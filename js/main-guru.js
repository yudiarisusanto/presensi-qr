// ============================================================
// js/main-guru.js - LOGIKA KHUSUS HALAMAN GURU
// ============================================================
let currentPage = 'dashboardGuru';

// ============================================================
// NAVIGASI
// ============================================================
function loadPage(pageName) {
    currentPage = pageName;

    // Tandai menu aktif
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) item.classList.add('active');
    });

    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    contentArea.innerHTML = '<div class="text-center py-16"><div class="loading-spinner mx-auto mb-4"></div><p class="text-on-surface-variant">Memuat halaman...</p></div>';

    switch(pageName) {
        case 'dashboardGuru': loadDashboardGuru(); break;
        case 'jadwalSaya': loadJadwalSaya(); break;
        case 'rekapAbsenSaya': loadRekapAbsenSaya(); break;
        case 'profilPengguna': loadProfilPenggunaGuru(); break;
        default: loadDashboardGuru();
    }
}

// ============================================================
// DASHBOARD GURU
// ============================================================
async function loadDashboardGuru() {
    const contentArea = document.getElementById('content-area');
    const user = currentUser || {};

    contentArea.innerHTML = `
        <div>
            <header class="mb-8">
                <h1 class="font-headline-lg text-on-surface mb-1">Selamat Datang, ${user.nama_lengkap || 'Bapak/Ibu Guru'} 👋</h1>
                <p class="text-on-surface-variant">${user.jabatan || 'Guru Mata Pelajaran'} • ${user.mata_pelajaran || 'Belum ada mata pelajaran'}</p>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Card Jadwal Hari Ini -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary">calendar_month</span>
                        </div>
                        <h3 class="font-headline-sm text-on-surface">Jadwal Hari Ini</h3>
                    </div>
                    <p class="text-on-surface-variant text-sm">Lihat jadwal mengajar hari ini</p>
                    <button onclick="loadPage('jadwalSaya')" class="mt-4 w-full py-2 bg-primary text-on-primary rounded-lg text-sm">Lihat Jadwal</button>
                </div>

                <!-- Card Rekap Kehadiran -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <span class="material-symbols-outlined text-green-600">fact_check</span>
                        </div>
                        <h3 class="font-headline-sm text-on-surface">Rekap Presensi</h3>
                    </div>
                    <p class="text-on-surface-variant text-sm">Lihat rekap kehadiran siswa di kelas Anda</p>
                    <button onclick="loadPage('rekapAbsenSaya')" class="mt-4 w-full py-2 bg-green-600 text-white rounded-lg text-sm">Lihat Rekap</button>
                </div>

                <!-- Card Profil -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <span class="material-symbols-outlined text-amber-600">person</span>
                        </div>
                        <h3 class="font-headline-sm text-on-surface">Profil Saya</h3>
                    </div>
                    <p class="text-on-surface-variant text-sm">Perbarui data diri dan akun</p>
                    <button onclick="loadPage('profilPengguna')" class="mt-4 w-full py-2 bg-amber-500 text-white rounded-lg text-sm">Edit Profil</button>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// JADWAL MENGAJAR
// ============================================================
async function loadJadwalSaya() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div>
            <header class="mb-6">
                <h1 class="font-headline-lg text-on-surface mb-1">Jadwal Mengajar Saya</h1>
                <p class="text-on-surface-variant">Jadwal pelajaran yang Anda ampu</p>
            </header>
            <div class="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant">
                <span class="material-symbols-outlined text-4xl mb-4">calendar_month</span>
                <p>Jadwal akan dimuat dari database...</p>
            </div>
        </div>
    `;
}

