import Link from "next/link";
import Logo from "./Logo";
import Preview from "./profil/Preview";
import ThemeToggle from "./ThemeToggle";
import "./profil/profil.css";

export const metadata = {
  title: "Ruang Proyek · Ruang kerja pribadi",
  description:
    "Ruang kerja pribadi untuk menyusun proyek, memantau tugas Kanban, mencatat permintaan, dan menyimpan catatan.",
};

const workflowSteps = [
  {
    step: "01",
    title: "Tangkap permintaan",
    body: "Catat setiap request yang masuk lengkap dengan peminta dan tenggatnya agar tidak ada pekerjaan yang tercecer di chat.",
  },
  {
    step: "02",
    title: "Ubah jadi proyek & catatan",
    body: "Konversi permintaan menjadi proyek terstruktur, simpan tautan penting, dan tulis catatan kerja di tempat yang sama.",
  },
  {
    step: "03",
    title: "Eksekusi lewat Kanban",
    body: "Pecah proyek menjadi daftar to-do dan geser progresnya dari Belum Mulai ke Dikerjakan sampai Selesai.",
  },
];

export default function HomePage() {
  return (
    <div className="rp-profile" id="atas">
      <a href="#konten" className="rp-skip visually-hidden">
        Langsung ke konten
      </a>

      <header className="rp-header">
        <div className="rp-nav rp-wrap">
          <a href="#atas" className="rp-brand">
            <Logo />
            <span>Ruang Proyek</span>
          </a>
          <nav aria-label="Navigasi beranda">
            <a href="#fitur" className="rp-nav-link">
              Fitur
            </a>
            <a href="#alurnya" className="rp-nav-link">
              Alur kerja
            </a>
            <a href="#tentang" className="rp-nav-link">
              Tentang
            </a>
            <ThemeToggle />
            <Link className="rp-outline" href="/login">
              Masuk <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="rp-hero rp-wrap">
          <div className="rp-intro">
            <p className="rp-eyebrow">
              <span className="rp-eyebrow-dot" aria-hidden="true" />
              Ruang kerja pribadi · Lokal &amp; tersinkron
            </p>
            <h1 id="konten" tabIndex={-1}>
              Semua proyek.
              <br />
              <em>Satu ruang.</em>
            </h1>
            <p className="rp-lead">
              Susun proyek, pantau tugas Kanban, kelola permintaan masuk, dan simpan catatan di satu
              ruang kerja yang tenang.
            </p>
            <div className="rp-actions">
              <Link href="/login" className="rp-button">
                Masuk <span aria-hidden="true">↗</span>
              </Link>
              <a href="#fitur" className="rp-button-secondary">
                Lihat tampilan <span aria-hidden="true">↓</span>
              </a>
            </div>
            <ul className="rp-pillars" aria-label="Ringkasan kemampuan">
              <li>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
                </svg>
                <span>4 modul terpadu</span>
              </li>
              <li>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M9 4v16M15 4v16" />
                </svg>
                <span>Kanban &amp; catatan</span>
              </li>
              <li>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                </svg>
                <span>Tersinkron ke akun pribadi</span>
              </li>
            </ul>
          </div>

          <div className="rp-still" aria-hidden="true">
            <div className="rp-folder">
              <div className="rp-back" />
              <div className="rp-sheet rp-sheet-back" />
              <div className="rp-sheet rp-sheet-front">
                <small>CATATAN PROYEK</small>
                <i />
                <i />
                <i />
              </div>
              <div className="rp-cover">
                <div className="rp-label">
                  <Logo />
                  <strong>
                    Ruang
                    <br />
                    Proyek.
                  </strong>
                </div>
                <div className="rp-print">
                  ARSIP PROYEK <span>RP / 01</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="rp-features">
          <div className="rp-wrap">
            <Preview />
          </div>
        </section>

        <section id="alurnya" className="rp-flow rp-wrap">
          <div className="rp-section-head">
            <span className="rp-kicker">Cara kerjanya</span>
            <h2>
              Dari masuk sampai tuntas<span>.</span>
            </h2>
          </div>
          <ol className="rp-steps">
            {workflowSteps.map((item) => (
              <li key={item.step} className="rp-step-card">
                <span className="rp-step-num" aria-hidden="true">
                  {item.step}
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="tentang" className="rp-about-band">
          <div className="rp-about rp-wrap">
            <div>
              <span className="rp-kicker">Ringkas &amp; fokus</span>
              <h2>
                Tentang
                <br />
                <em>Ruang Proyek.</em>
              </h2>
            </div>
            <div className="rp-about-copy">
              <p>
                Ruang Proyek menyatukan daftar proyek, tugas Kanban, permintaan masuk, dan catatan
                kerja dalam satu tempat yang rapi—tanpa menu berlebihan yang mengganggu fokus.
              </p>
              <p>
                Masuk dengan akun pribadi untuk menyinkronkan pekerjaan di berbagai perangkat, atau
                mulai langsung lewat mode lokal saat mencoba di perangkat sendiri.
              </p>
              <div className="rp-about-cta">
                <Link className="rp-button" href="/login">
                  Masuk <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="rp-footer-band">
        <div className="rp-footer rp-wrap">
          <span className="rp-brand">
            <Logo />
            <span>Ruang Proyek</span>
          </span>
          <div className="rp-footer-links">
            <Link href="/login">Masuk</Link>
            <a href="#atas">
              Kembali ke atas <span aria-hidden="true">↑</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
