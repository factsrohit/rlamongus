import { useState, useEffect, useCallback } from "react";

export function useLocation(updateInterval = 5000) {
  const [location, setLocation] = useState("📍 Waiting for location...");
  const [lastUpdate, setLastUpdate] = useState("");

  // --- Update location and send to server ---
  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation("❌ Geolocation not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation(`📍 Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
        setLastUpdate("✔️ Location updated in DB.");

        // Send to server only if changed
        const lastLat = localStorage.getItem("lastLat");
        const lastLon = localStorage.getItem("lastLon");

        if (lastLat !== latitude.toString() || lastLon !== longitude.toString()) {
          localStorage.setItem("lastLat", latitude);
          localStorage.setItem("lastLon", longitude);

          try {
            await fetch("/update-location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ latitude, longitude }),
            });
          } catch (err) {
            console.error("Failed to update location:", err);
          }
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocation("❌ Unable to get location.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, []);

  // --- Auto-refresh location at interval ---
  useEffect(() => {
    refreshLocation();
    const interval = setInterval(refreshLocation, updateInterval);
    return () => clearInterval(interval);
  }, [refreshLocation, updateInterval]);

  return { location, lastUpdate, refreshLocation };
}
