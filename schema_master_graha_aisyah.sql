-- =========================================================================
-- SETUP MASTER SINGLE BRANCH: GRAHA AISYAH MENTENG
-- (TOTAL TEPAT 52 KAMAR: 4 SECTION / LANTAI)
-- 1. VIP Belakang Warkop: 13 Kamar
-- 2. Dasar: 18 Kamar
-- 3. Gedung Atas Lt 2: 17 Kamar (1-8, 13-21)
-- 4. Gedung Atas Lt 3: 4 Kamar (9-12)
-- =========================================================================

-- 1. Pastikan kolom-kolom baru tersedia pada tabel rooms
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS room_type text DEFAULT 'non_vip',
ADD COLUMN IF NOT EXISTS price_per_day numeric DEFAULT 100000,
ADD COLUMN IF NOT EXISTS price_per_week numeric DEFAULT 500000,
ADD COLUMN IF NOT EXISTS price_per_month numeric DEFAULT 1350000,
ADD COLUMN IF NOT EXISTS damage_notes text;

-- 2. Pastikan kolom-kolom baru tersedia pada tabel check_in_requests
ALTER TABLE check_in_requests
ADD COLUMN IF NOT EXISTS room_category text DEFAULT 'non_vip',
ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 100000,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'qris',
ADD COLUMN IF NOT EXISTS rental_duration text DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS rental_days integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS rental_weeks integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS rental_months integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Pastikan CHECK constraint rental_duration mendukung 'weekly'
DO $$
BEGIN
  ALTER TABLE check_in_requests DROP CONSTRAINT IF EXISTS check_in_requests_rental_duration_check;
  ALTER TABLE check_in_requests 
    ADD CONSTRAINT check_in_requests_rental_duration_check 
    CHECK (rental_duration IN ('daily', 'weekly', 'monthly', '6months', '12months'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Set foreign key check_in_requests -> rooms menjadi ON DELETE SET NULL
DO $$
BEGIN
  ALTER TABLE check_in_requests DROP CONSTRAINT IF EXISTS check_in_requests_assigned_room_id_fkey;
  ALTER TABLE check_in_requests 
    ADD CONSTRAINT check_in_requests_assigned_room_id_fkey 
    FOREIGN KEY (assigned_room_id) REFERENCES rooms(id) ON DELETE SET NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Tabel Riwayat Check-Out Tamu
CREATE TABLE IF NOT EXISTS checkout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name text NOT NULL,
  phone text,
  room_number text,
  floor_name text,
  room_type text,
  check_in_date date,
  due_date date,
  checkout_date date DEFAULT CURRENT_DATE,
  checkout_time text,
  deposit_amount numeric DEFAULT 100000,
  late_fee numeric DEFAULT 0,
  damage_fee numeric DEFAULT 0,
  claimed_deposit numeric DEFAULT 0,
  deposit_refund numeric DEFAULT 0,
  additional_pay_needed numeric DEFAULT 0,
  notes text,
  processed_by text,
  created_at timestamptz DEFAULT now()
);

-- 5. Inisialisasi 52 Kamar dan 4 Section di Graha Aisyah Menteng
DO $$
DECLARE
  v_branch_id uuid;
  v_floor_vip_id uuid;
  v_floor_dasar_id uuid;
  v_floor_lt2_id uuid;
  v_floor_lt3_id uuid;
BEGIN
  -- Cek atau buat cabang Graha Aisyah Menteng
  SELECT id INTO v_branch_id FROM branches WHERE name ILIKE '%Menteng%' LIMIT 1;
  
  IF v_branch_id IS NULL THEN
    INSERT INTO branches (name, address)
    VALUES ('Graha Aisyah Menteng', 'Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226')
    RETURNING id INTO v_branch_id;
  ELSE
    UPDATE branches 
    SET name = 'Graha Aisyah Menteng', address = 'Jl. Menteng VII No.77, Medan Tenggara, Kec. Medan Denai, Kota Medan, Sumatera Utara 20226'
    WHERE id = v_branch_id;
  END IF;

  -- Pastikan semua profil staff/owner terhubung ke cabang Graha Aisyah Menteng
  UPDATE profiles SET branch_id = v_branch_id WHERE branch_id IS NULL OR branch_id != v_branch_id;

  -- Buat / Update 4 Section Lantai
  SELECT id INTO v_floor_vip_id FROM floors WHERE branch_id = v_branch_id AND name = 'VIP Belakang Warkop' LIMIT 1;
  IF v_floor_vip_id IS NULL THEN
    INSERT INTO floors (branch_id, name) VALUES (v_branch_id, 'VIP Belakang Warkop') RETURNING id INTO v_floor_vip_id;
  END IF;

  SELECT id INTO v_floor_dasar_id FROM floors WHERE branch_id = v_branch_id AND name = 'Dasar' LIMIT 1;
  IF v_floor_dasar_id IS NULL THEN
    INSERT INTO floors (branch_id, name) VALUES (v_branch_id, 'Dasar') RETURNING id INTO v_floor_dasar_id;
  END IF;

  SELECT id INTO v_floor_lt2_id FROM floors WHERE branch_id = v_branch_id AND name = 'Gedung Atas Lt 2' LIMIT 1;
  IF v_floor_lt2_id IS NULL THEN
    INSERT INTO floors (branch_id, name) VALUES (v_branch_id, 'Gedung Atas Lt 2') RETURNING id INTO v_floor_lt2_id;
  END IF;

  SELECT id INTO v_floor_lt3_id FROM floors WHERE branch_id = v_branch_id AND name = 'Gedung Atas Lt 3' LIMIT 1;
  IF v_floor_lt3_id IS NULL THEN
    INSERT INTO floors (branch_id, name) VALUES (v_branch_id, 'Gedung Atas Lt 3') RETURNING id INTO v_floor_lt3_id;
  END IF;

  -- Hubungkan lantai ke cabang Graha Aisyah Menteng
  UPDATE floors SET branch_id = v_branch_id WHERE branch_id != v_branch_id;

  -- Hapus cabang lama selain Graha Aisyah Menteng
  DELETE FROM branches WHERE id != v_branch_id;

  -- Hapus lantai selain 4 section ini
  DELETE FROM floors WHERE id NOT IN (v_floor_vip_id, v_floor_dasar_id, v_floor_lt2_id, v_floor_lt3_id);

  RAISE NOTICE 'Inisialisasi 4 Section Lantai Selesai!';
END $$;
