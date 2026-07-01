-- Dokumenty policyjne v2 - numeracja i uprawnienia
create table if not exists public.numeracja_dokumentow (
    id bigint generated always as identity primary key,
    typ text unique not null,
    prefix text not null,
    rok integer not null default extract(year from now()),
    ostatni_numer integer not null default 0,
    format text default '{PREFIX}/{ROK}/{NUMER}'
);
insert into public.numeracja_dokumentow (typ, prefix)
values
('notatka_sluzbowa', 'NS'),
('notatka_urzedowa', 'NU'),
('raport_spb', 'RSPB'),
('wniosek_o_ukaranie', 'WU'),
('zatrzymanie_dokumentu', 'PZD')
on conflict (typ) do nothing;
alter table public.dokumenty
add column if not exists numer_dokumentu text,
add column if not exists deleted_at timestamp with time zone,
add column if not exists deleted_by text;
alter table public.dokumenty enable row level security;
alter table public.numeracja_dokumentow enable row level security;
drop policy if exists "dokumenty_select" on public.dokumenty;
drop policy if exists "dokumenty_insert" on public.dokumenty;
drop policy if exists "dokumenty_update" on public.dokumenty;
create policy "dokumenty_select" on public.dokumenty for select to authenticated using (true);
create policy "dokumenty_insert" on public.dokumenty for insert to authenticated with check (true);
create policy "dokumenty_update" on public.dokumenty for update to authenticated using (true) with check (true);
drop policy if exists "numeracja_select" on public.numeracja_dokumentow;
drop policy if exists "numeracja_update" on public.numeracja_dokumentow;
create policy "numeracja_select" on public.numeracja_dokumentow for select to authenticated using (true);
create policy "numeracja_update" on public.numeracja_dokumentow for update to authenticated using (true) with check (true);
