-- ============================================
-- RESET DATA UNTUK TESTING
-- ============================================
-- WARNING: Script ini akan menghapus data berikut:
--   - Semua check-in requests
--   - Semua pembayaran (payments)
--   - Semua tenant/penghuni (tenants)
--   - Reset semua kamar menjadi kosong (is_occupied = false)
--
-- Data yang TIDAK dihapus:
--   - Cabang (branches)
--   - Lantai (floors)
--   - Kamar (rooms) - hanya direset is_occupied = false
--   - Staff/User accounts
--   - Profiles
--
-- Gunakan script ini HANYA untuk testing/development!
-- JANGAN jalankan di production tanpa backup!
-- ============================================

DO $$
BEGIN
    -- Step 1: Hapus semua check-in requests
    DELETE FROM check_in_requests;
    RAISE NOTICE 'Check-in requests deleted';

    -- Step 2: Hapus semua pembayaran
    DELETE FROM payments;
    RAISE NOTICE 'Payments deleted';

    -- Step 3: Hapus data guest_book (jika tabel masih ada) - harus sebelum hapus tenants
    -- karena ada foreign key constraint
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guest_book') THEN
        DELETE FROM guest_book;
        RAISE NOTICE 'Guest book deleted';
    ELSE
        RAISE NOTICE 'Guest book table not found (skipped)';
    END IF;

    -- Step 4: Hapus semua tenant/penghuni (setelah guest_book dihapus)
    DELETE FROM tenants;
    RAISE NOTICE 'Tenants deleted';

    -- Step 5: Reset semua kamar menjadi kosong
    UPDATE rooms SET is_occupied = false;
    RAISE NOTICE 'All rooms set to unoccupied';

    RAISE NOTICE '============================================';
    RAISE NOTICE 'RESET SELESAI!';
    RAISE NOTICE 'Data yang dihapus: check-in requests, payments, tenants';
    RAISE NOTICE 'Data yang tetap: branches, floors, rooms, staff/owner accounts';
    RAISE NOTICE 'Semua kamar telah direset menjadi kosong';
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- VERIFIKASI RESET
-- ============================================
SELECT 
    'Data setelah reset:' as info,
    (SELECT COUNT(*) FROM tenants) as total_tenants,
    (SELECT COUNT(*) FROM payments) as total_payments,
    (SELECT COUNT(*) FROM check_in_requests) as total_check_ins,
    (SELECT COUNT(*) FROM rooms WHERE is_occupied = true) as kamar_terisi,
    (SELECT COUNT(*) FROM rooms WHERE is_occupied = false) as kamar_kosong,
    (SELECT COUNT(*) FROM branches) as total_cabang,
    (SELECT COUNT(*) FROM floors) as total_lantai,
    (SELECT COUNT(*) FROM rooms) as total_kamar;

-- Cek apakah guest_book masih ada dan berapa datanya
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guest_book') THEN
        RAISE NOTICE 'Tabel guest_book masih ada di database (total: % baris)', 
            (SELECT COUNT(*) FROM guest_book);
    ELSE
        RAISE NOTICE 'Tabel guest_book tidak ditemukan';
    END IF;
END $$;

