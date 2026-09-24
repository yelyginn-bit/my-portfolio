import test from "node:test";
import assert from "node:assert/strict";
import {
  findDuplicateKinescopeIds,
  findInvalidOrientations,
  validatePortfolioRegistry,
} from "../src/lib/portfolioValidation";
import { projects, workAssets } from "../src/portfolio/v3PortfolioData";

test("live portfolio registry has no duplicate Kinescope IDs across projects", () => {
  assert.deepEqual(findDuplicateKinescopeIds(projects), []);
});

test("live portfolio registry uses only valid video orientations", () => {
  assert.deepEqual(findInvalidOrientations(workAssets), []);
});

test("live portfolio registry passes full validation", () => {
  const result = validatePortfolioRegistry(projects, workAssets);
  assert.deepEqual(result.errors, []);
});

test("catches the two known duplicate Kinescope IDs from YELYGINN-registry-proektov.md", () => {
  // Реальные конфликты из реестра: iXmVYXkXdmFiHpn6NCNoyq числился и за VK Fest,
  // и за «Горький в тени войны»; fvxndmGGHqWtuCcK5TnB4j — и за тизером СИБУРа,
  // и за «Основой». Это фикстура, воспроизводящая тот же паттерн, не сама
  // живая регистр-запись (в live-реестре этих дублей сейчас нет — см. PROMPT-25 §2).
  const projects = [
    { id: "vk-fest", videos: ["iXmVYXkXdmFiHpn6NCNoyq"] },
    { id: "gorky-v-teni-voyny", videos: ["iXmVYXkXdmFiHpn6NCNoyq"] },
    { id: "sibur-teaser", videos: ["fvxndmGGHqWtuCcK5TnB4j"] },
    { id: "osnova", videos: ["fvxndmGGHqWtuCcK5TnB4j"] },
  ];

  const duplicates = findDuplicateKinescopeIds(projects);
  assert.equal(duplicates.length, 2);
  assert.ok(duplicates.some((e) => e.includes("iXmVYXkXdmFiHpn6NCNoyq") && e.includes("vk-fest") && e.includes("gorky-v-teni-voyny")));
  assert.ok(duplicates.some((e) => e.includes("fvxndmGGHqWtuCcK5TnB4j") && e.includes("sibur-teaser") && e.includes("osnova")));

  const result = validatePortfolioRegistry(projects, []);
  assert.equal(result.errors.length, 2);
});

test("does not flag an ID that is reused within the same single project", () => {
  const projects = [
    { id: "one-project", videos: ["sameId000000000000000", "sameId000000000000000"] },
  ];
  assert.deepEqual(findDuplicateKinescopeIds(projects), []);
});

test("flags an invalid orientation value", () => {
  const assets = [
    { projectId: "bad-orientation", kinescopeId: "abc", orientation: "square" as never },
  ];
  const issues = findInvalidOrientations(assets);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /bad-orientation/u);
  assert.match(issues[0], /square/u);
});
