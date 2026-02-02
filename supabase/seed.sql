-- Seed data for Open Invite application
-- This file seeds all data from constants.ts into Supabase
-- Run with: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
-- Or use: supabase db reset (which runs migrations and seed.sql automatically)

-- Clear existing seed data (idempotent)
DELETE FROM public.friend_requests WHERE requester_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000016',
  '00000000-0000-0000-0000-000000000017',
  '00000000-0000-0000-0000-000000000018',
  '00000000-0000-0000-0000-000000000019',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);
DELETE FROM public.notifications WHERE user_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000016',
  '00000000-0000-0000-0000-000000000017',
  '00000000-0000-0000-0000-000000000018',
  '00000000-0000-0000-0000-000000000019',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);
DELETE FROM public.reactions;
DELETE FROM public.comments;
DELETE FROM public.event_invites;
DELETE FROM public.event_groups;
DELETE FROM public.event_attendees;
DELETE FROM public.events;
DELETE FROM public.user_groups;
DELETE FROM public.groups;
DELETE FROM public.user_friends;
DELETE FROM public.user_profiles WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000016',
  '00000000-0000-0000-0000-000000000017',
  '00000000-0000-0000-0000-000000000018',
  '00000000-0000-0000-0000-000000000019',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);
DELETE FROM auth.identities WHERE user_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000016',
  '00000000-0000-0000-0000-000000000017',
  '00000000-0000-0000-0000-000000000018',
  '00000000-0000-0000-0000-000000000019',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);
DELETE FROM auth.users WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000016',
  '00000000-0000-0000-0000-000000000017',
  '00000000-0000-0000-0000-000000000018',
  '00000000-0000-0000-0000-000000000019',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);

-- User ID mappings (u1-u22 to UUIDs)
-- u1 = Alex Thompson
-- u2 = Sarah Chen
-- u3 = Marcus Williams
-- u4 = Elena Rodriguez
-- u5 = Raj Patel
-- u6 = Chloe Martin
-- u7 = Tom Baker
-- u8 = Maya Singh (not friends with Alex)
-- u9 = Ben Carter (not friends with Alex)
-- u10 = Nina Kowalski (not friends with Alex)
-- u11 = Omar Hassan (not friends with Alex)
-- u12 = Zoe Kim (not friends with Alex)
-- u13 = Liam O'Connor (friends with Alex)
-- u14 = Lily Zhang (friends with Alex)
-- u15 = Leo Fernandez (pending friend - sent request to Alex)
-- u16 = Sam Rivera (friends with Alex)
-- u17 = Sophia Nguyen (friends with Alex)
-- u18 = Jake Morrison (pending friend - Alex sent request)
-- u19 = Julia Bennett (pending friend - sent request to Alex)
-- u20 = Derek Foster (friends with Alex)
-- u21 = Diana Cruz (pending friend - Alex sent request)
-- u22 = Daniel Park (friends with Alex)

-- Insert auth users
-- Password for all users: "password123"
-- Using a pre-computed bcrypt hash for "password123" (cost factor 10)
-- Generated using Python: bcrypt.hashpw(b'password123', bcrypt.gensalt(rounds=10))
DO $$
DECLARE
  -- Pre-computed bcrypt hash for "password123" 
  pwd_hash TEXT := '$2b$10$0I3uxkUiK7UNSMAy4fSngeWdewlmQPloLbByct5GT6qC2BovC9Dzm';
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    role,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'alex@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'sarah@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'marcus@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'elena@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'raj@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'chloe@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'tom@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'maya@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'ben@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'nina@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'omar@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'zoe@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'liam@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'lily@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'leo@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000000', 'sam@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000000', 'sophia@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000000', 'jake@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000000', 'julia@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000', 'derek@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'diana@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', 'daniel@example.com', pwd_hash, NOW(), 'authenticated', 'authenticated', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '')
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Auth users inserted with password hash';
END $$;

-- Insert auth identities (required for Supabase auth to work)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"sub": "00000000-0000-0000-0000-000000000001", "email": "alex@example.com"}', 'email', 'alex@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '{"sub": "00000000-0000-0000-0000-000000000002", "email": "sarah@example.com"}', 'email', 'sarah@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '{"sub": "00000000-0000-0000-0000-000000000003", "email": "marcus@example.com"}', 'email', 'marcus@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '{"sub": "00000000-0000-0000-0000-000000000004", "email": "elena@example.com"}', 'email', 'elena@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', '{"sub": "00000000-0000-0000-0000-000000000005", "email": "raj@example.com"}', 'email', 'raj@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', '{"sub": "00000000-0000-0000-0000-000000000006", "email": "chloe@example.com"}', 'email', 'chloe@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000007', '{"sub": "00000000-0000-0000-0000-000000000007", "email": "tom@example.com"}', 'email', 'tom@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000008', '{"sub": "00000000-0000-0000-0000-000000000008", "email": "maya@example.com"}', 'email', 'maya@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000009', '{"sub": "00000000-0000-0000-0000-000000000009", "email": "ben@example.com"}', 'email', 'ben@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', '{"sub": "00000000-0000-0000-0000-000000000010", "email": "nina@example.com"}', 'email', 'nina@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', '{"sub": "00000000-0000-0000-0000-000000000011", "email": "omar@example.com"}', 'email', 'omar@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', '{"sub": "00000000-0000-0000-0000-000000000012", "email": "zoe@example.com"}', 'email', 'zoe@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000013', '{"sub": "00000000-0000-0000-0000-000000000013", "email": "liam@example.com"}', 'email', 'liam@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000014', '{"sub": "00000000-0000-0000-0000-000000000014", "email": "lily@example.com"}', 'email', 'lily@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000015', '{"sub": "00000000-0000-0000-0000-000000000015", "email": "leo@example.com"}', 'email', 'leo@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000016', '{"sub": "00000000-0000-0000-0000-000000000016", "email": "sam@example.com"}', 'email', 'sam@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000017', '{"sub": "00000000-0000-0000-0000-000000000017", "email": "sophia@example.com"}', 'email', 'sophia@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000018', '{"sub": "00000000-0000-0000-0000-000000000018", "email": "jake@example.com"}', 'email', 'jake@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000019', '{"sub": "00000000-0000-0000-0000-000000000019", "email": "julia@example.com"}', 'email', 'julia@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000020', '{"sub": "00000000-0000-0000-0000-000000000020", "email": "derek@example.com"}', 'email', 'derek@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000021', '{"sub": "00000000-0000-0000-0000-000000000021", "email": "diana@example.com"}', 'email', 'diana@example.com', NOW(), NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000022', '{"sub": "00000000-0000-0000-0000-000000000022", "email": "daniel@example.com"}', 'email', 'daniel@example.com', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert user profiles
INSERT INTO public.user_profiles (id, name, avatar) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alex Thompson', 'https://picsum.photos/seed/alex/100/100'),
  ('00000000-0000-0000-0000-000000000002', 'Sarah Chen', 'https://picsum.photos/seed/sarah/100/100'),
  ('00000000-0000-0000-0000-000000000003', 'Marcus Williams', 'https://picsum.photos/seed/marcus/100/100'),
  ('00000000-0000-0000-0000-000000000004', 'Elena Rodriguez', 'https://picsum.photos/seed/elena/100/100'),
  ('00000000-0000-0000-0000-000000000005', 'Raj Patel', 'https://picsum.photos/seed/raj/100/100'),
  ('00000000-0000-0000-0000-000000000006', 'Chloe Martin', 'https://picsum.photos/seed/chloe/100/100'),
  ('00000000-0000-0000-0000-000000000007', 'Tom Baker', 'https://picsum.photos/seed/tom/100/100'),
  ('00000000-0000-0000-0000-000000000008', 'Maya Singh', 'https://picsum.photos/seed/maya/100/100'),
  ('00000000-0000-0000-0000-000000000009', 'Ben Carter', 'https://picsum.photos/seed/ben/100/100'),
  ('00000000-0000-0000-0000-000000000010', 'Nina Kowalski', 'https://picsum.photos/seed/nina/100/100'),
  ('00000000-0000-0000-0000-000000000011', 'Omar Hassan', 'https://picsum.photos/seed/omar/100/100'),
  ('00000000-0000-0000-0000-000000000012', 'Zoe Kim', 'https://picsum.photos/seed/zoe/100/100'),
  ('00000000-0000-0000-0000-000000000013', 'Liam O''Connor', 'https://picsum.photos/seed/liam/100/100'),
  ('00000000-0000-0000-0000-000000000014', 'Lily Zhang', 'https://picsum.photos/seed/lily/100/100'),
  ('00000000-0000-0000-0000-000000000015', 'Leo Fernandez', 'https://picsum.photos/seed/leo/100/100'),
  ('00000000-0000-0000-0000-000000000016', 'Sam Rivera', 'https://picsum.photos/seed/sam/100/100'),
  ('00000000-0000-0000-0000-000000000017', 'Sophia Nguyen', 'https://picsum.photos/seed/sophia/100/100'),
  ('00000000-0000-0000-0000-000000000018', 'Jake Morrison', 'https://picsum.photos/seed/jake/100/100'),
  ('00000000-0000-0000-0000-000000000019', 'Julia Bennett', 'https://picsum.photos/seed/julia/100/100'),
  ('00000000-0000-0000-0000-000000000020', 'Derek Foster', 'https://picsum.photos/seed/derek/100/100'),
  ('00000000-0000-0000-0000-000000000021', 'Diana Cruz', 'https://picsum.photos/seed/diana/100/100'),
  ('00000000-0000-0000-0000-000000000022', 'Daniel Park', 'https://picsum.photos/seed/daniel/100/100')
