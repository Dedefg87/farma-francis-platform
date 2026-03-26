
// Debug: read startup logs (added manually)
app.get("/api/debug/logs", (req, res) => {
  try {
    const logPath = "/tmp/farma-debug.log";
    if (!fs.existsSync(logPath)) {
      return res.status(404).send("Log file not found");
    }
    const data = fs.readFileSync(logPath, "utf-8");
    const lines = data.split("\n").slice(-100).join("\n");
    res.set("Content-Type", "text/plain");
    res.send(lines || "(empty)");
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
});
