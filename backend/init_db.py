import pandas as pd
from database import engine, Base, SessionLocal
from tables import Movie, Rating, Tag
import os

if os.path.exists("movielens.db"):
    os.remove("movielens.db")
    print("Old database deleted")

Base.metadata.create_all(bind=engine)

def load_data():
    session = SessionLocal()

    movies = pd.read_csv("ml-latest-small/movies.csv")
    ratings = pd.read_csv("ml-latest-small/ratings.csv")
    tags = pd.read_csv("ml-latest-small/tags.csv")

    for _, row in movies.iterrows():
        session.add(Movie(**row.to_dict()))

    for _, row in ratings.iterrows():
        session.add(Rating(**row.to_dict()))

    for _, row in tags.iterrows():
        session.add(Tag(**row.to_dict()))

    session.commit()
    session.close()

if __name__ == "__main__":
    load_data()