import { useState, useEffect, useCallback } from "react";

export function useRole(updateInterval = 5000) {
  const [role, setRole] = useState("Loading...");
  const [isImposter, setIsImposter] = useState(false);

  const fetchRole = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await fetchRole();
    };
    run();
    const interval = setInterval(run, updateInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchRole, updateInterval]);

  return { role, isImposter, refresh: fetchRole };
}
