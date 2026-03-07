alter table public.gift_invitee enable row level security;
alter table public.gift_invitation_link enable row level security;
alter table public.stripe_checkout_session enable row level security;

drop policy if exists gift_invitee_select_owner on public.gift_invitee;
create policy gift_invitee_select_owner
on public.gift_invitee
for select
using (
  exists (
    select 1
    from public.gift g
    where g.id = gift_invitee.gift_id
      and g.owner_user_id = auth.uid()
  )
);

drop policy if exists gift_invitee_insert_owner on public.gift_invitee;
create policy gift_invitee_insert_owner
on public.gift_invitee
for insert
with check (
  exists (
    select 1
    from public.gift g
    where g.id = gift_invitee.gift_id
      and g.owner_user_id = auth.uid()
  )
);

drop policy if exists gift_invitee_update_owner on public.gift_invitee;
create policy gift_invitee_update_owner
on public.gift_invitee
for update
using (
  exists (
    select 1
    from public.gift g
    where g.id = gift_invitee.gift_id
      and g.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.gift g
    where g.id = gift_invitee.gift_id
      and g.owner_user_id = auth.uid()
  )
);

drop policy if exists gift_invitation_link_select_owner on public.gift_invitation_link;
create policy gift_invitation_link_select_owner
on public.gift_invitation_link
for select
using (
  exists (
    select 1
    from public.gift g
    where g.id = gift_invitation_link.gift_id
      and g.owner_user_id = auth.uid()
  )
);

drop policy if exists gift_invitation_link_insert_owner on public.gift_invitation_link;
create policy gift_invitation_link_insert_owner
on public.gift_invitation_link
for insert
with check (
  exists (
    select 1
    from public.gift g
    where g.id = gift_invitation_link.gift_id
      and g.owner_user_id = auth.uid()
  )
);

drop policy if exists gift_invitation_link_update_owner on public.gift_invitation_link;
create policy gift_invitation_link_update_owner
on public.gift_invitation_link
for update
using (
  exists (
    select 1
    from public.gift g
    where g.id = gift_invitation_link.gift_id
      and g.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.gift g
    where g.id = gift_invitation_link.gift_id
      and g.owner_user_id = auth.uid()
  )
);

drop policy if exists stripe_checkout_session_select_owner on public.stripe_checkout_session;
create policy stripe_checkout_session_select_owner
on public.stripe_checkout_session
for select
using (
  exists (
    select 1
    from public.gift_invitee gi
    join public.gift g on g.id = gi.gift_id
    where gi.id = stripe_checkout_session.invitee_id
      and g.owner_user_id = auth.uid()
  )
);

drop policy if exists stripe_checkout_session_insert_owner on public.stripe_checkout_session;
create policy stripe_checkout_session_insert_owner
on public.stripe_checkout_session
for insert
with check (
  exists (
    select 1
    from public.gift_invitee gi
    join public.gift g on g.id = gi.gift_id
    where gi.id = stripe_checkout_session.invitee_id
      and g.owner_user_id = auth.uid()
  )
);

drop policy if exists stripe_checkout_session_update_owner on public.stripe_checkout_session;
create policy stripe_checkout_session_update_owner
on public.stripe_checkout_session
for update
using (
  exists (
    select 1
    from public.gift_invitee gi
    join public.gift g on g.id = gi.gift_id
    where gi.id = stripe_checkout_session.invitee_id
      and g.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.gift_invitee gi
    join public.gift g on g.id = gi.gift_id
    where gi.id = stripe_checkout_session.invitee_id
      and g.owner_user_id = auth.uid()
  )
);
