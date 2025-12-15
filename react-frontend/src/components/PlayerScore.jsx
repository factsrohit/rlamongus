import { useScore } from "../hooks/useScore";

export default function PlayerScore() {
  const { score } = useScore();
  return (
    <>
      {score === null || score === undefined ? (
        <p>Loading...</p>
      ) : (
        <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
          Your Current Score 🏆 {score}
        </p>
      )}
    </>
  );
}
