import { useEffect, useState } from "react";

export const MOTION_EVENT = "yelyginn:motion-change";

/**
 * Hero video and the marquee run unless the visitor switched them off with the
 * footer button (`yelyginn-motion = off`). The system "reduce motion" setting
 * deliberately does not stop them (owner decision, 11.10.2026); other effects
 * keep honouring it through their own `prefers-reduced-motion` CSS.
 */
export function motionIsAllowed(): boolean {
  try {
    return window.localStorage.getItem("yelyginn-motion") !== "off";
  } catch { /* Storage is unavailable: nothing was switched off. */ }
  return true;
}

export function setMotionAllowed(allowed: boolean) {
  try { window.localStorage.setItem("yelyginn-motion", allowed ? "on" : "off"); } catch { /* Apply for this page. */ }
  document.documentElement.dataset.motionPreference = allowed ? "full" : "reduce";
  window.dispatchEvent(new Event(MOTION_EVENT));
}

/** Shared by the video, marquee and footer control. Starts allowed so the server HTML already moves. */
export function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    const update = () => {
      const next = motionIsAllowed();
      document.documentElement.dataset.motionPreference = next ? "full" : "reduce";
      setAllowed(next);
    };
    update();
    window.addEventListener(MOTION_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(MOTION_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return allowed;
}
