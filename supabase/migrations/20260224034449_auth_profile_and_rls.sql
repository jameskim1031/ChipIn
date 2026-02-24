  create table if not exists public.user_profile (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    phone_e164 text unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  alter table public.gift
    add column if not exists owner_user_id uuid references auth.users(id);

  create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  as $$
  begin
    insert into public.user_profile (id, full_name, phone_e164)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      nullif(coalesce(new.phone, new.raw_user_meta_data->>'phone'), '')
    )
    on conflict (id) do nothing;
    return new;
  end;
  $$;

  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

  alter table public.user_profile enable row level security;
  create policy "profile_select_own" on public.user_profile
  for select using (auth.uid() = id);
  create policy "profile_update_own" on public.user_profile
  for update using (auth.uid() = id);

  alter table public.gift enable row level security;
  create policy "gift_select_own" on public.gift
  for select using (owner_user_id = auth.uid());
  create policy "gift_insert_own" on public.gift
  for insert with check (owner_user_id = auth.uid());
  create policy "gift_update_own" on public.gift
  for update using (owner_user_id = auth.uid());
