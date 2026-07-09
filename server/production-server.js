import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import apiHandler from "../api/[endpoint].js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const app = express();
const port = Number(process.env.PORT || 3000);

const pageMap = new Map([
  ["/", "index.html"],
  ["/privacy-policy", "privacy-policy.html"],
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
  ["/video-dlya-marketpleysov", "video-dlya-marketpleysov.html"],
  ["/ceny", "ceny.html"],
  ["/calculator", "calculator.html"],
  ["/account", "account.html"],
  ["/admin", "admin.html"],
  ["/cases", "cases.html"],
  ["/journal", "journal.html"],
  ["/blog", "blog/index.html"],
]);

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use("/api", express.json({ limit: "6mb" }));
app.use("/api", express.urlencoded({ extended: false, limit: "6mb" }));

app.all("/api/:endpoint", (req, res) => {
  req.query = { ...req.query, endpoint: req.params.endpoint };
  return apiHandler(req, res);
});

app.get("/prices", (_req, res) => {
  res.redirect(301, "/ceny");
});

app.use(
  express.static(distDir, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith("sitemap.xml")) {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  }),
);

app.get("*", (req, res) => {
  const urlPath = req.path.replace(/\/+$/u, "") || "/";
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
