"""Generates clearly fake test people across Camp A and Hospital B, plus a ground-truth file.

    .venv\\Scripts\\python -m server.testdata        # writes server/testdata/people.json and ground_truth.json

Every record has registered_by = "TEST DATA". The random seed is fixed, so the output is repeatable.
Seeking records follow the app's meaning: name/gender/age/clothing describe the missing person,
relative_name is the person searching.
"""
import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).parent / "testdata"
rng = random.Random(20261008)

SITES = ["camp-a", "hospital-b"]
PREFIX = {"camp-a": "A", "hospital-b": "B"}
CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
VILLAGES = ["Meppadi", "Velankanni", "Nagapattinam", "Kilvelur", "Thirukkuvalai", "Nagore", "Sirkazhi",
            "Vedaranyam", "Keezhaiyur", "Thalainayar", "Kodiyakkarai", "Tharangambadi", "Poompuhar", "Karaikal"]
VILLAGE_VARIANTS = {"Thirukkuvalai": "Tirukuvalai", "Keezhaiyur": "Kilaiyur", "Kodiyakkarai": "Kodiakarai",
                    "Tharangambadi": "Tarangambadi", "Vedaranyam": "Vedharanyam", "Kilvelur": "Keelvelur"}
FEMALE = ["Lakshmi", "Meenakshi", "Kavitha", "Selvi", "Saraswathi", "Priya", "Revathi", "Malathi", "Valli",
          "Parvathi", "Kamala", "Deepa", "Thenmozhi", "Jayanthi", "Vasanthi", "Shanthi", "Gowri", "Yamuna",
          "Sudha", "Anitha", "Bhuvana", "Chitra", "Devi", "Indira", "Janaki"]
MALE = ["Murugan", "Ramasamy", "Senthil", "Karthik", "Arumugam", "Velu", "Rajan", "Kannan", "Ganesan",
        "Subramani", "Palani", "Sekar", "Saravanan", "Ravi", "Prakash", "Dinesh", "Mani", "Selvam",
        "Thangaraj", "Muthu", "Balu", "Chandran", "Elango", "Gopal", "Ilango", "Kumaresan", "Natarajan"]
SPELLINGS = {"Lakshmi": ["Laxmi", "Latchumi", "Lakshmy"], "Meenakshi": ["Minakshi", "Meenatchi"],
             "Kavitha": ["Kavita", "Kavidha"], "Saraswathi": ["Saraswati", "Sarasvathi"],
             "Senthil": ["Sendhil", "Sentil"], "Karthik": ["Karthick", "Kartik"], "Murugan": ["Murukan"],
             "Ramasamy": ["Ramaswamy", "Ramasami"], "Arumugam": ["Arumugham", "Aarumugam"],
             "Subramani": ["Subramaniam", "Subramanian"], "Thenmozhi": ["Thenmoli", "Tenmozhi"],
             "Parvathi": ["Parvati", "Paarvathi"], "Ganesan": ["Ganeshan"], "Shanthi": ["Santhi", "Shanti"],
             "Revathi": ["Revati"], "Vasanthi": ["Vasanti", "Wasanthi"], "Jayanthi": ["Jeyanthi"],
             "Gowri": ["Gauri"], "Yamuna": ["Jamuna"], "Natarajan": ["Nadarajan"], "Kannan": ["Kanan"]}
CLOTHES_F = ["green saree with yellow border", "red saree", "blue churidar", "white and red cotton saree",
             "yellow frock", "pink nightie", "purple saree", "orange salwar", "maroon blouse and black skirt"]
CLOTHES_M = ["blue shirt and black pants", "white dhoti", "checked lungi and white vest", "grey t-shirt",
             "yellow t-shirt and blue shorts", "brown shirt", "green lungi", "school uniform, white shirt"]
MARKS = ["scar on left eyebrow", "mole on chin", "tattoo on right arm", "gold nose ring", "missing front tooth",
         "burn mark on left hand", "spectacles", "birthmark on neck", "limp in right leg", "bandage on head"]
FOUND_WHERE = ["near the bus stand", "on the beach road", "near the church", "at the temple", "near the market",
               "on the highway", "at the school", "near the fishing harbour"]
PRIVATE = ["a bus ticket to Nagapattinam in the shirt pocket", "small scar behind the right ear",
           "a black thread on the left wrist", "a photo of a baby in a plastic cover", "a silver toe ring",
           "birthmark on the back of the neck"]
START = datetime(2026, 10, 7, 6, 0, tzinfo=timezone.utc)

records: list[dict] = []
truth: list[dict] = []
used_names: set[tuple[str, str]] = set()


