export type DiscoveredDeviceDto = {
  id: string;
  endpoint: string;
  address: string;
  name?: string;
  hardware?: string;
  profiles: string[];
  xaddrs: string[];
};

export type MediaProfileDto = {
  token: string;
  name: string;
  encoding?: string;
  resolution?: { width: number; height: number };
  service: "media" | "media2";
};

export type ConnectedDeviceDto = {
  sessionId: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  serialNumber?: string;
  profiles: MediaProfileDto[];
};

export type StreamSessionDto = {
  streamId: string;
  profileToken: string;
  profileName: string;
  go2rtcPublicBase: string;
  mseUrl: string;
  webrtcUrl: string;
  hlsUrl: string;
  snapshotUrl: string;
};
