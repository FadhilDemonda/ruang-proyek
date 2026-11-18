import type { Item } from "./types";
import WorkspaceIcon from "./WorkspaceIcon";

type Props = {
  section: "todos" | "requests";
  item: Item;
  projectName: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: (target: "projects" | "todos") => void;
};

export default function ItemDetail({ section, item, projectName, onBack, onEdit, onDelete, onConvert }: Props) {
  const isTask = section === "todos";

  return (
    <div className="project-detail-page">
      <div className="detail-nav">
        <button type="button" className="back-button" onClick={onBack}>
          <WorkspaceIcon name="back" /> Kembali ke {isTask ? "to-do" : "request"}
        </button>
      </div>
      <section className="detail-hero card" aria-labelledby="item-detail-title">
        <div className="detail-hero-top">
          <div className="detail-hero-main">
            <div className="detail-hero-icon"><WorkspaceIcon name={section} /></div>
            <div className="detail-hero-copy">
              <span className="badge" data-status={item.status}>{item.status}</span>
              <h1 id="item-detail-title">{item.title}</h1>
              <p className="detail-hero-desc">{item.description || "Belum ada deskripsi."}</p>
            </div>
          </div>
          <div className="detail-hero-actions">
            <button type="button" onClick={onEdit}>Edit</button>
            <button type="button" className="danger-button" onClick={onDelete}>
              <WorkspaceIcon name="trash" /> Hapus
            </button>
          </div>
        </div>
        <dl className="detail-hero-meta">
          <div className="detail-meta-item">
            <dt>Tenggat</dt>
            <dd>{item.date || "Belum diatur"}</dd>
          </div>
          {isTask ? (
            <div className="detail-meta-item"><dt>Proyek</dt><dd>{projectName}</dd></div>
          ) : (
            <>
              <div className="detail-meta-item"><dt>Peminta</dt><dd>{item.requester || "Belum diisi"}</dd></div>
              <div className="detail-meta-item"><dt>Tanggal masuk</dt><dd>{item.requestDate || "Belum diatur"}</dd></div>
            </>
          )}
        </dl>
      </section>
      {!isTask && (
        <section className="card detail-section" aria-labelledby="request-conversion-title">
          <div className="detail-section-head">
            <div className="detail-section-title"><h2 id="request-conversion-title">Tindak lanjut</h2></div>
          </div>
          <div className="detail-hero-actions">
            {item.convertedId ? (
              <button type="button" onClick={() => onConvert("projects")}>Lihat hasil konversi</button>
            ) : (
              <>
                <button type="button" onClick={() => onConvert("projects")}>Jadikan proyek</button>
                <button type="button" onClick={() => onConvert("todos")}>Jadikan to-do</button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
