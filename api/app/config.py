from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

#: Yalnızca yerel geliştirme için. Üretimde bu değer görülürse uyarı basılıyor
#: (`main.py`) — bu sırla çıkılırsa token'lar tahmin edilebilir olur.
INSECURE_DEFAULT_SECRET = "gelistirme-icin-guvensiz-anahtar"

#: Yalnızca yerel geliştirme için admin parolası. Üretimde veritabanındaki hesap
#: bu parolayı kabul ediyorsa API açılmıyor (`main.py`).
INSECURE_DEFAULT_PASSWORD = "degistir"


class Settings(BaseSettings):
    """
    Ortam değişkenleri. Değerler `.env`den ya da Docker ortamından gelir.

    ⚠️ `jwt_secret` üretimde MUTLAKA verilmeli. Varsayılan yalnızca yerel
    geliştirme için; bu değerle üretime çıkılırsa token'lar tahmin edilebilir olur.
    Bu yüzden `main.py` üretimde varsayılanı görürse uyarıyor.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # docs/ARCHITECTURE.md § 3: /data paylaşılan volume — API yazar, Caddy okur.
    # İmajın içinde kalırsa her --build'de silinir (docker-compose.yml'deki nota bak).
    data_dir: Path = Path("/data")

    jwt_secret: str = INSECURE_DEFAULT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 60 * 12

    # Tek admin kullanıcı (docs/ARCHITECTURE.md § 2 — rol sistemi yok).
    # İlk açılışta bu bilgilerle hesap kurulur.
    admin_email: str = "admin@localhost"
    admin_password: str = INSECURE_DEFAULT_PASSWORD

    debug: bool = False

    @field_validator("jwt_secret", mode="after")
    @classmethod
    def _no_empty_secret(cls, value: str) -> str:
        """
        Compose `JWT_SECRET: ${JWT_SECRET:-}` yazınca değişken BOŞ STRING olarak
        geliyor ve varsayılanı eziyor. Boş bir sır, güvensiz varsayılandan da
        kötü — imzalama sessizce anlamsızlaşır. Boşsa varsayılana düşülüyor ki
        `main.py`'deki uyarı da devreye girsin.
        """
        return value.strip() or INSECURE_DEFAULT_SECRET

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.data_dir / 'site.db'}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
