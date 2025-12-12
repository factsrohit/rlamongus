import React, { useState, useEffect } from "react";
import { useAdminControls } from "../../hooks/useAdminControls";
function EmergencyOverlay({ visible, isAdmin}) {
  const [players, setPlayers] = useState([]);
  const { endMeeting } = useAdminControls();
  // Don't do anything if not visible
  if (!visible) return null;

  useEffect(() => {
    if (visible) {
      // Fetch available players for voting
      const fetchPlayers = async () => {
        try {
          const res = await fetch("/players");
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
        body: JSON.stringify({ vote_for : playerId }),
      });
      alert("Vote cast!");
    } catch (err) {
      console.error("Failed to cast vote:", err);
    }
  };

  const handleEndMeeting = async () => {
        if (!isAdmin) return alert("❌ Only admin can end the meeting.");
        const result = await endMeeting();
        if (result.success) alert("✅ Emergency meeting ended!");
        else alert("❌ unable to end meeting");
    };

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2>🚨 Emergency Meeting 🚨</h2>
        <p>All actions are disabled until the admin ends the meeting. Meet at the Server table.</p>
        {isAdmin && (
          <button
            className="neon"
            id="endmeetbtn"
            onClick={handleEndMeeting}
            style={{ marginTop: 20, display: "block" }}
          >
            End Meeting
          </button>
        )}

        {!isAdmin && (<div id="votingSection">
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
        )}
        </div>
    </div>
  );
}

export default EmergencyOverlay;