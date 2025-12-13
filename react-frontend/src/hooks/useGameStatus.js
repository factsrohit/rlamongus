import { useState, useEffect, useCallback } from "react";

export function useGameStatus(updateInterval = 5000) {
	const [crewmates, setCrewmates] = useState(0);
	const [imposters, setImposters] = useState(0);
	const [status, setStatus] = useState("Loading game status...");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const fetchStatus = useCallback(async () => {
		try {
			setLoading(true);
			setError(false);
			const res = await fetch("/game-status");
			const data = await res.json();
			const c = Number(data.crewmates || 0);
			const i = Number(data.imposters || 0);
			setCrewmates(c);
			setImposters(i);
			if (data.status) {
				setStatus(data.status);
			} else {
				setStatus(`${c} Crewmates | ${i} Imposters`);
			}
		} catch (err) {
			console.error("Failed to fetch game status:", err);
			setError(true);
			setStatus("Unable to fetch game status.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchStatus();
		const interval = setInterval(fetchStatus, updateInterval);
		return () => clearInterval(interval);
	}, [fetchStatus, updateInterval]);

	return { crewmates, imposters, error, refresh: fetchStatus };
}

