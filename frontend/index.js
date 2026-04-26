const API = "http://127.0.0.1:3000/movielens/api";

let userRatings = JSON.parse(sessionStorage.getItem("userRatings")) || [];
//storage type that keeps values when the page is refreshed but clears them when the browser is closed.
searchMovies();
getRatedMovies();

async function searchMovies() {
    const keyword = document.getElementById("searchInput").value;

    const res = await fetch(`${API}/movies?search=${keyword}`);
    const data = await res.json();

    const tableBody = document.querySelector("#moviesTable tbody");
    tableBody.innerHTML = ""; // Clear previous results
    
    tableBody.innerHTML = data.movies.map(m => {
        // Ελέγχουμε αν ο χρήστης έχει ήδη βαθμολογήσει αυτή την ταινία
        const hasRated = userRatings.some(r => Number(r.movieId) === Number(m.movieId));
        
        // Αν την έχει βαθμολογήσει, φτιάχνουμε το μανιτάρι με το tooltip. Αλλιώς, το αφήνουμε κενό.
        const ratedIcon = hasRated 
            ? ` <span title="You have rated this movie" style="cursor: help; font-size: 1.2em;">&#127812;</span>` 
            : "";

        return `
            <tr>
                <td>${m.title}${ratedIcon}</td>
                <td>${m.genres}</td>
                <td>
                   <input type="number" min="0" max="5" step="0.5" id="r${m.movieId}" onkeydown="return false;" style="width: 50px; text-align: center;">
                    <button onclick="rateMovie(${m.movieId},false,this)" style="margin-left: 10px;">Rate</button>
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    Average Rating: <strong>${m.avg_rating.toFixed(2)}</strong> <br>
                    <button onclick="viewRatings(${m.movieId}, this)" style="margin-top: 8px;">View Ratings</button>
                </td>
            </tr>
        `;
    }).join("");
}

