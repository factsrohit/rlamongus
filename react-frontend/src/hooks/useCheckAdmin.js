import { useState, useEffect } from "react";
 
export function useCheckAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Check if admin on mount ---
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch("/check-admin");
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch (err) {
        console.error("Failed to check admin status:", err);
      }
    };
    checkAdmin();
  }, []);

  return { isAdmin };
}