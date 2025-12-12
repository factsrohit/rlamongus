import React, { useEffect, useState } from "react";
import "./Dashboard.css";

// Components
import AdminControls from "./components/AdminControls";
import ImposterControls from "./components/ImposterControls";
import DeadOverlay from "./components/Overlays/DeadOverlay";
import WinnerOverlay from "./components/Overlays/WinnerOverlay";
import EmergencyOverlay from "./components/Overlays/EmergencyOverlay";
import TaskList from "./components/TaskList";

// Custom Hooks
import { useDashboard } from "./hooks/useDashboard";
import { useTasks } from "./hooks/useTasks";
import { useLocation } from "./hooks/useLocation";
import { useRole } from "./hooks/useRole";
import { useScore } from "./hooks/useScore";
import { useNearbyPlayers } from "./hooks/useNearbyPlayers";
import { useOverlays } from "./hooks/useOverlays";
import { useAdminControls } from "./hooks/useAdminControls";
export default function Dashboard() {
  // --- State from hooks ---
  const { role, isImposter, refresh: refreshRole } = useRole();
  const { score, refresh: refreshScore } = useScore();
  const { location, lastUpdate, refreshLocation } = useLocation();
  const { nearbyPlayers, refresh: refreshNearby } = useNearbyPlayers();
  const { tasks, taskStats, refreshTasks, submitTask } = useTasks();
  const {startGame} = useAdminControls();
  const { 
    winnerVisible, 
    setWinnerVisible,
    deadVisible, 
    setDeadVisible,
    emergencyVisible, 
    setEmergencyVisible,
    winnerMessage,
    checkStatus 
  } = useOverlays();
  const [taskPromptVisible, setTaskPromptVisible] = useState(false);
  // Additional state
  const [isAdmin, setIsAdmin] = useState(false);
  const [gameStatus, setGameStatus] = useState("Loading game status...");

  // --- Check if admin on mount ---
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch("/check-admin");
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch (err) {
        console.error("Failed to check admin status:", err);
      }
    };
    checkAdmin();
  }, []);

  // --- Fetch game status ---
  useEffect(() => {
    const fetchGameStatus = async () => {
      try {
        const res = await fetch("/game-status");
        const data = await res.json();
        setGameStatus(data.status || "Loading...");
      } catch (err) {
        console.error("Failed to fetch game status:", err);
      }
    };
    fetchGameStatus();
    const interval = setInterval(fetchGameStatus, 5000);
    return () => clearInterval(interval);
  }, []);






  // --- Render overlays if active ---
  // Don't early return - render overlays on top of main content instead
  const shouldShowMainContent = (!deadVisible && !emergencyVisible && !winnerVisible) || isAdmin;

  


  // --- Main Dashboard Render ---
  return (
    <>
      {/* Main Content */}
      {shouldShowMainContent && (
        <div className="container">
          <h1>Welcome to Real-Life AmongUs</h1>
          <p>Location Should Auto Update, If It Doesn't, Try:</p>

          <button className="neon" onClick={refreshLocation}>Refresh Current Location</button>

          <div className="info-box">
            <p>{location}</p>
            <p>{lastUpdate}</p>
            <p>🕵️‍♂️ Nearby Players: {nearbyPlayers.length > 0 ? nearbyPlayers.length : "NO players currently within your range."}</p>
          </div>

          <div id="taskProgress" className="info-box">
            <h3>Task Progress</h3>
            <p>Total Tasks: {taskStats.total}</p>
            <p>Completed Tasks: {taskStats.completed}</p>
            <p>Remaining Tasks: {taskStats.remaining}</p>
          </div>

          <p>{gameStatus}</p>
          <p>🕵️‍♂️ Role: {role}</p>
          <p>🏆 Current Score: {score}</p>

          <div className="info-box">
            <h3>Your Tasks</h3>
            <TaskList tasks={tasks} onSubmitAnswer={submitTask} />
          </div>

          {isImposter && <ImposterControls />}

          <a href="/logout">
            <button className="neon">🚪 Logout</button>
          </a>

          <br />
          <br />
        </div>
      )}

      {/* Admin Controls - render always if admin */}
      {shouldShowMainContent && isAdmin && <AdminControls setWinnerVisible={setWinnerVisible} />}

      {/* Overlays - render on top */}
      {!isAdmin &&<DeadOverlay visible={deadVisible} />}
      {!isAdmin && <EmergencyOverlay visible={emergencyVisible} />}
      <WinnerOverlay
        visible={winnerVisible}
        winnerMessage={winnerMessage}
        isAdmin={isAdmin}
        onRestart={startGame}
      />
    </>
  );
}