ON CONFLICT (id) DO NOTHING;

-- Event ID mappings (e1-e35 to UUIDs)
-- Using fixed UUIDs for consistency

-- Insert events
INSERT INTO public.events (
  id, host_id, title, description, activity_type, location, coordinates,
  start_time, end_time, is_flexible_start, is_flexible_end, visibility_type, max_seats, no_phones, allow_friend_invites
) VALUES
  -- e1: Bouldering at Crag X (GROUPS: CLIMBERS) - 2 hours
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Bouldering at Crag X', 'Projecting the new V4s in the cave. Come hang!', 'Sport', '769 Pandora Ave', '{"lat": 48.4293, "lng": -123.3635}'::jsonb, date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '17 hours' + INTERVAL '30 minutes', date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '19 hours' + INTERVAL '30 minutes', false, true, 'GROUPS', 5, false, false),
  
  -- e2: Costco Run (ALL_FRIENDS) - 2 hours
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Costco Run 🛒', 'Driving to Costco in Langford. I have 2 seats if anyone needs a ride or bulk snacks.', 'Errand', 'Costco Langford', '{"lat": 48.4557, "lng": -123.5097}'::jsonb, date_trunc('day', NOW()) + INTERVAL '2 days' + INTERVAL '11 hours', date_trunc('day', NOW()) + INTERVAL '2 days' + INTERVAL '13 hours', true, false, 'ALL_FRIENDS', 2, false, false),
  
  -- e3: Board Game Night (INVITE_ONLY) - 4 hours
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'Board Game Night', 'Settlers of Catan and Pizza. No phones at the table please!', 'Social', 'Fernwood Square', '{"lat": 48.4353, "lng": -123.3409}'::jsonb, date_trunc('day', NOW()) + INTERVAL '4 days' + INTERVAL '19 hours', date_trunc('day', NOW()) + INTERVAL '4 days' + INTERVAL '23 hours', false, false, 'INVITE_ONLY', 6, true, false),
  
  -- e4: Sunset Walk (ALL_FRIENDS) - 1.5 hours
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Sunset Walk', 'Walking the dog along Dallas Rd. Catching the sunset.', 'Social', 'Dallas Road', '{"lat": 48.4069, "lng": -123.3752}'::jsonb, date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '16 hours' + INTERVAL '45 minutes', date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '18 hours' + INTERVAL '15 minutes', true, true, 'ALL_FRIENDS', 10, true, false),
  
  -- e5: Deep Focus Study (GROUPS: WORK) - 4 hours
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'Deep Focus Study', 'Grinding out some code at the library. Silent company welcome.', 'Work', 'UVic Library', '{"lat": 48.4633, "lng": -123.3113}'::jsonb, date_trunc('day', NOW()) + INTERVAL '1 days' + INTERVAL '14 hours', date_trunc('day', NOW()) + INTERVAL '1 days' + INTERVAL '18 hours', false, false, 'GROUPS', 4, true, false),
  
  -- e6: Morning Coffee @ Hey Happy (ALL_FRIENDS) - 45 minutes
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', 'Morning Coffee @ Hey Happy', 'Quick espresso before work. Come say hi.', 'Food', 'Hey Happy Coffee', '{"lat": 48.4286, "lng": -123.3660}'::jsonb, date_trunc('day', NOW()) + INTERVAL '1 days' + INTERVAL '8 hours' + INTERVAL '30 minutes', date_trunc('day', NOW()) + INTERVAL '1 days' + INTERVAL '9 hours' + INTERVAL '15 minutes', true, true, 'ALL_FRIENDS', 8, false, false),
  
  -- e7: Spikeball in the Park (ALL_FRIENDS) - 2 hours
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', 'Spikeball in the Park', 'Bringing the net and some snacks. Beginners welcome!', 'Sport', 'Beacon Hill Park', '{"lat": 48.4132, "lng": -123.3642}'::jsonb, date_trunc('day', NOW()) + INTERVAL '3 days' + INTERVAL '13 hours', date_trunc('day', NOW()) + INTERVAL '3 days' + INTERVAL '15 hours', false, true, 'ALL_FRIENDS', 12, false, false),
  
  -- e8: Friday Night Beers (ALL_FRIENDS) - 3 hours - allow friend invites
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 'Friday Night Beers', 'The Drake Eatery. Craft beer and good vibes.', 'Social', 'The Drake', '{"lat": 48.4290, "lng": -123.3680}'::jsonb, date_trunc('day', NOW()) + INTERVAL '5 days' + INTERVAL '19 hours' + INTERVAL '30 minutes', date_trunc('day', NOW()) + INTERVAL '5 days' + INTERVAL '22 hours' + INTERVAL '30 minutes', true, true, 'ALL_FRIENDS', 20, false, true),
  
  -- e9: Mt Doug Hike (ALL_FRIENDS) - 3 hours
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000004', 'Mt Doug Hike', 'Hiking up to the summit for the view. Moderate pace.', 'Sport', 'Mount Douglas Park', '{"lat": 48.4925, "lng": -123.3456}'::jsonb, date_trunc('day', NOW()) + INTERVAL '12 days' + INTERVAL '10 hours', date_trunc('day', NOW()) + INTERVAL '12 days' + INTERVAL '13 hours', false, false, 'ALL_FRIENDS', 10, false, false),
  
  -- e10: Fish & Chips Lunch (ALL_FRIENDS) - 1.5 hours
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Fish & Chips Lunch', 'Red Fish Blue Fish on the wharf. It might be busy.', 'Food', 'Inner Harbour', '{"lat": 48.4246, "lng": -123.3689}'::jsonb, date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '12 hours' + INTERVAL '15 minutes', date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '13 hours' + INTERVAL '45 minutes', false, false, 'ALL_FRIENDS', 4, false, false),
  
  -- e11: Hackathon Prep (INVITE_ONLY) - 3 hours
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000003', 'Hackathon Prep', 'Brainstorming ideas for the upcoming hackathon.', 'Work', 'Kanzei Style Office', '{"lat": 48.4275, "lng": -123.3665}'::jsonb, date_trunc('day', NOW()) + INTERVAL '8 days' + INTERVAL '18 hours', date_trunc('day', NOW()) + INTERVAL '8 days' + INTERVAL '21 hours', false, false, 'INVITE_ONLY', 5, false, false),
  
  -- e12: Surfing Jordan River (ALL_FRIENDS) - 4 hours
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000005', 'Surfing Jordan River', 'Early morning swell looks good. Need a ride? I have a rack.', 'Sport', 'Jordan River', '{"lat": 48.4230, "lng": -124.0540}'::jsonb, date_trunc('day', NOW()) + INTERVAL '25 days' + INTERVAL '6 hours', date_trunc('day', NOW()) + INTERVAL '25 days' + INTERVAL '10 hours', false, false, 'ALL_FRIENDS', 3, false, false),
  
  -- e13: Thrift Shopping (ALL_FRIENDS) - 2.5 hours
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000006', 'Thrift Shopping', 'Hitting up Value Village and WIN downtown.', 'Errand', 'Store Street', '{"lat": 48.4310, "lng": -123.3690}'::jsonb, date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '14 hours', date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '16 hours' + INTERVAL '30 minutes', true, true, 'ALL_FRIENDS', 4, false, false),
  
  -- e14: Trivia Night (GROUPS: CLIMBERS) - 2.5 hours
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000007', 'Trivia Night', 'Need big brains for the quiz at Beagle Pub.', 'Social', 'Cook Street Village', '{"lat": 48.4144, "lng": -123.3567}'::jsonb, date_trunc('day', NOW()) + INTERVAL '16 days' + INTERVAL '20 hours', date_trunc('day', NOW()) + INTERVAL '16 days' + INTERVAL '22 hours' + INTERVAL '30 minutes', false, false, 'GROUPS', 6, true, false),
  
  -- e15: Willows Beach Chill (ALL_FRIENDS) - 3 hours
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000002', 'Willows Beach Chill', 'Bonfire (if allowed) and blankets. Watching the moon rise.', 'Social', 'Willows Beach', '{"lat": 48.4380, "lng": -123.3080}'::jsonb, date_trunc('day', NOW()) + INTERVAL '32 days' + INTERVAL '21 hours', date_trunc('day', NOW()) + INTERVAL '33 days' + INTERVAL '0 hours', true, true, 'ALL_FRIENDS', 15, true, false),
  
  -- e16: Winter Market Walk (ALL_FRIENDS) - 2 hours
  ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000004', 'Winter Market Walk', 'Browsing the artisan stalls at Bastion Square.', 'Social', 'Bastion Square', '{"lat": 48.4256, "lng": -123.3694}'::jsonb, date_trunc('day', NOW()) + INTERVAL '45 days' + INTERVAL '13 hours', date_trunc('day', NOW()) + INTERVAL '45 days' + INTERVAL '15 hours', true, true, 'ALL_FRIENDS', 6, false, false),
  
  -- e17: Code & Coffee (GROUPS: WORK) - 3 hours
  ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000005', 'Code & Coffee', 'Working on side projects. Habit Coffee has good wifi.', 'Work', 'Habit Coffee', '{"lat": 48.4286, "lng": -123.3644}'::jsonb, date_trunc('day', NOW()) + INTERVAL '60 days' + INTERVAL '9 hours', date_trunc('day', NOW()) + INTERVAL '60 days' + INTERVAL '12 hours', false, false, 'GROUPS', 4, true, false),
  
  -- e18: Badminton Drop-in (ALL_FRIENDS) - 1.5 hours
  ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000006', 'Badminton Drop-in', 'Casual games at Commonwealth Place.', 'Sport', 'Commonwealth Place', '{"lat": 48.5086, "lng": -123.3934}'::jsonb, date_trunc('day', NOW()) + INTERVAL '18 days' + INTERVAL '18 hours' + INTERVAL '30 minutes', date_trunc('day', NOW()) + INTERVAL '18 days' + INTERVAL '20 hours', false, false, 'ALL_FRIENDS', 4, false, false),
  
  -- e19: Sushi Dinner (INVITE_ONLY) - 2 hours
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'Sushi Dinner', 'Craving Ebizo sushi. Need reservations, let me know by noon.', 'Food', 'Ebizo Japanese', '{"lat": 48.4262, "lng": -123.3664}'::jsonb, date_trunc('day', NOW()) + INTERVAL '75 days' + INTERVAL '19 hours', date_trunc('day', NOW()) + INTERVAL '75 days' + INTERVAL '21 hours', false, false, 'INVITE_ONLY', 6, false, false),
  
  -- e20: Book Club: Dune (GROUPS: CLIMBERS + WORK) - 2 hours - multiple groups
  ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000003', 'Book Club: Dune', 'Discussing the first half. Meeting at Russell Books reading nook.', 'Social', 'Russell Books', '{"lat": 48.4253, "lng": -123.3665}'::jsonb, date_trunc('day', NOW()) + INTERVAL '40 days' + INTERVAL '18 hours', date_trunc('day', NOW()) + INTERVAL '40 days' + INTERVAL '20 hours', false, false, 'GROUPS', 8, true, false),
  
  -- e21: Airport Run (Pickup) (GROUPS: FAMILY) - 1.5 hours
  ('10000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'Airport Run (Pickup)', 'Picking up my brother. Anyone want a ride to Sidney?', 'Errand', 'Victoria Airport (YYJ)', '{"lat": 48.6469, "lng": -123.4258}'::jsonb, date_trunc('day', NOW()) + INTERVAL '11 days' + INTERVAL '15 hours' + INTERVAL '30 minutes', date_trunc('day', NOW()) + INTERVAL '11 days' + INTERVAL '17 hours', true, false, 'GROUPS', 2, false, false),
  
  -- e22: Tech Meetup Downtown (GROUPS: WORK) - 2.5 hours
  ('10000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000007', 'Tech Meetup Downtown', 'Networking event at Fort Tectoria.', 'Work', 'Fort Tectoria', '{"lat": 48.4243, "lng": -123.3630}'::jsonb, date_trunc('day', NOW()) + INTERVAL '50 days' + INTERVAL '17 hours', date_trunc('day', NOW()) + INTERVAL '50 days' + INTERVAL '19 hours' + INTERVAL '30 minutes', false, true, 'GROUPS', 20, false, false),
  
  -- e23: Squash Game (ALL_FRIENDS) - 1 hour
  ('10000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000005', 'Squash Game', 'Booked a court at Cedar Hill. Looking for an opponent.', 'Sport', 'Cedar Hill Rec', '{"lat": 48.4550, "lng": -123.3421}'::jsonb, date_trunc('day', NOW()) + INTERVAL '85 days' + INTERVAL '16 hours', date_trunc('day', NOW()) + INTERVAL '85 days' + INTERVAL '17 hours', false, false, 'ALL_FRIENDS', 2, false, false),
  
  -- e24: Late Night Pho (ALL_FRIENDS) - 1 hour
  ('10000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'Late Night Pho', 'Comfort food after the gym. Pho Vy on Fort.', 'Food', 'Pho Vy', '{"lat": 48.4289, "lng": -123.3622}'::jsonb, date_trunc('day', NOW()) + INTERVAL '13 days' + INTERVAL '21 hours', date_trunc('day', NOW()) + INTERVAL '13 days' + INTERVAL '22 hours', true, true, 'ALL_FRIENDS', 4, false, false),
  
  -- e25: Christmas Shopping (ALL_FRIENDS) - 3 hours
  ('10000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000006', 'Christmas Shopping', 'Braving the mall for gifts. Strength in numbers.', 'Errand', 'Mayfair Mall', '{"lat": 48.4452, "lng": -123.3698}'::jsonb, date_trunc('day', NOW()) + INTERVAL '5 days' + INTERVAL '10 hours', date_trunc('day', NOW()) + INTERVAL '5 days' + INTERVAL '13 hours', false, true, 'ALL_FRIENDS', 3, false, false),
  
  -- e26: Weekend Trip Planning (INVITE_ONLY) - 2 hours - allow friend invites
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000003', 'Weekend Trip Planning', 'Planning the Tofino trip over beers.', 'Travel', 'Swan''s Pub', '{"lat": 48.4295, "lng": -123.3704}'::jsonb, date_trunc('day', NOW()) + INTERVAL '28 days' + INTERVAL '19 hours' + INTERVAL '30 minutes', date_trunc('day', NOW()) + INTERVAL '28 days' + INTERVAL '21 hours' + INTERVAL '30 minutes', true, false, 'INVITE_ONLY', 5, false, true),
  
  -- e27: Movie Night: Sci-Fi (INVITE_ONLY) - 2.5 hours
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000002', 'Movie Night: Sci-Fi', 'Catching the late show at Capitol 6.', 'Entertainment', 'Capitol 6 Theatres', '{"lat": 48.4239, "lng": -123.3661}'::jsonb, date_trunc('day', NOW()) + INTERVAL '55 days' + INTERVAL '21 hours' + INTERVAL '15 minutes', date_trunc('day', NOW()) + INTERVAL '55 days' + INTERVAL '23 hours' + INTERVAL '45 minutes', false, false, 'INVITE_ONLY', 8, true, false),
  
  -- e28: Morning Jog (ALL_FRIENDS) - 1 hour
  ('10000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000004', 'Morning Jog', 'Ogden Point breakwater run. Easy pace.', 'Sport', 'Ogden Point', '{"lat": 48.4147, "lng": -123.3853}'::jsonb, date_trunc('day', NOW()) + INTERVAL '90 days' + INTERVAL '7 hours', date_trunc('day', NOW()) + INTERVAL '90 days' + INTERVAL '8 hours', false, false, 'ALL_FRIENDS', 4, false, false),
  
  -- e29: Brunch at Blue Fox (ALL_FRIENDS) - 1.5 hours
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000007', 'Brunch at Blue Fox', 'Waiting in line but it''s worth it. Benny time.', 'Food', 'Blue Fox Cafe', '{"lat": 48.4265, "lng": -123.3619}'::jsonb, date_trunc('day', NOW()) + INTERVAL '22 days' + INTERVAL '10 hours' + INTERVAL '30 minutes', date_trunc('day', NOW()) + INTERVAL '22 days' + INTERVAL '12 hours', true, false, 'ALL_FRIENDS', 6, false, false),
  
  -- e30: New Year's Eve Prep (ALL_FRIENDS) - 2 hours
  ('10000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'New Year''s Eve Prep', 'Buying supplies for the party.', 'Errand', 'Market on Yates', '{"lat": 48.4263, "lng": -123.3616}'::jsonb, date_trunc('day', NOW()) + INTERVAL '65 days' + INTERVAL '14 hours', date_trunc('day', NOW()) + INTERVAL '65 days' + INTERVAL '16 hours', true, true, 'ALL_FRIENDS', 3, false, false),
  
  -- e31: Symphony: The Nutcracker (ALL_FRIENDS) - 2.5 hours
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000002', 'Symphony: The Nutcracker', 'Ballet Victoria at the Royal Theatre. Dressing up nicely for this one!', 'Entertainment', 'Royal Theatre', '{"lat": 48.4237, "lng": -123.3644}'::jsonb, date_trunc('day', NOW()) + INTERVAL '35 days' + INTERVAL '19 hours', date_trunc('day', NOW()) + INTERVAL '35 days' + INTERVAL '21 hours' + INTERVAL '30 minutes', false, false, 'ALL_FRIENDS', 4, true, false),
  
  -- e32: Dune: Part Two (IMAX) (INVITE_ONLY) - 3 hours
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000005', 'Dune: Part Two (IMAX)', 'Seeing it properly on the biggest screen possible. Museum IMAX.', 'Entertainment', 'IMAX Victoria', '{"lat": 48.4206, "lng": -123.3676}'::jsonb, date_trunc('day', NOW()) + INTERVAL '10 days' + INTERVAL '18 hours' + INTERVAL '45 minutes', date_trunc('day', NOW()) + INTERVAL '10 days' + INTERVAL '21 hours' + INTERVAL '45 minutes', false, false, 'INVITE_ONLY', 6, true, false),
  
  -- e33: Jazz Night at Hermann's (ALL_FRIENDS) - 3 hours
  ('10000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000003', 'Jazz Night at Hermann''s', 'Live quartet playing standards. Cover is $20. Good food too.', 'Entertainment', 'Hermann''s Jazz Club', '{"lat": 48.4235, "lng": -123.3664}'::jsonb, date_trunc('day', NOW()) + INTERVAL '70 days' + INTERVAL '20 hours', date_trunc('day', NOW()) + INTERVAL '70 days' + INTERVAL '23 hours', false, true, 'ALL_FRIENDS', 8, true, false),
  
  -- e34: Comedy Night at Hecklers (ALL_FRIENDS) - 2 hours
  ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000006', 'Comedy Night at Hecklers', 'Local stand-up showcase. Always good for a laugh.', 'Entertainment', 'Hecklers Bar', '{"lat": 48.4419, "lng": -123.3857}'::jsonb, date_trunc('day', NOW()) + INTERVAL '42 days' + INTERVAL '20 hours' + INTERVAL '30 minutes', date_trunc('day', NOW()) + INTERVAL '42 days' + INTERVAL '22 hours' + INTERVAL '30 minutes', false, false, 'ALL_FRIENDS', 6, true, false),
  
  -- e35: Arkells Concert (ALL_FRIENDS) - 3 hours
  ('10000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000004', 'Arkells Concert', 'Big show at Save-On. I have an extra ticket in the lower bowl!', 'Entertainment', 'Save-On-Foods Memorial Centre', '{"lat": 48.4367, "lng": -123.3607}'::jsonb, date_trunc('day', NOW()) + INTERVAL '80 days' + INTERVAL '19 hours', date_trunc('day', NOW()) + INTERVAL '80 days' + INTERVAL '22 hours', false, false, 'ALL_FRIENDS', 2, false, false),
  
  -- Past events that Alex attended
  -- e36: Past Bouldering Session (3 days ago) - 2 hours
  ('10000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000002', 'Bouldering Session', 'Great session at the gym. Sent some new routes!', 'Sport', 'Climbing Gym', '{"lat": 48.4293, "lng": -123.3635}'::jsonb, date_trunc('day', NOW()) - INTERVAL '3 days' + INTERVAL '18 hours', date_trunc('day', NOW()) - INTERVAL '3 days' + INTERVAL '20 hours', false, true, 'ALL_FRIENDS', 6, false, false),
  
  -- e37: Past Coffee Meetup (1 week ago) - 1 hour
  ('10000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000003', 'Coffee & Catch-up', 'Morning coffee at Habit. Great conversation!', 'Food', 'Habit Coffee', '{"lat": 48.4286, "lng": -123.3644}'::jsonb, date_trunc('day', NOW()) - INTERVAL '7 days' + INTERVAL '9 hours', date_trunc('day', NOW()) - INTERVAL '7 days' + INTERVAL '10 hours', true, true, 'ALL_FRIENDS', 4, false, false),
  
  -- e38: Past Movie Night (2 weeks ago) - 3 hours (Inception is long!)
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000004', 'Movie Night: Inception', 'Watched Inception at the IMAX. Mind-blowing!', 'Entertainment', 'IMAX Victoria', '{"lat": 48.4206, "lng": -123.3676}'::jsonb, date_trunc('day', NOW()) - INTERVAL '14 days' + INTERVAL '19 hours', date_trunc('day', NOW()) - INTERVAL '14 days' + INTERVAL '22 hours', false, false, 'INVITE_ONLY', 4, true, false),
  
  -- e39: Past Hiking Trip (1 month ago) - 5 hours (longer coastal hike)
  ('10000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000005', 'East Sooke Park Hike', 'Beautiful coastal hike. Perfect weather!', 'Sport', 'East Sooke Park', '{"lat": 48.3500, "lng": -123.7000}'::jsonb, date_trunc('day', NOW()) - INTERVAL '30 days' + INTERVAL '10 hours', date_trunc('day', NOW()) - INTERVAL '30 days' + INTERVAL '15 hours', false, false, 'ALL_FRIENDS', 5, false, false),
  
  -- e40: Past Dinner Party (2 months ago) - 4 hours - Hidden event (INVITE_ONLY, past)
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000006', 'Dinner Party', 'Intimate dinner with close friends. Amazing food!', 'Food', 'Private Residence', '{"lat": 48.4286, "lng": -123.3660}'::jsonb, date_trunc('day', NOW()) - INTERVAL '60 days' + INTERVAL '19 hours', date_trunc('day', NOW()) - INTERVAL '60 days' + INTERVAL '23 hours', false, false, 'INVITE_ONLY', 6, false, false),
  
  -- e41: Past Work Session (3 weeks ago) - 4 hours
  ('10000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', 'Coding Session', 'Productive afternoon working on side projects.', 'Work', 'Home Office', '{"lat": 48.4286, "lng": -123.3660}'::jsonb, date_trunc('day', NOW()) - INTERVAL '21 days' + INTERVAL '14 hours', date_trunc('day', NOW()) - INTERVAL '21 days' + INTERVAL '18 hours', false, false, 'GROUPS', 3, true, false),
  
  -- e42: Past Beach Day (5 days ago) - 4 hours
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000002', 'Beach Day at Willows', 'Sunny day at the beach. Brought snacks!', 'Social', 'Willows Beach', '{"lat": 48.4380, "lng": -123.3080}'::jsonb, date_trunc('day', NOW()) - INTERVAL '5 days' + INTERVAL '14 hours', date_trunc('day', NOW()) - INTERVAL '5 days' + INTERVAL '18 hours', true, true, 'ALL_FRIENDS', 8, false, false)
ON CONFLICT (id) DO NOTHING;

-- Insert groups (user-created groups)
-- Each user creates their own groups based on what they need
-- Mix of open (anyone can join) and closed (invite-only) groups
INSERT INTO public.groups (id, name, created_by, is_open) VALUES
  -- u1 (Alex): Rock Climbers (open), Tech Workers (closed), Foodies (open)
  ('20000000-0000-0000-0000-000000000001', 'Rock Climbers', '00000000-0000-0000-0000-000000000001', true),
  ('20000000-0000-0000-0000-000000000002', 'Tech Workers', '00000000-0000-0000-0000-000000000001', false),
  ('20000000-0000-0000-0000-000000000012', 'Foodies', '00000000-0000-0000-0000-000000000001', true),
  
  -- u2 (Sarah): Climbing Crew (closed), Work Friends (open), Family & Close Friends (closed)
  ('20000000-0000-0000-0000-000000000003', 'Climbing Crew', '00000000-0000-0000-0000-000000000002', false),
  ('20000000-0000-0000-0000-000000000004', 'Work Friends', '00000000-0000-0000-0000-000000000002', true),
  ('20000000-0000-0000-0000-000000000005', 'Family & Close Friends', '00000000-0000-0000-0000-000000000002', false),
  
  -- u3 (Marcus): Study Group (open), Book Club (open), Tech Enthusiasts (closed)
  ('20000000-0000-0000-0000-000000000006', 'Study Group', '00000000-0000-0000-0000-000000000003', true),
  ('20000000-0000-0000-0000-000000000007', 'Book Club', '00000000-0000-0000-0000-000000000003', true),
  ('20000000-0000-0000-0000-000000000013', 'Tech Enthusiasts', '00000000-0000-0000-0000-000000000003', false),
  
  -- u4 (Elena): Game Night Squad (open), Adventure Seekers (open)
  ('20000000-0000-0000-0000-000000000014', 'Game Night Squad', '00000000-0000-0000-0000-000000000004', true),
  ('20000000-0000-0000-0000-000000000015', 'Adventure Seekers', '00000000-0000-0000-0000-000000000004', true),
  
  -- u5 (Raj): Deep Work Sessions (closed), Coffee & Code (open), Surfers (open)
  ('20000000-0000-0000-0000-000000000008', 'Deep Work Sessions', '00000000-0000-0000-0000-000000000005', false),
  ('20000000-0000-0000-0000-000000000016', 'Coffee & Code', '00000000-0000-0000-0000-000000000005', true),
  ('20000000-0000-0000-0000-000000000017', 'Surfers', '00000000-0000-0000-0000-000000000005', true),
  
  -- u6 (Chloe): Climbing Buddies (open), Thrift Shoppers (open), Fitness Friends (closed)
  ('20000000-0000-0000-0000-000000000009', 'Climbing Buddies', '00000000-0000-0000-0000-000000000006', true),
  ('20000000-0000-0000-0000-000000000018', 'Thrift Shoppers', '00000000-0000-0000-0000-000000000006', true),
  ('20000000-0000-0000-0000-000000000019', 'Fitness Friends', '00000000-0000-0000-0000-000000000006', false),
  
  -- u7 (Tom): Tech Meetup (open), Trivia Team (open), Morning Coffee Club (closed)
  ('20000000-0000-0000-0000-000000000010', 'Tech Meetup', '00000000-0000-0000-0000-000000000007', true),
  ('20000000-0000-0000-0000-000000000011', 'Trivia Team', '00000000-0000-0000-0000-000000000007', true),
  ('20000000-0000-0000-0000-000000000020', 'Morning Coffee Club', '00000000-0000-0000-0000-000000000007', false)
ON CONFLICT (created_by, name) DO NOTHING;

-- Insert event groups (for GROUPS visibility events)
-- Events reference groups created by the event host
INSERT INTO public.event_groups (event_id, group_id) VALUES
  -- e1: Bouldering at Crag X (host: u2/Sarah) - Climbing Crew
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003'),
  
  -- e5: Deep Focus Study (host: u5/Raj) - Deep Work Sessions
  ('10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000008'),
  
  -- e14: Trivia Night (host: u7/Tom) - Trivia Team
  ('10000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000011'),
  
  -- e17: Code & Coffee (host: u5/Raj) - Coffee & Code
  ('10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000016'),
  
  -- e20: Book Club: Dune (host: u3/Marcus) - Book Club + Study Group (multiple groups)
  ('10000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000006'),
  
  -- e21: Airport Run (Pickup) (host: u2/Sarah) - Family & Close Friends
  ('10000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000005'),
  
  -- e22: Tech Meetup Downtown (host: u7/Tom) - Tech Meetup
  ('10000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000010'),
  
  -- e41: Past Coding Session (host: u1/Alex) - Tech Workers
  ('10000000-0000-0000-0000-000000000041', '20000000-0000-0000-0000-000000000002')
ON CONFLICT (event_id, group_id) DO NOTHING;

-- Insert event invites (for INVITE_ONLY visibility events)
-- Invite the attendees who are already in event_attendees for these events
-- invited_by: NULL = host invited, user_id = friend who is attending invited
INSERT INTO public.event_invites (event_id, user_id, invited_by) VALUES
  -- e3: Board Game Night (host: u4/Elena) - invite attendees: u4, u2, u5, u7, u1
  -- All invitations from host (allow_friend_invites = false)
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', NULL),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', NULL),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', NULL),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000007', NULL),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', NULL),
  -- Add a couple of non-friends of u1 to the attendee list as well
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000008', NULL),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000009', NULL),
  
  -- e11: Hackathon Prep (host: u3/Marcus) - invite attendees: u3, u1, u5
  -- All invitations from host (allow_friend_invites = false)
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000003', NULL),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', NULL),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000005', NULL),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', NULL),
  
  -- e19: Sushi Dinner (host: u1/Alex) - invite attendees: u1, u2, u7
  -- All invitations from host (allow_friend_invites = false)
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', NULL),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000002', NULL),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000007', NULL),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000011', NULL),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000012', NULL),
  
  -- e26: Weekend Trip Planning (host: u3/Marcus, allow_friend_invites = true) - invite attendees: u3, u1, u4, u5
  -- Mix of host and friend invitations to demonstrate the feature
  -- Host (u3) invites u1
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', NULL),
  -- u1 (attending) invites u4
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001'),
  -- u4 (attending) invites u5
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004'),
  -- u1 (attending) invites u12 (not a friend of u1 in seed data)
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001'),
  
  -- e27: Movie Night: Sci-Fi (host: u2/Sarah) - invite attendees: u2, u7, u1
  -- All invitations from host (allow_friend_invites = false)
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000002', NULL),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000007', NULL),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', NULL),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000008', NULL),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000009', NULL),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000010', NULL),
  
  -- e32: Dune: Part Two (IMAX) (host: u5/Raj) - invite attendees: u5, u4, u1
  -- All invitations from host (allow_friend_invites = false)
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000005', NULL),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000004', NULL),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', NULL),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000011', NULL),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000012', NULL),
  
  -- Past events: e38 and e40 (INVITE_ONLY)
  -- e38: Past Movie Night (host: u4/Elena) - invite attendees: u4, u1, u2
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000004', NULL),
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000001', NULL),
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000002', NULL),
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000008', NULL),
  
  -- e40: Past Dinner Party (host: u6/Chloe) - invite attendees: u6, u1, u4, u7
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000006', NULL),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', NULL),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000004', NULL),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000007', NULL),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000012', NULL)
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Insert event attendees
INSERT INTO public.event_attendees (event_id, user_id) VALUES
  -- e1: Bouldering at Crag X - attendees: u2, u1, u6
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000009'),
  
  -- e2: Costco Run - attendees: u3
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008'),
  
  -- e3: Board Game Night - attendees: u4, u2, u5, u7
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000009'),
  
  -- e4: Sunset Walk - attendees: u1, u6
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000011'),
  
  -- e5: Deep Focus Study - attendees: u5, u2
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000012'),
  
  -- e6: Morning Coffee @ Hey Happy - attendees: u7, u1, u3
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010'),
  
  -- e7: Spikeball in the Park - attendees: u6, u4, u5, u2
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000009'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000011'),
  
  -- e8: Friday Night Beers - attendees: u2, u1, u3, u4, u5, u6, u7
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000011'),
  
  -- e9: Mt Doug Hike - attendees: u4, u6
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000011'),
  
  -- e10: Fish & Chips Lunch - attendees: u1, u5
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000012'),
  
  -- e11: Hackathon Prep - attendees: u3, u1, u5
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010'),
  
  -- e12: Surfing Jordan River - attendees: u5
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000009'),
  
  -- e13: Thrift Shopping - attendees: u6, u4
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000011'),
  
  -- e14: Trivia Night - attendees: u7, u1, u3, u2
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000009'),
  
  -- e15: Willows Beach Chill - attendees: u2, u6, u7
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000012'),
  
  -- e16: Winter Market Walk - attendees: u4, u1
  ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000010'),
  
  -- e17: Code & Coffee - attendees: u5, u3
  ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000011'),
  ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000012'),
  
  -- e18: Badminton Drop-in - attendees: u6
  ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000009'),
  ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000010'),
  
  -- e19: Sushi Dinner - attendees: u1, u2, u7
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000011'),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000012'),
  
  -- e20: Book Club: Dune - attendees: u3, u4, u5
  ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000011'),
  ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000012'),
  
  -- e21: Airport Run (Pickup) - attendees: u2
  ('10000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002'),
  
  -- e22: Tech Meetup Downtown - attendees: u7, u5, u3
  ('10000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000003'),
  
  -- e23: Squash Game - attendees: u5
  ('10000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000009'),
  
  -- e24: Late Night Pho - attendees: u1, u6
  ('10000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000010'),
  
  -- e25: Christmas Shopping - attendees: u6, u2
  ('10000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000011'),
  
  -- e26: Weekend Trip Planning - attendees: u3, u1, u4, u5
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000012'),
  
  -- e27: Movie Night: Sci-Fi - attendees: u2, u7, u1
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000009'),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000010'),
  
  -- e28: Morning Jog - attendees: u4
  ('10000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000009'),
  ('10000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000011'),
  
  -- e29: Brunch at Blue Fox - attendees: u7, u1, u2, u3
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000012'),
  
  -- e30: New Year's Eve Prep - attendees: u1
  ('10000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000009'),
  
  -- e31: Symphony: The Nutcracker - attendees: u2, u1, u7
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000010'),
  
  -- e32: Dune: Part Two (IMAX) - attendees: u5, u4, u1
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000011'),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000012'),
  
  -- e33: Jazz Night at Hermann's - attendees: u3, u6
  ('10000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000009'),
  
  -- e34: Comedy Night at Hecklers - attendees: u6, u2, u1
  ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000009'),
  ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000010'),
  
  -- e35: Arkells Concert - attendees: u4
  ('10000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000008'),
  
  -- Past events that Alex attended
  -- e36: Past Bouldering Session - attendees: u2, u1, u6
  ('10000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000006'),
  
  -- e37: Past Coffee Meetup - attendees: u3, u1
  ('10000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000009'),
  
  -- e38: Past Movie Night - attendees: u4, u1, u2
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000008'),
  
  -- e39: Past Hiking Trip - attendees: u5, u1, u3
  ('10000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000011'),
  
  -- e40: Past Dinner Party (Hidden/INVITE_ONLY) - attendees: u6, u1, u4, u7
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000012'),
  
  -- e41: Past Coding Session (hosted by Alex) - attendees: u1, u3, u5
  ('10000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000005'),
  
  -- e42: Past Beach Day - attendees: u2, u1, u6, u4
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000009'),
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000011')
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Insert comments
INSERT INTO public.comments (id, event_id, user_id, text, timestamp) VALUES
  -- e1: Comment from u3
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'I might be 10 mins late', date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '16 hours'),
  
  -- e7: Comment from u2
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'I am terrible at this but I am coming!', date_trunc('day', NOW()) + INTERVAL '1 days' + INTERVAL '10 hours')
ON CONFLICT (id) DO NOTHING;

