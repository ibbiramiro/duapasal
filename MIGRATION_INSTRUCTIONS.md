# Database Migration Instructions

## Field Addition: is_main_pastor

Untuk menambahkan field `is_main_pastor` ke tabel `pastors`, ikuti langkah berikut:

### 1. Via Supabase Dashboard
1. Buka Supabase Dashboard
2. Pilih project Anda
3. Go to **SQL Editor**
4. Copy dan jalankan SQL berikut:

```sql
-- Add is_main_pastor field to pastors table
ALTER TABLE pastors 
ADD COLUMN is_main_pastor BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX idx_pastors_main_pastor ON pastors(is_main_pastor);

-- Add comment for documentation
COMMENT ON COLUMN pastors.is_main_pastor IS 'Boolean flag to indicate if this is the main pastor/shepherd of the church';
```

### 2. Via Migration File
Jalankan file migrasi yang sudah dibuat:
```bash
# Jika menggunakan tool migrasi
psql $DATABASE_URL -f migrations/add_is_main_pastor_field.sql
```

### 3. Update Existing Data (Optional)
Untuk menandai pendeta yang sudah ada sebagai pendeta utama:
```sql
-- Update specific pastors as main pastors
UPDATE pastors 
SET is_main_pastor = TRUE 
WHERE name LIKE '%Pendeta Utama%' 
   OR name LIKE '%Senior Pastor%'
   OR name LIKE '%Gembala Utama%';
```

### 4. Verifikasi
Setelah migrasi, verifikasi dengan query berikut:
```sql
-- Check if field exists and has correct data
SELECT id, name, is_main_pastor 
FROM pastors 
LIMIT 5;
```

## Field Spesifikasi
- **Nama Field**: `is_main_pastor`
- **Tipe Data**: `BOOLEAN`
- **Default Value**: `FALSE`
- **Purpose**: Membedakan pendeta utama dengan pendeta pembantu
- **Usage**: Filter di dropdown registrasi, tanda status di admin panel

## Catatan
- Backup database sebelum menjalankan migrasi
- Test di development environment terlebih dahulu
- Field ini akan otomatis digunakan di frontend untuk filter pendeta utama
