import { readFileSync } from "node:fs";
import { register } from "node:module";

register(new URL("./ext-loader.mjs", import.meta.url));

const store = new Map();
globalThis.localStorage = {
  getItem(k) { return store.has(k) ? store.get(k) : null; },
  setItem(k, v) { store.set(k, String(v)); },
  removeItem(k) { store.delete(k); },
};

const {
  AUTH_EXPIRED_HINT, SUPABASE_KEY, acceptLists, isExpiredJwt, jwtExpMs, sb, tokenExpiresSoon,
} = await import("../src/core.js");

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function fakeJwt(expSec) {
  return b64url({ alg: "none", typ: "JWT" }) + "." + b64url({ exp: expSec, sub: "user-1" }) + ".sig";
}
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function reset() {
  store.clear();
  sb._token = null;
  sb._local = false;
  sb._onAuthLost = null;
  globalThis.fetch = async () => jsonResponse(500, { message: "unexpected fetch" });
}

function seedUser(token, session) {
  sb._token = token;
  localStorage.setItem("sf_token", token);
  localStorage.setItem("sf_user", JSON.stringify({ id: "user-1", email: "tom@example.com" }));
  if (session) localStorage.setItem("sf_session", JSON.stringify(session));
}

const nowSec = () => Math.floor(Date.now() / 1000);

reset();

const soon = fakeJwt(nowSec() + 30);
const later = fakeJwt(nowSec() + 3600);
const past = fakeJwt(nowSec() - 120);
assert(jwtExpMs(later) > Date.now(), "jwt exp is in the future");
assert(tokenExpiresSoon(soon, null) === true, "token inside 60s is soon");
assert(tokenExpiresSoon(later, null) === false, "token an hour out is not soon");
assert(tokenExpiresSoon(past, null) === true, "expired token is soon");
assert(tokenExpiresSoon(later, { expires_at: nowSec() + 10 }) === true, "session expires_at can force a refresh");
assert(isExpiredJwt({ status: 401 }, { code: "PGRST303", message: "JWT expired" }), "PGRST303");
assert(isExpiredJwt({ status: 401 }, { code: "PGRST301", message: "JWT expired" }), "PGRST301");
assert(isExpiredJwt({ status: 401 }, { message: "JWT expired" }), "message JWT expired");
assert(isExpiredJwt({ status: 401 }, { msg: "jwt expired" }), "lowercase jwt expired");
assert(!isExpiredJwt({ status: 401 }, { code: "42501", message: "permission denied" }), "other 401 stays");
assert(!isExpiredJwt({ status: 400 }, { code: "PGRST303", message: "JWT expired" }), "non-401 stays");

const badLoad = acceptLists([[{ id: 1 }], { code: "PGRST303", message: "JWT expired" }, [], [], [], []]);
assert(badLoad.ok === false && badLoad.error === "JWT expired", "error row is not an empty list");
const goodLoad = acceptLists([[{ id: 1 }], [], [], [], [], []]);
assert(goodLoad.ok === true && goodLoad.rows[0][0].id === 1, "real lists pass");
const emptyLoad = acceptLists([[], [], [], [], [], []]);
assert(emptyLoad.ok === true, "a genuine empty account is still empty");

let cache = JSON.stringify({ bands: [{ id: 7, name: "Hardy" }] });
function applyLoad(results) {
  const got = acceptLists(results);
  if (!got.ok) return cache;
  const [_b, _s, _g, _pl, _ps] = got.rows;
  cache = JSON.stringify({ bands: _b, songs: _s, gigs: _g, pls: _pl, ps: _ps });
  return cache;
}
assert(applyLoad([{ message: "JWT expired" }, [], [], [], [], []]).includes('"id":7'), "failed load keeps cache");
assert(!applyLoad([[], [], [], [], [], []]).includes('"id":7'), "real empty load may replace cache");

