import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addManualDevice,
  connectDevice,
  discoverDevices,
  fetchConfig,
  startStream,
  type ConnectedDevice,
  type DiscoveredDevice,
  type StreamSession,
} from "./api";
import { StreamViewer } from "./components/StreamViewer";

export default function App() {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [manualHost, setManualHost] = useState("");
  const [manualPort, setManualPort] = useState("");
  const [connected, setConnected] = useState<ConnectedDevice | null>(null);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [stream, setStream] = useState<StreamSession | null>(null);
  const [go2rtcBase, setGo2rtcBase] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchConfig()
      .then((c) => setGo2rtcBase(c.go2rtcPublicBase))
      .catch(() => setGo2rtcBase("http://localhost:1984"));
  }, []);

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedId) ?? null,
    [devices, selectedId],
  );

  const runDiscover = useCallback(async () => {
    setBusy(true);
    setStatus("Netwerkscan gestart (WS-Discovery, ~5 s)…");
    try {
      const found = await discoverDevices(5000);
      setDevices(found);
      setStatus(
        found.length
          ? `${found.length} ONVIF-apparaat/apparaten gevonden.`
          : "Geen camera's gevonden. Probeer host-netwerk of handmatig IP.",
      );
      if (found.length && !selectedId) {
        setSelectedId(found[0].id);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Scan mislukt");
    } finally {
      setBusy(false);
    }
  }, [selectedId]);

  const onManualAdd = async () => {
    const host = manualHost.trim();
    if (!host) return;
    setBusy(true);
    try {
      const port = manualPort ? Number(manualPort) : undefined;
      const device = await addManualDevice(host, port);
      setDevices((prev) => [device, ...prev.filter((d) => d.id !== device.id)]);
      setSelectedId(device.id);
      setStatus(`Handmatig toegevoegd: ${host}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Toevoegen mislukt");
    } finally {
      setBusy(false);
    }
  };

  const onConnect = async () => {
    if (!selectedDevice) {
      setStatus("Selecteer eerst een apparaat.");
      return;
    }
    if (!password) {
      setStatus("Vul het wachtwoord in.");
      return;
    }
    setBusy(true);
    setStream(null);
    try {
      const session = await connectDevice({
        deviceId: selectedDevice.id,
        username,
        password,
      });
      setConnected(session);
      const first = session.profiles[0]?.token ?? "";
      setSelectedProfile(first);
      setStatus(
        `Verbonden met ${session.manufacturer ?? ""} ${session.model ?? selectedDevice.address}`.trim(),
      );
    } catch (e) {
      setConnected(null);
      setStatus(e instanceof Error ? e.message : "Verbinden mislukt");
    } finally {
      setBusy(false);
    }
  };

  const onStartStream = async () => {
    if (!connected || !selectedProfile) return;
    setBusy(true);
    try {
      const s = await startStream(connected.sessionId, selectedProfile);
      setStream(s);
      setGo2rtcBase(s.go2rtcPublicBase);
      setStatus(`Stream gestart: ${s.profileName}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Stream starten mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>ONVIF Explorer</h1>
          <p>
            Ontdek camera&apos;s op het netwerk, verbind via ONVIF en bekijk live
            RTSP-streams in de browser.
          </p>
        </div>
        <button className="primary" onClick={runDiscover} disabled={busy}>
          Netwerk scannen
        </button>
      </header>

      <div className={`status ${status.includes("mislukt") ? "error" : ""}`}>
        {status}
      </div>

      <div className="layout" style={{ marginTop: "0.75rem" }}>
        <aside className="panel">
          <h2>Gevonden apparaten</h2>
          <ul className="device-list">
            {devices.length === 0 && (
              <li className="placeholder" style={{ padding: "1rem 0" }}>
                Nog geen apparaten. Start een scan of voeg een IP toe.
              </li>
            )}
            {devices.map((d) => (
              <li
                key={d.id}
                className={`device-item ${selectedId === d.id ? "selected" : ""}`}
                onClick={() => setSelectedId(d.id)}
              >
                <div className="title">{d.name ?? d.address}</div>
                <div className="meta">{d.address}</div>
                {d.hardware && <div className="meta">{d.hardware}</div>}
                {d.profiles.length > 0 && (
                  <div className="chip-row">
                    {d.profiles.map((p) => (
                      <span key={p} className="chip">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="manual-row">
            <input
              placeholder="Handmatig IP / hostname"
              value={manualHost}
              onChange={(e) => setManualHost(e.target.value)}
            />
            <button type="button" onClick={onManualAdd} disabled={busy}>
              +
            </button>
          </div>
          <input
            style={{ marginTop: "0.5rem" }}
            placeholder="ONVIF-poort (optioneel, default 80)"
            value={manualPort}
            onChange={(e) => setManualPort(e.target.value)}
          />
        </aside>

        <main className="panel">
          <h2>Verbinden &amp; stream</h2>
          <div className="form-grid">
            <label>
              Gebruikersnaam
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label>
              Wachtwoord
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <div className="toolbar">
              <button
                type="button"
                className="primary"
                onClick={onConnect}
                disabled={busy || !selectedDevice}
              >
                Verbinden
              </button>
              {connected && connected.profiles.length > 0 && (
                <>
                  <select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    style={{ maxWidth: "220px" }}
                  >
                    {connected.profiles.map((p) => (
                      <option key={p.token} value={p.token}>
                        {p.name}
                        {p.encoding ? ` · ${p.encoding}` : ""}
                        {p.resolution
                          ? ` ${p.resolution.width}×${p.resolution.height}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={onStartStream} disabled={busy}>
                    Stream starten
                  </button>
                </>
              )}
            </div>
          </div>

          {connected && (
            <p className="status ok" style={{ marginTop: "0.75rem" }}>
              {connected.manufacturer} {connected.model}
              {connected.firmwareVersion ? ` · FW ${connected.firmwareVersion}` : ""}
              {connected.serialNumber ? ` · SN ${connected.serialNumber}` : ""}
            </p>
          )}

          <div style={{ marginTop: "1rem" }}>
            {stream && go2rtcBase ? (
              <StreamViewer
                go2rtcBase={go2rtcBase}
                streamId={stream.streamId}
                profileName={stream.profileName}
              />
            ) : (
              <div className="viewer-wrap">
                <div className="placeholder">
                  Verbind met een camera en start een profiel-stream om live beeld te
                  zien.
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
