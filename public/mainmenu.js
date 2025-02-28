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

// Get location on page load
window.onload = () => {
    setInterval(updateNearbyPlayers, 5000);
    localStorage.clear();  // Clear stored location data on refresh
    getLocation();         // Start fetching location
};
