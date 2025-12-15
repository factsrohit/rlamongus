import { useState, useEffect } from "react";

export default function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [me, setMe] = useState(null);
  const [topScore, setTopScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // color generator from username
  const colorFor = (name) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) {
      h = (h * 31 + name.charCodeAt(i)) % 360;
    }
    return `hsl(${h}, 70%, 45%)`;
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(false);

      const [resBoard, resMe] = await Promise.all([
        fetch("/leaderboard-rankings"),
        fetch("/my-score"),
      ]);

      const boardData = await resBoard.json();
      const meData = await resMe.json();

      const username = meData?.username || null;
      setMe(username);

      // normalize board structure
      const rows =
        boardData?.leaderboard ||
        boardData?.rankings ||
        (Array.isArray(boardData) ? boardData : []);

      // compute top score
      const maxScore = rows.length
        ? Math.max(...rows.map((r) => Number(r.score || 0)))
        : 0;
      setTopScore(maxScore);

      // enhance rows with computed UI details
      const enhanced = rows.map((item, idx) => {
        const score = Number(item.score || 0);
        const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

        const rank = Number(item.rank || idx + 1);
        const icon =
          rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

        return {
          ...item,
          rank,
          icon,
          percent,
          isMe: item.username === username,
          color: colorFor(item.username),
          delay: Math.min(idx * 40, 400),
        };
      });

      setLeaderboard(enhanced);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLeaderboard();
    /*const interval = setInterval(fetchLeaderboard, updateInterval);
    return () => clearInterval(interval);*/
    return () => fetchLeaderboard();
  }, []);
  return {
    leaderboard,
    me,
    topScore,
    loading,
    error,
  };
}
