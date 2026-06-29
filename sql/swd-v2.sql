-- SWD v2.0 - uzupełnienie bazy pod dokumenty, panel dowódcy i archiwum

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
('bron_palna', 'UBP'),
('paralizator', 'UP'),
('wniosek_o_ukaranie', 'WU'),
('zatrzymanie_dokumentu', 'PZD')
on conflict (typ) do nothing;

create table if not exists public.historia_zmian (
    id bigint generated always as identity primary key,
    created_at timestamp with time zone default now(),
    tabela text,
    rekord_id bigint,
    akcja text,
    opis text,
    uzytkownik text,
    rola text,
    dane_przed jsonb,
    dane_po jsonb
);

create table if not exists public.aktywnosc (
    id bigint generated always as identity primary key,
    created_at timestamp with time zone default now(),
    uzytkownik text,
    rola text,
    akcja text,
    opis text
);

alter table public.dokumenty
add column if not exists numer_dokumentu text,
add column if not exists deleted_at timestamp with time zone,
add column if not exists deleted_by text,
add column if not exists zatwierdzone_przez text,
add column if not exists zatwierdzone_at timestamp with time zone,
add column if not exists podpis_elektroniczny text,
add column if not exists uwagi_dowodcy text,
add column if not exists sprawdzone_przez text,
add column if not exists sprawdzone_at timestamp with time zone;

alter table public.dokumenty enable row level security;
alter table public.numeracja_dokumentow enable row level security;
alter table public.historia_zmian enable row level security;
alter table public.aktywnosc enable row level security;

drop policy if exists "dokumenty_select" on public.dokumenty;
drop policy if exists "dokumenty_insert" on public.dokumenty;
drop policy if exists "dokumenty_update" on public.dokumenty;

create policy "dokumenty_select"
on public.dokumenty
for select
to authenticated
using (true);

create policy "dokumenty_insert"
on public.dokumenty
for insert
to authenticated
with check (true);

create policy "dokumenty_update"
on public.dokumenty
for update
to authenticated
using (true)
with check (true);

drop policy if exists "numeracja_select" on public.numeracja_dokumentow;
drop policy if exists "numeracja_update" on public.numeracja_dokumentow;

create policy "numeracja_select"
on public.numeracja_dokumentow
for select
to authenticated
using (true);

create policy "numeracja_update"
on public.numeracja_dokumentow
for update
to authenticated
using (true)
with check (true);

drop policy if exists "historia_select" on public.historia_zmian;
drop policy if exists "historia_insert" on public.historia_zmian;

create policy "historia_select"
on public.historia_zmian
for select
to authenticated
using (true);

create policy "historia_insert"
on public.historia_zmian
for insert
to authenticated
with check (true);

drop policy if exists "aktywnosc_select" on public.aktywnosc;
drop policy if exists "aktywnosc_insert" on public.aktywnosc;

create policy "aktywnosc_select"
on public.aktywnosc
for select
to authenticated
using (true);

create policy "aktywnosc_insert"
on public.aktywnosc
for insert
to authenticated
with check (true);
