from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    def __repr__(self):
        return f"<{self.__class__.__name__} id={getattr(self, 'id', 'Unsaved')}>"