Bridge: OpenClaw WebSocket Connector

Overview

- A small bridge that connects to a OpenClaw WebSocket endpoint and forwards tasks to a local HTTP API (OpenCode-like) when configured.
- Supports automatic reconnects and simple ack back to the WS server.

How to use

- Install dependencies and run from this directory.
- Configure environment variables:
  - OPENCLAW_WS_URL: WebSocket URL of OpenClaw (e.g. ws://187.77.53.162:51798)
  - OPENCODE_API_URL: Optional. Base URL of your local OpenCode API where tasks should be posted (e.g. http://localhost:8000)
- Run: npm install; OPENCLAW_WS_URL=ws://... OPENCODE_API_URL=http://localhost:8000 node index.js

Message protocol (example)

- Incoming: { type: 'task', id: 't1', task: { /_ payload _/ } }
- Outgoing (ACK): { type: 'ack', id: 't1', bridgeTaskId: 'b-123' }
- If forwarding fails: { type: 'ack', id: 't1', ok: false, error: '...' }

Notes

- If OPENCODE_API_URL is not set, the bridge will log the task and acknowledge.
- For security, run behind TLS (use wss) in production and avoid logging secrets.

Next steps

- If you want, I can tailor this to Python (FastAPI/Flask) or Go, or adapt to your existing repo structure.
- I can also wire a simple in-repo task queue and health checks.
