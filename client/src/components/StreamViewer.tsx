type Props = {
  go2rtcBase: string;
  streamId: string;
  profileName: string;
};

export function StreamViewer({ go2rtcBase, streamId, profileName }: Props) {
  const src = encodeURIComponent(streamId);
  const iframeSrc = `${go2rtcBase.replace(/\/$/, "")}/stream.html?src=${src}&mode=mse,webrtc,hls`;

  return (
    <div>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <strong>{profileName}</strong>
        <span className="status">Stream via go2rtc · {streamId}</span>
      </div>
      <div className="viewer-wrap">
        <iframe
          title={`Live stream ${profileName}`}
          src={iframeSrc}
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
}
