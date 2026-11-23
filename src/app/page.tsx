import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guards";
import { landingPathForRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(landingPathForRole(user.role));
}
