import { useState, useEffect, useCallback } from "react";

export function useTasks(updateInterval = 5000) {
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, remaining: 0 });

  // --- Fetch tasks from server ---
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/my-tasks");
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);

        const completed = data.tasks.filter((t) => t.completed).length;
        setTaskStats({
          total: data.tasks.length,
          completed,
          remaining: data.tasks.length - completed,
        });
      }
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

  // --- Auto-refresh tasks at interval ---
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, updateInterval);
    return () => clearInterval(interval);
  }, [fetchTasks, updateInterval]);

  return { tasks, taskStats, refreshTasks: fetchTasks, submitTask };
}