reset();
localStorage.setItem("sf_local", JSON.stringify({ bands: [{ id: "L1" }] }));
localStorage.setItem("sf_cache", JSON.stringify({ bands: [{ id: 7 }] }));
localStorage.setItem("sf_theme", "dark");
localStorage.setItem("sf_token", past);
localStorage.setItem("sf_user", JSON.stringify({ id: "user-1", email: "tom@example.com" }));
const legacy = sb.bootStoredAuth();
assert(legacy.ok === false && legacy.notice === AUTH_EXPIRED_HINT, "old expired token goes to login");
assert(localStorage.getItem("sf_token") == null, "dead access token is cleared");
assert(localStorage.getItem("sf_user") == null, "dead user is cleared");
assert(localStorage.getItem("sf_session") == null, "no leftover session");
assert(localStorage.getItem("sf_local").includes("L1"), "sf_local stays");
assert(localStorage.getItem("sf_cache").includes('"id":7'), "sf_cache stays");
assert(localStorage.getItem("sf_theme") === "dark", "theme stays");

reset();
localStorage.setItem("sf_token", later);
localStorage.setItem("sf_user", JSON.stringify({ id: "user-1", email: "tom@example.com" }));
const freshLegacy = sb.bootStoredAuth();
assert(freshLegacy.ok === true && freshLegacy.user.id === "user-1", "valid old token still signs in");
assert(sb._token === later, "valid old token is used");

reset();
localStorage.setItem("sf_token", past);
localStorage.setItem("sf_user", JSON.stringify({ id: "user-1", email: "tom@example.com" }));
localStorage.setItem("sf_session", JSON.stringify({ refresh_token: "rt-old", expires_at: nowSec() - 120 }));
const canRefresh = sb.bootStoredAuth();
assert(canRefresh.ok === true, "expired access token with refresh token still boots");
assert(localStorage.getItem("sf_session").includes("rt-old"), "refresh token kept for the next call");

reset();
const hour = nowSec() + 3600;
const signed = sb.auth.persist({
  access_token: later,
  refresh_token: "rt-1",
  expires_at: hour,
  expires_in: 3600,
  user: { id: "user-1", email: "tom@example.com" },
}, "tom@example.com");
assert(signed && signed.id === "user-1", "persist returns the user");
assert(localStorage.getItem("sf_token") === later, "sf_token kept");
const session = JSON.parse(localStorage.getItem("sf_session"));
assert(session.refresh_token === "rt-1" && session.expires_at === hour, "sf_session stores refresh and expiry");

reset();
const nestedExp = nowSec() + 4000;
sb.auth.persist({
  session: {
    access_token: fakeJwt(nestedExp),
    refresh_token: "rt-nested",
    expires_in: 4000,
  },
  user: { id: "user-2", email: "a@b.c" },
}, "a@b.c");
const nested = JSON.parse(localStorage.getItem("sf_session"));
assert(nested.refresh_token === "rt-nested", "signup session shape is stored");
assert(Math.abs(nested.expires_at - (nowSec() + 4000)) < 5, "expires_in becomes expires_at");

