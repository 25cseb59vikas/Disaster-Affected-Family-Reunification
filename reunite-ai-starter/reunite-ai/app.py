"""REUNITE AI demo server. Use fictional data only."""
from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path
import sqlite3, uuid, difflib

ROOT = Path(__file__).parent
app = Flask(__name__, static_folder='static', static_url_path='')
DB = ROOT / 'reunite.db'

def connect():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, camp TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, age INTEGER, relative_name TEXT, relationship TEXT, location TEXT, notes TEXT, created_at TEXT NOT NULL)')
    conn.commit()
    return conn

@app.get('/')
def home():
    return send_from_directory(ROOT / 'static', 'index.html')

@app.get('/api/health')
def health():
    return jsonify(status='ok')

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
            db.execute('INSERT OR IGNORE INTO records VALUES (?,?,?,?,?,?,?,?,?,?)', (
                r['id'],r['camp'][:50],r['kind'],r['name'][:150],r.get('age'),
                str(r.get('relative_name') or '')[:150],str(r.get('relationship') or '')[:60],
                str(r.get('location') or '')[:150],str(r.get('notes') or '')[:1000],r['created_at'][:50]))
        all_records = [dict(row) for row in db.execute('SELECT * FROM records ORDER BY created_at DESC')]
    return jsonify(records=all_records)

def similarity(a,b):
    return difflib.SequenceMatcher(None,(a or '').casefold().replace(' ',''),(b or '').casefold().replace(' ','')).ratio()

@app.get('/api/matches')
def matches():
    with connect() as db:
        rows = [dict(r) for r in db.execute('SELECT * FROM records')]
    result=[]
    for missing in [r for r in rows if r['kind']=='missing']:
        for survivor in [r for r in rows if r['kind']=='survivor' and r['camp'] != missing['camp']]:
            name_score=similarity(missing['name'],survivor['name'])
            relative_score=similarity(missing['relative_name'],survivor['relative_name']) if missing['relative_name'] and survivor['relative_name'] else 0
            age_score=1 if missing['age'] is not None and survivor['age'] is not None and abs(missing['age']-survivor['age']) <= 2 else 0
            score=round(100*(0.65*name_score+0.2*relative_score+0.15*age_score))
            if score >= 55:
                result.append({'missing':missing,'survivor':survivor,'score':score,'explanation':'Heuristic candidate ranking only; human verification required.'})
    return jsonify(matches=sorted(result,key=lambda r:r['score'],reverse=True)[:30])

if __name__ == '__main__':
    connect().close()
    app.run(host='0.0.0.0', port=5000, debug=False)
