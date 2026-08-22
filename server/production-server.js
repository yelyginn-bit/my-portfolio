import "dotenv/config";
import express from "express";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import apiHandler from "../api/[endpoint].js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const prerenderManifest = JSON.parse(readFileSync(path.join(distDir, "prerender-manifest.json"), "utf8"));
const prerenderRoutes = new Set(prerenderManifest.routes);
const app = express();
const port = Number(process.env.PORT || 3000);

const pageMap = new Map([
  ["/", "index.html"],
  ["/privacy-policy", "legal.html"],
  ["/personal-data-consent", "legal.html"],
  ["/cookie-policy", "legal.html"],
  ["/terms", "legal.html"],
  ["/payment-terms", "legal.html"],
  ["/cancellation-refund", "legal.html"],
  ["/gallery-terms", "legal.html"],
  ["/data-request", "legal.html"],
  ["/photo", "photo.html"],
  ["/portfolio", "portfolio.html"],
  ["/portfolio/reels", "portfolio-reels.html"],
  ["/portfolio/events", "portfolio-events.html"],
  ["/portfolio/concerts", "portfolio-concerts.html"],
  ["/portfolio/photo", "portfolio-photo.html"],
  ["/portfolio/editing", "portfolio-editing.html"],
  ["/project", "project.html"],
  ["/content-day", "content-day.html"],
  ["/reels", "reels.html"],
  ["/reklamnye-roliki", "reklamnye-roliki.html"],
  ["/event-video", "event-video.html"],
  ["/cvetokorrekciya", "cvetokorrekciya.html"],
  ["/video-dlya-marketpleysov", "video-dlya-marketpleysov.html"],
  ["/pryamye-translyacii", "pryamye-translyacii.html"],
  ["/ceny", "ceny.html"],
  ["/calculator", "calculator.html"],
  ["/account", "account.html"],
  ["/admin", "admin.html"],
  ["/journal", "journal.html"],
  ["/blog", "index.html"],
  ["/about", "index.html"],
  ["/contact", "index.html"],
]);

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https://kinescope.io https://*.kinescope.io; frame-src https://kinescope.io https://*.kinescope.io; connect-src 'self' https://mc.yandex.ru https://mc.yandex.com https://www.google-analytics.com https://*.supabase.co https://kinescope.io https://*.kinescope.io; font-src 'self' data:");
  const noIndexPrefix = /^\/(?:account|admin|gallery|g|journal)(?:\/|$)|^\/photo\//u;
  const noIndexPaths = new Set(["/portfolio/photo"]);
  if (noIndexPrefix.test(req.path) || noIndexPaths.has(req.path)) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

app.use("/api", express.json({ limit: "1mb", strict: true }));
app.use("/api", express.urlencoded({ extended: false, limit: "256kb", parameterLimit: 50 }));

app.all("/api/:endpoint", (req, res) => {
  req.query = { ...req.query, endpoint: req.params.endpoint };
  return apiHandler(req, res);
});

app.get("/prices", (_req, res) => {
  res.redirect(301, "/ceny");
});

app.get("/privacy-policy.html", (_req, res) => {
  res.redirect(301, "/privacy-policy");
});

app.get("/cases", (_req, res) => {
  res.redirect(301, "/portfolio");
});

app.get("/portfolio/editing", (_req, res) => {
  res.redirect(301, "/portfolio/post");
});

app.get("/portfolio/metro-gorkovskaya", (_req, res) => {
  res.redirect(301, "/portfolio/metro-gorkovskaya-concerts");
});

app.get("/portfolio/sber-architecture-course", (_req, res) => {
  res.redirect(301, "/portfolio/sber-arhitektura");
});

app.use(
  express.static(distDir, {
    index: false,
    redirect: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes(`${path.sep}v3-assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith("sitemap.xml")) {
        res.setHeader("Cache-Control", "public, max-age=3600");
      } else if (filePath.endsWith("robots.txt") || filePath.endsWith("site.webmanifest")) {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  }),
);

app.get("*", (req, res) => {
  const urlPath = req.path.replace(/\/+$/u, "") || "/";
  if (prerenderRoutes.has(urlPath)) {
    const prerenderedFile = urlPath === "/"
      ? path.join(distDir, "prerender", "index.html")
      : path.join(distDir, "prerender", urlPath.slice(1), "index.html");
    return res.sendFile(prerenderedFile, (error) => {
      if (error) res.status(500).send("Prerender output is missing");
    });
  }
  let fileName = pageMap.get(urlPath);

  if (!fileName && urlPath.startsWith("/portfolio/")) fileName = "project.html";
  if (!fileName && urlPath.startsWith("/g/")) fileName = "gallery.html";
  if (!fileName && urlPath.startsWith("/journal/")) fileName = "journal.html";
  if (!fileName && urlPath.startsWith("/blog/")) {
    const slug = urlPath.slice("/blog/".length);
    fileName = `blog/${slug}.html`;
  }

  if (!fileName) fileName = "index.html";
  res.sendFile(path.join(distDir, fileName), (error) => {
    if (error) res.status(404).sendFile(path.join(distDir, "index.html"));
  });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Yelyginn production server listening on http://127.0.0.1:${port}`);
});
