import os
import base64
import subprocess

screenshots_dir = r"d:\coding\manajemen-kos\scripts\screenshots"

def get_base64_image(filename):
    path = os.path.join(screenshots_dir, filename)
    if os.path.exists(path):
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode("utf-8")
            return f"data:image/png;base64,{data}"
    return ""

img_tamu = get_base64_image("ss_tamu_step1.png")
img_login = get_base64_image("ss_login.png")
img_dashboard = get_base64_image("ss_dashboard.png")
img_checkin = get_base64_image("ss_checkin_manager.png")
img_penghuni = get_base64_image("ss_penghuni.png")
img_pembayaran = get_base64_image("ss_pembayaran.png")
img_kamar = get_base64_image("ss_kamar.png")

html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Buku Panduan Penggunaan Web Graha Aisyah</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  @page {{
    size: A4 portrait;
    margin: 12mm 12mm 12mm 12mm;
    @bottom-right {{
      content: counter(page);
    }}
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    font-size: 9.5pt;
    line-height: 1.5;
  }}

  .page-break {{
    page-break-before: always;
    break-before: page;
  }}

  .avoid-break {{
    page-break-inside: avoid;
    break-inside: avoid;
  }}

  /* COVER STYLING */
  .cover {{
    height: 100%;
    min-height: 1000px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 44px 36px;
    background: linear-gradient(145deg, #064e3b 0%, #065f46 45%, #0f172a 100%);
    color: #ffffff;
    border-radius: 20px;
    position: relative;
    overflow: hidden;
  }}

  .cover::before {{
    content: "";
    position: absolute;
    top: -60px;
    right: -60px;
    width: 320px;
    height: 320px;
    background: rgba(16, 185, 129, 0.15);
    border-radius: 50%;
  }}

  .badge-cover {{
    display: inline-block;
    background: rgba(16, 185, 129, 0.25);
    border: 1px solid #10b981;
    color: #a7f3d0;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.5px;
  }}

  .cover-title {{
    font-size: 30pt;
    font-weight: 800;
    line-height: 1.15;
    color: #ffffff;
    margin: 25px 0 10px 0;
  }}

  .cover-subtitle {{
    font-size: 13pt;
    font-weight: 600;
    color: #a7f3d0;
    line-height: 1.4;
    max-width: 500px;
  }}

  .cover-divider {{
    width: 70px;
    height: 4px;
    background: #10b981;
    border-radius: 4px;
    margin: 20px 0;
  }}

  .cover-card-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 25px;
  }}

  .cover-card {{
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 14px 18px;
    border-radius: 12px;
  }}

  .cover-card-title {{
    font-weight: 700;
    font-size: 10.5pt;
    color: #6ee7b7;
    margin-bottom: 4px;
  }}

  .cover-card-desc {{
    font-size: 8.5pt;
    color: #cbd5e1;
    line-height: 1.35;
  }}

  .cover-footer {{
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 8.5pt;
    color: #94a3b8;
  }}

  /* HEADINGS */
  h1 {{
    font-size: 15pt;
    font-weight: 800;
    color: #064e3b;
    border-bottom: 2px solid #10b981;
    padding-bottom: 5px;
    margin: 14px 0 10px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }}

  h2 {{
    font-size: 11pt;
    font-weight: 700;
    color: #0f172a;
    margin: 12px 0 6px 0;
  }}

  p {{
    margin-bottom: 8px;
    color: #334155;
  }}

  /* BOXES */
  .box-simple {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }}

  .box-step {{
    display: flex;
    gap: 12px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 8px;
    page-break-inside: avoid;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }}

  .step-num {{
    background: #10b981;
    color: #ffffff;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 9pt;
    flex-shrink: 0;
    margin-top: 1px;
  }}

  .step-num.blue {{ background: #4f46e5; }}
  .step-num.purple {{ background: #8b5cf6; }}
  .step-num.amber {{ background: #f59e0b; }}

  .step-content {{
    flex: 1;
    font-size: 8.5pt;
  }}

  .step-title {{
    font-size: 9.5pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }}

  /* SCREENSHOT CONTAINER */
  .screenshot-wrapper {{
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    overflow: hidden;
    margin: 8px 0;
    box-shadow: 0 3px 6px rgba(0,0,0,0.05);
    background: #0f172a;
    text-align: center;
    page-break-inside: avoid;
  }}

  .screenshot-img {{
    width: 100%;
    max-height: 240px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
    background: #0f172a;
  }}

  .screenshot-img-mobile {{
    max-width: 170px;
    max-height: 320px;
    object-fit: contain;
    border-radius: 12px;
    border: 2px solid #334155;
    display: block;
  }}

  .screenshot-caption {{
    background: #f1f5f9;
    padding: 4px 10px;
    font-size: 7.5pt;
    color: #64748b;
    font-weight: 600;
    border-top: 1px solid #e2e8f0;
    text-align: center;
  }}

  /* 2-COLUMN LAYOUT WITH SCREENSHOT */
  .layout-with-screenshot {{
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 14px;
    align-items: start;
    margin: 8px 0;
    page-break-inside: avoid;
  }}

  .layout-mobile-preview {{
    display: grid;
    grid-template-columns: 1fr 180px;
    gap: 14px;
    align-items: start;
    margin: 8px 0;
    page-break-inside: avoid;
  }}

  /* CALLOUTS */
  .tip-box {{
    background: #f0fdf4;
    border-left: 3.5px solid #10b981;
    padding: 8px 12px;
    border-radius: 6px;
    margin: 8px 0;
    font-size: 8.5pt;
    color: #065f46;
    page-break-inside: avoid;
  }}

  .tip-box strong {{
    display: block;
    margin-bottom: 2px;
  }}

  .warn-box {{
    background: #fffbeb;
    border-left: 3.5px solid #f59e0b;
    padding: 8px 12px;
    border-radius: 6px;
    margin: 8px 0;
    font-size: 8.5pt;
    color: #92400e;
    page-break-inside: avoid;
  }}

  /* HEADER */
  .page-header {{
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5pt;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 600;
  }}

  .page-header span.app-name {{
    color: #065f46;
    font-weight: 800;
  }}

  .flow-badge {{
    display: inline-block;
    background: #ecfdf5;
    border: 1px solid #10b981;
    color: #065f46;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 7.5pt;
    font-weight: 700;
  }}
</style>
</head>
<body>

<!-- ==================== HALAMAN 1: COVER ==================== -->
<div class="cover">
  <div>
    <div>
      <span class="badge-cover">Buku Panduan Gambar & Langkah Praktis</span>
    </div>

    <div>
      <div class="cover-title">PANDUAN PEMAKAIAN APLIKASI KOST</div>
      <div class="cover-subtitle">Alur Mudah Penerimaan Tamu, Kas Harian & Manajemen Kamar</div>
      <div class="cover-divider"></div>
      <p style="color: #e2e8f0; font-size: 9.5pt; max-width: 520px; line-height: 1.5;">
        Buku panduan bergambar yang simpel dan tanpa bahasa rumit. Dibuat agar tamu mudah check-in mandiri, resepsionis cepat memproses kamar, dan bos/owner tenang memantau uang masuk dari rumah.
      </p>
    </div>
  </div>

  <div>
    <div class="cover-card-grid">
      <div class="cover-card">
        <div class="cover-card-title">1. Tamu Baru Datang (Check-In)</div>
        <div class="cover-card-desc">Cukup scan barcode meja, isi nama, foto KTP & wajah, lalu bayar via QRIS atau uang tunai di meja.</div>
      </div>
      <div class="cover-card">
        <div class="cover-card-title">2. Resepsionis Serahkan Kunci</div>
        <div class="cover-card-desc">Cek data di laptop, pilihkan kamar kosong yang siap, lalu langsung serahkan kunci fisik ke tamu.</div>
      </div>
      <div class="cover-card">
        <div class="cover-card-title">3. Tamu Keluar (Check-Out)</div>
        <div class="cover-card-desc">Cek kamar, hitung sisa deposit jaminan secara otomatis di web, kembalikan uang deposit, selesai.</div>
      </div>
      <div class="cover-card">
        <div class="cover-card-title">4. Hitung Kas & Ganti Shift</div>
        <div class="cover-card-desc">Cocokkan uang laci dengan angka di web, lalu klik 1 tombol untuk kirim rekapan shift ke grup WhatsApp.</div>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <strong style="color: #fff; font-size: 9.5pt; display: block;">Graha Aisyah Menteng</strong>
        Jl. Menteng VII No.77, Medan Tenggara, Kota Medan
      </div>
      <div style="text-align: right;">
        <strong style="color: #fff; font-size: 9.5pt; display: block;">Edisi 2026</strong>
        Siap Pakai untuk Semua Staf
      </div>
    </div>
  </div>
</div>

<!-- ==================== HALAMAN 2: ALUR TAMU (SELF CHECK-IN) ==================== -->
<div class="page-break"></div>

<div class="page-header">
  <span class="app-name">Graha Aisyah Menteng</span>
  <span>Bagian 1: Alur Tamu Baru (Self Check-In)</span>
</div>

<h1>Bagian 1: Alur Tamu Baru (Check-In Mandiri)</h1>
<p>
  Ketika ada tamu baru datang ke kost, tamu <strong>tidak perlu tulis tangan di buku tamu</strong>. Cukup scan barcode akrilik di atas meja resepsionis menggunakan kamera HP masing-masing.
</p>

<div class="layout-mobile-preview">
  <div>
    <h2>4 Langkah Mudah di HP Tamu:</h2>

    <div class="box-step">
      <div class="step-num">1</div>
      <div class="step-content">
        <div class="step-title">Scan Barcode & Isi Nama</div>
        Tamu scan barcode di meja kasir, lalu ketik nama lengkap sesuai KTP dan nomor WhatsApp aktif.
      </div>
    </div>

    <div class="box-step">
      <div class="step-num">2</div>
      <div class="step-content">
        <div class="step-title">Foto KTP & Foto Wajah (Selfie)</div>
        Tamu memfotokan KTP aslinya, lalu ambil foto wajah selfie secara langsung lewat kamera depan HP.
      </div>
    </div>

    <div class="box-step">
      <div class="step-num">3</div>
      <div class="step-content">
        <div class="step-title">Pilih Durasi & Mau Bayar Lewat Apa</div>
        Pilih mau sewa Harian (Rp 100rb), Mingguan, atau Bulanan. Lalu pilih pembayaran:
        <ul style="margin: 3px 0 0 14px;">
          <li><strong>QRIS:</strong> Scan QRIS di layar HP & upload bukti transfer.</li>
          <li><strong>Tunai (Cash):</strong> Serahkan uang tunai ke resepsionis, lalu tekan tombol <em>"Ambil Foto Uang Tunai"</em> untuk foto uang di meja secara langsung.</li>
        </ul>
      </div>
    </div>

    <div class="box-step">
      <div class="step-num">4</div>
      <div class="step-content">
        <div class="step-title">Kirim & Tunggu Kunci Fisik</div>
        Klik tombol Kirim. Tamu tinggal menunggu di depan meja selagi resepsionis membuka laptop untuk memberikan kunci kamar.
      </div>
    </div>

    <div class="tip-box">
      <strong>💡 Tips untuk Tamu:</strong>
      Jika kamera HP tidak terbuka, cukup pastikan browser HP sudah diberi izin akses kamera.
    </div>
  </div>

  <div>
    <div style="text-align: center;">
      <img src="{img_tamu}" alt="Tampilan HP Tamu" class="screenshot-img-mobile" />
      <div style="font-size: 7pt; color: #64748b; margin-top: 4px; font-weight: 600;">
        📱 Layar Check-In di HP Tamu
      </div>
    </div>
  </div>
</div>

<!-- ==================== HALAMAN 3: RESEPSIONIS MENERIMA TAMU ==================== -->
<div class="page-break"></div>

<div class="page-header">
  <span class="app-name">Graha Aisyah Menteng</span>
  <span>Bagian 2: Resepsionis Menerima Tamu Masuk</span>
</div>

<h1>Bagian 2: Resepsionis Menerima Tamu Masuk</h1>
<p>
  Tugas resepsionis saat tamu selesai mengisi data di HP adalah memeriksa data di laptop dan memberikan kunci kamar yang masih kosong.
</p>

<div class="screenshot-wrapper">
  <img src="{img_checkin}" alt="Menu Permintaan Check-In" class="screenshot-img" />
  <div class="screenshot-caption">
    💻 Menu "Permintaan Check-In" di Laptop Resepsionis: Tempat melihat tamu yang baru masuk
  </div>
</div>

<h2>3 Langkah Mudah Resepsionis Memproses Tamu:</h2>

<div class="box-step">
  <div class="step-num blue">1</div>
  <div class="step-content">
    <div class="step-title">Buka Menu "Permintaan Check-In"</div>
    Di menu sebelah kiri laptop, klik <strong>Permintaan Check-In</strong>. Nama tamu baru akan muncul dengan tanda kuning (Pending).
  </div>
</div>

<div class="box-step">
  <div class="step-num blue">2</div>
  <div class="step-content">
    <div class="step-title">Klik "Lihat Detail & Foto" untuk Cek Berkas</div>
    Cocokkan foto KTP dan wajah selfie dengan tamu yang ada di depan meja. Pastikan uang sewa sudah diterima (jika transfer cek mutasi QRIS, jika tunai hitung uang di meja).
  </div>
</div>

<div class="box-step">
  <div class="step-num blue">3</div>
  <div class="step-content">
    <div class="step-title">Pilih Kamar Kosong & Serahkan Kunci Fisik</div>
    Klik tombol hijau <strong>"Pilih Kamar & Selesai"</strong>. Pilih nomor kamar kosong yang tersedia dari daftar ➔ Klik Konfirmasi. Berikan kunci fisik kamar ke tamu. Selesai!
  </div>
</div>

<div class="warn-box">
  <strong>⚠️ Jika Data Tamu Salah atau Foto Buram:</strong>
  Resepsionis bisa klik tombol merah <strong>"Tolak"</strong> dan tulis alasannya (contoh: <em>"Foto KTP tidak jelas, tolong foto ulang"</em>).
</div>

<!-- ==================== HALAMAN 4: RESEPSIONIS CHECK-OUT TAMU ==================== -->
<div class="page-break"></div>

<div class="page-header">
  <span class="app-name">Graha Aisyah Menteng</span>
  <span>Bagian 3: Tamu Keluar (Check-Out) & Deposit</span>
</div>

<h1>Bagian 3: Tamu Keluar (Check-Out) & Deposit</h1>
<p>
  Saat masa sewa tamu sudah habis dan tamu akan keluar, ikuti langkah berikut untuk mengembalikan uang jaminan/deposit dan mengosongkan status kamar.
</p>

<div class="screenshot-wrapper">
  <img src="{img_penghuni}" alt="Menu Data Penghuni" class="screenshot-img" />
  <div class="screenshot-caption">
    💻 Menu "Data Penghuni" di Laptop: Tempat memantau siapa saja yang sedang menginap dan tombol Check-Out
  </div>
</div>

<h2>Cara Memproses Tamu Check-Out:</h2>

<div class="box-step">
  <div class="step-num purple">1</div>
  <div class="step-content">
    <div class="step-title">Terima Kunci & Cek Kamar</div>
    Ambil kunci dari tamu. Petugas kebersihan / staf cek kamar sebentar (pastikan remote AC, remote TV, dan kran air aman).
  </div>
</div>

<div class="box-step">
  <div class="step-num purple">2</div>
  <div class="step-content">
    <div class="step-title">Buka Menu "Data Penghuni" ➔ Klik Tombol "Check-Out"</div>
    Cari nama tamu / nomor kamar di tabel, lalu klik tombol merah <strong>Check-Out</strong> di sebelah kanan.
  </div>
</div>

<div class="box-step">
  <div class="step-num purple">3</div>
  <div class="step-content">
    <div class="step-title">Sistem Menghitung Uang Deposit Otomatis</div>
    Jika tidak ada barang rusak, isi denda <code>0</code>. Sistem otomatis menampilkan berapa uang deposit yang harus dikembalikan ke tamu (misal: Rp 100.000).
  </div>
</div>

<div class="box-step">
  <div class="step-num purple">4</div>
  <div class="step-content">
    <div class="step-title">Kembalikan Uang Deposit / KTP ➔ Klik Konfirmasi</div>
    Serahkan uang kembalian deposit (atau fisik KTP asli jika tamu jaminan KTP), lalu klik <strong>Konfirmasi Check-Out</strong>. Kamar otomatis langsung bersih dan kembali berstatus <em>Kosong / Siap Huni</em>.
  </div>
</div>

<!-- ==================== HALAMAN 5: HITUNG KAS & GANTI SHIFT ==================== -->
<div class="page-break"></div>

<div class="page-header">
  <span class="app-name">Graha Aisyah Menteng</span>
  <span>Bagian 4: Hitung Uang Kas & Ganti Shift</span>
</div>

<h1>Bagian 4: Hitung Kas Laci & Ganti Shift</h1>
<p>
  Agar uang kas tidak pernah selisih antara petugas shift pagi, siang, dan malam, web sudah memisahkan otomatis antara uang tunai di laci dan uang transfer QRIS.
</p>

<div class="screenshot-wrapper">
  <img src="{img_pembayaran}" alt="Menu Pembayaran Kas Shift" class="screenshot-img" />
  <div class="screenshot-caption">
    💻 Menu "Pembayaran" di Laptop: Rekapitulasi kas shift & tombol otomatis kirim laporan ke WhatsApp Bos
  </div>
</div>

<h2>Cara Serah Terima Kas saat Pergantian Shift:</h2>

<div class="box-step">
  <div class="step-num amber">1</div>
  <div class="step-content">
    <div class="step-title">Buka Menu "Pembayaran"</div>
    Pilih nama petugas yang bertugas dan tanggal shift hari ini.
  </div>
</div>

<div class="box-step">
  <div class="step-num amber">2</div>
  <div class="step-content">
    <div class="step-title">Hitung Uang Fisik di Laci Kasir</div>
    Lihat kotak hijau <strong>"Penerimaan Tunai (Cash)"</strong>. Hitung fisik uang di laci bersama petugas shift berikutnya. <strong>Jumlah uang di laci wajib sama persis dengan angka di web!</strong>
  </div>
</div>

<div class="box-step">
  <div class="step-num amber">3</div>
  <div class="step-content">
    <div class="step-title">Klik Tombol "Salin Laporan WhatsApp Shift"</div>
    Tinggal klik 1 tombol hijau di atas tabel, teks laporan shift langsung tersalin otomatis. Buka WhatsApp, tinggal <em>Paste (Tempel)</em> dan kirim ke grup WhatsApp Bos/Owner kost!
  </div>
</div>

<div class="tip-box">
  <strong>Contoh Teks Laporan yang Terkirim ke WhatsApp:</strong>
  📋 LAPORAN KAS SHIFT GRAHA AISYAH<br>
  • Uang Tunai (Cash di Laci): Rp 500.000 (2 transaksi)<br>
  • Uang Masuk QRIS: Rp 1.350.000 (1 transaksi)<br>
  • Kas laci sudah dihitung bersama dan cocok 100%.
</div>

<!-- ==================== HALAMAN 6: PANDUAN PEMILIK (OWNER) ==================== -->
<div class="page-break"></div>

<div class="page-header">
  <span class="app-name">Graha Aisyah Menteng</span>
  <span>Bagian 5: Panduan Pemilik Kost (Owner)</span>
</div>

<h1>Bagian 5: Panduan Pemilik Kost (Owner)</h1>
<p>
  Pemilik kost (Owner) bisa memantau seluruh aktivitas kost kapan saja langsung dari HP atau laptop pribadi di rumah tanpa perlu tanya-tanya manual ke resepsionis.
</p>

<div class="layout-with-screenshot">
  <div>
    <h2>Apa Saja yang Bisa Dilihat Pemilik:</h2>

    <div class="box-step">
      <div class="step-num">1</div>
      <div class="step-content">
        <div class="step-title">Tingkat Keterisian Kamar (Okupansi)</div>
        Melihat berapa kamar yang sedang terisi, kamar yang kosong, dan kamar yang sedang perbaikan secara langsung (*live*).
      </div>
    </div>

    <div class="box-step">
      <div class="step-num">2</div>
      <div class="step-title">Total Pendapatan Harian & Bulanan</div>
      Melihat total omset masuk hari ini dan bulan ini, lengkap dengan rincian uang cash vs QRIS.
    </div>
  </div>

  <div>
    <div class="screenshot-wrapper" style="margin-top: 0;">
      <img src="{img_dashboard}" alt="Dashboard Owner" class="screenshot-img" style="max-height: 170px;" />
      <div class="screenshot-caption">📊 Dashboard Utama Owner</div>
    </div>
  </div>
</div>

<div class="layout-with-screenshot" style="margin-top: 10px;">
  <div>
    <div class="box-step">
      <div class="step-num">3</div>
      <div class="step-content">
        <div class="step-title">Pengaturan 52 Kamar & Harga Sewa</div>
        Mengatur 52 kamar pada 4 Section (VIP Belakang Warkop 13 Kamar, Lantai Dasar 18 Kamar, Gedung Atas Lt 2 17 Kamar, Gedung Atas Lt 3 4 Kamar) serta mengubah tarif sewa harian/bulanan di menu <strong>Kamar</strong>.
      </div>
    </div>

    <div class="box-step">
      <div class="step-num">4</div>
      <div class="step-title">Kelola Akun Staf & QR Barcode Meja</div>
      Menambah akun resepsionis baru di menu <strong>Staff</strong> dan download gambar barcode siap cetak di menu <strong>QR Generator</strong>.
    </div>
  </div>

  <div>
    <div class="screenshot-wrapper" style="margin-top: 0;">
      <img src="{img_kamar}" alt="Menu Kamar" class="screenshot-img" style="max-height: 170px;" />
      <div class="screenshot-caption">🛏️ Menu Kelola 52 Kamar</div>
    </div>
  </div>
</div>

<!-- ==================== HALAMAN 7: TANYA JAWAB & MASALAH UMUM ==================== -->
<div class="page-break"></div>

<div class="page-header">
  <span class="app-name">Graha Aisyah Menteng</span>
  <span>Bagian 6: Tanya Jawab & Solusi Masalah Umum</span>
</div>

<h1>Bagian 6: Solusi Masalah Umum (Tanya Jawab)</h1>
<p>
  Berikut adalah rangkuman solusi cepat jika menghadapi kendala sehari-hari saat menggunakan web:
</p>

<div class="box-simple" style="border-left: 4px solid #10b981;">
  <div style="font-weight: 700; font-size: 9.5pt; color: #065f46; margin-bottom: 2px;">
    ❓ Kamera HP Tamu tidak bisa terbuka saat mau foto KTP / Wajah / Uang?
  </div>
  <div style="font-size: 8.5pt; color: #334155;">
    <strong>Solusi:</strong> Di browser HP tamu (Chrome atau Safari), tekan tanda gembok / setelan di sebelah kiri link web ➔ pilih <em>Izin Situs / Permissions</em> ➔ klik <strong>Izinkan Kamera</strong> ➔ lalu refresh halaman.
  </div>
</div>

<div class="box-simple" style="border-left: 4px solid #4f46e5;">
  <div style="font-weight: 700; font-size: 9.5pt; color: #3730a3; margin-bottom: 2px;">
    ❓ Tamu salah pilih durasi atau salah pilih nomor kamar?
  </div>
  <div style="font-size: 8.5pt; color: #334155;">
    <strong>Solusi:</strong> Tidak masalah. Resepsionis bisa langsung memilihkan nomor kamar yang benar saat mengklik tombol <strong>Pilih Kamar & Selesai</strong>, atau klik tombol merah <strong>Tolak</strong> agar tamu mengulang pilihannya.
  </div>
</div>

<div class="box-simple" style="border-left: 4px solid #f59e0b;">
  <div style="font-weight: 700; font-size: 9.5pt; color: #92400e; margin-bottom: 2px;">
    ❓ Tamu sudah pulang tapi di web status kamarnya masih "Terisi"?
  </div>
  <div style="font-size: 8.5pt; color: #334155;">
    <strong>Solusi:</strong> Itu tandanya resepsionis belum memproses check-out. Buka menu <strong>Data Penghuni</strong>, cari nama tamu tersebut, lalu klik tombol <strong>Check-Out</strong> dan konfirmasi. Kamar akan langsung berubah jadi <em>Kosong</em>.
  </div>
</div>

<div class="box-simple" style="border-left: 4px solid #ef4444;">
  <div style="font-weight: 700; font-size: 9.5pt; color: #991b1b; margin-bottom: 2px;">
    ❓ Uang kas di laci meja resepsionis tidak cocok saat ganti shift?
  </div>
  <div style="font-size: 8.5pt; color: #334155;">
    <strong>Solusi:</strong> Buka menu <strong>Pembayaran</strong>, cocokkan setiap baris transaksi berlabel <em>Tunai</em> dengan bukti foto uang serah terima tamu. Dari situ akan langsung ketahuan transaksi mana yang salah kembalian atau belum dihitung.
  </div>
</div>

<div class="tip-box" style="margin-top: 15px;">
  <strong>📞 Bantuan & Layanan:</strong>
  Jika ada kendala lain atau butuh bantuan teknis seputar sistem web, silakan langsung menghubungi pengelola atau tim IT Graha Aisyah Menteng.
</div>

</body>
</html>
"""

html_path = r"d:\coding\manajemen-kos\PANDUAN_PENGGUNAAN_GRAHA_AISYAH.html"
pdf_path = r"d:\coding\manajemen-kos\PANDUAN_PENGGUNAAN_GRAHA_AISYAH.pdf"

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML generated at: {html_path}")

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

browser = chrome_path if os.path.exists(chrome_path) else edge_path

cmd = [
    browser,
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    html_path
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("Return code:", res.returncode)

if os.path.exists(pdf_path):
    size = os.path.getsize(pdf_path)
    print(f"SUCCESS: PDF generated at {pdf_path} (Size: {size:,} bytes)")
else:
    print("ERROR: PDF was not generated")
