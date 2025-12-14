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
import TaskProgress from "./components/TaskProgress";
import DisplayRole from "./components/DisplayRole";
import PlayerScore from "./components/PlayerScore";
// Custom Hooks
import { useRole } from "./hooks/useRole";
import { useOverlays } from "./hooks/useOverlays";
import { useAdminControls } from "./hooks/useAdminControls";
export default function Dashboard() {
  // --- State from hooks ---
  const { role, isImposter, refresh: refreshRole } = useRole();

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

          <TaskProgress />
          
          <GameStatus />

          <PlayerScore />
          
          <DisplayRole role={role}/>

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
