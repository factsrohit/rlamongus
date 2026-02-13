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

        // Send to server only if changed
        const lastLat = localStorage.getItem("lastLat");
        const lastLon = localStorage.getItem("lastLon");

        if (lastLat !== latitude.toString() || lastLon !== longitude.toString()) {
          localStorage.setItem("lastLat", latitude);
          localStorage.setItem("lastLon", longitude);

          // Store timestamp of last update
          const now = new Date();
          const timeString = now.toLocaleTimeString();
          
          try {
            const res = await fetch("/update-location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ latitude, longitude }),
            });
            const data = await res.json();
            
            if(data.success){
              localStorage.setItem("lastUpdateTime", timeString);
              setLastUpdate(`✔️ Updated at ${timeString}`);
            }else{
              setLastUpdate(`❌ Failed to update at ${timeString}`);
            }

          } catch (err) {
            console.error("Failed to update location:", err);
            setLastUpdate(`❌ Failed to update at ${timeString}`);
          }
        } else {
          // Show last update time even if location hasn't changed
          const lastTime = localStorage.getItem("lastUpdateTime");
          if (lastTime) {
            setLastUpdate(`ℹ️ Last updated at ${lastTime}`);
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
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await refreshLocation();
    };
    run();
    const interval = setInterval(run, updateInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [refreshLocation, updateInterval]);

  return { location, lastUpdate, refresh : refreshLocation };
}
