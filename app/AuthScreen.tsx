"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { readWorkspaceRoute, workspaceHref } from "./workspaceRoute";
import Logo from "./Logo";
import WorkspaceIcon from "./WorkspaceIcon";
import styles from "./auth.module.css";

type IconName = "email" | "lock" | "person" | "eye" | "eye-off" | "enter";
const paths: Record<IconName, string> = {
  email: "M3 5h18v14H3ZM3 5l9 7 9-7",
  lock: "M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4m-4 5v2",
  person:
    "M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 21v-3a6 6 0 0 1 12 0v3Zm15-13v6m-3-3h6",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  "eye-off":
    "m3 3 18 18M10 5.2A12 12 0 0 1 12 5c6.5 0 10 7 10 7a20 20 0 0 1-4 4.6M6 6.5A21 21 0 0 0 2 12s3.5 7 10 7a13 13 0 0 0 5-1m-7-8a3 3 0 0 0 4 4",
  enter: "M14 3h6v18h-6M3 12h12m-4-4 4 4-4 4",
};

function AuthIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

const MIN_PASSWORD_LENGTH = 6;

function errorMessage(error: unknown) {
  if (!(error instanceof FirebaseError))
    return "Permintaan gagal diproses. Silakan coba lagi.";
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email atau kata sandi tidak sesuai.";
    case "auth/email-already-in-use":
      return "Email ini sudah digunakan. Masuk dengan akun yang sudah ada.";
    case "auth/invalid-email":
      return "Periksa kembali format alamat email.";
    case "auth/weak-password":
      return "Kata sandi belum memenuhi kebijakan akun. Gunakan kata sandi yang lebih panjang.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi.";
    case "auth/network-request-failed":
      return "Tidak dapat terhubung. Periksa koneksi internet Anda.";
    case "auth/operation-not-allowed":
      return "Login email dan kata sandi belum diaktifkan pada Firebase.";
    default:
      return "Layanan akun belum dapat memproses permintaan. Silakan coba lagi.";
  }
}

