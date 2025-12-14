import { useState, useEffect, useCallback } from "react";

export function useTaskProgress(updateInterval = 5000) {
    const [totalTasks, settottalTasks] = useState(0);
    const [completedTasks, setcompletedTasks] = useState(0);
    const [remainingTasks, setRemainingTasks] = useState(100);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchTaskProgress = useCallback(async () => {
        try {
            setLoading(true);
            setError(false);
            const res = await fetch('/task-progress');
            const data = await res.json();
            const totalt = Number(data.totalTasks || 0);
            const Completedt = Number(data.completedTasks || 0);
            const remainingt = (100 - data.percentageCompleted).toFixed(2)
            settottalTasks(totalt);
            setcompletedTasks(Completedt);
            setRemainingTasks(remainingt);
        } catch (err) {
            console.error("Failed to fetch game status:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTaskProgress();
        const interval = setInterval(fetchTaskProgress, updateInterval);
        return () => clearInterval(interval);
    }, [fetchTaskProgress, updateInterval]);

    return { totalTasks, completedTasks, remainingTasks, error, refresh: fetchTaskProgress };
}

