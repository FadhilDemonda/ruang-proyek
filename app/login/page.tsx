import type { Metadata } from "next";
import AuthScreen from "../AuthScreen";

export const metadata: Metadata = { title: "Masuk | Ruang Proyek" };

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
