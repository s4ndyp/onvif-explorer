import { discover } from "@2bad/onvif-discovery";
import { Device } from "@2bad/onvif";
import { defaultProfile, media, type Profile } from "@2bad/onvif-media";
import type {
  ConnectedDeviceDto,
  DiscoveredDeviceDto,
  MediaProfileDto,
} from "./types.js";
import { randomUUID } from "node:crypto";

const discoveryCache = new Map<string, DiscoveredDeviceDto>();

function profileToDto(p: Profile): MediaProfileDto {
  return {
    token: p.token,
    name: p.name,
    encoding: p.videoEncoder?.encoding,
    resolution: p.videoEncoder?.resolution,
    service: p.service,
  };
}

function deviceKey(endpoint: string, address: string): string {
  return `${endpoint}|${address}`;
}

export async function runDiscovery(options?: {
  timeoutMs?: number;
}): Promise<DiscoveredDeviceDto[]> {
  const found: DiscoveredDeviceDto[] = [];
  const seen = new Set<string>();

  for await (const device of discover({
    timeoutMs: options?.timeoutMs ?? 5000,
  })) {
    const key = deviceKey(device.endpoint, device.address);
    if (seen.has(key)) continue;
    seen.add(key);

    const dto: DiscoveredDeviceDto = {
      id: randomUUID(),
      endpoint: device.endpoint,
      address: device.address,
      name: device.name,
      hardware: device.hardware,
      profiles: device.profiles,
      xaddrs: device.xaddrs.map((u) => u.href),
    };
    discoveryCache.set(dto.id, dto);
    found.push(dto);
  }

  return found;
}

export function getCachedDevice(id: string): DiscoveredDeviceDto | undefined {
  return discoveryCache.get(id);
}

export function registerManualDevice(input: {
  address: string;
  xaddr: string;
  name?: string;
}): DiscoveredDeviceDto {
  const dto: DiscoveredDeviceDto = {
    id: randomUUID(),
    endpoint: input.xaddr,
    address: input.address,
    name: input.name ?? input.address,
    hardware: undefined,
    profiles: [],
    xaddrs: [input.xaddr],
  };
  discoveryCache.set(dto.id, dto);
  return dto;
}

function buildXaddr(hostname: string, port?: number): string {
  const p = port && port !== 80 ? `:${port}` : "";
  return `http://${hostname}${p}/onvif/device_service`;
}

export async function connectDevice(input: {
  deviceId?: string;
  xaddr?: string;
  hostname?: string;
  port?: number;
  username: string;
  password: string;
}): Promise<{ device: Device; dto: ConnectedDeviceDto; xaddr: string }> {
  let xaddr = input.xaddr;
  let address = input.hostname;

  if (input.deviceId) {
    const cached = discoveryCache.get(input.deviceId);
    if (!cached) {
      throw new Error("Apparaat niet gevonden; voer opnieuw een netwerkscan uit.");
    }
    xaddr = cached.xaddrs[0] ?? cached.endpoint;
    address = cached.address;
  }

  if (!xaddr && input.hostname) {
    xaddr = buildXaddr(input.hostname, input.port);
    address = input.hostname;
  }

  if (!xaddr) {
    throw new Error("Geen ONVIF-adres (xaddr) of hostname opgegeven.");
  }

  const serviceUrl = new URL(xaddr);
  const device = await Device.connect({
    url: serviceUrl,
    username: input.username,
    password: input.password,
  });

  const camera = device.use(media);
  const profiles = await camera.media.getProfiles();
  const info = await device.getDeviceInformation();

  const sessionId = randomUUID();
  const dto: ConnectedDeviceDto = {
    sessionId,
    manufacturer: info.manufacturer,
    model: info.model,
    firmwareVersion: info.firmwareVersion,
    serialNumber: info.serialNumber,
    profiles: profiles.map(profileToDto),
  };

  activeSessions.set(sessionId, {
    device,
    username: input.username,
    password: input.password,
    address: address ?? serviceUrl.hostname,
    xaddr,
  });

  return { device, dto, xaddr };
}

type ActiveSession = {
  device: Device;
  username: string;
  password: string;
  address: string;
  xaddr: string;
};

const activeSessions = new Map<string, ActiveSession>();

export function getSession(sessionId: string): ActiveSession | undefined {
  return activeSessions.get(sessionId);
}

export async function getStreamUriForProfile(
  sessionId: string,
  profileToken: string,
): Promise<{ uri: URL; profile: Profile }> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error("Sessie verlopen; opnieuw verbinden met de camera.");
  }

  const camera = session.device.use(media);
  const profiles = await camera.media.getProfiles();
  const profile =
    profiles.find((p) => p.token === profileToken) ??
    defaultProfile(profiles);
  if (!profile) {
    throw new Error("Geen media-profiel beschikbaar op deze camera.");
  }

  const stream = await camera.media.getStreamUri(profile);
  return { uri: stream.uri, profile };
}

export function closeSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.device.close();
    activeSessions.delete(sessionId);
  }
}
