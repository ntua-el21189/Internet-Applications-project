from sqlalchemy import Column, Integer, Float, String
from database import Base

class Movie(Base):
    __tablename__ = "movies"
    movieId = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    genres = Column(String)

class Rating(Base):
    __tablename__ = "ratings"
    userId = Column(Integer, primary_key=True)
    movieId = Column(Integer, primary_key=True)
    rating = Column(Float)
    timestamp=Column(Integer)

class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, autoincrement=True)
    userId = Column(Integer)
    movieId = Column(Integer)
    tag = Column(String)
    timestamp=Column(Integer)