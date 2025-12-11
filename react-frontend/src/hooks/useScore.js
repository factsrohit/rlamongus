import { useState, useEffect } from "react";

export function useScore(updateInterval = 5000) {
  const [score, setScore] = useState(0);

  const fetchScore = async () => {
    try {
      const res = await fetch("/my-score");
      const data = await res.json();
      setScore(Number(data.score || 0));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchScore();
    const interval = setInterval(fetchScore, updateInterval);
    return () => clearInterval(interval);
  }, []);

  return { score, refresh: fetchScore };
}
