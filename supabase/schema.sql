-- =====================================================================
--  Вкус у дома / WhatToEat — пълна схема за Supabase
--  Пусни целия файл наведнъж в Supabase → SQL Editor → New query → Run.
--  Скриптът може да се пуска повторно (drop-и в началото).
-- =====================================================================

-- ---------- 0. Изчистване (за повторно пускане) ----------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.username_available(text);
drop function if exists public.email_for_username(text);
drop table if exists public.friends;
drop table if exists public.shopping_items;
drop table if exists public.shopping_state;
drop table if exists public.week_plan;
drop table if exists public.recipes;
drop table if exists public.categories;
drop table if exists public.profiles;

-- ---------- 1. Таблици ----------

-- Публичен профил. НЯМА имейл колона — имейлите остават само в auth.users.
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null check (char_length(trim(username)) between 2 and 32),
  created_at timestamptz not null default now()
);
create unique index profiles_username_lower_idx on public.profiles (lower(username));

create table public.categories (
  id      uuid primary key default gen_random_uuid(),
  owner   uuid not null references public.profiles(id) on delete cascade,
  name    text not null check (char_length(trim(name)) between 1 and 40),
  unique (owner, name)
);
create index categories_owner_idx on public.categories(owner);

create table public.recipes (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 120),
  cat         text not null default 'Друго',
  emoji       text not null default '🍽️',
  "time"      text not null default '',
  servings    text not null default '',
  cal         text not null default '',
  is_public   boolean not null default false,
  fav         boolean not null default false,
  from_friend text,
  ings        jsonb not null default '[]'::jsonb,
  steps       text not null default '',
  created_at  timestamptz not null default now()
);
create index recipes_owner_idx  on public.recipes(owner);
create index recipes_public_idx on public.recipes(created_at desc) where is_public;

create table public.week_plan (
  id        uuid primary key default gen_random_uuid(),
  owner     uuid not null references public.profiles(id) on delete cascade,
  day       text not null,
  meal      text not null,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  unique (owner, day, meal, recipe_id)
);
create index week_plan_owner_idx on public.week_plan(owner);

-- Отметките върху продуктите, които идват автоматично от рецептите в менюто.
create table public.shopping_state (
  owner    uuid not null references public.profiles(id) on delete cascade,
  item_key text not null,
  done     boolean not null default false,
  primary key (owner, item_key)
);

-- Ръчно добавени продукти, които ги няма в нито една рецепта
-- (хляб, тоалетна хартия, кафе...).
create table public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 80),
  qty        text not null default '',
  unit       text not null default '',
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index shopping_items_owner_idx on public.shopping_items(owner, created_at);

create table public.friends (
  owner      uuid not null references public.profiles(id) on delete cascade,
  friend     uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner, friend),
  check (owner <> friend)
);

-- ---------- 2. Row Level Security ----------
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.recipes        enable row level security;
alter table public.week_plan      enable row level security;
alter table public.shopping_state enable row level security;
alter table public.shopping_items enable row level security;
alter table public.friends        enable row level security;

-- profiles: всеки влязъл вижда всички потребителски имена (нужно за търсене
-- на приятели и за автора под споделена рецепта). Пише само своя ред.
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- categories: само собствени
create policy categories_all on public.categories
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- recipes: четеш своите + всички публични; пишеш само своите
create policy recipes_select on public.recipes
  for select to authenticated using (owner = auth.uid() or is_public);
create policy recipes_insert on public.recipes
  for insert to authenticated with check (owner = auth.uid());
create policy recipes_update on public.recipes
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy recipes_delete on public.recipes
  for delete to authenticated using (owner = auth.uid());

-- week_plan / shopping_state / friends: само собствени
create policy week_plan_all on public.week_plan
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy shopping_all on public.shopping_state
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy shopping_items_all on public.shopping_items
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy friends_all on public.friends
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- ---------- 3. Автоматичен профил + начални данни при регистрация ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''),
                    'user_' || substr(new.id::text, 1, 8));
  if exists (select 1 from public.profiles p where lower(p.username) = lower(uname)) then
    uname := uname || '_' || substr(new.id::text, 1, 4);
  end if;

  insert into public.profiles (id, username) values (new.id, uname);

  insert into public.categories (owner, name)
  select new.id, c from unnest(array[
    'Закуска','Салата','Основно','Гарнитура','Десерт','Снакс','Друго'
  ]) c;

  insert into public.recipes (owner, name, cat, emoji, "time", servings, cal, ings, steps) values
  (new.id, 'Мусака - 4 порции', 'Основно', '🍲', '70 мин', '4', '185 kcal / 100 г',
   '[["500","г","картофи"],["500","г","кайма"],["2","бр","яйца"],["400","г","кисело мляко"]]'::jsonb,
   E'Обели и нарежи картофите.\nЗапържи каймата.\nПодреди картофите и каймата в тава.\nРазбий яйцата с киселото мляко и залей.\nПечи до златисто.'),
  (new.id, 'Баница', 'Закуска', '🥐', '50 мин', '6', '310 kcal / порция',
   '[["500","г","кори за баница"],["4","бр","яйца"],["400","г","кисело мляко"],["200","г","сирене"]]'::jsonb,
   E'Разбий яйцата и киселото мляко.\nНатроши сиренето.\nРедувай кори, плънка и сирене.\nЗавърши с кори и печи до златисто.'),
  (new.id, 'Шопска салата', 'Салата', '🥗', '15 мин', '2', '120 kcal / 100 г',
   '[["2","бр","домати"],["1","бр","краставица"],["1","бр","чушка"],["150","г","сирене"]]'::jsonb,
   E'Нарежи зеленчуците.\nСмеси ги в купа.\nДобави сиренето и овкуси.'),
  (new.id, 'Тирамису', 'Десерт', '🍰', '30 мин', '6', '280 kcal / порция',
   '[["250","г","маскарпоне"],["3","бр","яйца"],["200","г","бишкоти"],["200","мл","кафе"]]'::jsonb,
   E'Приготви крема.\nПотопи бишкотите в кафето.\nРедувай бишкоти и крем.\nОхлади преди сервиране.');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 4. RPC функции ----------

-- Проверка дали потребителското име е свободно (ползва се преди регистрация,
-- когато потребителят още не е влязъл и не може да чете profiles).
create or replace function public.username_available(uname text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles p where lower(p.username) = lower(trim(uname)));
$$;

-- Позволява вход с потребителско име вместо имейл.
-- ВНИМАНИЕ: това дава възможност някой да разбере имейла зад дадено
-- потребителско име. Ако не искаш това — изтрий функцията и остави само
-- вход с имейл (виж README).
create or replace function public.email_for_username(uname text)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(trim(uname))
  limit 1;
$$;

grant execute on function public.username_available(text)  to anon, authenticated;
grant execute on function public.email_for_username(text)  to anon, authenticated;

-- ---------- готово ----------
