import "./style.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ruang Proyek",
  description: "Ruang kerja pribadi untuk proyek dan tugas.",
};

const themeInitScript = `try{var t=localStorage.getItem("ruang-theme");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t;}}catch(e){}`;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
