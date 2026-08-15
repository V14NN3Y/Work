import { headers } from "next/headers";
import { AdminBasePathProvider } from "@/components/admin/AdminBasePathContext";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const host = headers().get("host") ?? "";
  const basePath = host === "adminboard.oralyah.com" ? "" : "/admin";

  return (
    <AdminBasePathProvider basePath={basePath}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AdminBasePathProvider>
  );
}
