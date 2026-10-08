"""Runs matching on the test data and prints precision and recall against the ground truth.

    .venv\\Scripts\\python -m server.evaluate
"""
import json
from pathlib import Path

from .match_config import STRONG
from .matching import compute

DATA = Path(__file__).parent / "testdata"


def main() -> None:
    records = json.loads((DATA / "people.json").read_text(encoding="utf-8"))
    truth = json.loads((DATA / "ground_truth.json").read_text(encoding="utf-8"))
    by_id = {r["id"]: r for r in records}
    true_pairs = {(t["found_id"], t["seeking_id"]): t for t in truth["pairs"]}
    decoys = set(truth["decoys"])

    suggestions = compute(records, [])
    scored = {(s["found_id"], s["seeking_id"]): s for s in suggestions}

    def report(label: str, threshold: int) -> None:
        predicted = {k for k, s in scored.items() if s["score"] >= threshold}
        tp = len(predicted & true_pairs.keys())
        precision = tp / len(predicted) if predicted else 0
        recall = tp / len(true_pairs)
        print(f"{label:<18} suggested {len(predicted):>3}  correct {tp:>3}  "
              f"precision {precision:.0%}  recall {recall:.0%}")

    print(f"{len(records)} records, {len(true_pairs)} true pairs\n")
    report("Possible or better", 50)
    report("Strong only", STRONG)

    by_kind: dict[str, list[int]] = {}
    for k, t in true_pairs.items():
        by_kind.setdefault(t["kind"], [0, 0])
        by_kind[t["kind"]][1] += 1
        if k in scored:
            by_kind[t["kind"]][0] += 1
    print("\nRecall by kind:", ", ".join(f"{k} {a}/{b}" for k, (a, b) in by_kind.items()))

    # Is the true partner ranked first for each seeking record?
    top_ok = 0
    for (f_id, s_id) in true_pairs:
        cands = sorted((s for s in suggestions if s["seeking_id"] == s_id), key=lambda s: -s["score"])
        top_ok += bool(cands) and cands[0]["found_id"] == f_id
    print(f"True partner ranked first: {top_ok}/{len(true_pairs)}")

    def name(rid: str) -> str:
        r = by_id[rid]
        return f"{r['name'] or '(no name)'} [{r['age_band'] or '?'}, {r['village'] or '?'}, rel {r['relative_name'] or '?'}]"

    false_pos = sorted((s for k, s in scored.items() if k not in true_pairs), key=lambda s: -s["score"])
    print(f"\nWorst false matches ({len(false_pos)} total):")
    for s in false_pos[:6]:
        decoy = " DECOY" if {s["found_id"], s["seeking_id"]} & decoys else ""
        print(f"  {s['score']:>3}{decoy}  {name(s['found_id'])}  <->  {name(s['seeking_id'])}")
        print(f"       for: {'; '.join(s['reasons_for'])}")

    missed = [(k, t) for k, t in true_pairs.items() if k not in scored]
    print(f"\nMissed true pairs ({len(missed)}):")
    from .matching import NameFrequency, compatible, score_pair
    freq = NameFrequency(records)
    for (f_id, s_id), t in missed[:8]:
        f, s = by_id[f_id], by_id[s_id]
        ev = score_pair(f, s, freq) if compatible(f, s) else {"score": "filtered", "reasons_against": ["gender/age"]}
        print(f"  {ev['score']:>3}  {t['kind']:<9} {t['variations']}  {name(f_id)}  <->  {name(s_id)}")
        print(f"       against: {'; '.join(ev['reasons_against']) or '-'}")


if __name__ == "__main__":
    main()
