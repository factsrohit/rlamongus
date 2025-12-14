import { useState, useCallback, useEffect, useRef } from "react";

export function useImposterActions() {
  const [cooldown, setCooldown] = useState(0);
  const [remoteRemaining, setRemoteRemaining] = useState(0);
  const [backstabRemaining, setBackstabRemaining] = useState(0);
  const [impostersList, setImpostersList] = useState("Loading...");
  const remoteTimerRef = useRef(null);
  const backstabTimerRef = useRef(null);
  const killTimerRef = useRef(null);
  const [durations, setDurations] = useState({ kill: 30, remote: 300, backstab: 180 });

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

  const fetchCooldownConfig = useCallback(async () => {
    try {
      const res = await fetch("/cooldowns");
      const data = await res.json();
      setDurations({
        kill: Number(data.kill || 30),
        remote: Number(data.remote || 300),
        backstab: Number(data.backstab || 180),
      });

      const now = Date.now();
      const rEnd = Number(localStorage.getItem("remoteCooldownEnd") || 0);
      const bEnd = Number(localStorage.getItem("backstabCooldownEnd") || 0);
      const kEnd = Number(localStorage.getItem("killCooldownEnd") || 0);
      if (rEnd > now) setRemoteRemaining(Math.ceil((rEnd - now) / 1000));
      if (bEnd > now) setBackstabRemaining(Math.ceil((bEnd - now) / 1000));
      if (kEnd > now) setCooldown(Math.ceil((kEnd - now) / 1000));
    } catch (err) {
      console.error("Failed to fetch cooldown config:", err);
    }
  }, []);

  // --- Kill action ---
  const kill = useCallback(async () => {
    if (cooldown > 0) {
      alert(`Kill on cooldown: ${cooldown}s remaining`);
      return { success: false, cooldown };
    }
    try {
      const res = await fetch("/kill", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Kill successful!");
        // start frontend cooldown for kill (use configured duration)
        const duration = durations.kill;
        const end = Date.now() + duration * 1000;
        localStorage.setItem("killCooldownEnd", String(end));
        setCooldown(duration);
        clearInterval(killTimerRef.current);
        killTimerRef.current = setInterval(() => {
          setCooldown((c) => {
            if (c <= 1) {
              clearInterval(killTimerRef.current);
              localStorage.removeItem("killCooldownEnd");
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      } else {
        alert(data.message || "Kill failed!");
      }
      return data;
    } catch (err) {
      console.error("Failed to kill:", err);
      return { success: false, error: err.message };
    }
  }, [cooldown, durations]);

  // --- Remote kill (snipe) ---
  const killRemote = useCallback(async () => {
    const target = prompt("Enter the name of the player to snipe:");
    if (!target) {
      alert("Snipe cancelled. No target specified.");
      return { success: false, error: "No target specified" };
    }
    if (remoteRemaining > 0) {
      alert(`Remote kill on cooldown: ${remoteRemaining}s remaining`);
      return { success: false, cooldown: remoteRemaining };
    }
    try {
      const res = await fetch("/kill-remote", { method: "POST" , headers: {
            "Content-Type": "application/json"
        }, body: JSON.stringify({ target })});
      const data = await res.json();
      if(data.success){
        alert(data.message || "Kill successful!");
        // start frontend cooldown for remote
        const duration = durations.remote;
        const end = Date.now() + duration * 1000;
        localStorage.setItem("remoteCooldownEnd", String(end));
        setRemoteRemaining(duration);
        clearInterval(remoteTimerRef.current);
        remoteTimerRef.current = setInterval(() => {
          setRemoteRemaining((r) => {
            if (r <= 1) {
              clearInterval(remoteTimerRef.current);
              localStorage.removeItem("remoteCooldownEnd");
              return 0;
            }
            return r - 1;
          });
        }, 1000);
      }else{
        alert(data.message || "Kill failed!");
      }
      return data;
    } catch (err) {
      console.error("Failed to remote kill:", err);
      return { success: false, error: err.message };
    }
  }, [remoteRemaining, durations]);
  // --- Backstab action ---
  // --- Remote kill (snipe) ---
  const backstab = useCallback(async () => {
    const target = prompt("Enter the name of the player to backstab:");
    if (!target) {
      alert("Backstab cancelled. No target specified.");
      return { success: false, error: "No target specified" };
    }
    if (backstabRemaining > 0) {
      alert(`Backstab on cooldown: ${backstabRemaining}s remaining`);
      return { success: false, cooldown: backstabRemaining };
    }
    try {
      const res = await fetch("/kill-remote", { method: "POST" , headers: {
            "Content-Type": "application/json"
        }, body: JSON.stringify({ target })});
      const data = await res.json();
      if(data.success){
        alert(data.message || "Kill successful!");
        // start frontend cooldown for backstab
        const duration = durations.backstab;
        const end = Date.now() + duration * 1000;
        localStorage.setItem("backstabCooldownEnd", String(end));
        setBackstabRemaining(duration);
        clearInterval(backstabTimerRef.current);
        backstabTimerRef.current = setInterval(() => {
          setBackstabRemaining((b) => {
            if (b <= 1) {
              clearInterval(backstabTimerRef.current);
              localStorage.removeItem("backstabCooldownEnd");
              return 0;
            }
            return b - 1;
          });
        }, 1000);
      }else{
        alert(data.message || "Kill failed!");
      }
      return data;
    } catch (err) {
      console.error("Failed to remote kill:", err);
      return { success: false, error: err.message };
    }
  }, [backstabRemaining, durations]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await fetchCooldownConfig();

      if (!mounted) return;

      // initialize persisted timers
      const now = Date.now();
      const rEnd = Number(localStorage.getItem("remoteCooldownEnd") || 0);
      const bEnd = Number(localStorage.getItem("backstabCooldownEnd") || 0);
      const kEnd = Number(localStorage.getItem("killCooldownEnd") || 0);
      if (rEnd > now) {
        setRemoteRemaining(Math.ceil((rEnd - now) / 1000));
        remoteTimerRef.current = setInterval(() => {
          setRemoteRemaining((r) => {
            if (r <= 1) {
              clearInterval(remoteTimerRef.current);
              localStorage.removeItem("remoteCooldownEnd");
              return 0;
            }
            return r - 1;
          });
        }, 1000);
      }
      if (bEnd > now) {
        setBackstabRemaining(Math.ceil((bEnd - now) / 1000));
        backstabTimerRef.current = setInterval(() => {
          setBackstabRemaining((b) => {
            if (b <= 1) {
              clearInterval(backstabTimerRef.current);
              localStorage.removeItem("backstabCooldownEnd");
              return 0;
            }
            return b - 1;
          });
        }, 1000);
      }
      if (kEnd > now) {
        setCooldown(Math.ceil((kEnd - now) / 1000));
        killTimerRef.current = setInterval(() => {
          setCooldown((c) => {
            if (c <= 1) {
              clearInterval(killTimerRef.current);
              localStorage.removeItem("killCooldownEnd");
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      }
    };

    void init();

    return () => {
      mounted = false;
      clearInterval(remoteTimerRef.current);
      clearInterval(backstabTimerRef.current);
      clearInterval(killTimerRef.current);
    };
  }, [fetchCooldownConfig]);

  return {
    cooldown,
    remoteRemaining,
    backstabRemaining,
    impostersList,
    kill,
    killRemote,
    backstab,
    fetchImposters,
  };
}
