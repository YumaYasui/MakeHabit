-- 1日に複数回スタンプを押せるようにする
--
-- スタンプは今までどおり「1習慣・1日につき1行」で、その日に何回やったかを count に持つ。
-- 1回以上押した日が「やった日」なので、連続や全員達成の判定は変わらない。
-- 既存のスタンプは count = 1（1回）になる。

alter table public.stamps
  add column count smallint not null default 1;

alter table public.stamps
  add constraint stamps_count_range check (count between 1 and 10);

-- 回数の書き換えは、押せる期間内（今日と過去7日以内）の自分の習慣だけ
create policy "スタンプの回数を変えられる" on public.stamps
  for update to authenticated
  using (
    date between public.app_today() - 7 and public.app_today()
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = (select auth.uid()) and h.archived_at is null
    )
  )
  with check (
    date between public.app_today() - 7 and public.app_today()
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = (select auth.uid()) and h.archived_at is null
    )
  );

-- 変えてよいのは回数だけ
create function public.stamps_protect_columns() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.habit_id <> old.habit_id or new.date <> old.date
     or new.is_late <> old.is_late or new.stamped_at <> old.stamped_at then
    raise exception 'stamp_immutable_column';
  end if;
  return new;
end;
$$;

create trigger stamps_protect_columns
  before update on public.stamps
  for each row execute function public.stamps_protect_columns();

-- 1回増やす。その日のスタンプがなければ作る。増やした後の回数を返す
-- security invoker なので、押せる期間や持ち主の確認は RLS がそのまま行う
create function public.add_stamp(p_habit_id uuid, p_date date) returns smallint
language plpgsql
set search_path = ''
as $$
declare
  v_count smallint;
begin
  insert into public.stamps (habit_id, date)
  values (p_habit_id, p_date)
  on conflict (habit_id, date) do update set count = public.stamps.count + 1
  returning count into v_count;
  return v_count;
exception
  when check_violation then
    raise exception 'stamp_limit_reached';
end;
$$;

-- 1回減らす。1回だったらスタンプを消す。減らした後の回数を返す（消えたら 0）
create function public.remove_stamp(p_habit_id uuid, p_date date) returns smallint
language plpgsql
set search_path = ''
as $$
declare
  v_count smallint;
begin
  update public.stamps set count = count - 1
  where habit_id = p_habit_id and date = p_date and count > 1
  returning count into v_count;
  if found then
    return v_count;
  end if;

  delete from public.stamps where habit_id = p_habit_id and date = p_date;
  if not found then
    raise exception 'stamp_not_found';
  end if;
  return 0;
end;
$$;

revoke execute on function public.add_stamp(uuid, date) from public, anon;
revoke execute on function public.remove_stamp(uuid, date) from public, anon;
grant execute on function public.add_stamp(uuid, date) to authenticated;
grant execute on function public.remove_stamp(uuid, date) to authenticated;
