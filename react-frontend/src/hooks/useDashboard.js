import { useState, useCallback } from "react";

export function useDashboard() {
  // --- State ---
  const [role, setRole] = useState("Loading...");
  const [score, setScore] = useState("Loading...");
  const [gameStatus, setGameStatus] = useState("Loading...");
  const [nearbyPlayers, setNearbyPlayers] = useState("🕵️‍♂️ No players nearby");
  const [isImposter, setIsImposter] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ejectionText, setEjectionText] = useState("");
  const [winnerVisible, setWinnerVisible] = useState(false);
  const [deadVisible, setDeadVisible] = useState(false);
  const [emergencyVisible, setEmergencyVisible] = useState(false);

  // --- Fetch dashboard info ---
  const refreshDashboard = useCallback(async () => {
    try {
      const res = await fetch("/statboard");
      const data = await res.json();

      setRole(data.role);
      setScore(data.score);
      setGameStatus(data.gameStatus);
      setNearbyPlayers(data.nearby || "🕵️‍♂️ No players nearby");

      setIsImposter(data.role === "IMPOSTER");
      setIsAdmin(data.isAdmin);

      // Overlay visibility
      setWinnerVisible(data.winnerVisible || false);
      setDeadVisible(data.deadVisible || false);
      setEmergencyVisible(data.emergencyVisible || false);

      // Optional: ejection text from server
      setEjectionText(data.ejectionText || "");
    } catch (err) {
      console.error("Failed to load dashboard info:", err);
    }
  }, []);

  return {
    role,
    score,
    gameStatus,
    nearbyPlayers,
    isImposter,
    isAdmin,
    ejectionText,
    winnerVisible,
    deadVisible,
    emergencyVisible,
    refreshDashboard,
    setWinnerVisible,
    setDeadVisible,
    setEmergencyVisible,
    setEjectionText,
  };
}
