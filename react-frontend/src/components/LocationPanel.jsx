import React from "react";

function LocationPanel({ location, lastUpdate, onRefresh }) {
  return (
    <div className="card">
      <h2>Location</h2>

      <p>
        📍 <strong>Your Location:</strong><br />
        {location
          ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
          : "Fetching location…"}
      </p>

      <p>⏳ Last DB Update:<br />
        {lastUpdate || "Location hasn't been updated in DB."}
      </p>

      <button className="neon" onClick={onRefresh}>
        Refresh Current Location
      </button>
    </div>
  );
}

export default LocationPanel;