-- Remove broad access from client roles
revoke all on table public.gift from anon;
revoke all on table public.gift from authenticated;
revoke all on table public.gift_invitee from anon;
revoke all on table public.gift_invitee from authenticated;
revoke all on table public.gift_invitation_link from anon;
revoke all on table public.gift_invitation_link from authenticated;
revoke all on table public.stripe_checkout_session from anon;
revoke all on table public.stripe_checkout_session from authenticated;
revoke all on table public.stripe_event from anon;
revoke all on table public.stripe_event from authenticated;
revoke all on table public.email_suppression from anon;
revoke all on table public.email_suppression from authenticated;
revoke all on table public.email_send_attempt from anon;
revoke all on table public.email_send_attempt from authenticated;
revoke all on table public.email_event from anon;
revoke all on table public.email_event from authenticated;
revoke all on table public.gift_progress from anon;
revoke all on table public.gift_progress from authenticated;

-- Grant only what authenticated users need for owner-scoped app flows
grant select, insert, update on table public.gift to authenticated;
grant select, insert, update on table public.gift_invitee to authenticated;
grant select, insert on table public.gift_invitation_link to authenticated;
grant select, insert on table public.stripe_checkout_session to authenticated;

-- Service role keeps full operational access
grant all on table public.gift to service_role;
grant all on table public.gift_invitee to service_role;
grant all on table public.gift_invitation_link to service_role;
grant all on table public.stripe_checkout_session to service_role;
grant all on table public.stripe_event to service_role;
grant all on table public.email_suppression to service_role;
grant all on table public.email_send_attempt to service_role;
grant all on table public.email_event to service_role;
grant all on table public.gift_progress to service_role;
