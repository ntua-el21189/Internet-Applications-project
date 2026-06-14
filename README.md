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

4. Move to the frontend directory and use the following command to start a simple http server

python -m http.server

5. Move to the backend directory and use the following command to start the backend server 

uvicorn main:app --port 3000

To make sure both servers function properly go to localhost:8000 where the static page for the front end should be and 
to localhost:3000 where the server connectivity is tested by the get api that returns all supported movie genres.  