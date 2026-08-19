-- =========================================================================
-- SETUP SINGLE BRANCH: KOST JL. MENTENG (TEPAT 53 KAMAR: 13 VIP, 40 NON-VIP)
-- =========================================================================

-- 1. Pastikan kolom-kolom baru tersedia pada tabel rooms
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS room_type text DEFAULT 'non_vip',
ADD COLUMN IF NOT EXISTS price_per_day numeric DEFAULT 100000,
ADD COLUMN IF NOT EXISTS price_per_week numeric DEFAULT 700000,
ADD COLUMN IF NOT EXISTS price_per_month numeric DEFAULT 3000000;

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

-- 4. Inisialisasi Tepat 53 Kamar di Graha Aisyah Menteng
DO $$
DECLARE
  v_branch_id uuid;
  v_floor_1_id uuid;
  v_floor_2_id uuid;
  v_floor_3_id uuid;
  i integer;
BEGIN
  -- Cek atau buat cabang Graha Aisyah Menteng
  SELECT id INTO v_branch_id FROM branches WHERE name ILIKE '%Menteng%' LIMIT 1;
  
  IF v_branch_id IS NULL THEN
    INSERT INTO branches (name, address)
    VALUES ('Graha Aisyah Menteng', 'Jl. Menteng No. 1, Jakarta Pusat')
    RETURNING id INTO v_branch_id;
  ELSE
    UPDATE branches 
    SET name = 'Graha Aisyah Menteng', address = 'Jl. Menteng No. 1, Jakarta Pusat'
    WHERE id = v_branch_id;
  END IF;

  -- Pastikan semua profil staff/owner terhubung ke cabang Graha Aisyah Menteng
  UPDATE profiles SET branch_id = v_branch_id WHERE branch_id IS NULL OR branch_id != v_branch_id;

  -- Buat / Update Lantai (Lantai 1, Lantai 2, Lantai 3)
  SELECT id INTO v_floor_1_id FROM floors WHERE branch_id = v_branch_id AND name = 'Lantai 1' LIMIT 1;
  IF v_floor_1_id IS NULL THEN
    INSERT INTO floors (branch_id, name) VALUES (v_branch_id, 'Lantai 1') RETURNING id INTO v_floor_1_id;
  END IF;

  SELECT id INTO v_floor_2_id FROM floors WHERE branch_id = v_branch_id AND name = 'Lantai 2' LIMIT 1;
  IF v_floor_2_id IS NULL THEN
    INSERT INTO floors (branch_id, name) VALUES (v_branch_id, 'Lantai 2') RETURNING id INTO v_floor_2_id;
  END IF;

  SELECT id INTO v_floor_3_id FROM floors WHERE branch_id = v_branch_id AND name = 'Lantai 3' LIMIT 1;
  IF v_floor_3_id IS NULL THEN
    INSERT INTO floors (branch_id, name) VALUES (v_branch_id, 'Lantai 3') RETURNING id INTO v_floor_3_id;
  END IF;

  -- Hubungkan lantai ke cabang Graha Aisyah Menteng
  UPDATE floors SET branch_id = v_branch_id WHERE branch_id != v_branch_id;

  -- Hapus cabang lama selain Graha Aisyah Menteng
  DELETE FROM branches WHERE id != v_branch_id;

  -- 13 KAMAR VIP LANTAI 1 (Kamar 1 s/d 13)
  FOR i IN 1..13 LOOP
    IF NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = i::text) THEN
      INSERT INTO rooms (floor_id, room_number, price, price_per_day, price_per_week, price_per_month, room_type, facilities, is_occupied)
      VALUES (
        v_floor_1_id,
        i::text,
        100000,
        100000,
        700000,
        3000000,
        'vip',
        '["AC", "Kamar Mandi Dalam", "Smart TV", "Wifi High-Speed", "Kasur Queen Bed", "Lemari Pakaian", "Meja Kerja", "Water Heater"]'::jsonb,
        false
      );
    ELSE
      UPDATE rooms 
      SET floor_id = v_floor_1_id,
          price = 100000,
          price_per_day = 100000,
          price_per_week = 700000,
          price_per_month = 3000000,
          room_type = 'vip',
          facilities = '["AC", "Kamar Mandi Dalam", "Smart TV", "Wifi High-Speed", "Kasur Queen Bed", "Lemari Pakaian", "Meja Kerja", "Water Heater"]'::jsonb
      WHERE room_number = i::text;
    END IF;
  END LOOP;

  -- 20 KAMAR NON-VIP LANTAI 2 (Kamar 14 s/d 33)
  FOR i IN 14..33 LOOP
    IF NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = i::text) THEN
      INSERT INTO rooms (floor_id, room_number, price, price_per_day, price_per_week, price_per_month, room_type, facilities, is_occupied)
      VALUES (
        v_floor_2_id,
        i::text,
        100000,
        100000,
        700000,
        3000000,
        'non_vip',
        '["AC", "Kamar Mandi Dalam", "Wifi High-Speed", "Kasur Single Bed", "Lemari Pakaian", "Meja Belajar"]'::jsonb,
        false
      );
    ELSE
      UPDATE rooms 
      SET floor_id = v_floor_2_id,
          price = 100000,
          price_per_day = 100000,
          price_per_week = 700000,
          price_per_month = 3000000,
          room_type = 'non_vip',
          facilities = '["AC", "Kamar Mandi Dalam", "Wifi High-Speed", "Kasur Single Bed", "Lemari Pakaian", "Meja Belajar"]'::jsonb
      WHERE room_number = i::text;
    END IF;
  END LOOP;

  -- 20 KAMAR NON-VIP LANTAI 3 (Kamar 34 s/d 53)
  FOR i IN 34..53 LOOP
    IF NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = i::text) THEN
      INSERT INTO rooms (floor_id, room_number, price, price_per_day, price_per_week, price_per_month, room_type, facilities, is_occupied)
      VALUES (
        v_floor_3_id,
        i::text,
        100000,
        100000,
        700000,
        3000000,
        'non_vip',
        '["AC", "Kamar Mandi Dalam", "Wifi High-Speed", "Kasur Single Bed", "Lemari Pakaian", "Meja Belajar"]'::jsonb,
        false
      );
    ELSE
      UPDATE rooms 
      SET floor_id = v_floor_3_id,
          price = 100000,
          price_per_day = 100000,
          price_per_week = 700000,
          price_per_month = 3000000,
          room_type = 'non_vip',
          facilities = '["AC", "Kamar Mandi Dalam", "Wifi High-Speed", "Kasur Single Bed", "Lemari Pakaian", "Meja Belajar"]'::jsonb
      WHERE room_number = i::text;
    END IF;
  END LOOP;

  -- HAPUS SEMUA KAMAR LAIN YANG DI LUAR NOMOR 1 S/D 53
  DELETE FROM rooms 
  WHERE room_number ~ '^\d+$' AND (room_number::int < 1 OR room_number::int > 53);

  -- Set semua harga seragam 100rb/hari
  UPDATE rooms 
  SET price = 100000, price_per_day = 100000, price_per_week = 700000, price_per_month = 3000000;

  RAISE NOTICE 'Selesai! Total kamar sekarang tepat 53: 13 VIP dan 40 Non-VIP.';
END $$;

-- Verifikasi hasil akhir
SELECT 
  r.room_type as tipe_kamar,
  COUNT(*) as jumlah_kamar,
  MIN(r.price_per_day) as harga_per_malam
FROM rooms r
GROUP BY r.room_type
ORDER BY r.room_type DESC;
