import { useState, useCallback } from "react";

export function useImposterActions() {
  const [cooldown, setCooldown] = useState("");
  const [remoteCooldown, setRemoteCooldown] = useState("");
  const [backstabCooldown, setBackstabCooldown] = useState("");
  const [impostersList, setImpostersList] = useState("Loading...");

  // --- Fetch other imposters ---
  const fetchImposters = useCallback(async () => {
    try {
      const res = await fetch("/all-imposters");
      const data = await res.json();
      if (data.imposters && Array.isArray(data.imposters)) {
        setImpostersList(data.imposters.join(", ") || "None");
      }
    } catch (err) {
      console.error("Failed to fetch imposters:", err);
    }
  }, []);

  // --- Kill action ---
  const kill = useCallback(async () => {
    try {
      const res = await fetch("/kill", { method: "POST" });
      const data = await res.json();

      if (data.cooldown) {
        setCooldown(`Kill on cooldown: ${data.cooldown}s remaining`);
        setTimeout(() => setCooldown(""), data.cooldown * 1000);
      } else if (data.success) {
        setCooldown("Kill used! Cooldown running...");
      }
      return data;
    } catch (err) {
      console.error("Failed to kill:", err);
      return { success: false, error: err.message };
    }
  }, []);

  // --- Remote kill (snipe) ---
  const killRemote = useCallback(async () => {
    try {
      const res = await fetch("/kill-remote", { method: "POST" });
      const data = await res.json();

      if (data.cooldown) {
        setRemoteCooldown(`Remote kill on cooldown: ${data.cooldown}s remaining`);
        setTimeout(() => setRemoteCooldown(""), data.cooldown * 1000);
      } else if (data.success) {
        setRemoteCooldown("Remote kill used! Cooldown running...");
      }
      return data;
    } catch (err) {
      console.error("Failed to remote kill:", err);
      return { success: false, error: err.message };
    }
  }, []);

  // --- Backstab action ---
  const backstab = useCallback(async () => {
    try {
      const res = await fetch("/backstab", { method: "POST" });
      const data = await res.json();

      if (data.cooldown) {
        setBackstabCooldown(`Backstab on cooldown: ${data.cooldown}s remaining`);
        setTimeout(() => setBackstabCooldown(""), data.cooldown * 1000);
      } else if (data.success) {
        setBackstabCooldown("Backstab used! Cooldown running...");
      }
      return data;
    } catch (err) {
      console.error("Failed to backstab:", err);
      return { success: false, error: err.message };
    }
  }, []);

  return {
    cooldown,
    remoteCooldown,
    backstabCooldown,
    impostersList,
    kill,
    killRemote,
    backstab,
    fetchImposters,
  };
}
