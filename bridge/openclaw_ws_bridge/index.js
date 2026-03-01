const WebSocket = require("ws");
const fetch = require("node-fetch");
require("dotenv").config();

// WebSocket URL to OpenClaw (provided by you): ws://187.77.53.162:51798
const WS_URL = process.env.OPENCLAW_WS_URL || "ws://187.77.53.162:51798";
// Optional: OpenCode/OpenCode-like API to forward tasks via REST
const OPENCODE_API_URL = process.env.OPENCODE_API_URL;
const RECONNECT_DELAY = parseInt(process.env.RECONNECT_DELAY || "5000", 10);

function connect() {
  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("[OpenClawWS] Connected to", WS_URL);
  });

  ws.on("message", async data => {
    let msg;
    try {
      msg = typeof data === "string" ? JSON.parse(data) : data;
    } catch (e) {
      console.error("[OpenClawWS] Failed to parse message", e);
      return;
    }

    // Expecting a task message format like: { type: 'task', id: 't1', task: { ... } }
    if (msg && msg.type === "task") {
      const id = msg.id;
      const task = msg.task || {};

      if (OPENCODE_API_URL) {
        try {
          const r = await fetch(`${OPENCODE_API_URL}/api/openclaw/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task, openclawTaskId: id }),
          });
          const resp = await r.json();
          // Acknowledge back to OpenClaw, optionally including a bridge/task mapping
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "ack",
                id,
                bridgeTaskId: resp.bridgeTaskId || null,
              })
            );
          }
        } catch (err) {
          console.error(
            "[OpenClawWS] Failed to forward task to OpenCode API",
            err
          );
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({ type: "ack", id, ok: false, error: String(err) })
            );
          }
        }
      } else {
        // No internal API configured; just log and ack
        console.log(
          "[OpenClawWS] Received task (no OpenCode API configured):",
          task
        );
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ack", id }));
        }
      }
    } else {
      console.log("[OpenClawWS] Ignoring message:", msg);
    }
  });

  ws.on("error", err => {
    console.error("[OpenClawWS] WebSocket error:", err);
  });

  ws.on("close", (code, reason) => {
    console.warn("[OpenClawWS] Connection closed", code, reason);
    setTimeout(connect, RECONNECT_DELAY);
  });
}

connect();
