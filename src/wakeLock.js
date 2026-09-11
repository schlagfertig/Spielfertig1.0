import { useEffect } from "react";

/** Hält den Bildschirm an, solange die Ansicht offen ist (Gig + Share). */
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock = null;
    let cancelled = false;

    const request = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (lock) return;
      try {
        const l = await navigator.wakeLock.request("screen");
        if (cancelled) { try { l.release(); } catch (_) {} return; }
        lock = l;
        l.addEventListener("release", () => { lock = null; });
      } catch (_) {}
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("pointerdown", request, { passive: true });
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("pointerdown", request);
      if (lock) { try { lock.release(); } catch (_) {} }
    };
  }, [active]);
}
