from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.infrastructure.db import models  # noqa: E402,F401
