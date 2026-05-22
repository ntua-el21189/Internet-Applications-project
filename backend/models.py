from typing import List
from pydantic import BaseModel
# for data type validation and serialization in FastAPI

class newMovie(BaseModel):
    title: str 
    genres: str

class Rating(BaseModel):
    userId: int
    movieId: int
    rating: float

class UserRating(BaseModel):
    movieId: int
    rating: float

class RecommendationRequest(BaseModel):
    ratings: List[UserRating]