-- Insert reactions
-- Note: For reactions, we distribute them among attendees. If userReacted is true, u1 (Alex) reacted.
-- For others, we distribute reactions among other attendees or users.
INSERT INTO public.reactions (event_id, user_id, emoji) VALUES
  -- e1: 💪 count 3, userReacted true (u1 reacted, plus 2 others from attendees)
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '💪'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '💪'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', '💪'),
  
  -- e3: 🎲 count 4, userReacted false (distribute among attendees)
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', '🎲'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '🎲'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', '🎲'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000007', '🎲'),
  
  -- e4: 🌅 count 2, userReacted true (u1 reacted, plus 1 other)
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '🌅'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006', '🌅'),
  
  -- e6: ☕ count 3, userReacted true (u1 reacted, plus 2 others)
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '☕'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', '☕'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', '☕'),
  
  -- e8: 🍻 count 7, userReacted true (u1 reacted, plus all other attendees)
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '🍻'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', '🍻'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000003', '🍻'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000004', '🍻'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000005', '🍻'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000006', '🍻'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000007', '🍻'),
  
  -- e10: 🐟 count 2, userReacted true (u1 reacted, plus u5)
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '🐟'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000005', '🐟'),
  
  -- e12: 🏄 count 1, userReacted true (u1 reacted)
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '🏄'),
  
  -- e14: 🧠 count 4, userReacted true (u1 reacted, plus 3 others)
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '🧠'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000007', '🧠'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000003', '🧠'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000002', '🧠'),
  
  -- e19: 🍣 count 3, userReacted true (u1 reacted, plus 2 others)
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', '🍣'),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000002', '🍣'),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000007', '🍣'),
  
  -- e24: 🍜 count 2, userReacted true (u1 reacted, plus u6)
  ('10000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', '🍜'),
  ('10000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000006', '🍜'),
  
  -- e26: 🌊 count 4, userReacted true (u1 reacted, plus 3 others)
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', '🌊'),
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000003', '🌊'),
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000004', '🌊'),
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000005', '🌊'),
  
  -- e27: 🎬 count 2, userReacted true (u1 reacted, plus u2 or u7)
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', '🎬'),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000002', '🎬'),
  
  -- e29: 🍳 count 4, userReacted true (u1 reacted, plus 3 others)
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', '🍳'),
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000007', '🍳'),
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000002', '🍳'),
  ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000003', '🍳'),
  
  -- e31: 🎻 count 3, userReacted true (u1 reacted, plus 2 others)
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', '🎻'),
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000002', '🎻'),
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000007', '🎻'),
  
  -- e32: 🍿 count 2, userReacted true (u1 reacted, plus u5 or u4)
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', '🍿'),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000005', '🍿'),
  
  -- e33: 🎷 count 1, userReacted true (u1 reacted)
  ('10000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000001', '🎷'),
  
  -- e34: 😂 count 3, userReacted true (u1 reacted, plus 2 others)
  ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000001', '😂'),
  ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000006', '😂'),
  ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000002', '😂'),
  
  -- e35: 🎸 count 1, userReacted true (u1 reacted)
  ('10000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000001', '🎸'),
  
  -- Past events reactions
  -- e36: 💪 count 3, userReacted true (u1 reacted, plus 2 others)
  ('10000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000001', '💪'),
  ('10000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000002', '💪'),
  ('10000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000006', '💪'),
  
  -- e37: ☕ count 2, userReacted true (u1 reacted, plus u3)
  ('10000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000001', '☕'),
  ('10000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000003', '☕'),
  
  -- e38: 🎬 count 3, userReacted true (u1 reacted, plus 2 others)
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000001', '🎬'),
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000004', '🎬'),
  ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000002', '🎬'),
  
  -- e39: 🏔️ count 3, userReacted true (u1 reacted, plus 2 others)
  ('10000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000001', '🏔️'),
  ('10000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000005', '🏔️'),
  ('10000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000003', '🏔️'),
  
  -- e40: 🍽️ count 4, userReacted true (u1 reacted, plus 3 others)
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', '🍽️'),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000006', '🍽️'),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000004', '🍽️'),
  ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000007', '🍽️'),
  
  -- e41: 💻 count 3, userReacted true (u1 reacted, plus 2 others)
  ('10000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', '💻'),
  ('10000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000003', '💻'),
  ('10000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000005', '💻'),
  
  -- e42: 🏖️ count 4, userReacted true (u1 reacted, plus 3 others)
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000001', '🏖️'),
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000002', '🏖️'),
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000006', '🏖️'),
  ('10000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000004', '🏖️')
