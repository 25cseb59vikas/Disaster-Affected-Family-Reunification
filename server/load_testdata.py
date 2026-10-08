"""Loads the generated test people into the server and runs matching.
Each site's app receives them on its next sync pull.

    .venv\\Scripts\\python -m server.load_testdata           # add to what is stored
    .venv\\Scripts\\python -m server.load_testdata --reset   # clear stored records, events and suggestions first

Safe to run while the server is running; no restart needed. The "Reset demo" button on /sim does the
same as --reset and also tells open apps to clear their local data.
"""
import json
import sys
from pathlib import Path

from . import matching, store

DATA = Path(__file__).parent / "testdata" / "people.json"


def load(reset: bool = False) -> tuple[int, int]:
    """Returns (records loaded, visible suggestions)."""
    if not DATA.exists():
        raise FileNotFoundError("No test data yet. Run: .venv\\Scripts\\python -m server.testdata")
    if reset:
        store.reset()
    accepted = store.add_records(json.loads(DATA.read_text(encoding="utf-8")), origin="loader")
    matching.update_suggestions()
    return len(accepted), len(store.visible_suggestions())


def main() -> None:
    try:
        loaded, suggestions = load(reset="--reset" in sys.argv)
    except FileNotFoundError as e:
        sys.exit(str(e))
    print(f"Loaded {loaded} test records into {store.DB_PATH}; {suggestions} suggestions.")
    print("Each site gets them on its next sync (every 15 s, or tap Sync now).")


if __name__ == "__main__":
    main()
