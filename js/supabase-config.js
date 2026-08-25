// ============================================================
// js/supabase-config.js
// Konfigurasi koneksi ke Supabase
// ============================================================

const SUPABASE_CONFIG = {
    // 👇 GANTI DENGAN PUNYA ANDA 👇
    SUPABASE_URL: 'https://paucvqxgqndoirjrjmxp.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdWN2cXhncW5kb2lyanJqbXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MzM1NzcsImV4cCI6MjEwMjMwOTU3N30.yxFmOlPjB1MQd88SyW8W1N50I9wyyJH4-s_ExqJn73Q'
    // 👆 GANTI DENGAN PUNYA ANDA 👆
};

// Inisialisasi Supabase Client
let supabaseClient = null;

function initSupabase() {
    if (supabaseClient) return supabaseClient;
    
    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_CONFIG.SUPABASE_URL,
            SUPABASE_CONFIG.SUPABASE_ANON_KEY
        );
        console.log('✅ Supabase terkoneksi');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Gagal koneksi Supabase:', error);
        return null;
    }
}

function getSupabase() {
    if (!supabaseClient) return initSupabase();
    return supabaseClient;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Konversi angka hari ke nama hari Indonesia
function getNamaHari(date) {
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return hari[date.getDay()];
}

// Format waktu: HH:MM:SS
function formatWaktu(date) {
    return date.toTimeString().slice(0, 8);
}

// Format tanggal: YYYY-MM-DD
function formatTanggal(date) {
    return date.toISOString().split('T')[0];
}

// Format tanggal Indonesia: 15 Agustus 2024
function formatTanggalIndo(dateStr) {
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const d = new Date(dateStr);
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// Konversi kelas Romawi ke Angka
function kelasRomawiToAngka(romawi) {
    const map = { 'X': '10', 'XI': '11', 'XII': '12' };
    return map[romawi] || romawi;
}

// Konversi kelas Angka ke Romawi
function kelasAngkaToRomawi(angka) {
    const map = { '10': 'X', '11': 'XI', '12': 'XII' };
    return map[String(angka)] || angka;
}

// Ambil inisial nama
function getInitial(nama) {
    return nama ? nama.charAt(0).toUpperCase() : 'U';
}