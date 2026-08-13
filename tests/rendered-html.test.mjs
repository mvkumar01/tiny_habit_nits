import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("the worker server-renders the TinyShift document", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>TinyShift — Healthy habits that fit your life<\/title>/i);
  assert.match(html, /<meta name="description" content="Map your real day/i);
  assert.match(html, /property="og:image" content="[^"]*\/og\.png"/i);
  assert.match(html, /rel="stylesheet"/, "the stylesheet must be linked or the page renders unstyled");
});

test("no starter scaffolding is left in the shipped page", async () => {
  const html = await (await render()).text();
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /sites-skeleton|react-loading-skeleton/i);
  assert.doesNotMatch(html, /Starter Project|Your site is taking shape/i);
});

test("the shell renders before hydration so the page is never blank", async () => {
  const html = await (await render()).text();
  const body = html.slice(html.indexOf("<body>"));
  assert.match(body, /Making space for a tiny shift/, "the pre-hydration shell should be visible");
  assert.match(body, /<script type="module"/, "the client bundle must be requested");
});