async function run() {
  reset();
  const renewed = fakeJwt(nowSec() + 7200);
  let refreshCalls = 0;
  const seen = [];
  globalThis.fetch = async (url, opts) => {
    const href = String(url);
    seen.push(href);
    if (href.includes("grant_type=refresh_token")) {
      refreshCalls += 1;
      assert(opts.headers.apikey === SUPABASE_KEY, "refresh uses the anon key");
      assert(opts.headers.Authorization === "Bearer " + SUPABASE_KEY, "refresh bearer is the anon key");
      assert(JSON.parse(opts.body).refresh_token === "rt-1", "refresh body");
      await delay(30);
      return jsonResponse(200, {
        access_token: renewed,
        refresh_token: "rt-2",
        expires_in: 3600,
        expires_at: nowSec() + 3600,
      });
    }
    return jsonResponse(200, [{ id: 3 }]);
  };
  seedUser(past, { refresh_token: "rt-1", expires_at: nowSec() - 120 });
  const [a, b] = await Promise.all([
    sb.query("bands", { select: "*" }),
    sb.query("songs", { select: "*" }),
  ]);
  assert(refreshCalls === 1, "concurrent refreshes share one request, got " + refreshCalls);
  assert(Array.isArray(a) && a[0].id === 3 && b[0].id === 3, "both queries got rows");
  assert(seen[0].includes("grant_type=refresh_token"), "expired token refreshes before REST");
  assert(sb._token === renewed, "memory token updated");
  assert(JSON.parse(localStorage.getItem("sf_session")).refresh_token === "rt-2", "rotated refresh token stored");
  assert(JSON.parse(localStorage.getItem("sf_user")).email === "tom@example.com", "user kept when refresh has no user");

  reset();
  refreshCalls = 0;
  const headers = [];
  const fresh = fakeJwt(nowSec() + 7200);
  globalThis.fetch = async (url, opts) => {
    const href = String(url);
    if (href.includes("grant_type=refresh_token")) {
      refreshCalls += 1;
      await delay(20);
      return jsonResponse(200, { access_token: fresh, refresh_token: "rt-2", expires_at: nowSec() + 3600, expires_in: 3600 });
    }
    headers.push(opts.headers.Authorization);
    if (headers.length === 1) return jsonResponse(401, { code: "PGRST303", message: "JWT expired" });
    return jsonResponse(200, [{ id: 9, name: "Band" }]);
  };
  seedUser(later, { refresh_token: "rt-1", expires_at: nowSec() + 3600 });
  const row = await sb.insert("bands", { name: "Band" });
  assert(row && row.id === 9, "insert retries once after JWT expired, got " + JSON.stringify(row));
  assert(refreshCalls === 1, "401 refreshes once");
  assert(headers.length === 2, "request retried once, got " + headers.length);
  assert(headers[1] === "Bearer " + fresh, "retry uses the new access token");

  reset();
  refreshCalls = 0;
  let restCalls = 0;
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes("grant_type=refresh_token")) {
      refreshCalls += 1;
      await delay(25);
      return jsonResponse(200, { access_token: fresh, refresh_token: "rt-2", expires_at: nowSec() + 3600, expires_in: 3600 });
    }
    restCalls += 1;
    await delay(15);
    if (restCalls <= 2) return jsonResponse(401, { code: "PGRST301", message: "JWT expired" });
    return jsonResponse(200, []);
  };
  seedUser(later, { refresh_token: "rt-1", expires_at: nowSec() + 3600 });
  await Promise.all([sb.query("bands", { select: "*" }), sb.query("songs", { select: "*" })]);
  assert(refreshCalls === 1, "two 401s share one refresh, got " + refreshCalls);
  assert(restCalls === 4, "each 401 retries once, got " + restCalls);

  reset();
  refreshCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("grant_type=refresh_token")) {
      refreshCalls += 1;
      return jsonResponse(200, { access_token: fresh, refresh_token: "rt-2", expires_at: nowSec() + 3600 });
    }
    return jsonResponse(401, { code: "42501", message: "permission denied" });
  };
  seedUser(later, { refresh_token: "rt-1", expires_at: nowSec() + 3600 });
  const denied = await sb.query("bands", { select: "*" });
  assert(refreshCalls === 0 && denied && denied.code === "42501", "unrelated 401 is not refreshed");

  reset();
  localStorage.setItem("sf_local", JSON.stringify({ bands: [{ id: "L1" }] }));
  localStorage.setItem("sf_cache", JSON.stringify({ bands: [{ id: 7 }] }));
  localStorage.setItem("sf_theme", "dark");
  let hint = "";
  sb._onAuthLost = (msg) => { hint = msg; };
  globalThis.fetch = async () => jsonResponse(400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
  seedUser(past, { refresh_token: "rt-dead", expires_at: nowSec() - 10 });
  let threw = false;
  try { await sb.query("bands", { select: "*" }); }
  catch (e) { threw = e.message === AUTH_EXPIRED_HINT; }
  assert(threw, "failed refresh rejects the query");
  assert(hint === AUTH_EXPIRED_HINT, "login hint");
  assert(localStorage.getItem("sf_token") == null, "token cleared");
  assert(localStorage.getItem("sf_user") == null, "user cleared");
  assert(localStorage.getItem("sf_session") == null, "session cleared");
  assert(localStorage.getItem("sf_local").includes("L1"), "failed refresh keeps sf_local");
  assert(localStorage.getItem("sf_cache").includes('"id":7'), "failed refresh keeps sf_cache");
  assert(localStorage.getItem("sf_theme") === "dark", "failed refresh keeps theme");

  reset();
  seedUser(past, { refresh_token: "rt-1", expires_at: nowSec() - 10 });
  localStorage.setItem("sf_local", "{\"bands\":[1]}");
  let lost = 0;
  sb._onAuthLost = () => { lost += 1; };
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  let offline = false;
  try { await sb.auth.refresh(); }
  catch (e) { offline = e && e.name === "TypeError"; }
  assert(offline && lost === 0, "offline refresh does not sign out");
  assert(localStorage.getItem("sf_token") === past, "offline keeps the access token");
  assert(localStorage.getItem("sf_local").includes("bands"), "offline keeps sf_local");

  reset();
  seedUser(later, { refresh_token: "rt-1", expires_at: nowSec() + 3600 });
  localStorage.setItem("sf_local", "{\"ok\":true}");
  globalThis.fetch = async (url) => {
    if (String(url).includes("/logout")) return jsonResponse(204, {});
    return jsonResponse(500, {});
  };
  await sb.auth.signOut();
  assert(localStorage.getItem("sf_token") == null && localStorage.getItem("sf_session") == null, "signOut clears the session");
  assert(localStorage.getItem("sf_local").includes("ok"), "signOut keeps sf_local");

  reset();
  refreshCalls = 0;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("grant_type=refresh_token")) refreshCalls += 1;
    assert(opts.headers.Authorization === "Bearer " + SUPABASE_KEY, "anon query stays on the anon key");
    return jsonResponse(200, [{ id: 1 }]);
  };
  seedUser(past, { refresh_token: "rt-1", expires_at: nowSec() - 10 });
  const shared = await sb.query("playlists", { select: "*", anon: true });
  assert(refreshCalls === 0 && shared[0].id === 1, "shared anon reads do not refresh");

  reset();
  globalThis.document = { visibilityState: "visible" };
  refreshCalls = 0;
  const again = fakeJwt(nowSec() + 5000);
  globalThis.fetch = async (url) => {
    if (String(url).includes("grant_type=refresh_token")) {
      refreshCalls += 1;
      return jsonResponse(200, { access_token: again, refresh_token: "rt-fg", expires_at: nowSec() + 3600, expires_in: 3600 });
    }
    return jsonResponse(500, {});
  };
  seedUser(later, { refresh_token: "rt-1", expires_at: nowSec() + 3600 });
  await sb.auth.refreshOnForeground();
  assert(refreshCalls === 1 && sb._token === again, "foreground refresh runs even when the access token is still valid");

  globalThis.document = { visibilityState: "hidden" };
  await sb.auth.refreshOnForeground();
  assert(refreshCalls === 1, "hidden app does not refresh");

  reset();
  seedUser(later, null);
  globalThis.document = { visibilityState: "visible" };
  let kept = 0;
  sb._onAuthLost = () => { kept += 1; };
  await sb.auth.refreshOnForeground();
  assert(kept === 0 && sb._token === later, "a still-valid old token stays logged in on wake");

  reset();
  seedUser(past, null);
  localStorage.setItem("sf_local", "{\"bands\":[1]}");
  localStorage.setItem("sf_cache", "{\"bands\":[9]}");
  let legacyHint = "";
  sb._onAuthLost = (msg) => { legacyHint = msg; };
  globalThis.document = { visibilityState: "visible" };
  await sb.auth.refreshOnForeground();
  assert(legacyHint === AUTH_EXPIRED_HINT, "expired old token on wake opens the login");
  assert(localStorage.getItem("sf_token") == null, "expired old token is cleared on wake");
  assert(localStorage.getItem("sf_local").includes("bands"), "wake keeps sf_local");
  assert(localStorage.getItem("sf_cache").includes("9"), "wake keeps sf_cache");

  const appSrc = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const authSrc = readFileSync(new URL("../src/auth.jsx", import.meta.url), "utf8");
  const swSrc = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert(appSrc.includes("acceptLists("), "loadAll uses acceptLists");
  assert(!appSrc.includes("Array.isArray(b)?b:[]"), "loadAll no longer turns errors into empty lists");
  assert(appSrc.includes("visibilitychange"), "app refreshes when it becomes visible");
  assert(authSrc.includes("sb.auth.persist"), "login stores the session through persist");
  assert(!authSrc.includes('setItem("sf_token"'), "login does not write the access token on its own");
  assert(swSrc.includes("spielfertig-v85"), "service worker cache bumped to v85");
  assert(!swSrc.includes("spielfertig-v84"), "does not reuse the open logo PR cache name");

  if (failed) {
    console.error(failed + " assertion(s) failed");
    process.exit(1);
  }
  console.log("auth session checks passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
