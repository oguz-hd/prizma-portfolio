from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings
from app.migrations import migrate

settings = get_settings()

# check_same_thread=False: FastAPI eşzamanlı `def` uç noktalarını iş parçacığı
# havuzunda çalıştırıyor; SQLite'ın varsayılan tek-iş-parçacığı kısıtı bunu engellerdi.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=settings.debug,
)


def init_db() -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    # Önce eksik tablolar (yeni tablolar burada doğar), sonra var olanlara eksik
    # sütunlar — migrations.py.
    SQLModel.metadata.create_all(engine)
    migrate(engine, settings.data_dir / "site.db")


def get_session() -> Generator[Session]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
