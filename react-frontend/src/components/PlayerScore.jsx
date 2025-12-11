import React from "react";

export default function PlayerScore({ score }) {
  return (
    <div className="card">
      <h2>Score</h2>

      {score === null || score === undefined ? (
        <p>Loading...</p>
      ) : (
        <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
          🏆 {score}
        </p>
      )}
    </div>
  );
}
