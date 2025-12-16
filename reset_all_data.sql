-- ============================================
-- SCRIPT RESET DATA PENGHUNI & KEUANGAN
-- ============================================
-- PERINGATAN: Script ini akan menghapus:
--   ✓ Semua penghuni (tenants)
--   ✓ Semua data pembayaran (payments)
--   ✓ Semua riwayat check-in requests
--   ✓ Reset semua kamar menjadi kosong
--
-- Data yang TIDAK akan dihapus:
--   ✗ Cabang (branches)
--   ✗ Lantai (floors)
--   ✗ Kamar (rooms) - hanya direset statusnya
--   ✗ Staff/User accounts (profiles)
--
-- Gunakan script ini HANYA untuk testing/development!
-- JANGAN jalankan di production tanpa backup!
-- ============================================

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
  RAISE NOTICE 'DATA SEBELUM RESET:';
  RAISE NOTICE 'Total Penghuni: %', tenant_count_before;
  RAISE NOTICE 'Total Pembayaran: %', payment_count_before;
  RAISE NOTICE 'Total Check-in Requests: %', checkin_count_before;
  RAISE NOTICE 'Kamar Terisi: %', occupied_rooms_before;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- 1. Hapus semua riwayat check-in requests (harus pertama karena foreign key)
  DELETE FROM check_in_requests;
  RAISE NOTICE '✓ Riwayat check-in requests telah dihapus';

  -- 2. Hapus semua data pembayaran
  DELETE FROM payments;
  RAISE NOTICE '✓ Data pembayaran telah dihapus';

  -- 3. Hapus semua penghuni (tenants)
  DELETE FROM tenants;
  RAISE NOTICE '✓ Semua penghuni telah dihapus';

  -- 4. Reset semua kamar menjadi kosong
  UPDATE rooms SET is_occupied = false;
  RAISE NOTICE '✓ Semua kamar telah direset menjadi kosong';

  -- Ambil data setelah reset
  SELECT COUNT(*) INTO tenant_count_after FROM tenants;
  SELECT COUNT(*) INTO payment_count_after FROM payments;
  SELECT COUNT(*) INTO checkin_count_after FROM check_in_requests;
  SELECT COUNT(*) INTO room_count FROM rooms;
  SELECT COUNT(*) INTO occupied_rooms_after FROM rooms WHERE is_occupied = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATA SETELAH RESET:';
  RAISE NOTICE 'Total Penghuni: %', tenant_count_after;
  RAISE NOTICE 'Total Pembayaran: %', payment_count_after;
  RAISE NOTICE 'Total Check-in Requests: %', checkin_count_after;
  RAISE NOTICE 'Total Kamar: %', room_count;
  RAISE NOTICE 'Kamar Terisi: %', occupied_rooms_after;
  RAISE NOTICE 'Kamar Kosong: %', (room_count - occupied_rooms_after);
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RESET SELESAI!';
  RAISE NOTICE 'Data penghuni, keuangan, dan check-in telah dihapus.';
  RAISE NOTICE 'Semua kamar telah direset menjadi kosong.';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- VERIFIKASI HASIL RESET
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

-- Tampilkan ringkasan struktur data yang tetap ada
SELECT 
  'Branches' as struktur_data,
  COUNT(*) as jumlah
FROM branches
UNION ALL
SELECT 
  'Floors' as struktur_data,
  COUNT(*) as jumlah
FROM floors
UNION ALL
SELECT 
  'Rooms' as struktur_data,
  COUNT(*) as jumlah
FROM rooms
UNION ALL
SELECT 
  'Profiles (Staff/Owner)' as struktur_data,
  COUNT(*) as jumlah
FROM profiles
ORDER BY struktur_data;




