import test from "node:test";
import assert from "node:assert/strict";
import {
  findDuplicateKinescopeIds,
  findInvalidOrientations,
  findMissingPhotos,
  validatePortfolioRegistry,
} from "../src/lib/portfolioValidation";
import { PORTFOLIO_PROJECTS, type PortfolioProject, type VideoOrientation } from "../src/lib/portfolio.data";

const project = (overrides: Partial<PortfolioProject> & { id: string }): PortfolioProject => ({
  title: overrides.id,
  client: "Test",
  category: "Test",
  role: "Test",
  technique: [],
  videos: [],
  photos: [],
  colorPairs: [],
  ...overrides,
});

test("real portfolio registry has no duplicate Kinescope IDs across the seeded examples", () => {
  assert.deepEqual(findDuplicateKinescopeIds(PORTFOLIO_PROJECTS), []);
});

test("real portfolio registry uses only valid video orientations", () => {
  assert.deepEqual(findInvalidOrientations(PORTFOLIO_PROJECTS), []);
});

test("real portfolio registry passes full validation (photos/color pairs are still empty, nothing to check yet)", () => {
  const result = validatePortfolioRegistry(PORTFOLIO_PROJECTS, () => true);
  assert.deepEqual(result.errors, []);
});

test("catches the two known duplicate Kinescope IDs from YELYGINN-registry-proektov.md", () => {
  // Реальные конфликты из реестра: iXmVYXkXdmFiHpn6NCNoyq числится и за VK Fest,
  // и за «Горький в тени войны»; fvxndmGGHqWtuCcK5TnB4j — и за тизером СИБУРа,
  // и за «Основой». Это фикстура, воспроизводящая тот же паттерн, не сама
  // реальная регистр-запись (в PORTFOLIO_PROJECTS этих проектов сейчас нет).
  const projects = [
    project({ id: "vk-fest", videos: [{ kinescopeId: "iXmVYXkXdmFiHpn6NCNoyq", orientation: "16:9", label: "VK Fest" }] }),
    project({ id: "gorky-v-teni-voyny", videos: [{ kinescopeId: "iXmVYXkXdmFiHpn6NCNoyq", orientation: "16:9", label: "Горький в тени войны" }] }),
    project({ id: "sibur-teaser", videos: [{ kinescopeId: "fvxndmGGHqWtuCcK5TnB4j", orientation: "16:9", label: "Сибур.Женщина тизер" }] }),
    project({ id: "osnova", videos: [{ kinescopeId: "fvxndmGGHqWtuCcK5TnB4j", orientation: "16:9", label: "FORMA_V3" }] }),
  ];

  const duplicates = findDuplicateKinescopeIds(projects);
  assert.equal(duplicates.length, 2);
  assert.ok(duplicates.some((e) => e.includes("iXmVYXkXdmFiHpn6NCNoyq") && e.includes("vk-fest") && e.includes("gorky-v-teni-voyny")));
  assert.ok(duplicates.some((e) => e.includes("fvxndmGGHqWtuCcK5TnB4j") && e.includes("sibur-teaser") && e.includes("osnova")));

  const result = validatePortfolioRegistry(projects, () => true);
  assert.equal(result.errors.length, 2);
});

test("does not flag an ID that is reused within the same single project", () => {
  const projects = [
    project({ id: "one-project", videos: [
      { kinescopeId: "sameId000000000000000", orientation: "16:9", label: "A" },
      { kinescopeId: "sameId000000000000000", orientation: "9:16", label: "B" },
    ] }),
  ];
  assert.deepEqual(findDuplicateKinescopeIds(projects), []);
});

test("flags an invalid orientation value", () => {
  const projects = [
    project({ id: "bad-orientation", videos: [{ kinescopeId: "abc", orientation: "4:3" as VideoOrientation, label: "Bad" }] }),
  ];
  const issues = findInvalidOrientations(projects);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /bad-orientation/u);
  assert.match(issues[0], /4:3/u);
});

test("flags a photo referenced in the registry but missing from processed static", () => {
  const projects = [
    project({ id: "missing-photo", photos: [{ id: "korona-setup-01", alt: "Setup" }] }),
  ];
  const issues = findMissingPhotos(projects, () => false);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /missing-photo/u);
  assert.match(issues[0], /korona-setup-01/u);
});

test("flags a color-grade pair whose raw or color frame is missing from processed static", () => {
  const projects = [
    project({ id: "missing-pair", colorPairs: [{ id: "pair-1", label: "Ракурс 1", rawPhotoId: "raw-1", colorPhotoId: "color-1" }] }),
  ];
  const existsOnlyRaw = (id: string) => id === "raw-1";
  const issues = findMissingPhotos(projects, existsOnlyRaw);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /color-1/u);
});
