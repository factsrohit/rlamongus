function VoteResults({ visible, results }) {
  if (!visible) return null;

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2>Voting Results</h2>
        <ul>
          {results.map((r, index) => (
            <li key={index}>
              {r.username}: {r.votes} votes
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
export default VoteResults;
