import type { MetadataRoute } from "next";

// Lets phones install the site as a home-screen app that opens full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KITE Timeclock",
    short_name: "KITE Time",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8ef",
    theme_color: "#c49edf",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