ON CONFLICT (event_id, user_id, emoji) DO NOTHING;

-- Insert notifications
-- Note: Notifications are for user u1 (Alex) unless specified otherwise
INSERT INTO public.notifications (id, user_id, type, title, message, timestamp, related_event_id, is_read, actor_id) VALUES
  -- n1: INVITE from Sarah for e8
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'INVITE', 'New Invite from Sarah', 'Sarah invited you to "Friday Night Beers"', date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '14 hours' + INTERVAL '30 minutes', '10000000-0000-0000-0000-000000000008', false, '00000000-0000-0000-0000-000000000002'),
  
  -- n2: COMMENT from Marcus on e1
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'COMMENT', 'New Comment', 'Marcus commented on "Bouldering at Crag X"', date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '10 hours' + INTERVAL '15 minutes', '10000000-0000-0000-0000-000000000001', false, '00000000-0000-0000-0000-000000000003'),
  
  -- n3: REMINDER for e4
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'REMINDER', 'Upcoming Event', 'Sunset Walk is starting in 1 hour', date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '15 hours' + INTERVAL '45 minutes', '10000000-0000-0000-0000-000000000004', true, NULL),
  
  -- n4: REACTION from Elena on e4
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'REACTION', 'Reaction Received', 'Elena reacted with 🔥 to your event', date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '9 hours', '10000000-0000-0000-0000-000000000004', true, '00000000-0000-0000-0000-000000000004'),
  
  -- n5: SYSTEM notification
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'SYSTEM', 'Welcome to Open Invite!', 'Start by adding friends or creating your first event.', date_trunc('day', NOW()) - INTERVAL '5 days' + INTERVAL '12 hours', NULL, true, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert user friendships
-- Create friendships based on users who attend events together
-- We'll create bidirectional friendships for users who have attended at least one event together
INSERT INTO public.user_friends (user_id, friend_id) VALUES
  -- u1 (Alex) friends with everyone (attends events with all)
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007'),
  
  -- u2 (Sarah) friends with others
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007'),
  
  -- u3 (Marcus) friends with others
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000007'),
  
  -- u4 (Elena) friends with others
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007'),
  
  -- u5 (Raj) friends with others
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000007'),
  
  -- u6 (Chloe) friends with u7
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007')
  ,
  -- Additional users (u8-u12) are *not* friends with u1 (Alex), but may be friends with others.
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000007'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000006'),
  
  -- New users who ARE friends with Alex (u1)
  -- u13 (Liam) - friends with Alex
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001'),
  -- u14 (Lily) - friends with Alex
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014'),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001'),
  -- u16 (Sam) - friends with Alex
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000016'),
  ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001'),
  -- u17 (Sophia) - friends with Alex
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000017'),
  ('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001'),
  -- u20 (Derek) - friends with Alex
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001'),
  -- u22 (Daniel) - friends with Alex
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001'),
  
  -- Some new users are friends with each other
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000014'), -- Liam <-> Lily
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000015'), -- Lily <-> Leo
  ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000017'), -- Sam <-> Sophia
  ('00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000019'), -- Jake <-> Julia
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000021'), -- Derek <-> Diana
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000022')  -- Diana <-> Daniel
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- Insert friend requests (pending friend requests involving Alex)
INSERT INTO public.friend_requests (id, requester_id, recipient_id, status, created_at) VALUES
  -- Requests sent TO Alex (Alex is recipient) - these show as "incoming" for Alex
  -- u15 (Leo) sent request to Alex
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'PENDING', NOW() - INTERVAL '2 days'),
  -- u19 (Julia) sent request to Alex
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'PENDING', NOW() - INTERVAL '1 day'),
  
  -- Requests sent BY Alex (Alex is requester) - these show as "outgoing" for Alex
  -- Alex sent request to u18 (Jake)
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000018', 'PENDING', NOW() - INTERVAL '3 days'),
  -- Alex sent request to u21 (Diana)
  ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021', 'PENDING', NOW() - INTERVAL '12 hours')
