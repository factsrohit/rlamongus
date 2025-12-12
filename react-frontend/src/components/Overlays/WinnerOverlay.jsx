import React from "react";
import useLeaderboard from "../../hooks/useLeaderboard"; 

function WinnerOverlay({ visible, winnerMessage, isAdmin, onRestart }) {
  
  const { leaderboard, loading, error } = useLeaderboard();

  if (!visible) return null;
  if (loading) return <p>Loading leaderboard...</p>;
  if (error) return <p>Unable to load leaderboard.</p>;

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2 id="winnerMessage">{winnerMessage || "🎉 Game Over!"}</h2>
        <p>The game has ended. Please wait for the admin to restart the game.</p>

        <div>
          <h3>Leaderboard</h3>

          <ul>
            {leaderboard.map((player) => (
              <li
                key={player.username}
                className={`lb-item fade-in ${player.isMe ? "me" : ""}`}
                style={{ animationDelay: `${player.delay}ms` }}
              >
                <div className="lb-rank">{player.icon}</div>

                <div
                  className="lb-avatar"
                  style={{ background: player.color }}
                >
                  {player.username[0].toUpperCase()}
                </div>

                <div className="lb-info">
                  <div className="lb-name-row">
                    <div className="lb-name">{player.username}</div>
                    <div className="lb-score">{player.score}</div>
                  </div>

                  <div className="lb-bar-wrap">
                    <div
                      className="lb-bar"
                      style={{ width: `${player.percent}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {isAdmin && (
          <button
            className="neon"
            id="newgamebtn"
            onClick={onRestart}
            style={{ marginTop: 20, display: "block" }}
          >
            ReStart Game
          </button>
        )}
      </div>
    </div>
  );
}

export default WinnerOverlay;
