import { supabase } from "./supabase.service";

//
export async function getLatestCheckoutSessionForInvitee(inviteeId: string) {
  const { data, error } = await supabase
    .from("stripe_checkout_session")
    .select("stripe_session_id,status,created_at")
    .eq("invitee_id", inviteeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}
