import { KiraApp } from "@/components/kira/KiraApp";
import { DEMO_SQUAD_ID, DEMO_USER_ID } from "@/lib/demo/seed";
import { getDemoState } from "@/lib/demo/state";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialState = await getDemoState(DEMO_USER_ID, DEMO_SQUAD_ID);

  return <KiraApp initialState={initialState} />;
}
