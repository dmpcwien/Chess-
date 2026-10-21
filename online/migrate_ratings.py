"""One-time, atomic transfer of all Glicko-2 identities and histories to long-term Postgres.

Use when LONG_TERM_RATING_DATABASE_URL is configured. RATING_DATABASE_URL
remains the old Render Free database. Credentials are never logged. If the
target already contains user data, migration refuses to overwrite any of it.
No migration is performed until the long-term URL exists.
"""
from __future__ import annotations

import os
import time

TABLES = {
    "players": ("id", "nickname", "token_hash", "created_at"),
    "ratings": ("player_id", "mode", "rating", "rd", "sigma", "games", "last_period"),
    "rated_games": (
        "game_id", "mode", "white_id", "black_id", "result", "finished_at",
        "white_before", "white_after", "black_before", "black_after",
    ),
}
MIGRATION_TAG = "render-free-ratings-2026-10-21"


def migrate_to_long_term(source_url: str, dest_url: str) -> dict:
    if not source_url or not dest_url:
        raise ValueError("Source and target PostgreSQL URLs are required.")
    if source_url == dest_url:
        raise ValueError("Migration source and destination must be distinct.")

    import psycopg
    try:
        from .ratings import RatingStore
    except ImportError:
        from ratings import RatingStore

    # Ensure the destination schema exists. Source schema already exists
    # because it has been used for rated games.
    RatingStore(database_url=dest_url)

    with psycopg.connect(source_url) as source, psycopg.connect(dest_url) as dest:
        with dest.transaction():
            dest.execute("""CREATE TABLE IF NOT EXISTS rating_migrations (
                migration_tag TEXT PRIMARY KEY, migrated_at BIGINT NOT NULL,
                player_count BIGINT NOT NULL, rating_count BIGINT NOT NULL,
                game_count BIGINT NOT NULL)""")

        if dest.execute("SELECT 1 FROM rating_migrations WHERE migration_tag = %s",
                        (MIGRATION_TAG,)).fetchone():
            return {"status": "already_migrated"}

        counts = {}
        with source.transaction():
            # Use one consistent snapshot to avoid mismatched games/ratings.
            source.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            records = {}
            for table, columns in TABLES.items():
                names = ", ".join(columns)
                records[table] = source.execute(
                    f"SELECT {names} FROM {table}"
                ).fetchall()
                counts[table] = len(records[table])

            # The entire insertion is atomic; partial data will be rolled
            # back on a single error, keeping the old database untouched.
            with dest.transaction():
                if dest.execute("SELECT 1 FROM rating_migrations WHERE migration_tag = %s",
                                (MIGRATION_TAG,)).fetchone():
                    return {"status": "already_migrated"}
                for table in TABLES:
                    if dest.execute(f"SELECT EXISTS (SELECT 1 FROM {table})").fetchone()[0]:
                        raise RuntimeError(
                            "Target contains Glicko-2 data already. Migration aborted "
                            "to protect existing profiles and ratings."
                        )
                for table, cols in TABLES.items():
                    names = ", ".join(cols)
                    placeholders = ", ".join(["%s"] * len(cols))
                    statement = f"INSERT INTO {table} ({names}) VALUES ({placeholders})"
                    with dest.cursor() as cur:
                        for row in records[table]:
                            cur.execute(statement, row)
                dest.execute(
                    """INSERT INTO rating_migrations
                    (migration_tag,migrated_at,player_count,rating_count,game_count)
                    VALUES (%s,%s,%s,%s,%s)""",
                    (MIGRATION_TAG, int(time.time()),
                     counts["players"], counts["ratings"], counts["rated_games"]),
                )
        return {"status": "migrated", "counts": counts}


def migrate_on_startup() -> dict:
    source = os.getenv("RATING_DATABASE_URL", "")
    target = os.getenv("LONG_TERM_RATING_DATABASE_URL", "")
    if not target:
        return {"status": "not_configured"}
    if not source:
        # New installation with only the long-term database.
        return {"status": "new_long_term_database"}
    return migrate_to_long_term(source, target)


if __name__ == "__main__":
    result = migrate_on_startup()
    print("Long-term Glicko-2 rating migration:", result["status"],
          result.get("counts", {}))
