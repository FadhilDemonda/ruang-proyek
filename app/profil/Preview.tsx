"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

type ViewItem = {
  id: string;
  name: string;
  route: string;
  file: string;
  summary: string;
  alt: string;
};

const views: ViewItem[] = [
  {
    id: "proyek",
    name: "Proyek",
    route: "ruang-proyek / proyek",
    file: "proyek",
    summary:
      "Kelompokkan semua proyek beserta status, tenggat, dan tautan hasil kerja dalam satu daftar yang mudah dipindai.",
    alt: "Tampilan daftar proyek Ruang Proyek dengan filter status, pencarian, dan kartu proyek aktif.",
  },
  {
    id: "todo",
    name: "To-do",
    route: "ruang-proyek / to-do",
    file: "tugas",
    summary:
      "Pindahkan tugas antar kolom Kanban saat pekerjaan beralih dari Belum Mulai ke Dikerjakan hingga Selesai.",
    alt: "Tampilan papan Kanban To-do Ruang Proyek dengan kolom Belum Mulai, Dikerjakan, dan Selesai.",
  },
  {
    id: "request",
    name: "Request",
    route: "ruang-proyek / request",
    file: "request",
    summary:
      "Catat permintaan yang masuk dari rekan atau tim lain, pantau statusnya, lalu konversi langsung menjadi proyek atau tugas.",
    alt: "Tampilan daftar Request Ruang Proyek dengan status permintaan masuk dan opsi konversi.",
  },
  {
    id: "notes",
    name: "Notes",
    route: "ruang-proyek / notes",
    file: "notes",
    summary:
      "Simpan catatan rapat, draf rencana, dan referensi penting berdampingan dengan proyek tanpa perlu berpindah aplikasi.",
    alt: "Tampilan halaman Notes Ruang Proyek dengan kartu catatan dan tombol tambah catatan baru.",
  },
];

export default function Preview() {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  function selectTab(index: number, moveFocus: boolean) {
    const next = (index + views.length) % views.length;
    setSelected(next);
    const button = tabRefs.current[next];
    if (button) {
      if (moveFocus) button.focus();
      button.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectTab(index + 1, true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectTab(index - 1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectTab(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      selectTab(views.length - 1, true);
    }
  }

  return (
    <div className="rp-showcase">
      <div className="rp-features-head">
        <div className="rp-features-title">
          <span className="rp-kicker">Empat modul utama</span>
          <h2>
            Isi ruang kerja<span>.</span>
          </h2>
        </div>
        <div className="rp-picker" role="tablist" aria-label="Pilih pratinjau modul Ruang Proyek">
          {views.map(({ id, name }, index) => {
            const isSelected = selected === index;
            return (
              <button
                key={id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                id={`${baseId}-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => selectTab(index, false)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rp-panels">
        {views.map((view, index) => {
          const isSelected = selected === index;
          return (
            <div
              key={view.id}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-${view.id}`}
              tabIndex={isSelected ? 0 : undefined}
              hidden={!isSelected}
            >
              <figure className="rp-panel-inner">
                <figcaption>{view.summary}</figcaption>
                <div className="rp-screen">
                  <div className="rp-chrome" aria-hidden="true">
                    <span className="rp-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="rp-chrome-url">{view.route}</span>
                  </div>
                  <div className="rp-screen-frame">
                    <img
                      src={`/profil/${view.file}.png`}
                      alt={view.alt}
                      width={1280}
                      height={800}
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  </div>
                </div>
              </figure>
            </div>
          );
        })}
      </div>
    </div>
  );
}
