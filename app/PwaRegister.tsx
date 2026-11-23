"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const { protocol, hostname } = window.location;
    const isSecure =
      protocol === "https:" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1";
    if (!isSecure) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Ignore registration failure when blocked by browser privacy settings.
    });
  }, []);

  return null;
}
