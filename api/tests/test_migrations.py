import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, text

from app.migrations import LATEST, migrate

# Faz 9 öncesi şema (göç 0): bölümlerde tür yok, milestones'ta section_id yok.
V0 = """
CREATE TABLE profile (id VARCHAR PRIMARY KEY, name VARCHAR NOT NULL);
CREATE TABLE sections (id VARCHAR PRIMARY KEY, slug VARCHAR NOT NULL, "order" INTEGER NOT NULL);
CREATE TABLE milestones (id VARCHAR PRIMARY KEY, kind VARCHAR NOT NULL, org VARCHAR NOT NULL,
                         period VARCHAR NOT NULL, "order" INTEGER NOT NULL);
CREATE TABLE projects (id VARCHAR PRIMARY KEY, slug VARCHAR NOT NULL, tech VARCHAR NOT NULL,
                       repo_url VARCHAR, live_url VARCHAR, "order" INTEGER NOT NULL,
                       published BOOLEAN NOT NULL);
INSERT INTO profile VALUES ('profile', 'Ad');
INSERT INTO sections VALUES ('hakkimda', 'hakkimda', 1), ('deneyim', 'deneyim', 2),
                            ('iletisim', 'iletisim', 3);
"""


def _v0(path: Path) -> None:
    with sqlite3.connect(path) as db:
        db.executescript(V0)


def test_upgrades_existing_database_and_backs_it_up(tmp_path: Path) -> None:
    db_file = tmp_path / "site.db"
    _v0(db_file)
    engine = create_engine(f"sqlite:///{db_file}")
    migrate(engine, db_file)
    with engine.connect() as conn:
        assert conn.execute(text("PRAGMA user_version")).scalar_one() == LATEST
        kinds = dict(conn.execute(text("SELECT id, kind FROM sections")).all())
        assert kinds == {"hakkimda": "about", "deneyim": "experience", "iletisim": "contact"}
        assert conn.execute(text("SELECT visible FROM sections LIMIT 1")).scalar_one() == 1
        cols = {r[1] for r in conn.execute(text("PRAGMA table_info(milestones)"))}
        assert "section_id" in cols
    assert (tmp_path / "site.db.bak-v0").exists()
    # İkinci açılış hiçbir şey yapmaz (yeni yedek yok).
    migrate(engine, db_file)
    assert not (tmp_path / f"site.db.bak-v{LATEST}").exists()


def test_fresh_database_only_records_version(tmp_path: Path) -> None:
    db_file = tmp_path / "site.db"
    with sqlite3.connect(db_file) as db:
        db.execute("CREATE TABLE profile (id VARCHAR PRIMARY KEY, name VARCHAR NOT NULL)")
    engine = create_engine(f"sqlite:///{db_file}")
    migrate(engine, db_file)
    with engine.connect() as conn:
        assert conn.execute(text("PRAGMA user_version")).scalar_one() == LATEST
    assert not list(tmp_path.glob("*.bak-*"))
