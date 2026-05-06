"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SignInResult = { error: string } | void;

const PRESET_USERS: Record<string, { email: string; password: string }> = {
  jinseng: { email: "jinseng@kira.app", password: "kira2026" },
  josephine: { email: "josephine@kira.app", password: "kira2026" },
};

export async function signInAsAction(userKey: string): Promise<SignInResult> {
  const preset = PRESET_USERS[userKey];
  if (!preset) {
    return { error: "Unknown user" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: preset.email,
    password: preset.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}
