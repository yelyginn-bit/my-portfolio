import { useEffect, useState } from "react";

export const MOTION_EVENT = "yelyginn:motion-change";

export function motionIsAllowed(): boolean {
  try {
    const preference = window.localStorage.getItem("yelyginn-motion");
    if (preference === "on") return true;
    if (preference === "off") return false;
  } catch { /* Use the system preference when storage is unavailable. */ }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setMotionAllowed(allowed: boolean) {
  try { window.localStorage.setItem("yelyginn-motion", allowed ? "on" : "off"); } catch { /* Apply for this page. */ }
  document.documentElement.dataset.motionPreference = allowed ? "full" : "reduce";
  window.dispatchEvent(new Event(MOTION_EVENT));
}

/** Shared by the video, marquee and footer control; SSR starts without motion. */
export function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const next = motionIsAllowed();
      document.documentElement.dataset.motionPreference = next ? "full" : "reduce";
      setAllowed(next);
    };
    update();
    query.addEventListener("change", update);
    window.addEventListener(MOTION_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener(MOTION_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return allowed;
}
