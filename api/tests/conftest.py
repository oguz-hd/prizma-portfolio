import os
import tempfile

import pytest

"""
Testler geçici bir veri klasöründe — dev veritabanına (volume) DOKUNMAZ.

⚠️ Ortam değişkenleri uygulama import edilmeden ÖNCE: ayarlar ve veritabanı motoru
import anında kuruluyor (config.get_settings önbellekli, db.engine modül düzeyinde).
Bütün testler aynı tohumlanmış veritabanını paylaşıyor; her test kendi kimlikleriyle
kayıt açıyor, hazır içeriği yalnızca okuyor ya da geri alıyor.

    docker exec prizma-portfolio-api-1 pytest
"""

DATA_DIR = tempfile.mkdtemp(prefix="prizma-test-")
os.environ["DATA_DIR"] = DATA_DIR
os.environ["DEBUG"] = "1"
os.environ["ADMIN_EMAIL"] = "admin@localhost"
os.environ["ADMIN_PASSWORD"] = "degistir"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as c:  # lifespan: göç + tohum + yayın
        yield c


@pytest.fixture(scope="session")
def auth(client: TestClient) -> dict[str, str]:
    r = client.post("/api/auth/login", json={"email": "admin@localhost", "password": "degistir"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['accessToken']}"}


@pytest.fixture
def data_dir() -> str:
    return DATA_DIR
