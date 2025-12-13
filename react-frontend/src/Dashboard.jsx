import React, { useEffect, useState } from "react";
import "./Dashboard.css";

// Components
import AdminControls from "./components/AdminControls";
import ImposterControls from "./components/ImposterControls";
import DeadOverlay from "./components/Overlays/DeadOverlay";
import WinnerOverlay from "./components/Overlays/WinnerOverlay";
import EmergencyOverlay from "./components/Overlays/EmergencyOverlay";
import TaskList from "./components/TaskList";
import GameStatus from "./components/GameStatus";
import LocationBox from "./components/LocationBox";

// Custom Hooks
import { useDashboard } from "./hooks/useDashboard";
import { useTasks } from "./hooks/useTasks";

import { useRole } from "./hooks/useRole";
import { useScore } from "./hooks/useScore";

import { useOverlays } from "./hooks/useOverlays";
import { useAdminControls } from "./hooks/useAdminControls";
export default function Dashboard() {
  // --- State from hooks ---
  const { role, isImposter, refresh: refreshRole } = useRole();
  const { score, refresh: refreshScore } = useScore();
  
  const { tasks, taskStats, refreshTasks, submitTask } = useTasks();
  const {startGame, endMeeting} = useAdminControls();
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

  // Additional state
  const [isAdmin, setIsAdmin] = useState(false);
 

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





  // --- Render overlays if active ---
  const shouldShowMainContent = (!deadVisible && !emergencyVisible && !winnerVisible) || isAdmin;

  if(winnerVisible) {
    return <WinnerOverlay
        winnerMessage={winnerMessage}
        isAdmin={isAdmin}
        onRestart={startGame}
      />
  }

  if(deadVisible && !isAdmin) {
    return <DeadOverlay visible={deadVisible} isAdmin={isAdmin} />;
  }

  if (emergencyVisible) {
    return <EmergencyOverlay visible={emergencyVisible} isAdmin={isAdmin} />;
  }

  // --- Main Dashboard Render ---
  return (
    <>
      {/* Main Content */}
      {shouldShowMainContent && (
        <div className="container">
          <h1>Welcome to Real-Life AmongUs</h1>
          
          <LocationBox />
          
          <div id="taskProgress" className="info-box">
            <h3>Task Progress</h3>
            <p>Total Tasks: {taskStats.total}</p>
            <p>Completed Tasks: {taskStats.completed}</p>
            <p>Remaining Tasks: {taskStats.remaining}</p>
          </div>

          <GameStatus />

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

      
    </>
  );
}
