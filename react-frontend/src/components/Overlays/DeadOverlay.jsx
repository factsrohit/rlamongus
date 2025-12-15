 function DeadOverlay({ visible }) {
  // Don't render anything if not visible
  if (!visible) return null;

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2>💀 You Are Dead 💀</h2>
        <p>You can no longer perform actions. Wait for the game to end.</p>
      </div>
    </div>
  );
}
export default DeadOverlay;