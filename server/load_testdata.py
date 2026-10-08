"""Loads the generated test people into the server and runs matching.
Each site's app receives them on its next sync pull.

    .venv\\Scripts\\python -m server.load_testdata           # add to what is stored
    .venv\\Scripts\\python -m server.load_testdata --reset   # clear stored records, events and suggestions first

Safe to run while the server is running; no restart needed.
"""
import json
import sys
from pathlib import Path

from . import matching, store

DATA = Path(__file__).parent / "testdata" / "people.json"


def main() -> None:
    if not DATA.exists():
        sys.exit("No test data yet. Run: .venv\\Scripts\\python -m server.testdata")
    if "--reset" in sys.argv:
        store.reset()
        print("Cleared stored records, events and suggestions.")
    people = json.loads(DATA.read_text(encoding="utf-8"))
    accepted = store.add_records(people, origin="loader")
    changed = matching.update_suggestions()
    print(f"Loaded {len(accepted)} test records into {store.DB_PATH}; {len(store.visible_suggestions())} suggestions "
          f"({changed} changed).")
    print("Each site gets them on its next sync (every 15 s, or tap Sync now).")


if __name__ == "__main__":
    main()
