"""Found/seeking matching: plain rules and fuzzy string similarity, no model training.

A found record describes a person at a site. A seeking record describes the missing
person (name, gender, age, clothing) and the relative who is searching (relative_name).
Every clue adds or subtracts points; a missing field scores zero.
"""
import math
import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz

from . import store
from .match_config import (AMBIGUOUS_GAP, NAME_CONFLICT_SIM, NAMELESS_MIN_CLUES, NAME_RARITY_FLOOR, NAME_SIM_FLOOR, POSSIBLE,
                           RELATIVE_SIM_MIN, STRONG, VILLAGE_CONFLICT_SIM, VILLAGE_SIM_MIN, WEIGHTS)

# Honorifics stripped from names (only when another word remains: "Selvi" alone is a name).
TITLES = {"selvi", "thiru", "thirumathi", "tmt", "smt", "shri", "sri", "kumari", "mr", "mrs", "ms", "dr",
          "master", "baby", "ammal"}

# Applied in order; then doubled letters collapse. Makes Lakshmi/Laxmi/Latchumi and th/t etc. agree.
SOUND_RULES = [("ksh", "x"), ("tchu", "x"), ("tch", "ch"), ("ck", "k"), ("zh", "l"), ("th", "t"),
               ("dh", "d"), ("sh", "s"), ("ph", "p"), ("v", "w"), ("aa", "a"), ("ee", "i"), ("oo", "u"),
               ("y", "i")]

AGE_ORDER = ["Under 12", "12–18", "19–59", "60+"]

STOPWORDS = {"a", "an", "and", "the", "with", "on", "in", "of", "her", "his", "their", "wearing", "wears",
             "has", "had", "near", "colour", "color", "coloured", "some", "one"}
MARK_WORDS = {"scar", "mole", "tattoo", "birthmark", "burn", "limp", "spectacles", "glasses", "bangle",
              "nose", "ring", "earring", "chain", "missing", "tooth", "teeth", "cast", "bandage"}
SYNONYMS = {"saree": "sari", "sarees": "sari", "frock": "dress", "specs": "spectacles", "pant": "pants",
            "trousers": "pants", "tshirt": "shirt", "t": "", "shirts": "shirt"}

ASK = {
    "clothing_marks": "Ask about a scar, mark or what they were wearing",
    "relative_name": "Ask the name of their father or husband",
    "village": "Ask which village they are from",
    "age_band": "Ask their age",
    "name": "Ask their full name, with their father's initial",
}
FIELD_LABELS = {"name": "Name", "age_band": "Age", "village": "Village", "relative_name": "Relative",
                "clothing_marks": "Clothing or marks"}


def sound_key(token: str) -> str:
    t = token.lower()
    for a, b in SOUND_RULES:
        t = t.replace(a, b)
    return re.sub(r"(.)\1+", r"\1", t)


@dataclass
class Name:
    raw: str
    keys: list[str] = field(default_factory=list)       # sound keys of full words
    initials: list[str] = field(default_factory=list)   # single letters, e.g. "M." in "M. Lakshmi"
    words: list[str] = field(default_factory=list)      # full words as written (lowercase)


def parse_name(raw: str | None) -> Name | None:
    if not raw or not raw.strip():
        return None
    words = re.findall(r"[a-zA-Z]+", raw.lower())
    if len([w for w in words if w not in TITLES and len(w) > 1]) >= 1:
        words = [w for w in words if w not in TITLES]
    n = Name(raw=raw.strip())
    for w in words:
        if len(w) == 1:
            n.initials.append(w)
        else:
            n.words.append(w)
            n.keys.append(sound_key(w))
    return n if n.keys or n.initials else None


def token_match(a: list[str], b: list[str]) -> tuple[float, list[tuple[str, str]], list[str]]:
    """Order-independent: each word of the shorter name to its best partner.
    Returns (average similarity 0–1, matched pairs, unmatched words of the longer name)."""
    if not a or not b:
        return 0.0, [], []
    short, long_ = (a, b) if len(a) <= len(b) else (b, a)
    pairs, used = [], set()
    total = 0.0
    for s in short:
        best_j, best = max(((j, fuzz.ratio(s, l)) for j, l in enumerate(long_) if j not in used),
                           key=lambda x: x[1], default=(None, 0))
        if best_j is not None:
            used.add(best_j)
            pairs.append((s, long_[best_j]))
        total += best / 100
    return total / len(short), pairs, [l for j, l in enumerate(long_) if j not in used]


