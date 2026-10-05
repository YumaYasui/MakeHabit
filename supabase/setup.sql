-- =============================================================================
-- MakeHabit データベースの初期設定（Supabase の SQL Editor に貼り付けて実行する用）
--
-- 使い方：
--   1. このファイルの中身を「全部」コピーする（1行目のこのコメントから最終行まで）
--   2. SQL Editor の新しいクエリに貼り付ける
--   3. 何も選択していない状態で「Run」を押す
--
-- 中身は supabase/migrations/ の2ファイルを順番につなげたもの。
-- migrations を変更したら、このファイルも作り直すこと：
--   cat supabase/migrations/*.sql の結果を、この見出しの下に入れる
-- =============================================================================

-- ----- 20261002000000_phase1.sql -----
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

-- ----- 20261003000000_phase2_rooms.sql -----
-- フェーズ2：ルーム（友達と同じ習慣に取り組む）
--
-- ルームの習慣は、メンバーごとに habits の行を1つ持つ（habits.room_id でルームと結びつく）。
-- 名前・アイコン・色はルームのものをメンバーの習慣にコピーして揃え、曜日は各自で決める。
-- ルームの作成・参加・退出などはすべて下の関数から行い、テーブルへの直接の書き込みはさせない。

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  icon text not null default '✅' check (char_length(icon) between 1 and 8),
  color text not null default 'orange'
    check (color in ('orange', 'rose', 'violet', 'sky', 'emerald', 'amber')),
  owner_id uuid not null references public.profiles (id),
  invite_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  -- left: 自分で退出 / removed: オーナーが外した / room_deleted: ルームの削除
  left_reason text check (left_reason in ('left', 'removed', 'room_deleted')),
  primary key (room_id, user_id),
  check ((left_at is null) = (left_reason is null))
);

create index room_members_user_id_idx on public.room_members (user_id);

alter table public.habits add column room_id uuid references public.rooms (id);
create index habits_room_id_idx on public.habits (room_id);

create table public.reactions (
  stamp_id uuid not null references public.stamps (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (stamp_id, user_id)
);

-- 1ルームの最大人数
create function public.room_max_members() returns int
language sql immutable
as $$ select 10 $$;

-- ---------------------------------------------------------------------------
-- アクセス制御用の関数（RLS の中から呼ぶため security definer で RLS を通さない）
-- ---------------------------------------------------------------------------

-- 自分が今参加しているルーム
create function public.my_room_ids() returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select m.room_id
  from public.room_members m
  join public.rooms r on r.id = m.room_id
  where m.user_id = auth.uid() and m.left_at is null and r.deleted_at is null
$$;

-- その人がそのルームに今参加しているか
create function public.is_active_member(p_room_id uuid, p_user_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = p_user_id and left_at is null
  )
$$;

-- 自分と同じルームに参加している人か
create function public.shares_room_with(p_user_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m
    where m.user_id = p_user_id and m.left_at is null
      and m.room_id in (select public.my_room_ids())
  )
$$;

revoke execute on function public.my_room_ids() from public, anon;
revoke execute on function public.is_active_member(uuid, uuid) from public, anon;
revoke execute on function public.shares_room_with(uuid) from public, anon;
grant execute on function public.my_room_ids() to authenticated;
grant execute on function public.is_active_member(uuid, uuid) to authenticated;
grant execute on function public.shares_room_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.reactions enable row level security;

create policy "参加中のルームを見られる" on public.rooms
  for select to authenticated using (id in (select public.my_room_ids()));

create policy "参加中のルームのメンバーを見られる" on public.room_members
  for select to authenticated
  using (left_at is null and room_id in (select public.my_room_ids()));

-- 同じルームのメンバーの表示名を見られる
create policy "ルームの仲間の表示名を見られる" on public.profiles
  for select to authenticated using (public.shares_room_with(id));

-- 同じルームのメンバーの、そのルームの習慣を見られる
create policy "ルームの仲間の習慣を見られる" on public.habits
  for select to authenticated
  using (
    room_id in (select public.my_room_ids())
    and public.is_active_member(room_id, user_id)
  );

-- 曜日設定とスタンプは「見られる習慣」のものを見られる（habits の RLS がそのまま効く）
drop policy "自分の習慣の曜日設定を見られる" on public.habit_schedules;
create policy "見られる習慣の曜日設定を見られる" on public.habit_schedules
  for select to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id));

drop policy "自分の習慣のスタンプを見られる" on public.stamps;
create policy "見られる習慣のスタンプを見られる" on public.stamps
  for select to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id));

-- ルームの習慣は直接作れない（create_room / join_room から作る）
drop policy "自分の習慣を作れる" on public.habits;
create policy "自分の習慣を作れる" on public.habits
  for insert to authenticated with check (user_id = (select auth.uid()) and room_id is null);

-- ルームの習慣は、退出してアーカイブになった後なら削除できる
drop policy "自分の習慣を削除できる" on public.habits;
create policy "自分の習慣を削除できる" on public.habits
  for delete to authenticated
  using (user_id = (select auth.uid()) and (room_id is null or archived_at is not null));

create policy "リアクションを見られる" on public.reactions
  for select to authenticated
  using (exists (select 1 from public.stamps s where s.id = stamp_id));

-- 👏を送れるのは、参加中のルームの、自分以外のメンバーのスタンプ
create policy "リアクションを送れる" on public.reactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.stamps s
      join public.habits h on h.id = s.habit_id
      where s.id = stamp_id and h.room_id is not null and h.user_id <> (select auth.uid())
    )
  );

create policy "自分のリアクションを取り消せる" on public.reactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ルームの習慣は、ルーム用の関数を通してしか変えられないようにする
-- ---------------------------------------------------------------------------

-- ルーム用の関数の中だけで on にする
create function public.room_write_allowed() returns boolean
language sql stable
as $$ select coalesce(current_setting('app.room_write', true), '') = 'on' $$;

create function public.allow_room_write() returns void
language sql volatile
as $$ select set_config('app.room_write', 'on', true) $$;

create or replace function public.habits_protect_columns() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id or new.start_date <> old.start_date
     or new.room_id is distinct from old.room_id then
    raise exception 'habit_immutable_column';
  end if;
  -- ルームの習慣の名前・アイコン・色・アーカイブ状態は、ルームの操作でだけ変わる
  if old.room_id is not null and not public.room_write_allowed() and (
    new.name <> old.name or new.icon <> old.icon or new.color <> old.color
    or new.archived_at is distinct from old.archived_at
  ) then
    raise exception 'room_habit_managed_by_room';
  end if;
  return new;
end;
$$;

-- ルームの習慣は名前・アイコン・色を変えず、曜日だけ変える
create or replace function public.update_habit(
  p_habit_id uuid, p_name text, p_icon text, p_color text, p_weekdays smallint[]
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_weekdays smallint[] := public.normalize_weekdays(p_weekdays);
  v_current smallint[];
  v_room_id uuid;
begin
  select room_id into v_room_id
  from public.habits
  where id = p_habit_id and user_id = auth.uid() and archived_at is null;
  if not found then
    raise exception 'habit_not_found';
  end if;

  if v_room_id is null then
    update public.habits set name = trim(p_name), icon = p_icon, color = p_color where id = p_habit_id;
  end if;

  select weekdays into v_current
  from public.habit_schedules
  where habit_id = p_habit_id and valid_from <= public.app_today()
  order by valid_from desc
  limit 1;

  if v_current is distinct from v_weekdays then
    insert into public.habit_schedules (habit_id, weekdays, valid_from)
    values (p_habit_id, v_weekdays, public.app_today())
    on conflict (habit_id, valid_from) do update set weekdays = excluded.weekdays;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- ルームの操作
-- ---------------------------------------------------------------------------

-- 自分がオーナーの、削除されていないルームを取り出す
create function public.owned_room(p_room_id uuid) returns public.rooms
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room_id and deleted_at is null;
  if not found or v_room.owner_id <> auth.uid() then
    raise exception 'not_room_owner';
  end if;
  return v_room;
end;
$$;

-- メンバーを抜けさせ、その人のルームの習慣をアーカイブする
create function public.end_membership(p_room_id uuid, p_user_id uuid, p_reason text) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.allow_room_write();
  update public.habits h set archived_at = now()
  from public.room_members m
  where m.room_id = p_room_id and m.user_id = p_user_id and m.left_at is null and h.id = m.habit_id;
  update public.room_members set left_at = now(), left_reason = p_reason
  where room_id = p_room_id and user_id = p_user_id and left_at is null;
end;
$$;

create function public.create_room(
  p_name text, p_icon text, p_color text, p_weekdays smallint[]
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_room_id uuid;
  v_habit_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.rooms (name, icon, color, owner_id)
  values (trim(p_name), p_icon, p_color, auth.uid())
  returning id into v_room_id;

  insert into public.habits (user_id, room_id, name, icon, color)
  values (auth.uid(), v_room_id, trim(p_name), p_icon, p_color)
  returning id into v_habit_id;

  insert into public.habit_schedules (habit_id, weekdays, valid_from)
  values (v_habit_id, public.normalize_weekdays(p_weekdays), public.app_today());

  insert into public.room_members (room_id, user_id, habit_id)
  values (v_room_id, auth.uid(), v_habit_id);

  return v_room_id;
end;
$$;

-- 招待URLを開いたときに見せる情報
create function public.get_invite(p_token text)
returns table (room_id uuid, name text, icon text, color text, owner_name text, member_count int, status text)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_member public.room_members;
  v_count int;
begin
  select * into v_room from public.rooms r where r.invite_token = p_token and r.deleted_at is null;
  if not found then
    return query select null::uuid, null::text, null::text, null::text, null::text, 0, 'not_found';
    return;
  end if;

  select * into v_member from public.room_members m where m.room_id = v_room.id and m.user_id = auth.uid();
  select count(*) into v_count from public.room_members m where m.room_id = v_room.id and m.left_at is null;

  return query
  select v_room.id, v_room.name, v_room.icon, v_room.color,
    (select p.display_name from public.profiles p where p.id = v_room.owner_id),
    v_count,
    case
      when v_member.user_id is not null and v_member.left_at is null then 'member'
      when v_member.left_reason = 'removed' then 'removed'
      when v_count >= public.room_max_members() then 'full'
      else 'ok'
    end;
end;
$$;

create function public.join_room(p_token text, p_weekdays smallint[]) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_member public.room_members;
  v_habit_id uuid;
  v_weekdays smallint[] := public.normalize_weekdays(p_weekdays);
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_room from public.rooms where invite_token = p_token and deleted_at is null for update;
  if not found then
    raise exception 'invite_not_found';
  end if;

  select * into v_member from public.room_members where room_id = v_room.id and user_id = auth.uid();
  if v_member.user_id is not null and v_member.left_at is null then
    return v_room.id;
  end if;
  if v_member.left_reason = 'removed' then
    raise exception 'removed_from_room';
  end if;
  if (select count(*) from public.room_members where room_id = v_room.id and left_at is null)
     >= public.room_max_members() then
    raise exception 'room_full';
  end if;

  perform public.allow_room_write();

  if v_member.user_id is not null then
    -- 再参加：アーカイブした習慣を戻し、以前の記録を引き継ぐ
    v_habit_id := v_member.habit_id;
    update public.habits
    set archived_at = null, name = v_room.name, icon = v_room.icon, color = v_room.color
    where id = v_habit_id;
    insert into public.habit_schedules (habit_id, weekdays, valid_from)
    values (v_habit_id, v_weekdays, public.app_today())
    on conflict (habit_id, valid_from) do update set weekdays = excluded.weekdays;
    update public.room_members
    set left_at = null, left_reason = null
    where room_id = v_room.id and user_id = auth.uid();
  else
    insert into public.habits (user_id, room_id, name, icon, color)
    values (auth.uid(), v_room.id, v_room.name, v_room.icon, v_room.color)
    returning id into v_habit_id;
    insert into public.habit_schedules (habit_id, weekdays, valid_from)
    values (v_habit_id, v_weekdays, public.app_today());
    insert into public.room_members (room_id, user_id, habit_id)
    values (v_room.id, auth.uid(), v_habit_id);
  end if;

  return v_room.id;
end;
$$;

-- 退出。オーナーは次のオーナーを指定する。ほかにメンバーがいなければルームを削除する
create function public.leave_room(p_room_id uuid, p_new_owner uuid default null) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_others int;
begin
  select * into v_room from public.rooms where id = p_room_id and deleted_at is null for update;
  if not found or not public.is_active_member(p_room_id, auth.uid()) then
    raise exception 'not_room_member';
  end if;

  if v_room.owner_id = auth.uid() then
    select count(*) into v_others from public.room_members
    where room_id = p_room_id and left_at is null and user_id <> auth.uid();
    if v_others = 0 then
      perform public.delete_room(p_room_id);
      return;
    end if;
    if p_new_owner is null or p_new_owner = auth.uid()
       or not public.is_active_member(p_room_id, p_new_owner) then
      raise exception 'new_owner_required';
    end if;
    update public.rooms set owner_id = p_new_owner where id = p_room_id;
  end if;

  perform public.end_membership(p_room_id, auth.uid(), 'left');
end;
$$;

create function public.remove_member(p_room_id uuid, p_user_id uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.owned_room(p_room_id);
  if p_user_id = auth.uid() or not public.is_active_member(p_room_id, p_user_id) then
    raise exception 'not_room_member';
  end if;
  perform public.end_membership(p_room_id, p_user_id, 'removed');
end;
$$;

create function public.delete_room(p_room_id uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  perform public.owned_room(p_room_id);
  for v_user_id in
    select user_id from public.room_members where room_id = p_room_id and left_at is null
  loop
    perform public.end_membership(p_room_id, v_user_id, 'room_deleted');
  end loop;
  update public.rooms set deleted_at = now() where id = p_room_id;
end;
$$;

-- 名前・アイコン・色を変え、参加中のメンバーの習慣にも反映する
create function public.update_room(p_room_id uuid, p_name text, p_icon text, p_color text) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.owned_room(p_room_id);
  update public.rooms set name = trim(p_name), icon = p_icon, color = p_color where id = p_room_id;
  perform public.allow_room_write();
  update public.habits h set name = trim(p_name), icon = p_icon, color = p_color
  from public.room_members m
  where m.room_id = p_room_id and m.left_at is null and h.id = m.habit_id;
end;
$$;

-- 招待URLを作り直す（古いURLは使えなくなる）
create function public.regenerate_invite(p_room_id uuid) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_token text := replace(gen_random_uuid()::text, '-', '');
begin
  perform public.owned_room(p_room_id);
  update public.rooms set invite_token = v_token where id = p_room_id;
  return v_token;
end;
$$;

-- 内部用の関数は外から呼ばせない
revoke execute on function public.owned_room(uuid) from public, anon, authenticated;
revoke execute on function public.end_membership(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.allow_room_write() from public, anon, authenticated;

revoke execute on function public.create_room(text, text, text, smallint[]) from public, anon;
revoke execute on function public.get_invite(text) from public, anon;
revoke execute on function public.join_room(text, smallint[]) from public, anon;
revoke execute on function public.leave_room(uuid, uuid) from public, anon;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
revoke execute on function public.delete_room(uuid) from public, anon;
revoke execute on function public.update_room(uuid, text, text, text) from public, anon;
revoke execute on function public.regenerate_invite(uuid) from public, anon;
grant execute on function public.create_room(text, text, text, smallint[]) to authenticated;
grant execute on function public.get_invite(text) to authenticated;
grant execute on function public.join_room(text, smallint[]) to authenticated;
grant execute on function public.leave_room(uuid, uuid) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.delete_room(uuid) to authenticated;
grant execute on function public.update_room(uuid, text, text, text) to authenticated;
grant execute on function public.regenerate_invite(uuid) to authenticated;

