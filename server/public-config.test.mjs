import assert from "node:assert/strict";
import test from "node:test";
import { publicConfigScript } from "./public-config.mjs";

test("writes public env into the browser script", () => {
  const script = publicConfigScript({
    VITE_GITHUB_CLIENT_ID: "abc",
    VITE_API_ORIGIN: "https://api.example",
  });
  assert.match(script, /"VITE_GITHUB_CLIENT_ID":"abc"/);
  assert.match(script, /"VITE_API_ORIGIN":"https:\/\/api\.example"/);
  assert.match(script, /"VITE_SUPABASE_URL":""/);
});

test("keeps a quote inside the string", () => {
  const script = publicConfigScript({
    VITE_GITHUB_CLIENT_ID: 'say "hi"',
  });
  assert.equal(
    script,
    'window.__BDD_CONFIG__={"VITE_GITHUB_CLIENT_ID":"say \\"hi\\"","VITE_API_ORIGIN":"","VITE_SUPABASE_URL":"","VITE_SUPABASE_ANON_KEY":""};\n',
  );
});
