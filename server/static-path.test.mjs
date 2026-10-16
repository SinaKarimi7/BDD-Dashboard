import assert from "node:assert/strict";
import test from "node:test";
import { staticRel } from "./static-path.mjs";

test("allows site paths", () => {
  assert.equal(staticRel("/"), "index.html");
  assert.equal(staticRel("/assets/index-abc.js"), "assets/index-abc.js");
  assert.equal(staticRel("/projects/abc/github"), "projects/abc/github");
});

test("rejects characters outside the allowlist", () => {
  assert.equal(staticRel("/<script>"), null);
  assert.equal(staticRel("/foo bar"), null);
  assert.equal(staticRel("/foo/%2e%2e/passwd"), null);
  assert.equal(staticRel("/foo/../../etc/passwd"), null);
});
