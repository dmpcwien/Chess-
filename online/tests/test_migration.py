"""Non-destructive migration and storage-selection safety tests."""
import pytest

from online.migrate_ratings import migrate_on_startup, migrate_to_long_term


def test_no_long_term_database_leaves_current_render_storage_untouched(monkeypatch):
    monkeypatch.delenv("LONG_TERM_RATING_DATABASE_URL", raising=False)
    monkeypatch.setenv("RATING_DATABASE_URL", "postgresql://existing-render-db")
    assert migrate_on_startup() == {"status": "not_configured"}


def test_migration_refuses_same_source_destination():
    with pytest.raises(ValueError, match="distinct"):
        migrate_to_long_term("postgresql://same", "postgresql://same")


def test_can_initialize_new_installation_directly_on_external_postgres(monkeypatch):
    monkeypatch.setenv("LONG_TERM_RATING_DATABASE_URL", "postgresql://fresh-neon")
    monkeypatch.delenv("RATING_DATABASE_URL", raising=False)
    assert migrate_on_startup() == {"status": "new_long_term_database"}
