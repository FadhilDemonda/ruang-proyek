"use client";

import Select from "./Select";
import WorkspaceIcon from "./WorkspaceIcon";
import { SECTION_LABELS, SECTION_STATUSES } from "./workspaceConfig";
import type { Item } from "./types";

type Props = {
  requests: Item[];
  visibleRequests: Item[];
  loading: boolean;
  search: string;
  filter: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onAddRequest: () => void;
  onOpenRequest: (id: string) => void;
  onEditRequest: (item: Item) => void;
  onDeleteRequest: (item: Item) => void;
  onConvertRequest: (item: Item, target: "projects" | "todos") => void;
};

export default function RequestsView({
  requests,
  visibleRequests,
  loading,
  search,
  filter,
  onSearchChange,
  onFilterChange,
  onAddRequest,
  onOpenRequest,
  onEditRequest,
  onDeleteRequest,
  onConvertRequest,
}: Props) {
  return (
    <div className="requests-page">
      <div className="heading">
        <div>
          <h1>Daftar request</h1>
          <p>Kelola permintaan masuk dan tindak lanjutnya.</p>
        </div>
        <button className="primary todo-add-btn" onClick={onAddRequest}>
          <span className="btn-plus">+</span>{" "}
          <span>Tambah request</span>
        </button>
      </div>
      <section className="archive-panel" aria-label={SECTION_LABELS.requests}>
        <div className="archive-toolbar">
          <h2>
            Semua request <span>{requests.length}</span>
          </h2>
          <div className="filterrow">
            <label className="sr archive-search">
              <WorkspaceIcon name="search" />
              Cari
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari request…"
              />
            </label>
            <label className="sr">
              Filter status
              <Select
                aria-label="Filter status"
                value={filter}
                onChange={(e) => onFilterChange(e.target.value)}
              >
                <option value="Semua">Semua status</option>
                {SECTION_STATUSES.requests.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </label>
          </div>
        </div>
        {loading ? (
          <p>Memuat data…</p>
        ) : (
          <div className="archive-list">
            {visibleRequests.length === 0 && (
              <div className="archive-empty">
                <div className="archive-art" aria-hidden="true">
                  <div className="folder-back" />
                  <div className="paper">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="folder-front">
                    <i />
                  </div>
                </div>
                <h3>
                  {requests.length ? "Tidak ada hasil yang cocok" : "Belum ada request"}
                </h3>
                <p>
                  {requests.length
                    ? "Coba kata kunci atau status lain."
                    : "Catat permintaan pertama untuk mulai melacak progresnya."}
                </p>
                {requests.length > 0 && (
                  <button
                    onClick={() => {
                      onSearchChange("");
                      onFilterChange("Semua");
                    }}
                  >
                    Reset pencarian dan filter
                  </button>
                )}
              </div>
            )}
            {visibleRequests.map((item) => (
              <article key={item.id} className="entry">
                <div className="row">
                  <span className="badge" data-status={item.status}>
                    {item.status}
                  </span>
                  <span>{item.date || ""}</span>
                </div>
                <button
                  className="itemtitle"
                  onClick={() => onOpenRequest(item.id)}
                >
                  {item.title}
                </button>
                <p>{item.description || ""}</p>
                <div className="row">
                  <small>
                    {item.requester || "Peminta belum diisi"}
                    {item.requestDate ? " · Masuk " + item.requestDate : ""}
                  </small>
                  <div>
                    {item.convertedId ? (
                      <button onClick={() => onConvertRequest(item, "projects")}>
                        Lihat hasil konversi
                      </button>
                    ) : (
                      <>
                        <button onClick={() => onConvertRequest(item, "projects")}>
                          Jadikan proyek
                        </button>{" "}
                        <button onClick={() => onConvertRequest(item, "todos")}>
                          Jadikan to-do
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="row actions">
                  <button onClick={() => onEditRequest(item)}>Edit</button>
                  <button onClick={() => onDeleteRequest(item)}>Hapus</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
