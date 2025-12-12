import React, { useState, useEffect } from "react";

function EmergencyOverlay({ visible, playersList = [] }) {
  const [players, setPlayers] = useState([]);

  // Don't do anything if not visible
  if (!visible) return null;

  useEffect(() => {
    if (visible) {
      // Fetch available players for voting
      const fetchPlayers = async () => {
        try {
          const res = await fetch("/all");
          const data = await res.json();
          if (data.players && Array.isArray(data.players)) {
            setPlayers(data.players);
          }
        } catch (err) {
          console.error("Failed to fetch players:", err);
        }
      };
      fetchPlayers();
    }
  }, [visible]);

  const castVote = async (playerId) => {
    try {
      await fetch("/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      alert("Vote cast!");
    } catch (err) {
      console.error("Failed to cast vote:", err);
    }
  };

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2>🚨 Emergency Meeting 🚨</h2>
        <p>All actions are disabled until the admin ends the meeting. Meet at the Server table.</p>

        <div id="votingSection">
          <h3>Vote to eject a player:</h3>
          <ul id="playerVoteList">
            {players.map((player) => (
              <li key={player.id}>
                <button onClick={() => castVote(player.id)}>{player.username}</button>
              </li>
            ))}
          </ul>
          <button onClick={() => castVote(null)}>Skip Vote</button>
        </div>
      </div>
    </div>
  );
}

export default EmergencyOverlay;