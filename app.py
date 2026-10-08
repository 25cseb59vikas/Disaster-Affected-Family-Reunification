import base64
import requests
from flask import request, jsonify

"""REUNITE AI demo server. Use fictional data only."""

from flask import Flask, jsonify, request, send_from_directory

from pathlib import Path

import sqlite3, uuid, difflib



ROOT = Path(__file__).parent

app = Flask(__name__, static_folder='static', static_url_path='')

DB = ROOT / 'reunite.db'

def create_verification_table():
    with sqlite3.connect(DB) as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS verifications (
                record_id TEXT NOT NULL,
                family_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                officer_note TEXT DEFAULT '',
                PRIMARY KEY (record_id, family_id)
            )
        """)
        db.commit()




def connect():

    conn = sqlite3.connect(DB)

    conn.row_factory = sqlite3.Row

    conn.execute('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, camp TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, age INTEGER, relative_name TEXT, relationship TEXT, location TEXT, notes TEXT, created_at TEXT NOT NULL)')



    conn.execute("""

        CREATE TABLE IF NOT EXISTS families (

            family_id TEXT PRIMARY KEY,

            household_name TEXT NOT NULL,

            home_location TEXT

        )

    """)



    conn.execute("""

        CREATE TABLE IF NOT EXISTS family_members (

            person_id TEXT PRIMARY KEY,

            family_id TEXT NOT NULL,

            name TEXT NOT NULL,

            age INTEGER,

            relationship TEXT,

            FOREIGN KEY (family_id) REFERENCES families(family_id)

        )

    """)



    conn.commit()

    return conn



def seed_families():

    with connect() as db:

        db.execute("""

            INSERT OR IGNORE INTO families

            VALUES (?, ?, ?)

        """, (

            "FAM001",

            "Kumar Family",

            "Coimbatore"

        ))



        members = [

            ("P001", "FAM001", "Ravi Kumar", 42, "Father"),

            ("P002", "FAM001", "Meena Kumar", 38, "Mother"),

            ("P003", "FAM001", "Arun Kumar", 12, "Son"),

            ("P004", "FAM001", "Priya Kumar", 9, "Daughter")

        ]



        db.executemany("""

            INSERT OR IGNORE INTO family_members

            (person_id, family_id, name, age, relationship)

            VALUES (?, ?, ?, ?, ?)

        """, members)





@app.get('/')

def home():

    return send_from_directory(ROOT / 'static', 'index.html')



@app.get('/api/health')

def health():

    return jsonify(status='ok')



@app.get('/api/families')

def get_families():

    with connect() as db:

        families = [

            dict(row) for row in db.execute(

                "SELECT * FROM families"

            )

        ]



        for family in families:

            family["members"] = [

                dict(row) for row in db.execute(

                    """

                    SELECT * FROM family_members

                    WHERE family_id = ?

                    """,

                    (family["family_id"],)

                )

            ]



    return jsonify(families=families)





@app.get('/api/family-connections')
def family_connections():
    with connect() as db:
        survivors = [dict(row) for row in db.execute(
            "SELECT * FROM records WHERE kind = 'survivor'"
        )]
        members = [dict(row) for row in db.execute("""
            SELECT fm.person_id, fm.family_id, fm.name, fm.age,
                   fm.relationship, f.household_name
            FROM family_members fm
            JOIN families f ON fm.family_id = f.family_id
        """)]
        relatives = [dict(row) for row in db.execute(
            "SELECT family_id, person_id, name, relationship FROM family_members"
        )]

    connections = []
    household_leads = set()
    for survivor in survivors:
        for member in members:
            name_score = similarity(survivor['name'], member['name'])
            age_score = int(
                survivor['age'] is not None
                and member['age'] is not None
                and abs(survivor['age'] - member['age']) <= 2
            )
            relative_clue = survivor.get('relative_name') or ''
            relative_score = 0
            if relative_clue:
                for relative in relatives:
                    if relative['family_id'] != member['family_id']:
                        continue
                    if relative['person_id'] == member['person_id']:
                        continue
                    stated_relationship = (survivor.get('relationship') or '').casefold()
                    actual_relationship = (relative.get('relationship') or '').casefold()
                    if (stated_relationship and stated_relationship != 'other'
                            and stated_relationship != actual_relationship):
                        continue
                    relative_score = max(
                        relative_score,
                        similarity(relative_clue, relative['name'])
                    )

            score = round(100 * (
                0.55 * name_score + 0.15 * age_score + 0.30 * relative_score
            ))
            person_identity_match = (
                name_score >= 0.75 and (age_score == 1 or name_score >= 0.95)
            )
            household_clue_match = (
                bool(relative_clue) and relative_score >= 0.85
                and not person_identity_match
            )
            if not person_identity_match and not household_clue_match:
                continue

            if household_clue_match:
                lead_key = (survivor['id'], member['family_id'])
                if lead_key in household_leads:
                    continue
                household_leads.add(lead_key)
                connections.append({
                    'survivor': survivor['name'],
                    'camp': survivor['camp'],
                    'record_id': survivor['id'],
                    'possible_member': None,
                    'family_id': member['family_id'],
                    'household_name': member['household_name'],
                    'score': score,
                    'clue_only': True,
                    'explanation': (
                        'Possible household identified through a remembered relative. '
                        'Specific identity remains unknown. Officer verification required.'
                    )
                })
                continue

            connections.append({
                'survivor': survivor['name'],
                'camp': survivor['camp'],
                'record_id': survivor['id'],
                'possible_member': member['name'],
                'family_id': member['family_id'],
                'household_name': member['household_name'],
                'score': score,
                'clue_only': False,
                'explanation': (
                    'Name, age and family clues suggest a candidate. '
                    'Officer verification required.'
                )
            })

    matched_families = {
        (c['record_id'], c['family_id'])
        for c in connections if not c['clue_only']
    }
    connections = [
        c for c in connections
        if not c['clue_only']
        or (c['record_id'], c['family_id']) not in matched_families
    ]
    connections.sort(key=lambda item: item['score'], reverse=True)
    return jsonify(connections=connections[:30])

@app.get('/api/verifications')
def get_verifications():
    with connect() as db:
        rows = db.execute("""
            SELECT record_id, family_id, status
            FROM verifications
        """).fetchall()

    return jsonify(verifications=[
        dict(row) for row in rows
    ])


@app.post('/api/verify')
def verify_match():
    data = request.get_json(silent=True) or {}

    record_id = data.get('record_id')
    family_id = data.get('family_id')
    status = data.get('status')

    if not isinstance(record_id, str) or not isinstance(family_id, str):
        return jsonify(error='Missing record or family ID'), 400

    if status not in ('verified', 'rejected'):
        return jsonify(error='Invalid status'), 400

    with connect() as db:
        record = db.execute(
            "SELECT id FROM records WHERE id = ?",
            (record_id,)
        ).fetchone()

        family = db.execute(
            "SELECT family_id FROM families WHERE family_id = ?",
            (family_id,)
        ).fetchone()

        if record is None or family is None:
            return jsonify(error='Record or family not found'), 404

        db.execute("""
            INSERT INTO verifications
                (record_id, family_id, status)
            VALUES (?, ?, ?)
            ON CONFLICT(record_id, family_id)
            DO UPDATE SET status = excluded.status
        """, (record_id, family_id, status))

    return jsonify(
        success=True,
        status=status
    )


def ensure_ai_description_column():
    with connect() as db:
        columns = [
            row["name"]
            for row in db.execute("PRAGMA table_info(records)")
        ]

        if "ai_description" not in columns:
            db.execute(
                "ALTER TABLE records "
                "ADD COLUMN ai_description TEXT DEFAULT ''"
            )


ensure_ai_description_column()




@app.post('/api/sync')

def sync():

    body = request.get_json(silent=True) or {}

    records = body.get('records', [])

    if not isinstance(records, list) or len(records) > 200:

        return jsonify(error='Send a list of at most 200 records'), 400

    with connect() as db:

        for r in records:

            if not isinstance(r, dict) or not all(isinstance(r.get(k), str) and r[k].strip() for k in ('id','camp','kind','name','created_at')):

                return jsonify(error='Invalid record'), 400

            if r['kind'] not in ('survivor', 'missing') or len(r['id']) > 100 or len(r['name']) > 150:

                return jsonify(error='Invalid record fields'), 400
            db.execute("""
                INSERT INTO records (
                    id, camp, kind, name, age,
                    relative_name, relationship, location,
                    notes, created_at, ai_description
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    ai_description = excluded.ai_description
                WHERE excluded.ai_description != ''
            """, (
                r['id'],
                r['camp'][:50],
                r['kind'],
                r['name'][:150],
                r.get('age'),
                str(r.get('relative_name') or '')[:150],
                str(r.get('relationship') or '')[:60],
                str(r.get('location') or '')[:150],
                str(r.get('notes') or '')[:1000],
                r['created_at'][:50],
                str(r.get('ai_description') or '')[:1000]
            ))
            

        all_records = [dict(row) for row in db.execute('SELECT * FROM records ORDER BY created_at DESC')]

    return jsonify(records=all_records)



def similarity(a,b):

    return difflib.SequenceMatcher(None,(a or '').casefold().replace(' ',''),(b or '').casefold().replace(' ','')).ratio()



@app.get('/api/matches')

def matches():

    with connect() as db:

        rows = [

            dict(r) for r in db.execute(

                'SELECT * FROM records'

            )

        ]



    result = []

    seen_pairs = set()



    missing_records = [

        r for r in rows if r['kind'] == 'missing'

    ]



    survivor_records = [

        r for r in rows if r['kind'] == 'survivor'

    ]



    for missing in missing_records:

        for survivor in survivor_records:



            if missing['camp'] == survivor['camp']:

                continue



            name_score = similarity(

                missing['name'], survivor['name']

            )



            relative_score = (

                similarity(

                    missing['relative_name'],

                    survivor['relative_name']

                )

                if missing['relative_name']

                and survivor['relative_name']

                else 0

            )



            age_score = (

                1 if missing['age'] is not None

                and survivor['age'] is not None

                and abs(missing['age'] - survivor['age']) <= 2

                else 0

            )



            score = round(

                100 * (

                    0.65 * name_score

                    + 0.20 * relative_score

                    + 0.15 * age_score

                )

            )



            if score < 55:

                continue



            # Demo-only display grouping.

            # Never use names alone to merge real people.

            missing_key = (

                missing['name'].casefold().replace(' ', ''),

                missing['camp']

            )



            survivor_key = (

                survivor['name'].casefold().replace(' ', ''),

                survivor['camp']

            )



            pair_key = (missing_key, survivor_key)



            if pair_key in seen_pairs:

                continue



            seen_pairs.add(pair_key)



            result.append({

                'missing': missing,

                'survivor': survivor,

                'score': score,

                'explanation': (

                    'Possible match only. '

                    'Human verification required.'

                )

            })



    result.sort(

        key=lambda r: r['score'],

        reverse=True

    )



    return jsonify(matches=result[:30])


@app.post("/api/reset-demo")
def reset_demo():
    with connect() as db:
        db.execute("DELETE FROM verifications")
        db.execute("DELETE FROM records")

    return jsonify(
        success=True,
        message="Demo registrations and reviews cleared."
    )

@app.post("/api/analyze-photo")
def analyze_photo():
    photo = request.files.get("photo")

    if not photo:
        return jsonify(error="No photo uploaded"), 400

    if photo.mimetype not in ("image/jpeg", "image/png", "image/webp"):
        return jsonify(error="Use a JPG, PNG, or WebP image"), 400

    image_bytes = photo.read(5 * 1024 * 1024 + 1)

    if len(image_bytes) > 5 * 1024 * 1024:
        return jsonify(error="Photo must be under 5 MB"), 400

    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    try:
        response = requests.post(
            "http://127.0.0.1:11434/api/chat",
            json={
                "model": "qwen2.5vl:3b",
                "stream": False,
                "messages": [{
                    "role": "user",
                    "content": (
                        "Describe only clearly visible clothing, colors, "
                        "bags, and accessories. Do not guess identity, "
                        "age, gender, health, or other personal attributes. "
                        "If a detail is unclear, say so. "
                        "Return a short factual description."
                    ),
                    "images": [image_base64]
                }]
            },
            timeout=120
        )

        response.raise_for_status()

        description = response.json()["message"]["content"]

        return jsonify(
            success=True,
            description=description,
            requires_officer_review=True
        )

    except (requests.RequestException, KeyError, ValueError) as error:
        app.logger.error("Ollama analysis failed: %s", error)
        return jsonify(error="Local AI analysis unavailable"), 503
@app.post("/api/missing-report")
def create_missing_report():
    import uuid
    from datetime import datetime, timezone

    data = request.get_json(silent=True) or {}

    name = str(data.get("missing_name") or "").strip()
    if not name or len(name) > 150:
        return jsonify(error="Valid missing person name required"), 400

    phone = str(data.get("caller_phone") or "").strip()
    location = str(data.get("last_seen_location") or "").strip()
    clothing = str(data.get("clothing_description") or "").strip()
    details = str(data.get("additional_details") or "").strip()
    language = str(data.get("language") or "en").strip()

    if language not in ("en", "ta"):
        return jsonify(error="Unsupported language"), 400

    if any(len(x) > limit for x, limit in (
        (phone, 30), (location, 150),
        (clothing, 1000), (details, 1000)
    )):
        return jsonify(error="Report field too long"), 400

    age = data.get("age")
    if age in ("", None):
        age = None
    else:
        try:
            age = int(age)
        except (ValueError, TypeError):
            return jsonify(error="Invalid age"), 400

        if not 0 <= age <= 120:
            return jsonify(error="Invalid age"), 400

    report_id = "RAI-" + uuid.uuid4().hex[:10].upper()

    with connect() as db:
        db.execute("""
            INSERT INTO missing_reports (
                id, caller_phone, missing_name, age,
                last_seen_location, clothing_description,
                additional_details, language, status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            report_id, phone, name, age, location,
            clothing, details, language, "pending",
            datetime.now(timezone.utc).isoformat()
        ))

    return jsonify(
        success=True,
        report_id=report_id,
        message="Missing person report received",
        status="pending"
    ), 201

@app.get("/api/missing-reports")
def get_missing_reports():
    with connect() as db:
        reports = [
            dict(row)
            for row in db.execute("""
                SELECT id, missing_name, age,
                       last_seen_location,
                       clothing_description,
                       additional_details,
                       language, status, created_at
                FROM missing_reports
                ORDER BY created_at DESC
                LIMIT 100
            """)
        ]

    return jsonify(reports=reports)

def create_missing_reports_table():
    with connect() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS missing_reports (
                id TEXT PRIMARY KEY,
                caller_phone TEXT,
                missing_name TEXT NOT NULL,
                age INTEGER,
                last_seen_location TEXT,
                clothing_description TEXT,
                additional_details TEXT,
                language TEXT DEFAULT 'en',
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL
            )
        """)
if __name__ == '__main__':
    connect().close()
    seed_families()
    create_verification_table()
    create_missing_reports_table()
    app.run(host='127.0.0.1', port=5000, debug=False)