export default function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmError, setConfirmError] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDark(localStorage.getItem("ruang-theme") === "dark");
    const target = new URLSearchParams(location.search).get("next");
    if (target?.startsWith("/?")) {
      setReturnTo(workspaceHref(readWorkspaceRoute(new URLSearchParams(target.slice(2)))));
    }
  }, []);
  useEffect(() => {
    if (error) errorBox.current?.focus();
  }, [error]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("ruang-theme", next ? "dark" : "light");
  }
  function unavailable() {
    setError(
      "Firebase belum dikonfigurasi. Login dan pendaftaran akun belum tersedia. Anda tetap bisa membuka ruang kerja lokal.",
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");
    setConfirmError(false);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const name = String(data.get("name") || "").trim();
    if (registering && !name) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    if (registering && password !== data.get("confirm")) {
      setConfirmError(true);
      setError(
        "Konfirmasi kata sandi belum sama. Periksa kembali kedua kolom kata sandi.",
      );
      return;
    }
    if (!auth || !db) {
      unavailable();
      return;
    }
    setBusy(true);
    try {
      if (registering) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        setProfileCreated(true);
        await updateProfile(credential.user, { displayName: name });
        await setDoc(doc(db, "users", credential.user.uid), {
          name,
          email,
          createdAt: Date.now(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace(returnTo);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (busy) return;
    setError("");
    setSuccess("");
    if (!auth) {
      unavailable();
      return;
    }
    const emailInput = form.current?.elements.namedItem("email");
    if (
      !(emailInput instanceof HTMLInputElement) ||
      !emailInput.reportValidity()
    )
      return;
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, emailInput.value.trim());
      setSuccess(
        "Jika email terdaftar, petunjuk pengaturan ulang kata sandi akan dikirim. Periksa kotak masuk dan folder spam.",
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page} data-auth-theme={dark ? "dark" : "light"}>
      <header className={styles.header}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="Ruang Proyek, buka ruang kerja"
        >
          <Logo />
          <span>
            Ruang Proyek<small>Ruang kerja terstruktur</small>
          </span>
        </Link>
        <span className={styles.connection}>
          {auth ? "Akun Firebase" : "Mode lokal"}
        </span>
      </header>
      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="auth-title">
          <div className={styles.intro}>
            {registering && (
              <span className={styles.registerIcon}>
                <AuthIcon name="person" />
              </span>
            )}
            <h1 id="auth-title">
              {registering ? "Buat akun baru" : "Masuk ke ruang kerja"}
            </h1>
            <p>
              {registering
                ? "Simpan proyek dan tugas di akun pribadi Anda."
                : "Lanjutkan proyek, tugas, dan permintaan yang sedang Anda kerjakan."}
            </p>
          </div>
          <form
            ref={form}
            onSubmit={submit}
            className={styles.form}
            aria-busy={busy}
          >
            {error && (
              <div
                ref={errorBox}
                tabIndex={-1}
                role="alert"
                className={styles.error}
              >
                {error}
                {confirmError && (
                  <a href="#auth-confirm">Periksa konfirmasi kata sandi</a>
                )}
                {profileCreated && (
                  <p>
                    Akun sudah dibuat, tetapi profil belum selesai disimpan.{" "}
                    <Link href="/">Buka ruang kerja</Link> atau{" "}
                    <Link href="/login">masuk kembali</Link>, jangan membuat
                    akun yang sama lagi.
                  </p>
                )}
              </div>
            )}
            {success && (
              <div role="status" className={styles.notice}>
                {success}
              </div>
            )}
            {registering && (
              <div className={styles.field}>
                <label htmlFor="auth-name">Nama lengkap</label>
                <div className={styles.inputWrap}>
                  <AuthIcon name="person" />
                  <input
                    id="auth-name"
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="Nama lengkap Anda"
                    disabled={busy || profileCreated}
                  />
                </div>
              </div>
            )}
            <div className={styles.field}>
              <label htmlFor="auth-email">Alamat email</label>
              <div className={styles.inputWrap}>
                <AuthIcon name="email" />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="nama@domain.com"
                  disabled={busy || profileCreated}
                />
              </div>
            </div>
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="auth-password">Kata sandi</label>
                {!registering && (
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={resetPassword}
                    disabled={busy}
                  >
                    Lupa sandi?
                  </button>
                )}
              </div>
              <div className={styles.inputWrap}>
                <AuthIcon name="lock" />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete={
                    registering ? "new-password" : "current-password"
                  }
                  placeholder={
                    registering ? "Buat kata sandi" : "Masukkan kata sandi akun"
                  }
                  aria-describedby={registering ? "password-hint" : undefined}
                  disabled={busy || profileCreated}
                />
                <button
                  type="button"
                  className={styles.reveal}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  aria-pressed={showPassword}
                >
                  <AuthIcon name={showPassword ? "eye-off" : "eye"} />
                </button>
              </div>
              {registering && (
                <small id="password-hint" className={styles.hint}>
                  Minimal {MIN_PASSWORD_LENGTH} karakter. Gunakan kata sandi
                  yang tidak dipakai di akun lain.
                </small>
              )}
            </div>
            {registering && (
              <div className={styles.field}>
                <label htmlFor="auth-confirm">Konfirmasi kata sandi</label>
                <div className={styles.inputWrap}>
                  <AuthIcon name="lock" />
                  <input
                    id="auth-confirm"
                    name="confirm"
                    type={showConfirm ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Ketik ulang kata sandi"
                    aria-invalid={confirmError || undefined}
                    aria-describedby={
                      confirmError ? "confirm-error" : undefined
                    }
                    onChange={() => setConfirmError(false)}
                    disabled={busy || profileCreated}
                  />
                  <button
                    type="button"
                    className={styles.reveal}
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={
                      showConfirm
                        ? "Sembunyikan konfirmasi kata sandi"
                        : "Tampilkan konfirmasi kata sandi"
                    }
                    aria-pressed={showConfirm}
                  >
                    <AuthIcon name={showConfirm ? "eye-off" : "eye"} />
                  </button>
                </div>
                {confirmError && (
                  <small id="confirm-error" className={styles.fieldError}>
                    Konfirmasi harus sama dengan kata sandi.
                  </small>
                )}
              </div>
            )}
            {!auth && (
              <div className={styles.notice}>
                <strong>Login akun belum aktif</strong>
                <p>
                  Firebase belum dikonfigurasi. Mode lokal tetap tersedia; data
                  lokal hanya tersimpan di browser ini.
                </p>
              </div>
            )}
            <button
              className={styles.submit}
              type="submit"
              disabled={busy || profileCreated}
            >
              {!registering && <AuthIcon name="enter" />}
              {busy ? "Memproses…" : registering ? "Buat akun" : "Masuk"}
            </button>
          </form>
          <p className={styles.switch}>
            {registering
              ? "Sudah punya akun?"
              : "Belum memiliki akun ruang kerja?"}{" "}
            <Link href={{
              pathname: registering ? "/login" : "/register",
              query: returnTo === "/" ? undefined : { next: returnTo },
            }}>
              {registering ? "Masuk" : "Buat akun"}
            </Link>
          </p>
          <div className={styles.bottomRow}>
            <Link href="/">
              {auth ? "Kembali ke ruang kerja" : "Buka ruang kerja lokal"}
            </Link>
            <button
              type="button"
              className={styles.theme}
              onClick={toggleTheme}
            >
              <WorkspaceIcon name={dark ? "sun" : "moon"} />
              {dark ? "Mode terang" : "Mode gelap"}
            </button>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <span>Ruang Proyek</span>
        <span>
          {auth
            ? "Login menggunakan email dan kata sandi."
            : "Data lokal tidak otomatis tersinkron ke akun."}
        </span>
      </footer>
    </div>
  );
}
