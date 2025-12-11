import React from "react";

export default function NearbyPlayersList({ nearbyPlayers }) {
  return (
    <div className="card">
      <h2>Nearby Players</h2>

      {(!nearbyPlayers || nearbyPlayers.length === 0) ? (
        <p>🕵️‍♂️ NO players currently within your range.</p>
      ) : (
        <ul className="nearby-list">
          {nearbyPlayers.map((p) => (
            <li key={p.id} className="nearby-item">
              <strong>{p.username}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