function rateMovie(movieId, isUpdate, buttonElement) {
    const inputId = isUpdate ? `u${movieId}` : `r${movieId}`;
    const ratingInput = document.getElementById(inputId);
    const ratingValue = parseFloat(ratingInput.value);

    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
        alert("Please enter a valid rating between 0 and 5.");
        return;
    }
    const row = ratingInput.closest("tr");
    const title = row.cells[0].innerText.replace('🍄', '').trim();

    const existingIndex = userRatings.findIndex(r => r.movieId === movieId);
    
    if (existingIndex !== -1) {
        userRatings[existingIndex].rating = ratingValue;
    } else {
        userRatings.push({movieId: movieId, title: title, rating: ratingValue });
    }
    sessionStorage.setItem("userRatings", JSON.stringify(userRatings));
    getRatedMovies();
    
    if (!isUpdate && row) {
        const titleCell = row.cells[0];
        if (!titleCell.innerHTML.includes('&#127812;')) {
            titleCell.innerHTML += ` <span title="You have rated this movie" style="cursor: help; font-size: 1.2em;">&#127812;</span>`;
        }
    }

    if (buttonElement) {
        const originalText = buttonElement.innerText;
        buttonElement.innerText = "Movie Rated!";
        setTimeout(() => {
            buttonElement.innerText = originalText;
        }, 500);
    }
    
    console.log("Current Session Ratings:", userRatings);
}
function getRatedMovies(){
    const tbody = document.querySelector("#myRatingsTable tbody");
    if (!tbody) return;

    if (userRatings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;">No movies rated yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = userRatings.map(r => `
        <tr>
            <td>${r.title}</td>
            <td style="text-align: center;">
                <input type="number" min="0" max="5" step="0.5" id="u${r.movieId}" value="${r.rating}" onkeydown="return false;" style="width: 50px; text-align: center;">
                <button onclick="rateMovie(${r.movieId}, true)" style="margin-left: 10px;">Update Rating</button>
            </td>
        </tr>
    `).join("");
}

async function addMovie() {
    const title = document.getElementById("titleInput").value;
    const genres = document.getElementById("genresInput").value;

    const res = await fetch(`${API}/movies`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, genres })
    });

    const msg = document.getElementById("addMovieMsg");
    const data = await res.json();
    if (res.ok) {
        msg.innerHTML = `Movie added successfully! ${data.movieId}`;
        msg.style.color = "white";
        
    } else {
        msg.innerHTML = `❌ ${data.detail || "Something went wrong"}`;
        msg.style.color = "red";
    }
}

async function viewRatings(movieId, buttonElement) {
    const currentRow = buttonElement.closest("tr");
    const nextRow = currentRow.nextElementSibling;

    if (nextRow && nextRow.classList.contains("ratings-drawer")) {
        const drawerDiv = nextRow.querySelector(".drawer-content");
        
        if (drawerDiv.classList.contains("open")) {
            drawerDiv.classList.remove("open"); // Κλείνει ομαλά
            buttonElement.innerText = "Ratings";
        } else {
            drawerDiv.classList.add("open"); // Ανοίγει ομαλά
            buttonElement.innerText = "Hide Ratings";
        }
        return;
    }

    buttonElement.innerText = "Loading...";

    try {
        const res = await fetch(`${API}/ratings/${movieId}`);
        const data = await res.json();

        buttonElement.innerText = "Hide Ratings";

        if (!data.ratings || data.ratings.length === 0) {
            alert("No ratings found for this movie.");
            buttonElement.innerText = "Ratings";
            return;
        }

        const drawerBgColor = " rgb(162, 168, 100)"; // <-- Βάλε εδώ ό,τι χρώμα θέλεις! (π.χ. #24577b, #aadbfa, ή rgb)

        const drawerRow = document.createElement("tr");
        drawerRow.className = "ratings-drawer";
        let html = `
            <td colspan="4" style="background-color: ${drawerBgColor}; padding: 0;">
                <div class="drawer-content">
                    <h4 style="margin-top:15px; color: #ffffff;">All User Ratings for this Movie</h4>
                    <div style="max-height: 150px; overflow-y: auto; border: 1px solid #e2fcff; margin-bottom: 15px;">
                        <table style="width: 100%; margin: 0; background-color:  rgb(129, 184, 94);">
                            <thead style="position: sticky; top: 0; z-index: 1;">
                                <tr>
                                    <th style="padding: 5px; background-color:rgb(185, 195, 119); border-bottom: 1px solid #e2fcff;">User ID</th>
                                    <th style="padding: 5px; background-color: rgb(185, 195, 119); border-bottom: 1px solid #e2fcff;">Rating</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        data.ratings.forEach(r => {
            html += `
                <tr>
                    <td style="text-align: center; padding: 5px;">User ${r.userId}</td>
                    <td style="text-align: center; padding: 5px; font-weight: bold;">${r.rating} / 5</td>
                </tr>`;
        });

        html += `</tbody></table></div></div></td>`;
        drawerRow.innerHTML = html;

        // Βάζουμε τη γραμμή στο DOM
        currentRow.parentNode.insertBefore(drawerRow, currentRow.nextSibling);

        // ΜΙΚΡΟ ΤΡΙΚ: Ζητάμε από τον browser να διαβάσει το ύψος πριν του βάλουμε την κλάση "open", 
        // για να προλάβει να καταλάβει ότι πρέπει να κάνει animation!
        const drawerDiv = drawerRow.querySelector(".drawer-content");
        void drawerDiv.offsetWidth; 
        drawerDiv.classList.add("open");

    } catch (error) {
        console.error("Σφάλμα:", error);
        alert("The backend didn't respond correctly. Check the console.");
        buttonElement.innerText = "Ratings";
    }
}

async function getRecommendations() {
    
    if (userRatings.length === 0) {
        alert("Please rate at least one movie first so we can learn your taste!");
        return;
    }

    
    const btn = document.querySelector("button[onclick='getRecommendations()']");
    const originalText = btn.innerText;
    btn.innerText = "Finding best movies for you... ⏳";
    btn.disabled = true; // disable the button to prevent multiple clicks while waiting for the response
    
    try {
        // prepare request body
        const payload = {
            ratings: userRatings.map(r => ({
                movieId: Number(r.movieId),
                rating: Number(r.rating)
            }))
        };

        const res = await fetch(`${API}/recommendations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        // display recommendations
        const tbody = document.querySelector("#recommendationsTable tbody");
        
        if (!data.recommendations || data.recommendations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">We need more data. Try rating a few more movies!</td></tr>`;
        } else {
            tbody.innerHTML = data.recommendations.map(m => `
                <tr>
                    <td>${m.title}</td>
                    <td>${m.genres}</td>
                    <td style="text-align: center; font-weight: bold; font-size: 1.0em; color: #010f2d;">
                        ${m.predictedRating.toFixed(2)}
                    </td>
                </tr>
            `).join("");
        }

    } catch (error) {
        console.error("Σφάλμα στα Recommendations:", error);
        alert("Something went wrong in the backend. Check the console.");
    } finally {
        // Ό,τι και να γίνει, επαναφέρουμε το κουμπί στην αρχική του μορφή
        btn.innerText = originalText;
        btn.disabled = false;
    }
}


const searchInput = document.getElementById("searchInput");

if (searchInput) {
    searchInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault(); 
            searchMovies();         
        }
    });
}