import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(new URL("../src/server.js", import.meta.url), "utf8");

test("watchdog: env var with sane default and disable knob", () => {
  assert.match(
    src,
    /OPENCLAW_GATEWAY_MEMORY_LIMIT_MB\s*\?\?\s*"1536"/,
    "default RSS limit (1536MB) should be encoded",
  );
  assert.match(
    src,
    /OPENCLAW_GATEWAY_MEMORY_CHECK_INTERVAL_MS\s*\?\?\s*"60000"/,
    "default check interval (60s) should be encoded",
  );
  assert.match(
    src,
    /GATEWAY_MEMORY_LIMIT_MB\s*<=\s*0/,
    "setting limit to 0 should disable the watchdog",
  );
});

test("watchdog: reads RSS from /proc and calls restartGateway over threshold", () => {
  const helperIdx = src.indexOf("function readProcessRssBytes(");
  assert.ok(helperIdx >= 0, "readProcessRssBytes helper missing");
  const helperWindow = src.slice(helperIdx, helperIdx + 400);
  assert.match(helperWindow, /\/proc\/\$\{pid\}\/status/);
  assert.match(helperWindow, /VmRSS/);

  const wdIdx = src.indexOf("function startGatewayMemoryWatchdog(");
  assert.ok(wdIdx >= 0, "startGatewayMemoryWatchdog missing");
  const wdWindow = src.slice(wdIdx, wdIdx + 1200);
  assert.match(wdWindow, /gatewayProc\?\.pid/, "watchdog should guard on gatewayProc.pid");
  assert.match(wdWindow, /readProcessRssBytes/);
  assert.match(wdWindow, /restartGateway\(\)/, "watchdog must reuse restartGateway()");
  assert.match(wdWindow, /GATEWAY_MEMORY_MIN_RESTART_INTERVAL_MS/, "cool-down guard must be present");
});

test("watchdog: started from server listen callback", () => {
  const listenIdx = src.indexOf("app.listen(PORT");
  assert.ok(listenIdx >= 0);
  const tail = src.slice(listenIdx);
  assert.match(tail, /startGatewayMemoryWatchdog\(\)/, "watchdog must be started after listen");
});
