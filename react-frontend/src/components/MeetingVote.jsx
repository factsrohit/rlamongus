function MeetingVote({ visible, players, onVote }) {
  if (!visible) return null;

  return (
    <div className="overlay vote-overlay">
      <div className="overlay-content">
        <h2>Vote Someone Out</h2>

        <ul className="player-vote-list">
          {players.map((p) => (
            <li key={p.id} className="vote-player">
              <button onClick={() => onVote(p.id)}>
                {p.username}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
export default MeetingVote;
