import { KiraApp } from "@/components/kira/KiraApp";
import { prisma } from "@/lib/db";
import { getDemoState } from "@/lib/demo/state";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await prisma.squadMember.findFirst({
    where: { userId: user.id },
  });

  if (!membership) {
    redirect("/login");
  }

  const initialState = await getDemoState(user.id);

  return <KiraApp initialState={initialState} />;
}
