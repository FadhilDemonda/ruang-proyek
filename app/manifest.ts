import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruang Proyek",
    short_name: "Ruang Proyek",
    description:
      "Ruang kerja pribadi untuk menyusun proyek, memantau tugas Kanban, mencatat permintaan, dan menyimpan catatan.",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f0",
    theme_color: "#5b6a43",
    lang: "id",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
