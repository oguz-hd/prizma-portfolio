import os
import threading
from pathlib import Path

from sqlmodel import Session

from app.config import get_settings
from app.content import build_content, render_meta

"""
★ Yayın: veritabanı → `/data/content.json` + `/data/meta.html` (docs/ARCHITECTURE.md § 3).

Ziyaretçi tarafı veritabanını hiç görmez: Caddy bu iki dosyayı paylaşılan
volume'dan okur. API her açılışta ve her içerik değişikliğinden sonra
(Faz 7 — panel) ikisini yeniden yazar.

    content.json   site mount'tan önce bunu çeker (web/src/content/useContent.ts)
    meta.html      <title> + description + og:* — Caddy index.html'e gömer
                   (Caddyfile → templates), çünkü paylaşım kartları JS çalıştırmaz
"""

settings = get_settings()

CONTENT_FILE = "content.json"
META_FILE = "meta.html"

# İki yayın aynı anda çalışırsa (panelden art arda iki kayıt) yazmalar sıraya
# girsin: kurma + yazma kilidin içinde, yani en son biten en güncel hâli yazar.
_lock = threading.Lock()


def _write_atomic(path: Path, text: str) -> None:
    """
    Önce geçici dosyaya, sonra tek hamlede yerine. Caddy tam o anda okursa
    yarım bir JSON değil, ya eskisini ya yenisini görür.
    """
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def publish(session: Session) -> None:
    with _lock:
        content = build_content(session)
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        # exclude_none: `note`, `navLabel`, `repoUrl` yoksa alan hiç yazılmaz —
        # ön yüzdeki opsiyonel alanlarla (`note?:`) aynı şekil, `null` değil.
        _write_atomic(
            settings.data_dir / CONTENT_FILE,
            content.model_dump_json(by_alias=True, exclude_none=True),
        )
        _write_atomic(settings.data_dir / META_FILE, render_meta(content))
