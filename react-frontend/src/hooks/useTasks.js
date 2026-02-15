import { useState, useEffect, useCallback } from "react";

export function useTasks(updateInterval = 5000) {
  const [tasks, setTasks] = useState([]);

  // --- Fetch tasks from server ---
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/my-tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  }, []);

  // --- Submit a task answer ---
  const submitTask = useCallback(async (taskId, answer) => {
    try {
      const res = await fetch("/submit-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, answer }),
      });
      const data = await res.json();

      // Refresh tasks if correct
      if (data.success) fetchTasks();
      return data;
    } catch (err) {
      console.error("Failed to submit task:", err);
      return { success: false, error: err.message };
    }
  }, [fetchTasks]);

  // --- Request hint for a task ---
  const requestHint = useCallback(async (taskId) => {
    try {
      const res = await fetch("/request-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Failed to request hint:", err);
      return { success: false, error: err.message };
    }
  }, []);

  // --- Auto-refresh tasks at interval ---
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await fetchTasks();
    };

    run();
    const interval = setInterval(run, updateInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchTasks, updateInterval]);


  return { tasks, refreshTasks: fetchTasks, submitTask, requestHint };
}