def keywords(text: str | None) -> set[str]:
    if not text:
        return set()
    out = set()
    for w in re.findall(r"[a-z]+", text.lower()):
        w = SYNONYMS.get(w, w)
        if w and w not in STOPWORDS and len(w) > 1:
            out.add(w)
    return out


def similar(a: str | None, b: str | None) -> float | None:
    na, nb = parse_name(a), parse_name(b)
    if not na or not nb or not na.keys or not nb.keys:
        return None
    return token_match(na.keys, nb.keys)[0]


def age_gap(a: str | None, b: str | None) -> int | None:
    if a not in AGE_ORDER or b not in AGE_ORDER:
        return None
    return abs(AGE_ORDER.index(a) - AGE_ORDER.index(b))


def compatible(f: dict, s: dict) -> bool:
    gf, gs = f.get("gender"), s.get("gender")
    if gf in ("male", "female") and gs in ("male", "female") and gf != gs:
        return False
    gap = age_gap(f.get("age_band"), s.get("age_band"))
    return gap is None or gap <= 1


class NameFrequency:
    """How many records carry all of the given name words (e.g. both "indira" and "ilango")."""

    def __init__(self, records: list[dict]):
        self.sets = [set(n.keys) for r in records if (n := parse_name(r.get("name")))]
        self.cache: dict[frozenset, int] = {}

    def __getitem__(self, keys: frozenset) -> int:
        if keys not in self.cache:
            self.cache[keys] = sum(keys <= s for s in self.sets)
        return self.cache[keys]


def name_rarity(keys: list[str], freq: NameFrequency) -> float:
    # The two records being compared both carry the name, so one other carrier is "rare".
    others = max(1, freq[frozenset(keys)] - 1)
    return max(NAME_RARITY_FLOOR, 1 / math.sqrt(others))


