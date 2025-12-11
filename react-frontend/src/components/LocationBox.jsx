import React from "react";

const LocationBox = ({ player }) => {
  return (
    <div className="location-box">
      <p>{player.name}</p>
      <p>Role: {player.role}</p>
      <p>
        Lat: {player.lat.toFixed(3)}, Lng: {player.lng.toFixed(3)}
      </p>
    </div>
  );
};

export default LocationBox;
