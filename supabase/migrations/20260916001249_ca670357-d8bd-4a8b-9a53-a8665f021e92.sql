create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_division int not null check (start_division between 1 and 10),
  created_at timestamptz not null default now()
);
grant select on public.teams to anon, authenticated;
grant all on public.teams to service_role;
alter table public.teams enable row level security;
create policy "teams public read" on public.teams for select using (true);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_monday date not null,
  total_weeks int not null default 10,
  current_week int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.seasons to anon, authenticated;
grant all on public.seasons to service_role;
alter table public.seasons enable row level security;
create policy "seasons public read" on public.seasons for select using (true);

create table public.week_slots (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  week_no int not null check (week_no between 1 and 52),
  team_id uuid not null references public.teams(id) on delete cascade,
  division int not null check (division between 1 and 10),
  position int not null check (position between 1 and 3),
  tie_break_adj int not null default 0,
  unique (season_id, week_no, team_id),
  unique (season_id, week_no, division, position)
);
grant select on public.week_slots to anon, authenticated;
grant all on public.week_slots to service_role;
alter table public.week_slots enable row level security;
create policy "week_slots public read" on public.week_slots for select using (true);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  week_no int not null,
  division int not null check (division between 1 and 10),
  match_no int not null check (match_no between 1 and 3),
  team_a_id uuid not null references public.teams(id) on delete cascade,
  team_b_id uuid not null references public.teams(id) on delete cascade,
  court int not null,
  start_time text not null,
  status text not null default 'scheduled' check (status in ('scheduled','pending','final')),
  s1a int, s1b int, s2a int, s2b int, s3a int, s3b int,
  submitted_by text,
  submitted_at timestamptz,
  approved_at timestamptz,
  unique (season_id, week_no, division, match_no)
);
grant select on public.matches to anon, authenticated;
grant all on public.matches to service_role;
alter table public.matches enable row level security;
create policy "matches public read" on public.matches for select using (true);

create index matches_week_idx on public.matches (season_id, week_no);
create index week_slots_week_idx on public.week_slots (season_id, week_no);

insert into public.teams (name, start_division) values
('May Day',1),
('Friskt Vågat',1),
('Kerala Blasters',1),
('Reunion',2),
('JAK & DM Smashers',2),
('Hum Tum',2),
('Sundhlöfs',3),
('Comeback',3),
('Side by Side',3),
('GGG',4),
('WINTER STRIKERS',4),
('Voltage Vectors',4),
('Ludvika Smashers',5),
('Andhra Vikings',5),
('Lightning Boys',5),
('Sjukstugan',6),
('Desi divas',6),
('SuperKings',6),
('Punjab Power',7),
('Baddfolk 2.0',7),
('The Legends',7),
('Lilla Grid',8),
('Kir',8),
('Pumpa Gubbe',8),
('Madbinton',9),
('Hällarna',9),
('Örnbjörn',9),
('Sokiyans',10),
('Peboi',10),
('Fjäderfäna',10);

insert into public.seasons (name, start_monday, current_week) values ('Motionsserien HT-26','2026-09-07',2);

insert into public.week_slots (season_id, week_no, division, position, team_id)
select s.id, v.wk, v.div, v.pos, t.id from (values
(1,1,1,'May Day'),
(1,1,2,'Friskt Vågat'),
(1,1,3,'Kerala Blasters'),
(1,2,1,'Reunion'),
(1,2,2,'JAK & DM Smashers'),
(1,2,3,'Hum Tum'),
(1,3,1,'Sundhlöfs'),
(1,3,2,'Comeback'),
(1,3,3,'Side by Side'),
(1,4,1,'GGG'),
(1,4,2,'WINTER STRIKERS'),
(1,4,3,'Voltage Vectors'),
(1,5,1,'Ludvika Smashers'),
(1,5,2,'Andhra Vikings'),
(1,5,3,'Lightning Boys'),
(1,6,1,'Sjukstugan'),
(1,6,2,'Desi divas'),
(1,6,3,'SuperKings'),
(1,7,1,'Punjab Power'),
(1,7,2,'Baddfolk 2.0'),
(1,7,3,'The Legends'),
(1,8,1,'Lilla Grid'),
(1,8,2,'Kir'),
(1,8,3,'Pumpa Gubbe'),
(1,9,1,'Madbinton'),
(1,9,2,'Hällarna'),
(1,9,3,'Örnbjörn'),
(1,10,1,'Sokiyans'),
(1,10,2,'Peboi'),
(1,10,3,'Fjäderfäna'),
(2,1,1,'Kerala Blasters'),
(2,1,2,'May Day'),
(2,1,3,'Reunion'),
(2,2,1,'Friskt Vågat'),
(2,2,2,'JAK & DM Smashers'),
(2,2,3,'Comeback'),
(2,3,1,'Hum Tum'),
(2,3,2,'Side by Side'),
(2,3,3,'WINTER STRIKERS'),
(2,4,1,'Sundhlöfs'),
(2,4,2,'GGG'),
(2,4,3,'Andhra Vikings'),
(2,5,1,'Voltage Vectors'),
(2,5,2,'Lightning Boys'),
(2,5,3,'SuperKings'),
(2,6,1,'Ludvika Smashers'),
(2,6,2,'Sjukstugan'),
(2,6,3,'Baddfolk 2.0'),
(2,7,1,'Desi divas'),
(2,7,2,'The Legends'),
(2,7,3,'Kir'),
(2,8,1,'Punjab Power'),
(2,8,2,'Lilla Grid'),
(2,8,3,'Hällarna'),
(2,9,1,'Pumpa Gubbe'),
(2,9,2,'Madbinton'),
(2,9,3,'Peboi'),
(2,10,1,'Örnbjörn'),
(2,10,2,'Sokiyans'),
(2,10,3,'Fjäderfäna')
) as v(wk,div,pos,nm) join public.teams t on t.name = v.nm cross join public.seasons s where s.name='Motionsserien HT-26';

