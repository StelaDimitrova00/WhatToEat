-- =====================================================================
--  Миграция: подредба на категориите (drag & drop)
-- =====================================================================
--  Пусни ТОЗИ файл, ако вече си пускал schema.sql и имаш реални данни.
--  Ако тепърва настройваш проекта — само schema.sql е достатъчен.
--  Този скрипт НЕ трие нищо.
-- =====================================================================

alter table public.categories
  add column if not exists position integer not null default 0;

-- Първоначална подредба на съществуващите категории — по азбучен ред,
-- за да не тръгнат всички от 0.
with ordered as (
  select id, (row_number() over (partition by owner order by name) - 1) as rn
  from public.categories
)
update public.categories c
   set position = o.rn
  from ordered o
 where o.id = c.id
   and c.position = 0;

create index if not exists categories_owner_position_idx
  on public.categories(owner, position);
