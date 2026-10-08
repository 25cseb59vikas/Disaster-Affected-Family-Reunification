
from app import connect

with connect() as db:
    rows = db.execute("""
        SELECT name, camp, kind, COUNT(*) AS total
        FROM records
        GROUP BY LOWER(REPLACE(name, ' ', '')), camp, kind
        HAVING COUNT(*) > 1
    """).fetchall()

    if not rows:
        print("No duplicate name/camp/type groups found.")

    for row in rows:
        print(
            row["name"],
            "|", row["camp"],
            "|", row["kind"],
            "| Copies:", row["total"]
        )
