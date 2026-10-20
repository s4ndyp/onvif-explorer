const defaultInternal = "http://go2rtc:1984";

export function getGo2rtcInternalUrl(): string {
  return process.env.GO2RTC_INTERNAL_URL ?? defaultInternal;
}

export function getGo2rtcPublicBase(): string {
  const base = process.env.GO2RTC_PUBLIC_URL ?? "http://localhost:1984";
  return base.replace(/\/$/, "");
}

export async function registerRtspStream(
  streamId: string,
  rtspUrl: string,
): Promise<void> {
  const base = getGo2rtcInternalUrl();
  const params = new URLSearchParams({
    name: streamId,
    src: rtspUrl,
  });
  const res = await fetch(`${base}/api/streams?${params}`, { method: "PUT" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`go2rtc stream registratie mislukt (${res.status}): ${text}`);
  }
}

export async function removeStream(streamId: string): Promise<void> {
  const base = getGo2rtcInternalUrl();
  const params = new URLSearchParams({ src: streamId });
  await fetch(`${base}/api/streams?${params}`, { method: "DELETE" });
}

export function buildViewerUrls(streamId: string): {
  mseUrl: string;
  webrtcUrl: string;
  hlsUrl: string;
  snapshotUrl: string;
} {
  const pub = getGo2rtcPublicBase();
  const q = encodeURIComponent(streamId);
  return {
    mseUrl: `${pub}/api/stream.mp4?src=${q}`,
    webrtcUrl: `${pub}/api/ws?src=${q}`,
    hlsUrl: `${pub}/api/stream.m3u8?src=${q}`,
    snapshotUrl: `${pub}/api/frame.jpeg?src=${q}`,
  };
}

export function embedCredentialsInRtsp(
  uri: URL,
  username: string,
  password: string,
): string {
  const clone = new URL(uri.href);
  clone.username = encodeURIComponent(username);
  clone.password = encodeURIComponent(password);
  return clone.href;
}
