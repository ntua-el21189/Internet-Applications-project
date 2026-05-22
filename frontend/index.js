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
        return `
            <tr>
                <td>${m.title}</td>
                <td>${m.genres}</td>
                <td style="text-align: center; vertical-align: middle;">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                        <input type="range" class="star-rating" min="0" max="5" step="0.5" id="r${m.movieId}" value="0" style="--val: 0;"
                            onmousemove="this.style.setProperty('--hover-val', Math.ceil(((event.clientX - this.getBoundingClientRect().left) / this.offsetWidth) * 10) / 2)"
                            onmouseleave="this.style.setProperty('--hover-val', this.value)"
                            oninput="this.style.setProperty('--val', this.value); this.style.setProperty('--hover-val', this.value);"
                            onchange="rateMovie(${m.movieId}, false, null); showSavedMessage(this);">
                        <span class="save-msg" style="color: #cdc56f; font-size: 0.85em; opacity: 0; transition: opacity 0.3s; position: absolute; bottom: -20px;">Saved!</span>
                    </div>
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    Average Rating: <strong>${m.avg_rating.toFixed(2)}</strong> <br>
                    <button onclick="viewRatings(${m.movieId}, this)" title="View more ratings" style="background: none; border: none; color:rgb(250, 245, 194); font-size: 1.1em; cursor: pointer; padding: 0; margin-top: 8px;">
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
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
    const title = row.cells[0].innerText.trim();

    const existingIndex = userRatings.findIndex(r => r.movieId === movieId);
    
    if (existingIndex !== -1) {
        userRatings[existingIndex].rating = ratingValue;
    } else {
        userRatings.push({movieId: movieId, title: title, rating: ratingValue });
    }
    sessionStorage.setItem("userRatings", JSON.stringify(userRatings));
    getRatedMovies();

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
            <td style="text-align: center; vertical-align: middle;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                    <input type="range" class="star-rating" min="0" max="5" step="0.5" id="u${r.movieId}" value="${r.rating}" style="--val: ${r.rating};"
                        onmousemove="this.style.setProperty('--hover-val', Math.ceil(((event.clientX - this.getBoundingClientRect().left) / this.offsetWidth) * 10) / 2)"
                        onmouseleave="this.style.setProperty('--hover-val', this.value)"
                        oninput="this.style.setProperty('--val', this.value); this.style.setProperty('--hover-val', this.value);"
                        onchange="rateMovie(${r.movieId}, true, null); showSavedMessage(this);">
                    <span class="save-msg" style="color: #cdc56f; font-size: 0.85em; opacity: 0; transition: opacity 0.3s; position: absolute; bottom: -20px;">Updated!</span>
                </div>
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
        msg.innerHTML = `${data.detail || "Something went wrong"}`;
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
            buttonElement.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
        } else {
            drawerDiv.classList.add("open"); // Ανοίγει ομαλά
            buttonElement.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
        }
        return;
    }

    buttonElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const res = await fetch(`${API}/ratings/${movieId}`);
        const data = await res.json();

        buttonElement.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';

        if (!data.ratings || data.ratings.length === 0) {
            alert("No ratings found for this movie.");
            buttonElement.innerText = "Ratings";
            return;
        }

        const drawerBgColor = " rgba(38, 1, 1, 0.63)"; 

        const drawerRow = document.createElement("tr");
        drawerRow.className = "ratings-drawer";
        
        // Φτιάχνουμε την HTML "καθαρή" χωρίς inline χρώματα, 
        // για να πάρει αυτόματα το design του εξωτερικού πίνακα!
        let html = `
            <td colspan="4" style="background-color: rgba(0, 0, 0, 0.3); padding: 0; border: none;">
                <div class="drawer-content">
                    <h4 style="margin-top: 15px; margin-bottom: 15px; color:#fff9dd;">User Ratings for this Movie</h4>
                    <div style="max-height: 160px; overflow-y: auto; margin-bottom: 20px; border-radius: 15px;">
                        <table style="margin: 0;">
                            <thead style="position: sticky; top: 0; z-index: 2;">
                                <tr>
                                    <th>User ID</th>
                                    <th>Rating</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        data.ratings.forEach(r => {
            html += `
                <tr>
                    <td style="text-align: center; padding: 5px;">User ${r.userId}</td>
                    <td style="text-align: center; padding: 5px; font-weight: bold; color: #fff9dd;">
                        ${r.rating} / 5
                    </td>
                </tr>`;
        });

        html += `</tbody></table></div></div></td>`;
        drawerRow.innerHTML = html;
        // Βάζουμε τη γραμμή στο DOM
        currentRow.parentNode.insertBefore(drawerRow, currentRow.nextSibling);

        //Ζητάμε από τον browser να διαβάσει το ύψος πριν του βάλουμε την κλάση "open", 
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
    const originalHTML = btn.innerHTML; // Κρατάμε το εικονίδιο + κείμενο
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Finding...';
    btn.disabled = true; 
    
    try {
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
        const tbody = document.querySelector("#recommendationsTable tbody");
        
        if (!data.recommendations || data.recommendations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">We need more data. Try rating a few more movies!</td></tr>`;
        } else {
            tbody.innerHTML = data.recommendations.map(m => `
                <tr>
                    <td>${m.title}</td>
                    <td>${m.genres}</td>
                    <td style="text-align: center; font-weight: bold; font-size: 1.1em; color: #fff9dd;">
                        ${m.predictedRating.toFixed(2)} / 5
                    </td>
                </tr>
            `).join("");
        }

        // Εμφανίζουμε το Pop-up!
        document.getElementById("recommendationsOverlay").style.display = "flex";

    } catch (error) {
        console.error("Σφάλμα στα Recommendations:", error);
        alert("Something went wrong in the backend. Check the console.");
    } finally {
        btn.innerHTML = originalHTML; // Επαναφορά κουμπιού
        btn.disabled = false;
    }
}

// Συνάρτηση για να κλείνει το Pop-up
function closeRecommendations() {
    document.getElementById("recommendationsOverlay").style.display = "none";
}

function showSavedMessage(inputElement) {
    // Βρίσκει το <span> "Saved!" που είναι ακριβώς δίπλα/κάτω από τα αστέρια
    const msgSpan = inputElement.nextElementSibling;
    if (msgSpan && msgSpan.classList.contains("save-msg")) {
        msgSpan.style.opacity = "1"; // Το εμφανίζει
        
        // Το εξαφανίζει ξανά μετά από 1.5 δευτερόλεπτο
        setTimeout(() => {
            msgSpan.style.opacity = "0";
        }, 1500);
    }
}
