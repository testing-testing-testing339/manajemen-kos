-- Script untuk reset data keuangan dan riwayat transaksi
-- PERINGATAN: Script ini akan menghapus:
--   - Semua data pembayaran (payments)
--   - Semua riwayat check-in requests
--   - Semua penghuni (tenants)
--   - Reset semua kamar menjadi kosong (is_occupied = false)
--
-- Data yang TIDAK akan dihapus:
--   - Cabang (branches)
--   - Lantai (floors)
--   - Kamar (rooms) - hanya direset is_occupied = false
--   - Staff/User accounts (profiles)

DO $$
DECLARE
  tenant_count INTEGER;
  room_count INTEGER;
  payment_count INTEGER;
  checkin_count INTEGER;
  occupied_rooms_count INTEGER;
BEGIN
  -- 1. Hapus semua riwayat check-in requests (harus sebelum tenants karena foreign key)
  DELETE FROM check_in_requests;
  RAISE NOTICE 'Riwayat check-in requests telah dihapus';

  -- 2. Hapus semua data pembayaran (harus sebelum tenants karena foreign key dengan ON DELETE SET NULL)
  DELETE FROM payments;
  RAISE NOTICE 'Data pembayaran telah dihapus';

  -- 3. Hapus semua penghuni (tenants)
  DELETE FROM tenants;
  RAISE NOTICE 'Semua penghuni telah dihapus';

  -- 4. Reset semua kamar menjadi kosong
  UPDATE rooms SET is_occupied = false;
  RAISE NOTICE 'Semua kamar telah direset menjadi kosong';

  -- 5. Tampilkan ringkasan
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  SELECT COUNT(*) INTO room_count FROM rooms;
  SELECT COUNT(*) INTO payment_count FROM payments;
  SELECT COUNT(*) INTO checkin_count FROM check_in_requests;
  SELECT COUNT(*) INTO occupied_rooms_count FROM rooms WHERE is_occupied = true;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Ringkasan setelah reset:';
  RAISE NOTICE 'Total Penghuni: %', tenant_count;
  RAISE NOTICE 'Total Kamar: %', room_count;
  RAISE NOTICE 'Kamar Terisi: %', occupied_rooms_count;
  RAISE NOTICE 'Kamar Kosong: %', (room_count - occupied_rooms_count);
  RAISE NOTICE 'Total Pembayaran: %', payment_count;
  RAISE NOTICE 'Total Check-in Requests: %', checkin_count;
  RAISE NOTICE '========================================';
END $$;

-- Verifikasi hasil
SELECT 
  'Tenants' as table_name,
  COUNT(*) as record_count
FROM tenants
UNION ALL
SELECT 
  'Rooms' as table_name,
  COUNT(*) as record_count
FROM rooms
UNION ALL
SELECT 
  'Payments' as table_name,
  COUNT(*) as record_count
FROM payments
UNION ALL
SELECT 
  'Check-in Requests' as table_name,
  COUNT(*) as record_count
FROM check_in_requests
ORDER BY table_name;