insert into public.matches (season_id, week_no, division, match_no, team_a_id, team_b_id, court, start_time, status, s1a,s1b,s2a,s2b,s3a,s3b, approved_at)
select s.id, v.wk, v.div, v.mn, ta.id, tb.id, v.court, v.st, v.status, v.s1a,v.s1b,v.s2a,v.s2b,v.s3a,v.s3b, case when v.status='final' then now() end from (values
(1,1,1,'May Day','Friskt Vågat',1,'19:00','final',20,21,21,15,8,11),
(1,1,2,'Friskt Vågat','Kerala Blasters',1,'19:20','final',16,21,13,21,null,null),
(1,1,3,'May Day','Kerala Blasters',1,'19:40','final',16,21,21,14,11,6),
(1,2,1,'Reunion','JAK & DM Smashers',2,'19:00','final',21,17,21,20,null,null),
(1,2,2,'JAK & DM Smashers','Hum Tum',2,'19:20','final',21,13,21,16,null,null),
(1,2,3,'Reunion','Hum Tum',2,'19:40','final',21,19,21,14,null,null),
(1,3,1,'Sundhlöfs','Comeback',3,'19:00','final',18,21,8,21,null,null),
(1,3,2,'Comeback','Side by Side',3,'19:20','final',21,14,21,17,null,null),
(1,3,3,'Sundhlöfs','Side by Side',3,'19:40','final',8,21,17,21,null,null),
(1,4,1,'GGG','WINTER STRIKERS',4,'19:00','final',21,12,9,21,5,11),
(1,4,2,'WINTER STRIKERS','Voltage Vectors',4,'19:20','final',21,0,21,0,null,null),
(1,4,3,'GGG','Voltage Vectors',4,'19:40','final',21,0,21,0,null,null),
(1,5,1,'Ludvika Smashers','Andhra Vikings',5,'19:00','final',12,21,21,20,5,11),
(1,5,2,'Andhra Vikings','Lightning Boys',5,'19:20','final',21,14,21,16,null,null),
(1,5,3,'Ludvika Smashers','Lightning Boys',5,'19:40','final',14,21,15,21,null,null),
(1,6,1,'Sjukstugan','Desi divas',1,'20:00','final',21,15,21,13,null,null),
(1,6,2,'Desi divas','SuperKings',1,'20:20','final',15,21,16,21,null,null),
(1,6,3,'Sjukstugan','SuperKings',1,'20:40','final',21,20,19,21,6,11),
(1,7,1,'Punjab Power','Baddfolk 2.0',2,'20:00','final',20,21,15,21,null,null),
(1,7,2,'Baddfolk 2.0','The Legends',2,'20:20','final',21,19,21,13,null,null),
(1,7,3,'Punjab Power','The Legends',2,'20:40','final',18,21,13,21,null,null),
(1,8,1,'Lilla Grid','Kir',3,'20:00','final',6,21,13,21,null,null),
(1,8,2,'Kir','Pumpa Gubbe',3,'20:20','final',21,19,11,21,11,6),
(1,8,3,'Lilla Grid','Pumpa Gubbe',3,'20:40','final',21,12,21,19,null,null),
(1,9,1,'Madbinton','Hällarna',4,'20:00','final',21,14,20,21,10,11),
(1,9,2,'Hällarna','Örnbjörn',4,'20:20','final',21,11,12,21,11,6),
(1,9,3,'Madbinton','Örnbjörn',4,'20:40','final',0,0,0,0,null,null),
(1,10,1,'Sokiyans','Peboi',5,'20:00','final',8,21,9,21,null,null),
(1,10,2,'Peboi','Fjäderfäna',5,'20:20','final',21,7,21,13,null,null),
(1,10,3,'Sokiyans','Fjäderfäna',5,'20:40','final',21,12,10,21,11,6),
(2,1,1,'Kerala Blasters','May Day',1,'19:00','scheduled',null,null,null,null,null,null),
(2,1,2,'May Day','Reunion',1,'19:20','scheduled',null,null,null,null,null,null),
(2,1,3,'Kerala Blasters','Reunion',1,'19:40','scheduled',null,null,null,null,null,null),
(2,2,1,'Friskt Vågat','JAK & DM Smashers',2,'19:00','scheduled',null,null,null,null,null,null),
(2,2,2,'JAK & DM Smashers','Comeback',2,'19:20','scheduled',null,null,null,null,null,null),
(2,2,3,'Friskt Vågat','Comeback',2,'19:40','scheduled',null,null,null,null,null,null),
(2,3,1,'Hum Tum','Side by Side',3,'19:00','scheduled',null,null,null,null,null,null),
(2,3,2,'Side by Side','WINTER STRIKERS',3,'19:20','scheduled',null,null,null,null,null,null),
(2,3,3,'Hum Tum','WINTER STRIKERS',3,'19:40','scheduled',null,null,null,null,null,null),
(2,4,1,'Sundhlöfs','GGG',4,'19:00','scheduled',null,null,null,null,null,null),
(2,4,2,'GGG','Andhra Vikings',4,'19:20','scheduled',null,null,null,null,null,null),
(2,4,3,'Sundhlöfs','Andhra Vikings',4,'19:40','scheduled',null,null,null,null,null,null),
(2,5,1,'Voltage Vectors','Lightning Boys',5,'19:00','scheduled',null,null,null,null,null,null),
(2,5,2,'Lightning Boys','SuperKings',5,'19:20','scheduled',null,null,null,null,null,null),
(2,5,3,'Voltage Vectors','SuperKings',5,'19:40','scheduled',null,null,null,null,null,null),
(2,6,1,'Ludvika Smashers','Sjukstugan',1,'20:00','scheduled',null,null,null,null,null,null),
(2,6,2,'Sjukstugan','Baddfolk 2.0',1,'20:20','scheduled',null,null,null,null,null,null),
(2,6,3,'Ludvika Smashers','Baddfolk 2.0',1,'20:40','scheduled',null,null,null,null,null,null),
(2,7,1,'Desi divas','The Legends',2,'20:00','scheduled',null,null,null,null,null,null),
(2,7,2,'The Legends','Kir',2,'20:20','scheduled',null,null,null,null,null,null),
(2,7,3,'Desi divas','Kir',2,'20:40','scheduled',null,null,null,null,null,null),
(2,8,1,'Punjab Power','Lilla Grid',3,'20:00','scheduled',null,null,null,null,null,null),
(2,8,2,'Lilla Grid','Hällarna',3,'20:20','scheduled',null,null,null,null,null,null),
(2,8,3,'Punjab Power','Hällarna',3,'20:40','scheduled',null,null,null,null,null,null),
(2,9,1,'Pumpa Gubbe','Madbinton',4,'20:00','scheduled',null,null,null,null,null,null),
(2,9,2,'Madbinton','Peboi',4,'20:20','scheduled',null,null,null,null,null,null),
(2,9,3,'Pumpa Gubbe','Peboi',4,'20:40','scheduled',null,null,null,null,null,null),
(2,10,1,'Örnbjörn','Sokiyans',5,'20:00','scheduled',null,null,null,null,null,null),
(2,10,2,'Sokiyans','Fjäderfäna',5,'20:20','scheduled',null,null,null,null,null,null),
(2,10,3,'Örnbjörn','Fjäderfäna',5,'20:40','scheduled',null,null,null,null,null,null)
) as v(wk,div,mn,na,nb,court,st,status,s1a,s1b,s2a,s2b,s3a,s3b)
join public.teams ta on ta.name = v.na join public.teams tb on tb.name = v.nb
cross join public.seasons s where s.name='Motionsserien HT-26';