def score_pair(f: dict, s: dict, freq: NameFrequency) -> dict:
    """Evidence for found record f and seeking record s."""
    pts = 0.0
    pro, con, unknown = [], [], []
    clues: set[str] = set()  # independent agreeing clues besides gender and age
    w = WEIGHTS

    # Name
    nf, ns = parse_name(f.get("name")), parse_name(s.get("name"))
    extra_words: list[str] = []
    if nf and ns and nf.keys and ns.keys:
        sim, pairs, extra_words = token_match(nf.keys, ns.keys)
        if sim >= NAME_SIM_FLOOR:
            rarity = name_rarity([p[0] for p in pairs], freq)
            pts += w["name_max"] * min(1.0, (sim - NAME_SIM_FLOOR) / (1 - NAME_SIM_FLOOR)) * rarity
            how = "Names match" if sim >= 0.95 else "Names sound alike"
            common = " (a common name here)" if rarity < 0.75 else ""
            pro.append(f"{how}: {nf.raw} / {ns.raw}{common}")
        elif sim < NAME_CONFLICT_SIM:
            pts += w["name_conflict"]
            con.append(f"Names are different: {nf.raw} / {ns.raw}")
        else:
            pts += w["name_partial"]
            con.append(f"Names only partly alike: {nf.raw} / {ns.raw}")
    else:
        unknown.append("name")

    # Relatives. On a seeking record relative_name is the person searching.
    rel_pts, rel_reason = 0.0, None
    f_rel, s_rel = f.get("relative_name"), s.get("relative_name")
    sim = similar(f_rel, s_rel)
    if sim is not None and sim >= RELATIVE_SIM_MIN:
        rel_pts = w["relative_max"] * sim
        rel_reason = f"Relative's name agrees: {f_rel} / {s_rel}"
    for p in f.get("looking_for") or []:
        sim2 = similar(p.get("name"), s_rel)
        if sim2 is not None and sim2 >= RELATIVE_SIM_MIN and w["relative_max"] * sim2 > rel_pts:
            rel_pts = w["relative_max"] * sim2
            rel_reason = f"Found person is looking for their {p.get('relation') or 'relative'} {p.get('name')}, who is searching"
    if rel_pts == 0:
        # Initial or extra name word standing for the father's / husband's name.
        for name_obj, other_rel in ((nf, s_rel), (ns, f_rel)):
            r = parse_name(other_rel)
            if not name_obj or not r or not r.words:
                continue
            if any(r.words[0].startswith(i) for i in name_obj.initials):
                rel_pts, rel_reason = w["relative_initial"], f"Initial in {name_obj.raw} fits {other_rel}"
                break
        if rel_pts == 0 and extra_words:
            for r in (parse_name(f_rel), parse_name(s_rel)):
                if r and r.keys and any(fuzz.ratio(x, k) >= 85 for x in extra_words for k in r.keys):
                    rel_pts, rel_reason = w["relative_in_name"], "Father's or husband's name appears in the other name"
                    break
    if rel_pts:
        pts += rel_pts
        pro.append(rel_reason)
        clues.add("relative")
    elif f_rel and s_rel:
        same_role = (f.get("relative_relation") or "").lower() == (s.get("relative_relation") or "").lower() != ""
        if same_role and sim is not None and sim < NAME_CONFLICT_SIM:
            pts += w["relative_conflict"]
            con.append(f"Different {f.get('relative_relation')}: {f_rel} / {s_rel}")
    else:
        unknown.append("relative_name")

    # Village and where found
    fv, sv = f.get("village"), s.get("village")
    if fv and sv:
        vsim = fuzz.ratio(sound_key(fv), sound_key(sv))
        if vsim >= VILLAGE_SIM_MIN:
            pts += w["village"]
            clues.add("village")
            pro.append(f"Same village: {fv}" if vsim >= 95 else f"Villages sound alike: {fv} / {sv}")
        elif vsim < VILLAGE_CONFLICT_SIM:
            pts += w["village_conflict"]
            con.append(f"Different villages: {fv} / {sv}")
    else:
        unknown.append("village")
    # Where found vs the family's village or where they last saw the person.
    # The exact place is not repeated in the reason; it is shown only after verification.
    fw, last_seen = f.get("found_where"), s.get("last_seen")
    if fw and sv and fuzz.partial_ratio(sound_key(sv), sound_key(fw)) >= VILLAGE_SIM_MIN:
        pts += w["found_where_village"]
        pro.append(f"Found near the family's village ({sv})")
        clues.add("location")
    elif fw and last_seen and fuzz.token_set_ratio(sound_key(last_seen), sound_key(fw)) >= VILLAGE_SIM_MIN:
        pts += w["found_where_village"]
        pro.append("Found where the family last saw them")
        clues.add("location")

    # Clothing and marks
    kf, ks = keywords(f.get("clothing_marks")), keywords(s.get("clothing_marks"))
    if kf and ks:
        shared = kf & ks
        if shared:
            pts += w["clothing_max"] * len(shared) / min(len(kf), len(ks))
            marks = shared & MARK_WORDS
            if marks:
                pts += w["marks_bonus"]
            pro.append(f"Clothing or marks agree: {', '.join(sorted(shared))}")
            clues.add("clothing")
        else:
            con.append("Clothing or marks described differently")
    else:
        unknown.append("clothing_marks")

    # Age
    gap = age_gap(f.get("age_band"), s.get("age_band"))
    if gap == 0:
        pts += w["age_same"]
        pro.append(f"Same age group: {f['age_band']}")
    elif gap == 1:
        con.append(f"Age groups differ: {f['age_band']} / {s['age_band']}")
    else:
        unknown.append("age_band")

    # Full names agree (every word, initials not conflicting) and gender or age agrees, with nothing against:
    # a Possible match even when nothing else is recorded yet, so the sites are asked to check. Without this,
    # a sparse pair with a common name stays under the threshold and nobody is told (missing fields would
    # lower the score). Common names still stay below Strong.
    if nf and ns and nf.keys and set(nf.keys) == set(ns.keys) and not con and (
            not nf.initials or not ns.initials or set(nf.initials) & set(ns.initials)):
        gender_agrees = f.get("gender") in ("male", "female") and f.get("gender") == s.get("gender")
        if (gender_agrees or gap == 0) and pts < POSSIBLE:
            pts = POSSIBLE
            pro.append("Full names agree; little else is recorded on both sides yet")

    nameless = not nf
    if nameless:
        # Score over the evidence that can exist: the name weight is left out of the maximum.
        if f.get("gender") in ("male", "female") and f.get("gender") == s.get("gender"):
            pts += w["gender_same"]
            pro.append(f"Same gender: {f['gender']}")
        pts = pts * 100 / (100 - w["name_max"])
        if len(clues) < NAMELESS_MIN_CLUES:
            pts = min(pts, POSSIBLE - 1)  # not enough description to suggest
        elif not {"clothing", "location"} <= clues:
            pts = min(pts, STRONG - 1)    # Possible at most

    score = int(round(max(0.0, min(100.0, pts))))
    return {"score": score, "reasons_for": pro, "reasons_against": con, "unknown": unknown, "nameless": nameless}


def has(r: dict, f: str) -> bool:
    return bool(r.get(f))


