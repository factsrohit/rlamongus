
import { useGameStatus } from '../hooks/useGameStatus';
function GameStatus() {
    const { crewmates, imposters, status, loading, error } = useGameStatus();
    
    return (
        <div className="info-box game-status">
            {error && <p>Unable to fetch game status.</p>}
            {!error && (
                <>
                    <p>👥 Crewmates Alive: {crewmates} &nbsp; 🦹‍♂️ Imposters Left: {imposters}</p>
                </>
            )}
        </div>
    );
}

export default GameStatus;