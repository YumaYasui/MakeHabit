-- フェーズ1：ひとりで使える機能（プロフィール・習慣・曜日設定・スタンプ）

-- アプリ上の「今日」。日本時間の午前3時で日付が変わる
create function public.app_today() returns date
language sql stable
set search_path = ''
as $$
  select ((now() at time zone 'Asia/Tokyo') - interval '3 hours')::date
$$;

-- ---------------------------------------------------------------------------
-- プロフィール
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  -- 初回ログイン時の表示名登録を済ませたか
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "自分のプロフィールを見られる" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "自分のプロフィールを変更できる" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Googleログインで初めてサインアップしたときにプロフィールを作る（初期値はGoogleの名前）
create function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1),
      'ユーザー'
    ), 30)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 習慣
-- ---------------------------------------------------------------------------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  icon text not null default '✅' check (char_length(icon) between 1 and 8),
  color text not null default 'orange'
    check (color in ('orange', 'rose', 'violet', 'sky', 'emerald', 'amber')),
  start_date date not null default public.app_today(),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index habits_user_id_idx on public.habits (user_id);

alter table public.habits enable row level security;

create policy "自分の習慣を見られる" on public.habits
  for select to authenticated using (user_id = (select auth.uid()));
create policy "自分の習慣を作れる" on public.habits
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "自分の習慣を変更できる" on public.habits
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "自分の習慣を削除できる" on public.habits
  for delete to authenticated using (user_id = (select auth.uid()));

-- 開始日・持ち主は作成後に変えさせない
create function public.habits_protect_columns() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id or new.start_date <> old.start_date then
    raise exception 'habit_immutable_column';
  end if;
  return new;
end;
$$;

create trigger habits_protect_columns
  before update on public.habits
  for each row execute function public.habits_protect_columns();

-- アーカイブしていない習慣は1人10個まで
create function public.habits_enforce_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.archived_at is null and (tg_op = 'INSERT' or old.archived_at is not null) then
    -- 同じユーザーの同時追加で上限を越えないようにする
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));
    if (
      select count(*) from public.habits
      where user_id = new.user_id and archived_at is null and id <> new.id
    ) >= 10 then
      raise exception 'habit_limit_reached';
    end if;
  end if;
  return new;
end;
$$;

create trigger habits_enforce_limit
  before insert or update of archived_at on public.habits
  for each row execute function public.habits_enforce_limit();

-- ---------------------------------------------------------------------------
-- 曜日設定の履歴（0 = 日曜 〜 6 = 土曜）
-- valid_from 以降、次の設定が始まるまでこの設定で実施日を判定する
-- ---------------------------------------------------------------------------
create table public.habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  weekdays smallint[] not null
    check (cardinality(weekdays) between 1 and 7 and weekdays <@ '{0,1,2,3,4,5,6}'::smallint[]),
  valid_from date not null,
  unique (habit_id, valid_from)
);

alter table public.habit_schedules enable row level security;

create policy "自分の習慣の曜日設定を見られる" on public.habit_schedules
  for select to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));

-- 曜日設定の書き込みは create_habit / update_habit からだけ行う

-- ---------------------------------------------------------------------------
-- スタンプ
-- ---------------------------------------------------------------------------
create table public.stamps (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,
  stamped_at timestamptz not null default now(),
  -- 当日以外（過去7日以内）に押した「後押し」か
  is_late boolean not null default false,
  unique (habit_id, date)
);

alter table public.stamps enable row level security;

create policy "自分の習慣のスタンプを見られる" on public.stamps
  for select to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));

-- 押せるのは今日と過去7日以内、習慣の開始日以降、アーカイブしていない習慣だけ
create policy "スタンプを押せる" on public.stamps
  for insert to authenticated
  with check (
    date between public.app_today() - 7 and public.app_today()
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = (select auth.uid())
        and h.archived_at is null and date >= h.start_date
    )
  );

create policy "スタンプを取り消せる" on public.stamps
  for delete to authenticated
  using (
    date between public.app_today() - 7 and public.app_today()
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = (select auth.uid()) and h.archived_at is null
    )
  );

-- 押した日時と後押しかどうかはサーバー側で決める
create function public.stamps_set_meta() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.stamped_at := now();
  new.is_late := new.date <> public.app_today();
  return new;
end;
$$;

create trigger stamps_set_meta
  before insert on public.stamps
  for each row execute function public.stamps_set_meta();

-- ---------------------------------------------------------------------------
-- 習慣の作成・変更（曜日設定の履歴もまとめて書き込む）
-- ---------------------------------------------------------------------------
create function public.normalize_weekdays(p_weekdays smallint[]) returns smallint[]
language sql immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct w order by w), '{}') from unnest(p_weekdays) as w
$$;

create function public.create_habit(
  p_name text, p_icon text, p_color text, p_weekdays smallint[]
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_habit_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.habits (user_id, name, icon, color)
  values (auth.uid(), trim(p_name), p_icon, p_color)
  returning id into v_habit_id;

  insert into public.habit_schedules (habit_id, weekdays, valid_from)
  values (v_habit_id, public.normalize_weekdays(p_weekdays), public.app_today());

  return v_habit_id;
end;
$$;

create function public.update_habit(
  p_habit_id uuid, p_name text, p_icon text, p_color text, p_weekdays smallint[]
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_weekdays smallint[] := public.normalize_weekdays(p_weekdays);
  v_current smallint[];
begin
  update public.habits
  set name = trim(p_name), icon = p_icon, color = p_color
  where id = p_habit_id and user_id = auth.uid();
  if not found then
    raise exception 'habit_not_found';
  end if;

  select weekdays into v_current
  from public.habit_schedules
  where habit_id = p_habit_id and valid_from <= public.app_today()
  order by valid_from desc
  limit 1;

  -- 曜日を変えたときだけ、今日から新しい設定を適用する
  if v_current is distinct from v_weekdays then
    insert into public.habit_schedules (habit_id, weekdays, valid_from)
    values (p_habit_id, v_weekdays, public.app_today())
    on conflict (habit_id, valid_from) do update set weekdays = excluded.weekdays;
  end if;
end;
$$;

revoke execute on function public.create_habit(text, text, text, smallint[]) from public, anon;
revoke execute on function public.update_habit(uuid, text, text, text, smallint[]) from public, anon;
grant execute on function public.create_habit(text, text, text, smallint[]) to authenticated;
grant execute on function public.update_habit(uuid, text, text, text, smallint[]) to authenticated;
