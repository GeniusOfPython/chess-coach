import { describe, expect, it } from "vitest";
import { buildServiceWorker } from "./serviceWorkerBuild";

const template = [
  'const VERSION = "__BUILD_VERSION__";',
  "const FILES = [/* __PRECACHE_MANIFEST__ */];",
].join("\n");

describe("service worker build", () => {
  it("creates a deterministic manifest from current build files", () => {
    const result = buildServiceWorker({
      template,
      files: [
        { path: "assets/app.js", content: "javascript" },
        { path: "index.html", content: "html" },
        { path: "sw.js", content: "old worker" },
      ],
    });

    expect(result.precacheUrls).toEqual([
      "/assets/app.js",
      "/index.html",
    ]);
    expect(result.source).toContain('"/assets/app.js","/index.html"');
    expect(result.source).not.toContain("__BUILD_VERSION__");
    expect(result.version).toMatch(/^[a-f0-9]{12}$/);
  });

  it("changes the version when a build file changes", () => {
    const first = buildServiceWorker({
      template,
      files: [{ path: "app.js", content: "first" }],
    });
    const second = buildServiceWorker({
      template,
      files: [{ path: "app.js", content: "second" }],
    });

    expect(first.version).not.toBe(second.version);
  });

  it("rejects a template without build placeholders", () => {
    expect(() => buildServiceWorker({
      template: "self.addEventListener('fetch', () => {});",
      files: [],
    })).toThrow("Service worker не подготовлен");
  });
});