def new_id() -> str:
    return str(uuid.UUID(int=rng.getrandbits(128), version=4))


def code(site: str) -> str:
    return f"{PREFIX[site]}-" + "".join(rng.choice(CODE_CHARS) for _ in range(4))


def band(age: int) -> str:
    return "Under 12" if age < 12 else "12–18" if age <= 18 else "19–59" if age <= 59 else "60+"


def variant(name: str) -> str:
    return rng.choice(SPELLINGS.get(name, [name]))


def person(gender: str | None = None, given: str | None = None, father: str | None = None,
           village: str | None = None, age: int | None = None) -> dict:
    gender = gender or rng.choice(["male", "female"])
    while True:
        g = given or rng.choice(FEMALE if gender == "female" else MALE)
        fa = father or rng.choice(MALE)
        if (g, fa) not in used_names or given:
            break
    used_names.add((g, fa))
    age = age if age is not None else rng.choice([rng.randint(3, 11), rng.randint(13, 17), rng.randint(20, 58),
                                                  rng.randint(20, 58), rng.randint(61, 80)])
    married = gender == "female" and age >= 22 and rng.random() < 0.6
    return {
        "gender": gender, "given": g, "father": fa, "age": age,
        "husband": rng.choice(MALE) if married else None,
        "village": village or rng.choice(VILLAGES),
        "clothes": rng.choice(CLOTHES_F if gender == "female" else CLOTHES_M),
        "mark": rng.choice(MARKS) if rng.random() < 0.5 else None,
    }


def record(kind: str, site: str, **fields) -> dict:
    r = {
        "id": new_id(), "code": code(site), "site": site, "type": kind,
        "created_at": (START + timedelta(minutes=rng.randint(0, 2 * 24 * 60))).isoformat(),
        "registered_by": "TEST DATA", "name": None, "gender": "unknown", "age_band": None, "village": None,
        "relative_name": None, "relative_relation": None, "clothing_marks": None, "found_where": None,
        "household_id": None, "last_seen": None, "private_detail": None, "has_missing_family": False, "looking_for": [], "transcript": None, "photo": None,
    }
    r.update(fields)
    records.append(r)
    return r


def clothing(p: dict) -> str:
    return p["clothes"] + (f", {p['mark']}" if p["mark"] else "")


def found_record(p: dict, site: str, name: str | None, household: str | None = None, **extra) -> dict:
    rel, relation = (p["husband"], "husband") if p["husband"] else (p["father"], "father")
    return record("found", site, name=name, gender=p["gender"], age_band=band(p["age"]), village=p["village"],
                  relative_name=rel, relative_relation=relation, clothing_marks=clothing(p),
                  found_where=f"{rng.choice(FOUND_WHERE)}, {p['village']}" if rng.random() < 0.6 else rng.choice(FOUND_WHERE),
                  household_id=household, **extra)


def seeking_record(p: dict, site: str, name: str | None, searcher: str, relation: str,
                   household: str | None = None) -> dict:
    return record("seeking", site, name=name, gender=p["gender"], age_band=band(p["age"]), village=p["village"],
                  relative_name=searcher, relative_relation=relation, clothing_marks=clothing(p),
                  household_id=household)


VARIATIONS = ["spelling", "initial", "swapped", "age", "missing_village", "missing_clothing", "missing_relative",
              "village_spelling", "spelling", "initial"]


def true_pair(i: int, p: dict | None = None, household: str | None = None, kind: str = "pair") -> None:
    p = p or person()
    found_site = rng.choice(SITES)
    seek_site = SITES[1 - SITES.index(found_site)]
    v1 = VARIATIONS[i % len(VARIATIONS)]
    v2 = rng.choice(VARIATIONS) if rng.random() < 0.4 else None
    variations = {v1, v2} - {None}

    full = f"{p['given']} {p['father']}"
    found_name, seek_name = full, full
    if "spelling" in variations:
        seek_name = f"{variant(p['given'])} {p['father']}"
    if "initial" in variations:
        found_name = f"{p['father'][0]}. {p['given']}"
    if "swapped" in variations:
        seek_name = f"{p['father']} {p['given']}"
    if rng.random() < 0.3:  # often only the given name is known
        found_name = p["given"] if "initial" not in variations else found_name

    # Who is searching: the father/husband recorded on the found side (cross-check), or someone else.
    if rng.random() < 0.6:
        searcher, relation = ((p["husband"], "husband") if p["husband"] else (p["father"], "father"))
    else:
        relation = rng.choice(["mother", "brother", "sister", "son", "daughter"])
        searcher = rng.choice(FEMALE if relation in ("mother", "sister", "daughter") else MALE)
    looking = [{"relation": relation, "name": searcher}] if rng.random() < 0.3 else []

    f = found_record(p, found_site, found_name, household, has_missing_family=bool(looking), looking_for=looking)
    s = seeking_record(p, seek_site, seek_name, searcher, relation, household)
    if "age" in variations:
        older = p["age"] + rng.choice([-4, -3, 3, 4])
        s["age_band"] = band(max(1, older))
    if "missing_village" in variations:
        s["village"] = None
    if "village_spelling" in variations:
        s["village"] = VILLAGE_VARIANTS.get(p["village"], p["village"])
    if "missing_clothing" in variations:
        s["clothing_marks"] = None
    if "missing_relative" in variations:
        f["relative_name"], f["relative_relation"] = None, None
    if i % 3 != 2:
        f["private_detail"] = PRIVATE[i % len(PRIVATE)]
    truth.append({"found_id": f["id"], "seeking_id": s["id"], "kind": kind, "variations": sorted(variations)})


