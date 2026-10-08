
from app import connect
import shutil
from pathlib import Path

db_path = Path(__file__).parent / "reunite.db"

# Back up the database before making changes.
shutil.copy2(db_path, db_path.with_suffix(".db.backup"))

with connect() as db:
    duplicates = db.execute("""
        SELECT id, name, camp, kind, created_at
        FROM records
        ORDER BY created_at, id
    """).fetchall()

    seen = set()
    removed = 0

    for record in duplicates:
        key = (
            record["name"].casefold().replace(" ", ""),
            record["camp"],
            record["kind"]
        )

        if key in seen:
            db.execute(
                "DELETE FROM records WHERE id = ?",
                (record["id"],)
            )
            removed += 1
        else:
            seen.add(key)

    print(f"Removed {removed} duplicate records.")
    print("Database backup created.")
