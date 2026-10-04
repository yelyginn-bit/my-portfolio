import test from "node:test";
import assert from "node:assert/strict";
import { resolveCalculatorType, resolveServiceContext, serviceContactHref } from "../src/lib/service-context";

test("service CTA context is limited to known services and public source pages", () => {
  assert.deepEqual(resolveServiceContext("?service=reels&from=%2Freels"), {
    service: "Reels",
    sourcePath: "/reels",
  });
  assert.deepEqual(resolveServiceContext("", "/cvetokorrekciya"), {
    service: "Цветокоррекция",
    sourcePath: "/cvetokorrekciya",
  });
  assert.deepEqual(resolveServiceContext("?service=unknown&from=https%3A%2F%2Fevil.invalid"), {
    service: "Съёмка // оператор",
    sourcePath: "/",
  });
  assert.deepEqual(resolveServiceContext("?service=event&from=%2Fnot-a-public-service"), {
    service: "Событие",
    sourcePath: "/",
  });
  assert.equal(serviceContactHref("photo", "/photo"), "/?service=photo&from=%2Fphoto#contact");
  assert.deepEqual(resolveServiceContext("?service=content-day&from=%2Fcontent-day"), {
    service: "Контент-съёмка // фото и видео",
    sourcePath: "/content-day",
  });
  assert.deepEqual(resolveServiceContext("?service=photo-reportage&from=%2Fphoto", "/calculator"), {
    service: "Фотосъёмка",
    sourcePath: "/photo",
  });
});

test("calculator only preselects service types represented by its active estimate", () => {
  const available = ["Контент для бизнеса", "Цветокоррекция"];
  assert.equal(resolveCalculatorType("content-day", available), "Контент для бизнеса");
  assert.equal(resolveCalculatorType("color", available), "Цветокоррекция");
  assert.equal(resolveCalculatorType("livestream", available), undefined);
  assert.equal(resolveCalculatorType("not-a-service", available), undefined);
});