def main() -> None:
    # The hard case for decoys: a true pair with a common name in a common village.
    common = person(gender="male", given="Murugan", father="Ramasamy", village="Kilvelur", age=35)
    true_pair(0, common)
    for i in range(1, 24):
        true_pair(i)

    # Households: members of one family found at different sites, searched for by one relative.
    for h in range(3):
        hid = new_id()
        father = rng.choice(MALE)
        village = rng.choice(VILLAGES)
        members = [person(gender="female", father=father, village=village, age=rng.randint(30, 50)),
                   person(father=father, village=village, age=rng.randint(4, 11))]
        if h == 0:
            members.append(person(father=father, village=village, age=rng.randint(13, 17)))
        for j, m in enumerate(members):
            true_pair(24 + h * 3 + j, m, household=hid, kind="household")

    # Nameless found people: only gender, age, clothing or marks, and where found.
    for i in range(8):
        p = person()
        p["mark"] = p["mark"] or rng.choice(MARKS)
        site = rng.choice(SITES)
        f = record("found", site, name=None, gender=p["gender"], age_band=band(p["age"]),
                   clothing_marks=clothing(p), found_where=f"{rng.choice(FOUND_WHERE)}, {p['village']}")
        if i < 4:  # a family is searching for four of them
            searcher = rng.choice(MALE)
            s = seeking_record(p, SITES[1 - SITES.index(site)], f"{p['given']} {p['father']}", searcher, "father")
            if i < 2:  # the family says where they last saw them
                s["last_seen"] = f["found_where"].split(",")[0]
            truth.append({"found_id": f["id"], "seeking_id": s["id"], "kind": "nameless", "variations": []})

    # Decoys: different people sharing the common name and village of the first pair.
    decoys = []
    for i in range(8):
        p = person(gender="male", given="Murugan", father=rng.choice([m for m in MALE if m != "Ramasamy"]),
                   village="Kilvelur", age=rng.choice([8, 16, 28, 45, 52, 67, 72, 40]))
        site = rng.choice(SITES)
        r = (found_record(p, site, f"Murugan {p['father']}" if i % 2 else "Murugan") if i < 4 else
             seeking_record(p, site, f"Murugan {p['father']}", rng.choice(FEMALE), rng.choice(["mother", "wife"])))
        decoys.append(r["id"])

    # Everyone else: registered once, nobody matching.
    while len(records) < 150:
        p = person()
        site = rng.choice(SITES)
        if rng.random() < 0.5:
            found_record(p, site, f"{p['given']} {p['father']}" if rng.random() < 0.8 else p["given"])
        else:
            seeking_record(p, site, f"{p['given']} {p['father']}", rng.choice(FEMALE + MALE),
                           rng.choice(["mother", "father", "wife", "husband", "brother", "sister"]))

    OUT.mkdir(exist_ok=True)
    (OUT / "people.json").write_text(json.dumps(records, indent=1, ensure_ascii=False), encoding="utf-8")
    (OUT / "ground_truth.json").write_text(json.dumps({"pairs": truth, "decoys": decoys}, indent=1), encoding="utf-8")
    kinds = {}
    for t in truth:
        kinds[t["kind"]] = kinds.get(t["kind"], 0) + 1
    print(f"{len(records)} records ({sum(r['type'] == 'found' for r in records)} found, "
          f"{sum(r['type'] == 'seeking' for r in records)} seeking), true pairs: {kinds}, decoys: {len(decoys)}")


if __name__ == "__main__":
    main()
