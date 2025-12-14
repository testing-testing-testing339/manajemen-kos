# Graha Aisyah Mainframe System

Sistem manajemen kost berbasis web untuk mengelola cabang, lantai, kamar, penghuni, pembayaran, dan check-in berbasis QR code.

## 🚀 Fitur Utama

- **Manajemen Properti**: Kelola cabang, lantai, dan kamar
- **Manajemen Penghuni**: Data penghuni dengan foto KTP dan selfie
- **Sistem Pembayaran**: Tracking pembayaran sewa dengan status konfirmasi
- **Check-in QR Code**: Sistem check-in berbasis QR code untuk penyewa baru
- **Manajemen Staff**: CRUD staff dengan foto dan detail lengkap
- **Role-Based Access Control**: Owner dan Staff dengan akses berbeda

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js 18+ 
- npm atau yarn
- Akun Supabase
- GitHub account (untuk deployment)

## 🔧 Setup Development

1. **Clone repository**
   ```bash
   git clone <your-repo-url>
   cd manajemen-kos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   
   Buat file `.env.local` di root project:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Setup Database**
   
   Jalankan script SQL di Supabase SQL Editor (dalam urutan):
   - `db_schema.sql` - Schema dasar
   - `payments_schema.sql` - Schema pembayaran
   - `check_in_schema.sql` - Schema check-in
   - `staff_management_schema.sql` - Schema staff
   - `fix_profiles_rls_simple.sql` - RLS policies untuk profiles
   - `rls_policies_for_staff.sql` - RLS policies untuk staff
   - `fix_branches_public_access.sql` - Public access untuk branches
   - `fix_rooms_public_access_complete.sql` - Public access untuk rooms
   - `storage_setup.sql` - Setup storage bucket
   - `storage_check_in_photos.sql` - Setup storage untuk check-in photos

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Buka browser**
   ```
   http://localhost:3000
   ```

## 📦 Build untuk Production

```bash
npm run build
npm start
```

## 🚀 Deploy ke Vercel

1. **Push ke GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy ke Vercel**
   - Buka [Vercel Dashboard](https://vercel.com)
   - Klik "Add New Project"
   - Import repository dari GitHub
   - Tambahkan Environment Variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Klik "Deploy"

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |

## 🗂️ Struktur Project

```
manajemen-kos/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── dashboard/    # Dashboard pages
│   │   ├── check-in/     # Public check-in form
│   │   └── api/          # API routes
│   ├── components/       # React components
│   └── lib/              # Utilities
├── *.sql                 # Database migration scripts
└── public/               # Static files
```

## 👥 Roles

- **Owner**: Full access ke semua fitur
- **Staff**: Hanya bisa melihat dan manage data di cabang yang ditugaskan

## 📄 License

Private project - Graha Aisyah

## 👨‍💻 Author

Graha Aisyah Development Team