ON CONFLICT (requester_id, recipient_id) DO NOTHING;

-- Insert user groups
-- Add users to groups based on events they host or attend
-- Creators are ADMIN, others are MEMBER
-- Mix of open groups (anyone can join) and closed groups (invite-only)
INSERT INTO public.user_groups (user_id, group_id, role) VALUES
  -- Climbing-related groups
  -- u2's Climbing Crew (closed) - u2 ADMIN, u1 and u6 MEMBERS
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', 'MEMBER'),
  -- u1's Rock Climbers (open) - u1 ADMIN, u2 and u6 joined
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'MEMBER'),
  -- u6's Climbing Buddies (open) - u6 ADMIN, u1 and u2 joined
  ('00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000009', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000009', 'MEMBER'),
  
  -- Work-related groups
  -- u5's Deep Work Sessions (closed) - u5 ADMIN, u1, u2, u3 MEMBERS
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000008', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000008', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000008', 'MEMBER'),
  -- u5's Coffee & Code (open) - u5 ADMIN, u1, u3, u7 joined
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000016', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000016', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000016', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000016', 'MEMBER'),
  -- u1's Tech Workers (closed) - u1 ADMIN, u3 and u5 MEMBERS
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'MEMBER'),
  -- u2's Work Friends (open) - u2 ADMIN, u1, u3, u5, u7 joined
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000004', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000004', 'MEMBER'),
  -- u7's Tech Meetup (open) - u7 ADMIN, u1, u3, u5 joined
  ('00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000010', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000010', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000010', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000010', 'MEMBER'),
  
  -- Study/Book groups
  -- u3's Study Group (open) - u3 ADMIN, u1, u5 joined
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000006', 'MEMBER'),
  -- u3's Book Club (open) - u3 ADMIN, u4, u5 joined
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000007', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007', 'MEMBER'),
  
  -- Social groups
  -- u4's Game Night Squad (open) - u4 ADMIN, u2, u5, u7 joined
  ('00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000014', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000014', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000014', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000014', 'MEMBER'),
  -- u4's Adventure Seekers (open) - u4 ADMIN, u1, u6 joined
  ('00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000015', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000015', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000015', 'MEMBER'),
  
  -- Food/Activity groups
  -- u1's Foodies (open) - u1 ADMIN, u2, u4, u7 joined
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000012', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000012', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000012', 'MEMBER'),
  -- u6's Thrift Shoppers (open) - u6 ADMIN, u4 joined
  ('00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000018', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000018', 'MEMBER'),
  
  -- Specialized groups
  -- u5's Surfers (open) - u5 ADMIN only (new group)
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000017', 'ADMIN'),
  -- u6's Fitness Friends (closed) - u6 ADMIN, u1 joined
  ('00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000019', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000019', 'MEMBER'),
  -- u7's Trivia Team (open) - u7 ADMIN, u1, u3 joined
  ('00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000011', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000011', 'MEMBER'),
  -- u7's Morning Coffee Club (closed) - u7 ADMIN, u1 joined
  ('00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000020', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000020', 'MEMBER'),
  -- u3's Tech Enthusiasts (closed) - u3 ADMIN, u1, u5 joined
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000013', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000013', 'MEMBER'),
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000013', 'MEMBER'),
  
  -- Family group
  -- u2's Family & Close Friends (closed) - u2 ADMIN only
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', 'ADMIN')
ON CONFLICT (user_id, group_id) DO NOTHING;

