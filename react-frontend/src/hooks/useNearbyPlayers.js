import { useState, useEffect } from "react";

export function useNearbyPlayers(updateInterval = 5000) {
  const [nearbyPlayers, setNearbyPlayers] = useState([]);

  const fetchNearbyPlayers = async () => {
    try {
      const res = await fetch("/nearby-players");
      const data = await res.json();
      setNearbyPlayers(data.players || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNearbyPlayers();
    const interval = setInterval(fetchNearbyPlayers, updateInterval);
    return () => clearInterval(interval);
  }, []);

  return { nearbyPlayers, refresh: fetchNearbyPlayers };
}
