import './style.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Ruang Proyek', description: 'Ruang kerja pribadi untuk proyek dan tugas.' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="id"><body>{children}</body></html>; }