def ask_next(seeker: dict, top: dict, runner: dict | None, unknown: list[str]) -> str | None:
    """The field that best separates the top candidate from the runner-up."""
    order = ["clothing_marks", "relative_name", "village", "age_band", "name"]
    if runner is not None:
        for f in order:
            if not has(seeker, f) and (has(top, f) or has(runner, f)):
                return ASK[f]
        for f in order:
            if has(top, f) != has(runner, f):
                return ASK[f]
    for f in order:
        if f in unknown:
            return ASK[f]
    # Everything is recorded on both sides: ask the family to describe something the found record has.
    for f in order:
        if has(top, f):
            return ASK[f]
    return ASK["name"]


def compute(records: list[dict], events: list[dict]) -> list[dict]:
    found = [r for r in records if r.get("type") == "found"]
    seeking = [r for r in records if r.get("type") == "seeking"]
    ruled_out = {(e["found_id"], e["seeking_id"]) for e in events if e.get("kind") == "rule_out"}
    freq = NameFrequency(records)
    by_id = {r["id"]: r for r in records}

    # Existing approved household pairs can corroborate another member's search.
    approved = {(e.get("found_id"), e.get("seeking_id")) for e in events
                if e.get("kind") == "family_match"}
    approved_households = {
        (by_id[sid].get("household_id"), by_id[fid].get("site"))
        for fid, sid in approved if fid in by_id and sid in by_id
        and by_id[sid].get("household_id")
    }
    # Reciprocal evidence is independent of the candidate's own search: the
    # candidate must have a separate linked search for the original searcher.
    searches_by_searcher = {}
    for other in seeking:
        if other.get("searcher_id"):
            searches_by_searcher.setdefault(other["searcher_id"], []).append(other)

    results = []
    for s in seeking:
        cands = []
        for f in found:
            if f["id"] == s.get("searcher_id") or (f["id"], s["id"]) in ruled_out or not compatible(f, s):
                continue
            # Linked searcher is a known person, never a candidate for their own search.
            searcher = by_id.get(s.get("searcher_id"))
            evidence_search = dict(s)
            if searcher:
                if not evidence_search.get("relative_name"):
                    evidence_search["relative_name"] = searcher.get("name")
                if not evidence_search.get("village"):
                    evidence_search["village"] = searcher.get("village")
            ev = score_pair(f, evidence_search, freq)
            if searcher:
                ev["reasons_for"].append(f"Searcher registered at {searcher.get('site')}: {searcher.get('name') or 'unnamed'}")
                # Reciprocal names alone are weak; require the reverse search
                # to have compatible demographics and an independently close name.
                for reverse in searches_by_searcher.get(f["id"], []):
                    if reverse["id"] == s["id"] or not compatible(searcher, reverse):
                        continue
                    reverse_sim = similar(searcher.get("name"), reverse.get("name"))
                    if reverse_sim is not None and reverse_sim >= 0.9:
                        ev["score"] = min(100, ev["score"] + 12)
                        ev["reasons_for"].append("They are looking for each other")
                        break
            if s.get("household_id") and (s["household_id"], f.get("site")) in approved_households:
                ev["score"] = min(100, ev["score"] + 6)
                ev["reasons_for"].append("Another member of this household has a verified match at this site")
            if ev["score"] >= POSSIBLE:
                cands.append((f, ev))
        cands.sort(key=lambda c: -c[1]["score"])
        for i, (f, ev) in enumerate(cands):
            other = cands[1][0] if i == 0 and len(cands) > 1 else (cands[0][0] if i > 0 else None)
            ambiguous = len(cands) > 1 and i < 2 and cands[0][1]["score"] - cands[1][1]["score"] <= AMBIGUOUS_GAP
            # Nameless: ask for a physical detail.
            question = ASK["clothing_marks"] if ev["nameless"] else ask_next(by_id[s["id"]], f, other, ev["unknown"])
            results.append({
                "id": f"{f['id']}:{s['id']}",
                "found_id": f["id"],
                "seeking_id": s["id"],
                "score": ev["score"],
                "band": "Strong" if ev["score"] >= STRONG else "Possible",
                "ambiguous": ambiguous,
                "reasons_for": ev["reasons_for"],
                "reasons_against": ev["reasons_against"],
                "unknown": [FIELD_LABELS[u] for u in ev["unknown"]],
                "ask_next": question,
                "nameless": ev["nameless"],
            })
    return results


def update_suggestions() -> int:
    """Recompute all suggestions from stored records and events (fast for a few thousand records)."""
    return store.replace_suggestions(compute(store.all_records(), store.all_events()))
