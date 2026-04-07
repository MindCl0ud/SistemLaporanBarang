import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = session.user?.role;

  if (role === "ADMIN_GUDANG") {
    redirect("/admin");
  }

  if (role === "KEPALA_DINAS") {
    redirect("/eksekutif");
  }

  redirect("/pegawai");
}
