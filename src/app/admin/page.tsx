import type { Metadata } from "next";
import { AdminPortal } from "@/features/admin/components/admin-portal";

export const metadata: Metadata = {
  title: "Admin Portal",
};

export default function AdminPage() {
  return <AdminPortal />;
}
