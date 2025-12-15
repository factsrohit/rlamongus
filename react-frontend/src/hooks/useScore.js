import { useState, useEffect, useCallback } from "react";

export function useScore(updateInterval = 5000) {
  const [score, setScore] = useState(0);

  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch("/my-score");
      const data = await res.json();
      setScore(Number(data.score || 0));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await fetchScore();
    };
    run();
    const interval = setInterval(run, updateInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchScore, updateInterval]);

  return { score, refresh: fetchScore };
}
