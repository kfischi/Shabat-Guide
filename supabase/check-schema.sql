-- ============================================================
--  MULTIBRAWN CHECK — טבלאות (Supabase · SQL Editor · הרצה אחת)
--  אותו פרויקט Supabase של multibrawn.co.il. כל הטבלאות בקידומת check_ כדי לא להתנגש ב-leads הקיים.
--  RLS פעיל בלי policies: אין גישה מהדפדפן. רק הפונקציות בשרת (service role) קוראות וכותבות.
-- ============================================================

-- מקומות
create table if not exists check_venues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  venue_type text,                       -- אולם / גן אירועים / יקב / מלון עם אולם / מתחם מיוחד
  city text,
  area text not null,                    -- חייב להתאים לרשימת האזורים בשאלון (public/check/options.js)
  capacity_min int,
  capacity_max int not null,
  kashrut text,                          -- הכשר מדויק, מתוך הרשימה בשאלון
  kashrut_verified boolean not null default false,
  contact_name text,
  phone text not null,
  virtual_tour_url text,
  agreement_status text not null default 'none' check (agreement_status in ('none', 'sent', 'signed')),
  active boolean not null default false,
  source_url text,                       -- קישור בעמוד "מקומות לאירועים"
  notes text
);
create index if not exists idx_check_venues_match on check_venues (active, area, capacity_max);

-- עד 10 מקומות פעילים בכל אזור (התחייבות של ערדית)
create or replace function check_venue_area_limit() returns trigger language plpgsql as $$
begin
  if new.active and (
    select count(*) from check_venues where active and area = new.area and id <> new.id
  ) >= 10 then
    raise exception 'כבר יש 10 מקומות פעילים באזור %', new.area;
  end if;
  return new;
end $$;
drop trigger if exists trg_check_venue_area_limit on check_venues;
create trigger trg_check_venue_area_limit before insert or update of active, area on check_venues
  for each row execute function check_venue_area_limit();

-- זמינות (טופס שבועי של המקום). תאריך תפוס = המקום לא יקבל פנייה לתאריך הזה.
create table if not exists check_availability (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references check_venues(id) on delete cascade,
  date date not null,
  is_available boolean not null,
  cancelled_deal boolean not null default false,  -- תאריך שהתבטל
  special_price int,
  updated_at timestamptz not null default now(),
  unique (venue_id, date)
);

-- בקשות לקוח (השאלון)
create table if not exists check_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text,
  who text not null,                     -- לקוח פרטי / מפיק/ה
  event_type text not null,
  event_date date not null,
  time_of_day text,
  date_flexible boolean not null default false,
  flex_note text,
  guests int not null,
  areas text[] not null,
  venue_types text[] not null default '{}',
  budget_type text check (budget_type in ('per_guest', 'total')),
  budget_amount int,
  kashrut text[] not null,
  must_haves text[] not null default '{}',
  notes text,
  name text not null,
  phone text not null,
  email text,
  summary text not null,
  status text not null default 'new' check (status in ('new', 'approved', 'rejected', 'dispatched', 'closed')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'waived')),
  approved_at timestamptz,
  dispatched_at timestamptz
);
create index if not exists idx_check_requests_created on check_requests (created_at desc);
create index if not exists idx_check_requests_status on check_requests (status);

-- פניות: בקשה × מקום. הטוקן הוא הקישור האישי של המקום לענות.
create table if not exists check_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid not null references check_requests(id) on delete cascade,
  venue_id uuid not null references check_venues(id) on delete cascade,
  token text not null unique,
  status text not null default 'sent' check (status in ('sent', 'available', 'unavailable')),
  price int,
  price_type text check (price_type in ('per_guest', 'total')),
  venue_note text,
  replied_at timestamptz,
  client_details_shared boolean not null default false,
  unique (request_id, venue_id)
);

-- פגישות (שלב הבא: תזכורות ותוצאה דרך n8n)
create table if not exists check_meetings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid not null references check_requests(id) on delete cascade,
  venue_id uuid not null references check_venues(id) on delete cascade,
  inquiry_id uuid references check_inquiries(id) on delete set null,
  meeting_at timestamptz not null,
  client_confirm text not null default 'pending' check (client_confirm in ('pending', 'coming', 'postponed', 'cancelled')),
  outcome text check (outcome in ('closed', 'in_progress', 'not_fit', 'no_show')),
  final_guests int,
  notes text
);

alter table check_venues enable row level security;
alter table check_availability enable row level security;
alter table check_requests enable row level security;
alter table check_inquiries enable row level security;
alter table check_meetings enable row level security;
