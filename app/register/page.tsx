import type { Metadata } from "next";
import AuthScreen from "../AuthScreen";

export const metadata: Metadata = { title: "Buat akun | Ruang Proyek" };

export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
