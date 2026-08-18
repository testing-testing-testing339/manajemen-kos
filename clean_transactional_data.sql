-- ============================================
-- SCRIPT CLEAN DATA TRANSAKSIONAL
-- ============================================
-- PERINGATAN: Script ini akan menghapus BERSIH:
--   ✓ Semua penghuni (tenants)
--   ✓ Semua data pembayaran (payments)
--   ✓ Semua riwayat check-in requests
--   ✓ Reset semua kamar menjadi kosong (is_occupied = false)
--
-- Data yang TIDAK akan dihapus (TETAP ADA):
--   ✗ Cabang (branches) - tetap utuh
--   ✗ Lantai (floors) - tetap utuh
--   ✗ Kamar (rooms) - tetap utuh, hanya direset status is_occupied = false
--   ✗ User/Staff accounts (profiles) - tetap utuh
--
-- Gunakan script ini HANYA untuk testing/development!
-- JANGAN jalankan di production tanpa backup!
-- ============================================

BEGIN;

DO $$
DECLARE
  tenant_count_before INTEGER;
  payment_count_before INTEGER;
  checkin_count_before INTEGER;
  tenant_count_after INTEGER;
  payment_count_after INTEGER;
  checkin_count_after INTEGER;
  room_count INTEGER;
  occupied_rooms_before INTEGER;
  occupied_rooms_after INTEGER;
BEGIN
  -- Ambil data sebelum reset
  SELECT COUNT(*) INTO tenant_count_before FROM tenants;
  SELECT COUNT(*) INTO payment_count_before FROM payments;
  SELECT COUNT(*) INTO checkin_count_before FROM check_in_requests;
  SELECT COUNT(*) INTO occupied_rooms_before FROM rooms WHERE is_occupied = true;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATA SEBELUM CLEAN:';
  RAISE NOTICE 'Total Penghuni: %', tenant_count_before;
  RAISE NOTICE 'Total Pembayaran: %', payment_count_before;
  RAISE NOTICE 'Total Check-in Requests: %', checkin_count_before;
  RAISE NOTICE 'Kamar Terisi: %', occupied_rooms_before;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- 1. Hapus semua riwayat check-in requests (harus pertama karena foreign key constraint)
  DELETE FROM check_in_requests;
  RAISE NOTICE '✓ Riwayat check-in requests telah dihapus';

  -- 2. Hapus semua data pembayaran (harus sebelum hapus tenants karena foreign key)
  DELETE FROM payments;
  RAISE NOTICE '✓ Data pembayaran telah dihapus';

  -- 3. Hapus semua penghuni (tenants)
  DELETE FROM tenants;
  RAISE NOTICE '✓ Semua penghuni telah dihapus';

  -- 4. Reset semua kamar menjadi kosong
  UPDATE rooms SET is_occupied = false;
  RAISE NOTICE '✓ Semua kamar telah direset menjadi kosong (is_occupied = false)';

  -- Ambil data setelah reset
  SELECT COUNT(*) INTO tenant_count_after FROM tenants;
  SELECT COUNT(*) INTO payment_count_after FROM payments;
  SELECT COUNT(*) INTO checkin_count_after FROM check_in_requests;
  SELECT COUNT(*) INTO room_count FROM rooms;
  SELECT COUNT(*) INTO occupied_rooms_after FROM rooms WHERE is_occupied = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATA SETELAH CLEAN:';
  RAISE NOTICE 'Total Penghuni: %', tenant_count_after;
  RAISE NOTICE 'Total Pembayaran: %', payment_count_after;
  RAISE NOTICE 'Total Check-in Requests: %', checkin_count_after;
  RAISE NOTICE 'Total Kamar: %', room_count;
  RAISE NOTICE 'Kamar Terisi: %', occupied_rooms_after;
  RAISE NOTICE 'Kamar Kosong: %', (room_count - occupied_rooms_after);
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CLEAN DATA SELESAI!';
  RAISE NOTICE 'Semua data transaksional telah dihapus.';
  RAISE NOTICE 'Data cabang, lantai, kamar, dan user tetap utuh.';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- VERIFIKASI HASIL CLEAN
-- ============================================
SELECT 
  'Tenants' as tabel,
  COUNT(*) as jumlah_data,
  CASE WHEN COUNT(*) = 0 THEN '✓ Kosong' ELSE '✗ Masih ada data' END as status
FROM tenants
UNION ALL
SELECT 
  'Payments' as tabel,
  COUNT(*) as jumlah_data,
  CASE WHEN COUNT(*) = 0 THEN '✓ Kosong' ELSE '✗ Masih ada data' END as status
FROM payments
UNION ALL
SELECT 
  'Check-in Requests' as tabel,
  COUNT(*) as jumlah_data,
  CASE WHEN COUNT(*) = 0 THEN '✓ Kosong' ELSE '✗ Masih ada data' END as status
FROM check_in_requests
UNION ALL
SELECT 
  'Rooms (Terisi)' as tabel,
  COUNT(*) as jumlah_data,
  CASE WHEN COUNT(*) = 0 THEN '✓ Semua kosong' ELSE '✗ Masih ada yang terisi' END as status
FROM rooms
WHERE is_occupied = true
ORDER BY tabel;

-- ============================================
-- TAMPILKAN STRUKTUR DATA YANG TETAP ADA
-- ============================================
SELECT 
  'Branches (Cabang)' as struktur_data,
  COUNT(*) as jumlah
FROM branches
UNION ALL
SELECT 
  'Floors (Lantai)' as struktur_data,
  COUNT(*) as jumlah
FROM floors
UNION ALL
SELECT 
  'Rooms (Kamar)' as struktur_data,
  COUNT(*) as jumlah
FROM rooms
UNION ALL
SELECT 
  'Profiles (User/Staff)' as struktur_data,
  COUNT(*) as jumlah
FROM profiles
ORDER BY struktur_data;

-- ============================================
-- RINGKASAN KAMAR PER CABANG (jika ingin melihat detail)
-- ============================================
SELECT 
  b.name as cabang,
  COUNT(r.id) as total_kamar,
  COUNT(CASE WHEN r.is_occupied = true THEN 1 END) as kamar_terisi,
  COUNT(CASE WHEN r.is_occupied = false THEN 1 END) as kamar_kosong
FROM branches b
LEFT JOIN floors f ON f.branch_id = b.id
LEFT JOIN rooms r ON r.floor_id = f.id
GROUP BY b.id, b.name
ORDER BY b.name;


