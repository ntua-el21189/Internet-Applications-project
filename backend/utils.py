from sqlalchemy.orm import Session
from database import SessionLocal
from sqlalchemy import text

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_valid_genres():
    db = SessionLocal() 
    try:
        rows = db.execute(text("SELECT genres FROM movies")).fetchall()
        genre_set = set()
        for row in rows:
            genres = row[0].split('|')
            genre_set.update(genres)
        return genre_set
    finally:
        db.close() 

VALID_GENRES = get_valid_genres()
 