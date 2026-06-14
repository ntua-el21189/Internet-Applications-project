from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal
from tables import Movie
from models import newMovie, RecommendationRequest
import math
from fastapi.middleware.cors import CORSMiddleware
from utils import get_db,VALID_GENRES

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def search_movies():
    return {"genres": VALID_GENRES}

@app.get("/movielens/api/movies")
def search_movies(search: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT m.movieId, m.title, m.genres, AVG(r.rating) as avg_rating
            FROM movies m
            LEFT JOIN ratings r ON m.movieId = r.movieId
            WHERE LOWER(m.title) LIKE :search
            GROUP BY m.movieId, m.title, m.genres
        """),
        {"search": f"%{search.lower()}%"}
    ).fetchall()

    movies = [
        {"movieId": r[0], "title": r[1], "genres": r[2], "avg_rating": round(r[3], 2) if r[3] is not None else 0.0}
        for r in rows
    ]
    return {"status": 200, "movies": movies}

@app.get("/movielens/api/ratings/{movieId}")
def get_movie_ratings(movieId: int, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT userId, rating, timestamp
            FROM ratings
            WHERE movieId = :movieId
        """),
        {"movieId": movieId}
    ).fetchall()

    ratings_list = [
        {"userId": r[0], "rating": r[1], "timestamp": r[2]}
        for r in rows
    ]
    return {"status": "success", "ratings": ratings_list}


@app.post("/movielens/api/movies")
def add_movie( movie:newMovie ,db: Session = Depends(get_db)):
    input_genres = movie.genres.split('|') 
    for g in input_genres:
        if g not in VALID_GENRES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid genre: '{g}'. Valid genres are separated by '|' and must be from the official list."
            )
        
    existing = db.execute(
        text("""
            SELECT movieId FROM movies
            WHERE LOWER(title) = LOWER(:title)
            AND genres = :genres
        """),
        {"title": movie.title, "genres": movie.genres}
    ).fetchone()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Movie already exists"
        )
    max_id_result = db.execute(text("SELECT MAX(movieId) FROM movies")).fetchone()
    new_id = (max_id_result[0]) + 1

    new_movie_db = Movie(
        movieId=new_id,
        title=movie.title,
        genres=movie.genres
    )
    try:
        db.add(new_movie_db)
        db.commit()
        db.refresh(new_movie_db)
        return {"status": "success", "movieId": new_movie_db.movieId}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Id already exists or invalid data provided"
        )
    
@app.post("/movielens/api/recommendations")
def get_recommendations(req: RecommendationRequest, db: Session = Depends(get_db)):
    my_ratings = {r.movieId: r.rating for r in req.ratings}
    
    if not my_ratings:
        return {"status": "success", "recommendations": []}

    my_movies = set(my_ratings.keys())
    my_avg = sum(my_ratings.values()) / len(my_ratings)

    # 1. Identify users v with overlapping rated movies
    movie_ids_tuple = tuple(my_movies)
    if len(movie_ids_tuple) == 1:
        movie_ids_tuple = f"({movie_ids_tuple[0]})"
    
    query = f"""
        SELECT userId, movieId, rating 
        FROM ratings 
        WHERE userId IN (
            SELECT DISTINCT userId FROM ratings WHERE movieId IN {movie_ids_tuple}
        )
    """
    rows = db.execute(text(query)).fetchall()

    users_data = {}
    for user_id, movie_id, rating in rows:
        if user_id not in users_data:
            users_data[user_id] = {}
        users_data[user_id][movie_id] = rating

    # 2. Compute similarity: sim(u,v) = Pearson correlation
    pearson_similarities = {}
    user_averages = {}

    for user_id, their_ratings in users_data.items():
        common_movies = my_movies.intersection(their_ratings.keys())
        
        # --- ΑΛΛΑΓΗ 1: Απαιτούμε τουλάχιστον 2 ΚΟΙΝΕΣ ταινίες για να συγκρίνουμε ---
        if len(common_movies) < 2:
            continue
        
        their_avg = sum(their_ratings.values()) / len(their_ratings)
        user_averages[user_id] = their_avg

        numerator = 0.0
        sum_sq_u = 0.0
        sum_sq_v = 0.0

        for m in common_movies:
            diff_u = my_ratings[m] - my_avg
            diff_v = their_ratings[m] - their_avg

            numerator += diff_u * diff_v
            sum_sq_u += diff_u ** 2
            sum_sq_v += diff_v ** 2

        denominator = math.sqrt(sum_sq_u) * math.sqrt(sum_sq_v)
        
        if denominator == 0:
            continue
            
        sim = numerator / denominator
        
        if sim > 0.4: 
            pearson_similarities[user_id] = sim

    # 3. Select the top-K most similar users
    K = 50
    sorted_users = sorted(pearson_similarities.items(), key=lambda x: x[1], reverse=True)
    top_k_users = dict(sorted_users[:K])

    # 4. Predict ratings for unrated movies
    movie_predictions = {}
    
    for user_id, sim in top_k_users.items():
        their_ratings = users_data[user_id]
        their_avg = user_averages[user_id]
        
        for m, rating in their_ratings.items():
            if m in my_movies:
                continue 
            
            if m not in movie_predictions:
                # --- ΑΛΛΑΓΗ 2: Κρατάμε ξανά το count για να ξέρουμε πόσοι την πρότειναν ---
                movie_predictions[m] = {"num": 0.0, "den": 0.0, "count": 0}
            
            movie_predictions[m]["num"] += sim * (rating - their_avg)
            movie_predictions[m]["den"] += abs(sim)
            movie_predictions[m]["count"] += 1

    final_recommendations = []
    for m, vals in movie_predictions.items():
        # --- ΑΛΛΑΓΗ 3: Μόνο ταινίες που είδαν τουλάχιστον 2 "παρόμοιοι" ---
        if vals["den"] > 0 and vals["count"] >= 2:
            pred_rating = my_avg + (vals["num"] / vals["den"])
            pred_rating = max(0.5, min(5.0, pred_rating))
            final_recommendations.append({
                "movieId": m, 
                "predictedRating": pred_rating,
                "count": vals["count"] # Το κρατάμε για την ταξινόμηση
            })

    # 5. Recommend the top-N movies
    N = 10
    # --- ΑΛΛΑΓΗ 4: Ισοβαθμία; Βάλε πρώτη την ταινία με τα μεγαλύτερα reviews (count) ---
    final_recommendations.sort(key=lambda x: (x["predictedRating"], x["count"]), reverse=True)
    top_n = final_recommendations[:N]

    top_n_results = []
    for rec in top_n:
        movie_info = db.execute(
            text("SELECT title, genres FROM movies WHERE movieId = :id"),
            {"id": rec["movieId"]}
        ).fetchone()
        
        if movie_info:
            top_n_results.append({
                "movieId": rec["movieId"],
                "title": movie_info[0],
                "genres": movie_info[1],
                "predictedRating": round(rec["predictedRating"], 2)
            })

    return {
        "status": "success",
        "recommendations": top_n_results
    }