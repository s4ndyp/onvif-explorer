export type DiscoveredDevice = {
  id: string;
  endpoint: string;
  address: string;
  name?: string;
  hardware?: string;
  profiles: string[];
  xaddrs: string[];
};

export type MediaProfile = {
  token: string;
  name: string;
  encoding?: string;
  resolution?: { width: number; height: number };
  service: "media" | "media2";
};

export type ConnectedDevice = {
  sessionId: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  serialNumber?: string;
  profiles: MediaProfile[];
};

export type StreamSession = {
  streamId: string;
  profileToken: string;
  profileName: string;
  go2rtcPublicBase: string;
  mseUrl: string;
  webrtcUrl: string;
  hlsUrl: string;
  snapshotUrl: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data;
}

export async function fetchConfig(): Promise<{ go2rtcPublicBase: string }> {
  return parseJson(await fetch("/api/config"));
}

export async function discoverDevices(timeoutMs = 5000): Promise<DiscoveredDevice[]> {
  const data = await parseJson<{ devices: DiscoveredDevice[] }>(
    await fetch("/api/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeoutMs }),
    }),
  );
  return data.devices;
}

export async function addManualDevice(hostname: string, port?: number): Promise<DiscoveredDevice> {
  const data = await parseJson<{ device: DiscoveredDevice }>(
    await fetch("/api/devices/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname, port }),
    }),
  );
  return data.device;
}

export async function connectDevice(input: {
  deviceId?: string;
  username: string;
  password: string;
}): Promise<ConnectedDevice> {
  const data = await parseJson<{ connected: ConnectedDevice }>(
    await fetch("/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return data.connected;
}

export async function startStream(
  sessionId: string,
  profileToken: string,
): Promise<StreamSession> {
  return parseJson(
    await fetch("/api/streams/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, profileToken }),
    }),
  );
}
