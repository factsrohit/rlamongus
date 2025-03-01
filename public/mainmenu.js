function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition, showError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    console.log(`Latitude: ${lat}, Longitude: ${lon}`);

    // Display location on the webpage
    document.getElementById("location").textContent = `Current Player Loc Lat: ${lat}, Lon: ${lon}`;

    // Fetch last known location from server
    fetch('/get-location')
        .then(response => response.json())
        .then(data => {
            if (data.latitude && data.longitude) {
                document.getElementById("loclastupdate").textContent = `Last Saved Location: \nLat ${data.latitude}, Lon ${data.longitude}`;
            } else {
                document.getElementById("loclastupdate").textContent = "No previous location found.";
            }
        })
        .catch(error => console.error("Error fetching last location:", error));

    // **Check if the location has changed before updating**
    if (localStorage.getItem("lastLat") !== lat.toString() || localStorage.getItem("lastLon") !== lon.toString()) {
        localStorage.setItem("lastLat", lat);
        localStorage.setItem("lastLon", lon);

        // Send updated location to the server
        fetch('/update-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lon })
        })
        .then(response => response.text())
        .then(data => console.log(data))
        .catch(error => console.error("Error updating location:", error));
    }
}

function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred.");
            break;
    }
}

// Update nearby players every 5 seconds
function updateNearbyPlayers() {
    fetch('/nearby-players')
        .then(response => response.json())
        .then(data => {
            document.getElementById("nearbyPlayers").textContent = `Players Nearby(${data.count}): ${data.players.join(", ")}`;
        })
        .catch(error => console.error("Error fetching nearby players:", error));
}

function clearUsers() {
    if (confirm("Are you sure you want to delete all users except the admin?")) {
        fetch('/clear-users', { method: 'POST' })
            .then(response => response.text())
            .then(data => alert(data))
            .catch(error => console.error("Error clearing users:", error));
    }
}
//setInterval(updateNearbyPlayers, 5000);
function checkRole() {
    fetch('/dashboard')
    .then(res => res.json())
    .then(data => {
        if (data.imposters > 0) {
            document.getElementById("killBtn").style.display = "block";
        }
    });
}

function kill() {
    fetch('/kill', { method: "POST" })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        startCooldown();
    })
    .catch(err => console.error(err));
}

function startCooldown() {
    let timeLeft = 30;
    const cooldown = document.getElementById("cooldown");
    const btn = document.getElementById("killBtn");

    btn.disabled = true;
    const interval = setInterval(() => {
        cooldown.textContent = `Kill available in: ${timeLeft}s`;
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(interval);
            cooldown.textContent = "";
            btn.disabled = false;
        }
    }, 1000);
}
function updateGameStatus() {
    fetch('/game-status')
        .then(response => response.json())
        .then(data => {
            document.getElementById("gameStatus").textContent = 
                `Crewmates Left: ${data.crewmates} | Imposters: ${data.imposters}`;
        })
        .catch(error => console.error("Error fetching game status:", error));
}


// Get location on page load
window.onload = () => {
    setInterval(updateGameStatus, 5000);
    setInterval(updateNearbyPlayers, 5000);
    localStorage.clear();  // Clear stored location data on refresh
    getLocation();         // Start fetching location
    checkRole();
};
