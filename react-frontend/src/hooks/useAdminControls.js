import { useState, useCallback } from "react";

export function useAdminControls() {
  const [isLoading, setIsLoading] = useState(false);

  // --- Start game ---
  const startGame = useCallback(async () => {
    const numTasks = parseInt(prompt("Enter number of tasks per player:", "4"));

  if (!numTasks || numTasks <= 0) {
    alert("Please enter a valid number greater than 0.");
    return;
  }
    setIsLoading(true);
    try {
      const res = await fetch("/start-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numTasks })
    });
      const data = await res.json();
      return { success: data.success, message: data.message || "Game restarted" };
    } catch (err) {
      console.error("Failed to start game:", err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Start emergency meeting ---
  const startMeeting = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/startmeet", { method: "POST" });
      const data = await res.json();
      return { success: data.success, message: data.message || "Emergency meeting started" };
    } catch (err) {
      console.error("Failed to start meeting:", err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- End emergency meeting ---
  const endMeeting = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/endmeet", { method: "POST" });
      const data = await res.json();
      return { success: data.success, message: data.message || "Emergency meeting ended" };
    } catch (err) {
      console.error("Failed to end meeting:", err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Convert crewmates to imposters ---
  const convertCrewmates = useCallback(async () => {
    setIsLoading(true);
    const count = prompt("Enter the number of crewmates to convert to imposters:");
    try {
      const res = await fetch('/convert-crewmates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: parseInt(count) })
    });
      const data = await res.json();
      return { success: data.success, message: data.message || "Crewmates converted" };
    } catch (err) {
      console.error("Failed to convert crewmates:", err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Clear scores ---
  const clearScores = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/clear-scores", { method: "POST" });
      const data = await res.json();
      return { success: data.success, message: data.message || "Scores cleared" };
    } catch (err) {
      console.error("Failed to clear scores:", err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Clear all users (except admin) ---
  const clearUsers = useCallback(async () => {
    if (!window.confirm("⚠️ Are you sure? This will delete all users except admin.")) {
      return { success: false, message: "Cancelled" };
    }
    
    setIsLoading(true);
    try {
      const res = await fetch("/clear-users", { method: "POST" });
      const data = await res.json();
      return { success: data.success, message: data.message || "All users cleared" };
    } catch (err) {
      console.error("Failed to clear users:", err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Add task ---
  const addTask = useCallback(async (question, answer, hint) => {
    setIsLoading(true);
    try {
      const res = await fetch("/add-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, hint }),
      });
      const data = await res.json();
      return { success: data.success, message: data.message || "Task added" };
    } catch (err) {
      console.error("Failed to add task:", err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    startGame,
    startMeeting,
    endMeeting,
    convertCrewmates,
    clearScores,
    clearUsers,
    addTask,
  };
}
