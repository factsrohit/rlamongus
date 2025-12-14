import { useState, useEffect, useCallback } from "react";

export function useOverlays(updateInterval = 5000) {
  const [winnerVisible, setWinnerVisible] = useState(false);
  const [deadVisible, setDeadVisible] = useState(false);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState("");

  // --- Check game status and overlays ---
  const checkStatus = useCallback(async () => {
    try {
      // Check if player is dead
      const deadRes = await fetch("/check-dead");
      const deadData = await deadRes.json();
      setDeadVisible(deadData.isDead || false);

      // Check if game has winner
      const winRes = await fetch("/check-win");
      const winData = await winRes.json();
      if (winData.winner) {
        setWinnerVisible(true);
        // Format the winner message properly
        const formattedWinner = winData.winner === 'IMPOSTERS' ? 'Imposters' : 'Crewmates';
        setWinnerMessage(`🎉 ${formattedWinner} Win!`);
        
        // Fetch leaderboard
      } else {
        setWinnerVisible(false);
      }

      // Check if emergency meeting is active
      const meetRes = await fetch("/statusmeet");
      const meetData = await meetRes.json();
      setEmergencyVisible(meetData.emergency_meeting || false);
    } catch (err) {
      console.error("Failed to check status:", err);
    }
  }, []);

  // --- Auto-check status at interval ---
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, updateInterval);
    return () => clearInterval(interval);
  }, [checkStatus, updateInterval]);

  return {
    winnerVisible,
    setWinnerVisible,
    deadVisible,
    setDeadVisible,
    emergencyVisible,
    setEmergencyVisible,
    winnerMessage,
    checkStatus,
  };
}
