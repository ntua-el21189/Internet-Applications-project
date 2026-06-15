## Movie Finder 

This website helps users find movies they would like by comparing their rated movies to users with similar interests.

## Τεχνολογίες που χρησιμοποιήθηκαν
* **Backend:** Python 3, FastAPI, Uvicorn, Pydantic,SQLAlchemy
* **Βάση Δεδομένων:** SQLite3
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fetch API)
* **Dataset:** [MovieLens Dataset](https://grouplens.org/datasets/movielens/)

## Οδηγίες εκτέλεσης

1. Create a virtual environment

From your project folder:

python -m venv venv

2. Activate it

Mac/Linux:
source venv/bin/activate
Windows:
venv\Scripts\activate

3. Install all dependencies

With the environment active in the backend directory:

pip install -r requirements.txt

4. To initialize and populate the database move the backend directory and run the following command:

python -m init_db

5. Move to the frontend directory and use the following command to start a simple http server

python -m http.server

6. Move to the backend directory and use the following command to start the backend server 

uvicorn main:app --port 3000

To view the APIs documentation head to the following link : http://localhost:3000/docs#/

To make sure both servers function properly go to localhost:8000 where the static page for the front end should be and 
to localhost:3000 where the server connectivity is tested by the get api that returns all supported movie genres.  