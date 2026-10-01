import logging
import shutil
from collections.abc import Callable
from pathlib import Path

from sqlalchemy import Connection, Engine, text

"""
Şema göçleri — var olan veritabanı silinmeden yükselir (Faz 9).

`SQLModel.metadata.create_all` yalnızca EKSİK TABLOYU kurar; var olan tabloya
sütun eklemez. Bu yüzden şema değişince ya veritabanı sıfırlanırdı (içerik gider)
ya da burada bir adım yazılır.

Sürüm SQLite'ın kendi sayacında: `PRAGMA user_version`. Açılışta (db.py → init_db)
eksik adımlar sırayla uygulanır; her çalıştırmadan ÖNCE dosyanın kopyası alınır
(`site.db.bak-v<eski sürüm>`) — bir adım yarıda kalırsa geri dönüş elle bir kopya.

Boş veritabanında adım çalışmaz: `create_all` modellerden zaten son şemayı kurdu,
yalnızca sürüm yazılır. Ölçü "profil satırı yok" — tohumlama henüz çalışmamış.

Yeni adım eklemek: modeli değiştir → buraya `(n, fonksiyon)` ekle → adım idempotent
olsun (`_add_column` var olan sütunu atlıyor), çünkü yarıda kalan bir adım yeniden
çalışabilir.
"""

logger = logging.getLogger("uvicorn.error")


def _columns(conn: Connection, table: str) -> set[str]:
    return {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}


def _add_column(conn: Connection, table: str, column: str, ddl: str) -> None:
    if column not in _columns(conn, table):
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def _v1_section_kinds(conn: Connection) -> None:
    """Bölüm türleri, duyuru alanları, zaman çizelgesi maddeleri, proje kapağı."""
    _add_column(conn, "sections", "kind", "VARCHAR NOT NULL DEFAULT 'text'")
    _add_column(conn, "sections", "visible", "BOOLEAN NOT NULL DEFAULT 1")
    _add_column(conn, "sections", "link_href", "VARCHAR")
    _add_column(conn, "sections", "starts_on", "VARCHAR")
    _add_column(conn, "sections", "ends_on", "VARCHAR")
    # Eskiden bileşen slug'tan seçiliyordu (web/src/App.tsx); hazır üç bölüm.
    for slug, kind in (("hakkimda", "about"), ("deneyim", "experience"), ("iletisim", "contact")):
        conn.execute(text("UPDATE sections SET kind = :k WHERE slug = :s"), {"k": kind, "s": slug})
    _add_column(conn, "milestones", "section_id", "VARCHAR")
    conn.execute(
        text("CREATE INDEX IF NOT EXISTS ix_milestones_section_id ON milestones (section_id)")
    )
    _add_column(conn, "projects", "cover_media_id", "VARCHAR")


MIGRATIONS: list[tuple[int, Callable[[Connection], None]]] = [
    (1, _v1_section_kinds),
]
LATEST = MIGRATIONS[-1][0]


def migrate(engine: Engine, db_file: Path) -> None:
    with engine.connect() as conn:
        version = conn.execute(text("PRAGMA user_version")).scalar_one()
        if version >= LATEST:
            return
        fresh = version == 0 and not conn.execute(text("SELECT 1 FROM profile LIMIT 1")).first()

    if not fresh:
        backup = db_file.with_name(f"{db_file.name}.bak-v{version}")
        shutil.copy2(db_file, backup)
        logger.info("Göç öncesi yedek: %s", backup.name)

    with engine.begin() as conn:
        if not fresh:
            for number, step in MIGRATIONS:
                if number > version:
                    step(conn)
                    logger.info("Göç %d uygulandı: %s", number, step.__doc__)
        # PRAGMA parametre almıyor; LATEST koddan gelen bir tam sayı.
        conn.execute(text(f"PRAGMA user_version = {LATEST}"))
