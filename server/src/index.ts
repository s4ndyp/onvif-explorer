import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeSession,
  connectDevice,
  getSession,
  getStreamUriForProfile,
  registerManualDevice,
  runDiscovery,
} from "./onvif-service.js";
import {
  buildViewerUrls,
  embedCredentialsInRtsp,
  getGo2rtcPublicBase,
  registerRtspStream,
  removeStream,
} from "./go2rtc.js";
import { randomUUID } from "node:crypto";
import type { StreamSessionDto } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 8080);
const publicDir = path.join(__dirname, "..", "public");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    go2rtcPublic: getGo2rtcPublicBase(),
  });
});

app.get("/api/config", (_req, res) => {
  res.json({
    go2rtcPublicBase: getGo2rtcPublicBase(),
  });
});

app.post("/api/discover", async (req, res) => {
  try {
    const timeoutMs = Number(req.body?.timeoutMs ?? 5000);
    const devices = await runDiscovery({ timeoutMs });
    res.json({ devices });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : "Netwerkscan mislukt. Controleer host-netwerk (multicast UDP 3702).",
    });
  }
});

app.post("/api/devices/manual", (req, res) => {
  try {
    const hostname = String(req.body?.hostname ?? "").trim();
    const port = req.body?.port ? Number(req.body.port) : undefined;
    if (!hostname) {
      res.status(400).json({ error: "hostname is verplicht" });
      return;
    }
    const p = port && port !== 80 ? `:${port}` : "";
    const xaddr = `http://${hostname}${p}/onvif/device_service`;
    const device = registerManualDevice({
      address: hostname,
      xaddr,
      name: req.body?.name,
    });
    res.json({ device });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Handmatig toevoegen mislukt",
    });
  }
});

app.post("/api/connect", async (req, res) => {
  try {
    const { deviceId, xaddr, hostname, port, username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: "Gebruikersnaam en wachtwoord zijn verplicht" });
      return;
    }
    const result = await connectDevice({
      deviceId,
      xaddr,
      hostname,
      port: port ? Number(port) : undefined,
      username: String(username),
      password: String(password),
    });
    res.json({
      connected: result.dto,
      xaddr: result.xaddr,
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      error:
        err instanceof Error
          ? err.message
          : "Verbinden met camera mislukt",
    });
  }
});

app.post("/api/streams/start", async (req, res) => {
  try {
    const sessionId = String(req.body?.sessionId ?? "");
    const profileToken = String(req.body?.profileToken ?? "");
    if (!sessionId || !profileToken) {
      res.status(400).json({ error: "sessionId en profileToken zijn verplicht" });
      return;
    }

    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Sessie niet gevonden" });
      return;
    }

    const { uri, profile } = await getStreamUriForProfile(
      sessionId,
      profileToken,
    );
    const rtspWithAuth = embedCredentialsInRtsp(
      uri,
      session.username,
      session.password,
    );
    const streamId = `cam_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await registerRtspStream(streamId, rtspWithAuth);

    const urls = buildViewerUrls(streamId);
    const payload: StreamSessionDto = {
      streamId,
      profileToken: profile.token,
      profileName: profile.name,
      go2rtcPublicBase: getGo2rtcPublicBase(),
      ...urls,
    };
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(502).json({
      error:
        err instanceof Error ? err.message : "Stream starten mislukt",
    });
  }
});

app.delete("/api/streams/:streamId", async (req, res) => {
  try {
    await removeStream(req.params.streamId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Stream stoppen mislukt",
    });
  }
});

app.delete("/api/sessions/:sessionId", (req, res) => {
  closeSession(req.params.sessionId);
  res.json({ ok: true });
});

app.use(express.static(publicDir));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  res.sendFile(path.join(publicDir, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(port, "0.0.0.0", () => {
  if (
    port !== 8080 &&
    process.env.HOST_NETWORK !== "true" &&
    process.env.HOST_NETWORK !== "1"
  ) {
    console.warn(
      `ONVIF Explorer luistert op poort ${port}. In Docker hoort dit 8080 te zijn; gebruik APP_PORT voor de externe poort.`,
    );
  }
  console.log(`ONVIF Explorer luistert op http://0.0.0.0:${port}`);
});
