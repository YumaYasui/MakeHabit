import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MakeHabit",
    short_name: "MakeHabit",
    description: "やったらスタンプ。続けた日が見える習慣化アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#f97316",
    lang: "ja",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
