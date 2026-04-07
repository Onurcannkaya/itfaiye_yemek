import { createClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'itfaiye_supabase_config'

// Varsayılan Supabase bilgileri
export const DEFAULT_SUPABASE_URL = 'https://kxosilqixjljfedwaxuo.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4b3NpbHFpeGpsamZlZHdheHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzI2MTcsImV4cCI6MjA5MTE0ODYxN30.4uq_oUaUGlwnl0zYYkuXm-T3P-o8ovTEwTENV9IgQ6s'

export function getStoredConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveConfig(url, anonKey) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, anonKey }))
}

export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY)
}

export function createSupabase(url, anonKey) {
  return createClient(url, anonKey)
}

export const PERSONNEL_SEED = [
  { name: 'Hidayet Yücekaya', title: 'Başçavuş', order_index: 1 },
  { name: 'Ömer Çakmak', title: 'Çavuş', order_index: 2 },
  { name: 'Abdullah Übeyde Özkur', title: null, order_index: 3 },
  { name: 'Beyza Durak', title: null, order_index: 4 },
  { name: 'Beyza Kılıç', title: null, order_index: 5 },
  { name: 'Elif Tunçer', title: null, order_index: 6 },
  { name: 'Emir Furkan Taşdelen', title: null, order_index: 7 },
  { name: 'Fatih Güler', title: null, order_index: 8 },
  { name: 'Fatmanur Çolakoğlu', title: null, order_index: 9 },
  { name: 'Gülenay', title: null, order_index: 10 },
  { name: 'Hasan Çınar Kuzu', title: null, order_index: 11 },
  { name: 'İsmail Aslan', title: null, order_index: 12 },
  { name: 'Kadir Kuru', title: null, order_index: 13 },
  { name: 'Melih Arslan', title: null, order_index: 14 },
  { name: 'Muhammed Emin Kara', title: null, order_index: 15 },
  { name: 'Muhammed Enes Yıldırım', title: null, order_index: 16 },
  { name: 'Muhammed Kara', title: null, order_index: 17 },
  { name: 'Muhammed Yasir İnce', title: null, order_index: 18 },
  { name: 'Mustafa Demir', title: null, order_index: 19 },
  { name: 'Mustafa Köse', title: null, order_index: 20 },
  { name: 'Mustafa Metin Bıçakcigil', title: null, order_index: 21 },
  { name: 'Onurcan Kaya', title: null, order_index: 22 },
  { name: 'Selahattin Tosun', title: null, order_index: 23 },
  { name: 'Sencer Yıldız', title: null, order_index: 24 },
  { name: 'Uğur Budak', title: null, order_index: 25 },
  { name: 'Yağmur', title: null, order_index: 26 },
]

export const SQL_SCHEMA = `-- 1. Personel tablosu
create table if not exists personnel (
  id bigint primary key generated always as identity,
  name text not null,
  title text,
  order_index integer not null
);

-- 2. Ödeme tablosu
create table if not exists payments (
  id bigint primary key generated always as identity,
  person_id bigint not null references personnel(id) on delete cascade,
  amount numeric not null default 180,
  status text not null default 'unpaid' check (status in ('paid', 'unpaid')),
  payment_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique(person_id, payment_date)
);

-- 3. Index
create index if not exists idx_payments_date on payments(payment_date);

-- 4. RLS (anon key erişimi için)
alter table personnel enable row level security;
create policy "personnel_all" on personnel for all using (true) with check (true);

alter table payments enable row level security;
create policy "payments_all" on payments for all using (true) with check (true);

-- 5. Personel verilerini ekle
insert into personnel (name, title, order_index) values
('Hidayet Yücekaya', 'Başçavuş', 1),
('Ömer Çakmak', 'Çavuş', 2),
('Abdullah Übeyde Özkur', null, 3),
('Beyza Durak', null, 4),
('Beyza Kılıç', null, 5),
('Elif Tunçer', null, 6),
('Emir Furkan Taşdelen', null, 7),
('Fatih Güler', null, 8),
('Fatmanur Çolakoğlu', null, 9),
('Gülenay', null, 10),
('Hasan Çınar Kuzu', null, 11),
('İsmail Aslan', null, 12),
('Kadir Kuru', null, 13),
('Melih Arslan', null, 14),
('Muhammed Emin Kara', null, 15),
('Muhammed Enes Yıldırım', null, 16),
('Muhammed Kara', null, 17),
('Muhammed Yasir İnce', null, 18),
('Mustafa Demir', null, 19),
('Mustafa Köse', null, 20),
('Mustafa Metin Bıçakcigil', null, 21),
('Onurcan Kaya', null, 22),
('Selahattin Tosun', null, 23),
('Sencer Yıldız', null, 24),
('Uğur Budak', null, 25),
('Yağmur', null, 26);`
