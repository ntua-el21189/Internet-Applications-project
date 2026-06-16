from typing import List
from pydantic import BaseModel
# for data type validation and serialization in FastAPI
# it is used to define the structure of the data that is sent and received by the API endpoints

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

#-----------#
class Tag(BaseModel):
    search: str

#----------#