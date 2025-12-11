import React from "react";

function WinnerOverlay({ visible, winnerMessage, leaderboard = [], isadmin ,onRestart }) {
  if (!visible) return null;

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2 id="winnerMessage">{winnerMessage || "🎉 Game Over!"}</h2>
        <p>The game has ended. Please wait for the admin to restart the game.</p>
        
        <div>
          <h3>Leaderboard</h3>
          <ul id="leaderboardList">
            {leaderboard && leaderboard.length > 0 ? (
              leaderboard.map((player, index) => (
                <li key={player.username || index}>
                  {index + 1}. {player.username} - {player.score} pts
                </li>
              ))
            ) : (
              <li>Loading leaderboard...</li>
            )}
          </ul>
        </div>
        if(isadmin){
        <button 
          className="neon" 
          id="newgamebtn" 
          onClick={onRestart} 
          style={{ marginTop: 20, display: "block" }}
        >
          ReStart Game
        </button>
        }
      </div>
    </div>
  );
}

export default WinnerOverlay;