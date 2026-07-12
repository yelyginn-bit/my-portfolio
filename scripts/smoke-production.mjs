const origin = (process.env.SMOKE_ORIGIN || "https://yelyginn.ru").replace(/\/$/u, "");
const routes = [
  "/",
  "/portfolio",
  "/reels",
  "/event-video",
  "/photo",
  "/ceny",
  "/calculator",
  "/privacy-policy",
  "/api/send-form",
];

let failed = false;
for (const route of routes) {
  try {
    const response = await fetch(`${origin}${route}`, { redirect: "manual" });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? "OK" : "FAIL"} ${response.status} ${route}`);
    failed ||= !ok;
  } catch (error) {
    failed = true;
    console.error(`FAIL ${route}: ${error instanceof Error ? error.message : "network error"}`);
  }
}

if (failed) process.exitCode = 1;
