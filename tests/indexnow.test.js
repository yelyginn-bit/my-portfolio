import test from "node:test";
import assert from "node:assert/strict";
import { ORIGIN, ENDPOINT, KEY_LOCATION, publicUrl, documentRecord, changedUrls, deferredQueue, notifyPublished, contentHistory, sitemapWithHistory } from "../scripts/indexnow.mjs";

const key = "fixture-indexnow-public-key";
const html = (url, text, options = "") => `<html><head><title>Title</title><meta name="description" content="Description"><link rel="canonical" href="${url}">${options}</head><body><header>Header</header><main><h1>Heading</h1><p>${text}</p></main><footer>Footer</footer></body></html>`;
const snapshot = (...records) => ({ schema: 1, origin: ORIGIN, routes: records });
const url = `${ORIGIN}/photo`;
const oldHtml = html(url, "old content");
const newHtml = html(url, "new content");
const before = snapshot(documentRecord(url, oldHtml));
const after = snapshot(documentRecord(url, newHtml));

test("Only public canonical site URLs may be announced", () => {
  for (const bad of ["https://other.invalid/photo", `${ORIGIN}/account`, `${ORIGIN}/photo/private`, `${ORIGIN}/portfolio/photo`, `${ORIGIN}/api/send-form`, `${ORIGIN}/_kit`, `${ORIGIN}/g/private`, `${ORIGIN}/photo/`, `${url}?token=x`, `${url}#x`, `${ORIGIN}/%61ccount`]) assert.throws(() => publicUrl(bad));
  assert.equal(publicUrl(`${ORIGIN}/gallery-terms`), `${ORIGIN}/gallery-terms`);
  assert.throws(() => documentRecord(url, html(url, "new", '<meta name="robots" content="noindex">')));
  assert.throws(() => documentRecord(url, html(`${ORIGIN}/`, "new")));
});

test("Changes distinguish visible content from asset churn and record additions/deletions", () => {
  assert.deepEqual(changedUrls(before, before), []);
  assert.equal(documentRecord(url, oldHtml.replace("Header", "Other header").replace("</head>", '<script src="/assets/newhash.js"></script></head>')).hash, before.routes[0].hash);
  assert.deepEqual(changedUrls(before, after), [url]);
  assert.deepEqual(changedUrls(snapshot(), after), [url]);
  assert.deepEqual(changedUrls(before, snapshot()), [url]);
  assert.throws(() => changedUrls(before, snapshot(after.routes[0], after.routes[0])));
});

test("Deferred owner-approved indexing stores the exact URL delta and snapshots without submitting", () => {
  const queue = deferredQueue(before, after, "/state/before.json", "/state/after.json", "2026-10-04T12:00:00.000Z");
  assert.deepEqual(queue.urlList, [url]);
  assert.equal(queue.beforeSnapshot, "before.json");
  assert.equal(queue.afterSnapshot, "after.json");
  assert.equal(queue.submitted, false);
});

test("Dry-run and unchanged release perform no network requests", async () => {
  const fetcher = () => { throw new Error("Unexpected network"); };
  assert.equal((await notifyPublished({ before, after, key, fetcher })).mode, "dry-run");
  assert.equal((await notifyPublished({ before, after: before, key, submit: true, fetcher })).mode, "unchanged");
});

test("Wrong published key or unpublished candidate prevent every IndexNow POST", async () => {
  for (const wrongKey of [true, false]) {
    let posts = 0;
    const fetcher = async (requested, options) => {
      if (options.method === "POST") { posts++; throw new Error("Must not submit"); }
      if (requested === KEY_LOCATION) return new Response(wrongKey ? "different-key" : key);
      return new Response(oldHtml);
    };
    await assert.rejects(notifyPublished({ before, after, key, submit: true, fetcher }), wrongKey ? /key verification/ : /differs from candidate/);
    assert.equal(posts, 0);
  }
});

test("Verified published changes are sent once; 202 is pending validation, never indexed", async () => {
  let posted;
  const fetcher = async (requested, options) => {
    if (requested === KEY_LOCATION) return new Response(key);
    if (requested === url) return new Response(newHtml);
    assert.equal(requested, ENDPOINT);
    assert.equal(options.method, "POST");
    assert.equal(posted, undefined);
    posted = JSON.parse(options.body);
    return new Response("", { status: 202 });
  };
  const result = await notifyPublished({ before, after, key, submit: true, fetcher });
  assert.equal(result.received, true); assert.equal(result.keyValidation, "pending"); assert.equal(result.indexed, "not verified");
  assert.deepEqual(posted.urlList, [url]); assert.equal(posted.keyLocation, KEY_LOCATION);
});

test("Deletion needs an actual 404/410; rejected submissions remain failures", async () => {
  for (const status of [200, 404]) {
    let posts = 0;
    const fetcher = async (requested, options) => {
      if (requested === KEY_LOCATION) return new Response(key);
      if (options.method === "POST") { posts++; return new Response("", { status: 403 }); }
      return new Response("", { status });
    };
    const promise = notifyPublished({ before, after: snapshot(), key, submit: true, fetcher });
    if (status === 200) { await assert.rejects(promise, /Deletion not published/); assert.equal(posts, 0); }
    else { const result = await promise; assert.equal(result.received, false); assert.equal(result.httpStatus, 403); assert.equal(posts, 1); }
  }
});

test("Layout changes preserve fingerprints while visible content/media/links change them", () => {
  const baseline = html(url, '<a href="/about" class="old">About</a><img src="/portrait.jpg" alt="Portrait"/>');
  const hash = documentRecord(url, baseline).hash;
  assert.equal(documentRecord(url, baseline.replace('class="old"', 'class="new" style="padding:32px"')).hash, hash);
  for (const next of [baseline.replace('/about', '/contact'), baseline.replace('/portrait.jpg', '/another.jpg'), baseline.replace('Portrait', 'Work')]) assert.notEqual(documentRecord(url, next).hash, hash);
});

test("Content dates survive unchanged releases, change only affected URLs and omit unknown history", () => {
  const other = documentRecord(`${ORIGIN}/about`, html(`${ORIGIN}/about`, "About"));
  const initial = snapshot(before.routes[0], other);
  const current = snapshot(after.routes[0], other);
  const first = contentHistory(initial, current, null, "2026-10-03");
  assert.deepEqual(first.routes.map((record) => record.lastmod), ["2026-10-03", null]);
  assert.deepEqual(contentHistory(current, current, first, "2026-10-04"), first);
  const added = documentRecord(`${ORIGIN}/contact`, html(`${ORIGIN}/contact`, "Contact"));
  const next = contentHistory(current, snapshot(other, added), first, "2026-10-04");
  assert.deepEqual(next.routes.map((record) => record.lastmod), [null, "2026-10-04"]);
  assert.throws(() => contentHistory(initial, current, null, "2026-02-30"));
  assert.throws(() => contentHistory(initial, current, { ...first, routes: [{...first.routes[0], lastmod:"2099-01-01"}] }, "2026-10-04"));
  const xml = `<urlset><url><loc>${url}</loc><lastmod>2000-01-01</lastmod></url><url><loc>${other.url}</loc><lastmod>2000-01-01</lastmod></url></urlset>`;
  const output = sitemapWithHistory(xml, first);
  assert.equal((output.match(/<lastmod>/g) || []).length, 1);
  assert.match(output, /2026-10-03/);
  assert.doesNotMatch(output, /2000-01-01/);
  assert.throws(() => sitemapWithHistory('<urlset></urlset>', first));
});
