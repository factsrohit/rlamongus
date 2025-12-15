import { useState, useEffect, useCallback } from "react";

export function useNearbyPlayers(updateInterval = 5000) {
  const [nearbyPlayers, setNearbyPlayers] = useState([]);

  const fetchNearbyPlayers = useCallback(async () => {
    try {
      const res = await fetch("/nearby-players");
      const data = await res.json();
      setNearbyPlayers(data.players || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await fetchNearbyPlayers();
    };
    run();
    const interval = setInterval(run, updateInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchNearbyPlayers, updateInterval]);

  return { nearbyPlayers, refresh: fetchNearbyPlayers };
}
