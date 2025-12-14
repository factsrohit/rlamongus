import { useState, useEffect } from "react";

export function useRole(updateInterval = 5000) {
  const [role, setRole] = useState("Loading...Role");
  const [isImposter, setIsImposter] = useState(false);

  const fetchRole = async () => {
    try {
      const res = await fetch("/getRole");
      const data = await res.json();
      if (data.success) {
        setRole(data.role);
        setIsImposter(data.role === "IMPOSTER");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRole();
    const interval = setInterval(fetchRole, updateInterval);
    return () => clearInterval(interval);
  }, []);

  return { role, isImposter, refresh: fetchRole };
}
