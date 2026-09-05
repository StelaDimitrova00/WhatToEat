-- =====================================================================
--  Миграция: ръчно добавени продукти в списъка за пазаруване
-- =====================================================================
--  Пусни ТОЗИ файл САМО ако вече си пускал schema.sql и имаш реални данни.
--  Ако тепърва настройваш проекта — просто пусни schema.sql, там вече е включено.
--  Този скрипт НЕ трие нищо.
-- =====================================================================

create table if not exists public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 80),
  qty        text not null default '',
  unit       text not null default '',
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_owner_idx on public.shopping_items(owner, created_at);

alter table public.shopping_items enable row level security;

drop policy if exists shopping_items_all on public.shopping_items;
create policy shopping_items_all on public.shopping_items
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
