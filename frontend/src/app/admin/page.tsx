import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  const host = headers().get("host") ?? "";
  const basePath = host === "adminboard.oralyah.com" ? "" : "/admin";
  redirect(`${basePath}/orders`);
}