// ============================================================
// REKAP ABSENSI
// ============================================================
async function loadRekapAbsenSaya() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div>
            <header class="mb-6">
                <h1 class="font-headline-lg text-on-surface mb-1">Rekap Kehadiran Siswa</h1>
                <p class="text-on-surface-variant">Data presensi pada mata pelajaran yang Anda ampu</p>
            </header>
            <div class="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant">
                <span class="material-symbols-outlined text-4xl mb-4">fact_check</span>
                <p>Data rekap presensi akan dimuat dari database...</p>
            </div>
        </div>
    `;
}

// ============================================================
// PROFIL PENGGUNA GURU
// ============================================================
async function loadProfilPenggunaGuru() {
    const contentArea = document.getElementById('content-area');
    const user = currentUser || {};

    contentArea.innerHTML = `
        <div>
            <header class="mb-6">
                <h1 class="font-headline-lg text-on-surface mb-1">Profil Pengguna</h1>
                <p class="text-on-surface-variant">Kelola data diri dan informasi akun Anda</p>
            </div>

            <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-6 max-w-2xl">
                <form id="formProfilGuru" onsubmit="event.preventDefault(); simpanProfilGuru();" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label class="block mb-2 font-label-md">Nama Lengkap</label>
                            <input type="text" id="guru_nama_lengkap" value="${user.nama_lengkap || ''}" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                        </div>
                        <div>
                            <label class="block mb-2 font-label-md">NIP</label>
                            <input type="text" id="guru_nip" value="${user.nip || ''}" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 font-mono">
                        </div>
                        <div>
                            <label class="block mb-2 font-label-md">NUPTK</label>
                            <input type="text" id="guru_nuptk" value="${user.nuptk || ''}" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 font-mono">
                        </div>
                        <div>
                            <label class="block mb-2 font-label-md">Jabatan</label>
                            <input type="text" id="guru_jabatan" value="${user.jabatan || ''}" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                        </div>
                        <div>
                            <label class="block mb-2 font-label-md">Mata Pelajaran</label>
                            <input type="text" id="guru_mata_pelajaran" value="${user.mata_pelajaran || ''}" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block mb-2 font-label-md">Email</label>
                            <input type="email" id="guru_email" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block mb-2 font-label-md">Telepon</label>
                            <input type="tel" id="guru_telepon" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onclick="loadProfilPenggunaGuru()" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container">Batal</button>
                        <button type="submit" class="px-6 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90">Simpan Perubahan</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// ============================================================
// SIMPAN PROFIL GURU KE DATABASE
// ============================================================
async function simpanProfilGuru() {
    showLoading('Menyimpan...');
    try {
        const sb = getSupabase();
        if (!sb || !currentUser?.id) throw new Error('Tidak ada sesi aktif');

        const data = {
            nama_lengkap: document.getElementById('guru_nama_lengkap').value.trim(),
            nip: document.getElementById('guru_nip').value.trim(),
            nuptk: document.getElementById('guru_nuptk').value.trim(),
            jabatan: document.getElementById('guru_jabatan').value.trim(),
            mata_pelajaran: document.getElementById('guru_mata_pelajaran').value.trim()
        };

        if (!data.nama_lengkap) {
            hideLoading();
            showToast('Nama lengkap wajib diisi!', 'error');
            return;
        }

        const { error } = await sb.from('profil_guru').update(data).eq('user_id', currentUser.id);
        if (error) throw error;

        // Update sesi lokal
        Object.assign(currentUser, data);
        localStorage.setItem('presensiQR_user', JSON.stringify(currentUser));

        hideLoading();
        showToast('Profil berhasil disimpan!', 'success');
        loadProfilPenggunaGuru();

    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

// ============================================================
// FUNGSI BANTUAN
// ============================================================
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('hidden');
}
function formatTanggal(date) {
    return date.toISOString().split('T')[0];
}
function formatTanggalIndo(tgl) {
    if (!tgl) return '-';
    const [y, m, d] = tgl.split('-');
    const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${d} ${namaBulan[+m-1]} ${y}`;
}
function showLoading(text = 'Memuat...') {
    const el = document.getElementById('loadingOverlay');
    const txt = document.getElementById('loadingText');
    if (txt) txt.textContent = text;
    if (el) el.classList.remove('hidden');
}
function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('hidden');
}
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const warna = { success:'bg-green-500', error:'bg-red-500', warning:'bg-amber-500', info:'bg-blue-500' };
    const icon = { success:'check_circle', error:'error', warning:'warning', info:'info' };
    const toast = document.createElement('div');
    toast.className = `toast flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-lg border min-w-[280px]`;
    toast.innerHTML = `
        <span class="material-symbols-outlined ${warna[type].replace('bg-','text-')}">${icon[type]}</span>
        <span class="text-sm font-medium">${message}</span>
    `;
    container.insertBefore(toast, container.firstChild);
    setTimeout(() => toast.remove(), 3000);
}
function closeModalConfirm() {
    document.getElementById('modalConfirm').classList.add('hidden');
}
