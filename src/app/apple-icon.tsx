import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iPhone のホーム画面用アイコン（PNG が必要）
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f97316" }}>
        <svg width="140" height="140" viewBox="0 0 512 512">
          <g transform="rotate(-12 256 256)">
            <circle cx="256" cy="256" r="150" fill="none" stroke="#fff" strokeWidth="28" />
            <path d="M186 262l50 50 96-104" fill="none" stroke="#fff" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
