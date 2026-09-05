-- =====================================================================
--  Миграция: снимка към рецепта
-- =====================================================================
--  Пусни ТОЗИ файл, ако вече си пускал schema.sql и имаш реални данни.
--  Ако тепърва настройваш проекта — само schema.sql е достатъчен.
--  Този скрипт НЕ трие нищо. Може да се пуска повторно.
-- =====================================================================

-- 1. Колоната, в която пазим пътя до файла (не целия URL).
alter table public.recipes
  add column if not exists photo text;

-- 2. Bucket-ът за снимките. Публичен е, защото рецептите се споделят —
--    иначе снимката нямаше да се вижда в общия феед.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- 3. Кой какво може с файловете.
--    Четене: всеки. Писане: само в собствената си папка (<user_id>/...).
drop policy if exists "recipe photos readable by everyone" on storage.objects;
create policy "recipe photos readable by everyone"
  on storage.objects for select
  using (bucket_id = 'recipe-photos');

drop policy if exists "recipe photos insert own folder" on storage.objects;
create policy "recipe photos insert own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-photos'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "recipe photos update own folder" on storage.objects;
create policy "recipe photos update own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'recipe-photos'
         and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'recipe-photos'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "recipe photos delete own folder" on storage.objects;
create policy "recipe photos delete own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-photos'
         and (storage.foldername(name))[1] = auth.uid()::text);
