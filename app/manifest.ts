import type { MetadataRoute } from "next";

// Lets phones install the site as a home-screen app that opens full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Timeclock",
    short_name: "Timeclock",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8e7",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
