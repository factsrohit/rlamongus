import { useAdminControls } from "../hooks/useAdminControls";

import { NavLink } from "react-router-dom";

function AdminControls({ setWinnerVisible}) {
    const { isLoading, startGame, startMeeting, endMeeting, convertCrewmates, clearScores, clearUsers } = useAdminControls();

    const handleStartGame = async () => {
        setWinnerVisible(false);
        const result = await startGame();
        if (result.success) alert("✅ Game restarted!");
        else alert("❌ " + result.error);
    }


    const handleStartMeeting = async () => {
        const result = await startMeeting();
        if (result.success) alert("✅ Emergency meeting started!");
        else alert("❌ " + result.error);
    };

    const handleEndMeeting = async () => {
        const result = await endMeeting();
        if (result.success) alert("✅ Emergency meeting ended!");
        else alert("❌ " + result.error);
    };

    const handleConvertCrewmates = async () => {
        const result = await convertCrewmates();
        if (result.success) alert("✅ All crewmates converted to imposters!");
        else alert("❌ " + result.error);
    };

    const handleClearScores = async () => {
        const result = await clearScores();
        if (result.success) alert("✅ All scores cleared!");
        else alert("❌ " + result.error);
    };

    const handleClearUsers = async () => {
        const result = await clearUsers();
        if (result.success) alert("✅ All users cleared!");
        else alert("❌ " + result.error);
    };


    return (
        <div id="admincontrols" className="container">
            <h2>ADMIN CONTROLS</h2>

            <button className="neon" id="startGameBtn" onClick={handleStartGame} disabled={isLoading}>ReStart Game</button>
            <button className="alert" id="emergencystart" onClick={handleStartMeeting} disabled={isLoading}>🚨 Start Emergency Meeting</button>
            <button className="alert" id="emergencyend" onClick={handleEndMeeting} disabled={isLoading}>✅ End Emergency Meeting</button>
            <button className="alert" id="convertCrewmatesBtn" onClick={handleConvertCrewmates} disabled={isLoading}>🔄 Convert Crewmates to Imposters</button>
            <button className="alert" id="scorereset" onClick={handleClearScores} disabled={isLoading}>✅ Clear Scores of All Players</button>
            <button className="alert" id="clearusers" onClick={handleClearUsers} disabled={isLoading}>⚠️ Clear All Users (Except Admin)</button>
            <button className="neon" id="taskManagementBtn">
                <NavLink to="/taskmanagement" style={{ color: 'inherit', textDecoration: 'none' }}>
                    Manage Tasks
                </NavLink>
            </button>
            <button className="neon" id="userManagementBtn">
                <NavLink to="/usermanagement" style={{ color: 'inherit', textDecoration: 'none' }}>
                    Manage Users
                </NavLink>
            </button>
        </div>
    );
}
export default AdminControls;