// ============================================================
// js/main.js - VERSI LENGKAP & SUDAH DIPERBARUI
// Semua fungsi UI, CRUD, navigasi, dan fitur admin
// PEMBARUAN: 
//   - Menambahkan card baru "Statistik Siswa per Tingkat" di bawah Grafik Kehadiran
//   - Header hijau gradien sama dengan Grafik Kehadiran, icon analytics
//   - Tabel dinamis: data dari database siswa dikelompokkan per kelas & jurusan
// ============================================================

// ============================================================
// UI UTILITIES: Loading, Toast, Modal
// ============================================================


// ============================================================
// CSS untuk Custom Dropdown (search di dalam popup)
// ============================================================
(function injectCustomDropdownCSS() {
    if (document.getElementById('custom-dropdown-css')) return;
    const css = `
        <style id="custom-dropdown-css">
            .custom-dropdown .dropdown-menu { display: none; }
            .custom-dropdown.open .dropdown-menu { display: block; }
            .custom-dropdown .dropdown-option {
                padding: 8px 12px;
                cursor: pointer;
                font-size: 14px;
                color: #191c1d;
                border-bottom: 1px solid #eceeee;
            }
            .custom-dropdown .dropdown-option:last-child { border-bottom: none; }
            .custom-dropdown .dropdown-option:hover { background-color: #e6e8e8; }
            .custom-dropdown .dropdown-empty {
                padding: 16px;
                text-align: center;
                color: #6f797a;
                font-size: 13px;
            }
            .dark .custom-dropdown .dropdown-option { color: #eff1f1; border-bottom-color: #393c3d; }
            .dark .custom-dropdown .dropdown-option:hover { background-color: #393c3d; }
            .dark .custom-dropdown .dropdown-menu { background-color: #2e3131; border-color: rgba(111,121,122,0.5); }
            .dark .custom-dropdown .dropdown-toggle { background-color: #272a2b; border-color: rgba(111,121,122,0.5); color: #eff1f1; }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', css);
})();

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
    
    const warna = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'warning': 'bg-amber-500',
        'info': 'bg-blue-500'
    };
    
    const icon = {
        'success': 'check_circle',
        'error': 'error',
        'warning': 'warning',
        'info': 'info'
    };
    
    const toast = document.createElement('div');
    toast.className = 'toast flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-lg border border-outline-variant min-w-[280px]';
    toast.innerHTML = `
        <span class="material-symbols-outlined ${warna[type].replace('bg-', 'text-')}">${icon[type]}</span>
        <span class="text-sm text-on-surface font-medium">${message}</span>
    `;
    
    container.insertBefore(toast, container.firstChild);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Modal Konfirmasi
let modalConfirmCallback = null;

function showModalConfirm(title, message, callback) {
    document.getElementById('modalConfirmTitle').textContent = title;
    document.getElementById('modalConfirmMessage').textContent = message;
    document.getElementById('modalConfirm').classList.remove('hidden');
    modalConfirmCallback = callback;
}

function closeModalConfirm() {
    document.getElementById('modalConfirm').classList.add('hidden');
    modalConfirmCallback = null;
}

function executeModalConfirm() {
    if (modalConfirmCallback) modalConfirmCallback();
    closeModalConfirm();
}

// ============================================================
// FUNGSI PAGINATION UMUM - Berlaku untuk SEMUA tabel
// Pola: Halaman 1-4: 1 2 3 4 5 … last
//       Halaman tengah: 1 … (curr-1) curr (curr+1) … last
//       Halaman akhir: 1 … (last-4) (last-3) (last-2) (last-1) last
// ============================================================
function generatePageNumbers(current, total) {
    if (total <= 1) return [1];
    
    const pages = [];
    const edgeSize = 5;   // jumlah angka di tepi (awal/akhir)
    const midSize = 3;    // jumlah angka di tengah (curr-1, curr, curr+1)
    const halfMid = Math.floor(midSize / 2); // 1
    
    if (total <= edgeSize + 2) {
        // Sedikit halaman, tampilkan semua
        for (let i = 1; i <= total; i++) pages.push(i);
        return pages;
    }
    
    // Batas kapan dianggap "di tepi"
    const leftThreshold = 4;           // halaman <= 4: tampilkan 5 angka dari awal
    const rightThreshold = total - 3;  // halaman >= last-3: tampilkan 5 angka dari akhir
    
    if (current <= leftThreshold) {
        // Dekat awal: 1 2 3 4 5 … last
        for (let i = 1; i <= edgeSize; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(total);
    } else if (current >= rightThreshold) {
        // Dekat akhir: 1 … (last-4) (last-3) (last-2) (last-1) last
        pages.push(1);
        pages.push('ellipsis');
        for (let i = total - edgeSize + 1; i <= total; i++) pages.push(i);
    } else {
        // Di tengah: 1 … (curr-1) curr (curr+1) … last
        pages.push(1);
        pages.push('ellipsis');
        for (let i = current - halfMid; i <= current + halfMid; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(total);
    }
    
    return pages;
}

// Fungsi: Render HTML pagination lengkap (prev + numbers + next)
function renderPaginationHTML(currentPage, totalPages, pageVarName, onClickFunc) {
    if (totalPages <= 1) return '';
    
    let html = '';
    
    // Cek apakah onClickFunc sudah berupa ekspresi lengkap (mengandung tanda kurung)
    // Jika ya: gunakan apa adanya. Jika tidak: tambahkan ()
    const buildOnClick = (pageNum) => {
        const call = onClickFunc.includes('(') ? onClickFunc : `${onClickFunc}()`;
        return `${pageVarName}=${pageNum};${call}`;
    };
    
    // Tombol Previous
    html += `<button onclick="${buildOnClick(Math.max(1, currentPage - 1))}" class="p-1 rounded text-on-surface-variant hover:bg-surface-container transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_left</span></button>`;
    
    // Nomor halaman
    const pages = generatePageNumbers(currentPage, totalPages);
    for (const p of pages) {
        if (p === 'ellipsis') {
            html += `<span class="w-8 h-8 flex items-center justify-center text-on-surface-variant font-medium">…</span>`;
        } else {
            html += `<button onclick="${buildOnClick(p)}" class="w-8 h-8 rounded font-label-md flex items-center justify-center ${p === currentPage ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container transition-colors'}">${p}</button>`;
        }
    }
    
    // Tombol Next
    html += `<button onclick="${buildOnClick(Math.min(totalPages, currentPage + 1))}" class="p-1 rounded text-on-surface-variant hover:bg-surface-container transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === totalPages ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_right</span></button>`;
    
    return html;
}

// ============================================================
// NAVIGASI SIDEBAR
// ============================================================

let currentPage = 'dashboardAdmin';

// Variabel global nama sekolah (default: SMK Negeri 1)
let namaSekolah = 'SMK Negeri 1';

// Fungsi: Memuat nama sekolah dari pengaturan_sistem
async function loadNamaSekolah() {
    try {
        const sb = getSupabase();
        if (!sb) return namaSekolah;
        // Coba baca dari tabel baru profil_sekolah terlebih dahulu
        const { data: profilData } = await sb.from('profil_sekolah').select('nama_sekolah').limit(1).maybeSingle();
        if (profilData && profilData.nama_sekolah && profilData.nama_sekolah.trim()) {
            namaSekolah = profilData.nama_sekolah.trim();
        } else {
            // Fallback: baca dari pengaturan_sistem (untuk kompatibilitas)
            const { data: oldData } = await sb.from('pengaturan_sistem').select('nilai').eq('pengaturan', 'Nama_Sekolah').maybeSingle();
            if (oldData && oldData.nilai && oldData.nilai.trim()) {
                namaSekolah = oldData.nilai.trim();
            }
        }
    } catch(e) {}
    return namaSekolah;
}

// Fungsi: Update tampilan nama sekolah di sidebar & tempat lain
function updateTampilanNamaSekolah() {
    const elLevel = document.getElementById('sidebarUserLevel');
    if (elLevel && currentUser && currentUser.level === 'admin') {
        elLevel.textContent = namaSekolah;
    }
}



// ============================================================
// FUNGSI: Profil Sekolah (Menu Baru)
// ============================================================
async function loadProfilSekolah() {
    const contentArea = document.getElementById('content-area');
    
    let profil = {};
    try {
        const sb = getSupabase();
        const { data } = await sb.from('profil_sekolah').select('*').limit(1).maybeSingle();
        if (data) profil = data;
    } catch(e) {
        console.error('Gagal memuat profil sekolah:', e);
    }
    
    // Helper: tampilkan nilai atau "-" jika kosong
    const v = (val) => val && val.toString().trim() ? val.toString().trim() : '-';
    
    contentArea.innerHTML = `
        <div>
            <header class="mb-stack-lg pb-stack-sm">
                <h1 class="font-headline-lg text-headline-lg text-on-surface mb-2">Profil Sekolah</h1>
                <p class="font-body-lg text-body-lg text-on-surface-variant">Informasi lengkap identitas sekolah Anda.</p>
            </header>
            
            <!-- CARD: DETAIL DATA SEKOLAH (MODE VIEW) -->
            <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden max-w-5xl">
                <!-- HEADER CARD -->
                <div class="px-container-padding py-3 flex items-center justify-between" 
                     style="background: linear-gradient(to bottom right, #004349, #0d5c63); min-height: 52px;">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined" style="color: white;">school</span>
                        <h2 class="font-headline-sm text-headline-sm" style="color: white;">Detail Data Sekolah</h2>
                    </div>
                </div>
                
                <!-- BODY CARD: Tampilan Data -->
                <div class="p-container-padding">
                    <!-- Identitas Dasar -->
                    <div class="mb-6">
                        <h3 class="font-label-md text-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30">Identitas Dasar</h3>
                        <div class="space-y-0">
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Nama Sekolah</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.nama_sekolah)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">NPSN</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium font-mono flex-1">${v(profil.npsn)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Jenjang Pendidikan</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.tingkat_sekolah)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Status Sekolah</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.status_sekolah)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Negara</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.negara)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Alamat Lengkap -->
                    <div class="mb-6">
                        <h3 class="font-label-md text-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30">Alamat Lengkap</h3>
                        <div class="space-y-0">
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Alamat</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.alamat)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">RT / RW</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.rt_rw)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Kode Pos</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium font-mono flex-1">${v(profil.kode_pos)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Kelurahan / Desa</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.kelurahan)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Kecamatan</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.kecamatan)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Kabupaten / Kota</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.kabupaten_kota)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Provinsi</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.provinsi)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Kontak & Website -->
                    <div class="mb-6">
                        <h3 class="font-label-md text-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30">Kontak & Website</h3>
                        <div class="space-y-0">
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Nomor Telepon</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.kontak)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Nomor Fax</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.nomor_fax)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Email</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1 break-all">${v(profil.email)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Website</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1 break-all">${v(profil.website)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Lintang (Latitude)</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium font-mono flex-1">${v(profil.lintang)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Bujur (Longitude)</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium font-mono flex-1">${v(profil.bujur)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Kepala Sekolah -->
                    <div class="mb-6">
                        <h3 class="font-label-md text-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30">Kepala Sekolah</h3>
                        <div class="space-y-0">
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">Nama Lengkap</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium flex-1">${v(profil.nama_kepala_sekolah)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">NIP</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium font-mono flex-1">${v(profil.nip_kepala_sekolah)}</span>
                            </div>
                            <div class="flex items-start border-b border-outline-variant/20 py-2">
                                <span class="text-on-surface-variant font-label-md w-52 shrink-0">NUPTK</span>
                                <span class="text-on-surface-variant font-label-md w-5 shrink-0 text-center">:</span>
                                <span class="text-on-surface font-body-md font-medium font-mono flex-1">${v(profil.nuptk)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Visi & Misi -->
                    <div>
                        <h3 class="font-label-md text-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30">Visi & Misi</h3>
                        <div class="space-y-4">
                            <div>
                                <span class="text-on-surface-variant font-label-md block mb-2">Visi Sekolah</span>
                                <p class="text-on-surface font-body-md bg-surface-container-low rounded-lg p-4 whitespace-pre-wrap">${v(profil.visi)}</p>
                            </div>
                            <div>
                                <span class="text-on-surface-variant font-label-md block mb-2">Misi Sekolah</span>
                                <p class="text-on-surface font-body-md bg-surface-container-low rounded-lg p-4 whitespace-pre-wrap">${v(profil.misi)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- FOOTER CARD: Tombol Edit -->
                <div class="px-container-padding py-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-end">
                    <button onclick="bukaModalEditProfil()" class="px-6 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm inline-flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                        Edit Data Sekolah
                    </button>
                </div>
            </div>
            
            <!-- MODAL EDIT PROFIL SEKOLAH -->
            <div id="modalEditProfil" class="fixed inset-0 z-[9997] hidden">
                <div class="modal-overlay absolute inset-0 bg-black/50" onclick="tutupModalEditProfil()"></div>
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
                    <!-- Header Modal -->
                    <div class="px-container-padding py-3 flex items-center justify-between shrink-0" 
                         style="background: linear-gradient(to bottom right, #004349, #0d5c63); border-radius: 0.75rem 0.75rem 0 0;">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined" style="color: white;">edit</span>
                            <h2 class="font-headline-sm text-headline-sm" style="color: white;">Edit Data Sekolah</h2>
                        </div>
                        <button onclick="tutupModalEditProfil()" class="p-1 rounded-lg hover:bg-white/10 transition-colors" style="color: white;">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    <!-- Tab Modal -->
                    <div class="px-container-padding pt-4 shrink-0">
                        <div class="flex gap-1 p-1 rounded-lg w-full" style="background: #eceeee;">
                            <button type="button" onclick="switchModalTab('modalTabManual')" id="modalTabManualBtn" class="modal-tab-btn active flex-1 px-3 py-2 rounded-md font-label-md transition-all bg-white shadow-sm text-sm" style="color: #004349;">
                                <span class="material-symbols-outlined text-[16px] align-middle mr-1">edit_note</span>Edit Manual
                            </button>
                            <button type="button" onclick="switchModalTab('modalTabTemplate')" id="modalTabTemplateBtn" class="modal-tab-btn flex-1 px-3 py-2 rounded-md font-label-md transition-all text-sm text-on-surface-variant hover:bg-white">
                                <span class="material-symbols-outlined text-[16px] align-middle mr-1">table_chart</span>Template Excel
                            </button>
                        </div>
                    </div>
                    
                    <!-- Body Modal (Scrollable) -->
                    <div class="flex-1 overflow-y-auto px-container-padding py-4">
                        <!-- TAB: EDIT MANUAL -->
                        <div id="modalTabManual" class="modal-tab-content active space-y-5">
                            <form id="formProfilManual" onsubmit="event.preventDefault(); simpanProfilDariModal();">
                                <!-- Identitas Dasar -->
                                <div class="mb-5">
                                    <h4 class="font-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30 text-xs">Identitas Dasar</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div class="md:col-span-2">
                                            <label class="block mb-1 font-label-md text-xs">Nama Sekolah <span class="text-error">*</span></label>
                                            <input type="text" id="ps_nama_sekolah" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none">
                                        </div>
                                        <div>
                                            <label class="block mb-1 font-label-md text-xs">NPSN</label>
                                            <input type="text" id="ps_npsn" maxlength="20" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none">
                                        </div>
                                        <div>
                                            <label class="block mb-1 font-label-md text-xs">Jenjang Pendidikan</label>
                                            <select id="ps_tingkat_sekolah" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none">
                                                <option value="SD">SD</option><option value="SMP">SMP</option><option value="SMA">SMA</option>
                                                <option value="SMK">SMK</option><option value="MI">MI</option><option value="MTS">MTS</option>
                                                <option value="MA">MA</option><option value="Lainnya">Lainnya</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block mb-1 font-label-md text-xs">Status Sekolah</label>
                                            <select id="ps_status_sekolah" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none">
                                                <option value="Negeri">Negeri</option><option value="Swasta">Swasta</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block mb-1 font-label-md text-xs">Negara</label>
                                            <input type="text" id="ps_negara" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Alamat -->
                                <div class="mb-5">
                                    <h4 class="font-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30 text-xs">Alamat Lengkap</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div class="md:col-span-2">
                                            <label class="block mb-1 font-label-md text-xs">Alamat</label>
                                            <textarea id="ps_alamat" rows="2" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></textarea>
                                        </div>
                                        <div><label class="block mb-1 font-label-md text-xs">RT / RW</label><input type="text" id="ps_rt_rw" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Kode Pos</label><input type="text" id="ps_kode_pos" maxlength="10" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Kelurahan / Desa</label><input type="text" id="ps_kelurahan" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Kecamatan</label><input type="text" id="ps_kecamatan" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Kabupaten / Kota</label><input type="text" id="ps_kabupaten_kota" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Provinsi</label><input type="text" id="ps_provinsi" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                    </div>
                                </div>
                                
                                <!-- Kontak -->
                                <div class="mb-5">
                                    <h4 class="font-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30 text-xs">Kontak & Lokasi</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label class="block mb-1 font-label-md text-xs">Nomor Telepon</label><input type="text" id="ps_kontak" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Nomor Fax</label><input type="text" id="ps_nomor_fax" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Email</label><input type="email" id="ps_email" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Website</label><input type="text" id="ps_website" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Lintang (Latitude)</label><input type="text" id="ps_lintang" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Bujur (Longitude)</label><input type="text" id="ps_bujur" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                    </div>
                                </div>
                                
                                <!-- Kepala Sekolah -->
                                <div class="mb-5">
                                    <h4 class="font-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30 text-xs">Kepala Sekolah</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div class="md:col-span-2"><label class="block mb-1 font-label-md text-xs">Nama Lengkap</label><input type="text" id="ps_nama_kepala_sekolah" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div><label class="block mb-1 font-label-md text-xs">NIP</label><input type="text" id="ps_nip_kepala_sekolah" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                        <div class="md:col-span-2"><label class="block mb-1 font-label-md text-xs">NUPTK</label><input type="text" id="ps_nuptk" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></div>
                                    </div>
                                </div>
                                
                                <!-- Visi Misi -->
                                <div>
                                    <h4 class="font-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30 text-xs">Visi & Misi</h4>
                                    <div class="space-y-4">
                                        <div><label class="block mb-1 font-label-md text-xs">Visi Sekolah</label><textarea id="ps_visi" rows="3" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></textarea></div>
                                        <div><label class="block mb-1 font-label-md text-xs">Misi Sekolah</label><textarea id="ps_misi" rows="4" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"></textarea></div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <!-- TAB: TEMPLATE EXCEL -->
                        <div id="modalTabTemplate" class="modal-tab-content hidden">
                            <div class="space-y-6">
                                <!-- Download Template -->
                                <div class="bg-primary-container/20 rounded-lg p-5 border border-primary/20">
                                    <div class="flex items-start gap-4">
                                        <div class="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shrink-0">
                                            <span class="material-symbols-outlined text-white">download</span>
                                        </div>
                                        <div class="flex-1">
                                            <h4 class="font-headline-sm text-headline-sm text-on-surface mb-1">Download Template</h4>
                                            <p class="font-body-md text-body-md text-on-surface-variant text-sm mb-3">Unduh template Excel untuk mengisi data sekolah secara offline.</p>
                                            <button onclick="downloadTemplateProfilSekolah()" class="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors text-sm inline-flex items-center gap-2">
                                                <span class="material-symbols-outlined text-[18px]">download</span>Download Template Excel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Upload Template -->
                                <div class="bg-surface-container-low rounded-lg p-5 border border-outline-variant/30">
                                    <div class="flex items-start gap-4">
                                        <div class="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center shrink-0">
                                            <span class="material-symbols-outlined text-on-secondary-container">upload</span>
                                        </div>
                                        <div class="flex-1 w-full">
                                            <h4 class="font-headline-sm text-headline-sm text-on-surface mb-1">Upload Template</h4>
                                            <p class="font-body-md text-body-md text-on-surface-variant text-sm mb-3">Upload file Excel yang sudah diisi untuk mengupdate data sekolah secara otomatis.</p>
                                            <div class="flex items-center gap-3 flex-wrap">
                                                <input type="file" id="fileProfilTemplate" accept=".xlsx,.xls" class="hidden" onchange="handleUploadProfilTemplate(event)">
                                                <button onclick="document.getElementById('fileProfilTemplate').click()" class="px-4 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-highest transition-colors text-sm inline-flex items-center gap-2">
                                                    <span class="material-symbols-outlined text-[18px]">folder_open</span>Pilih File Excel
                                                </button>
                                                <span id="namaFileProfil" class="text-sm text-on-surface-variant">Belum ada file dipilih</span>
                                            </div>
                                            <p id="previewUploadProfil" class="text-xs text-on-surface-variant mt-3 hidden bg-surface-container-lowest rounded p-3"></p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="bg-error-container/30 rounded-lg p-4 border border-error/20">
                                    <div class="flex items-start gap-3">
                                        <span class="material-symbols-outlined text-error shrink-0">info</span>
                                        <p class="text-sm text-on-surface-variant">
                                            <strong>Catatan:</strong> Data dari template Excel akan menimpa semua data sekolah yang ada. Pastikan file yang diupload sudah benar.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer Modal -->
                    <div class="px-container-padding py-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-end items-center gap-3 shrink-0 rounded-b-xl">
                        <button type="button" onclick="tutupModalEditProfil()" class="px-4 py-2 rounded-lg border border-error text-error hover:bg-error-container/30 transition-colors text-sm">
                            Batal
                        </button>
                        <button type="button" onclick="simpanProfilDariModal()" class="px-6 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm text-sm inline-flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">save</span>Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Isi form modal dengan data saat ini
    isiFormModalProfil(profil);
}

// ============================================================
// FUNGSI BANTUAN: Isi form modal dengan data
// ============================================================
function isiFormModalProfil(profil) {
    const fields = ['nama_sekolah','npsn','tingkat_sekolah','status_sekolah','negara',
        'alamat','rt_rw','kode_pos','kelurahan','kecamatan','kabupaten_kota','provinsi',
        'kontak','nomor_fax','email','website','lintang','bujur',
        'nama_kepala_sekolah','nip_kepala_sekolah','nuptk','visi','misi'];
    
    fields.forEach(f => {
        const el = document.getElementById('ps_' + f);
        if (el && profil[f]) {
            el.value = profil[f];
        } else if (el) {
            el.value = '';
        }
    });
    
    // Default negara
    const elNegara = document.getElementById('ps_negara');
    if (elNegara && !elNegara.value) elNegara.value = 'Indonesia';
}

// ============================================================
// FUNGSI: Buka & Tutup Modal Edit
// ============================================================
function bukaModalEditProfil() {
    const modal = document.getElementById('modalEditProfil');
    if (modal) modal.classList.remove('hidden');
    // Aktifkan tab pertama
    switchModalTab('modalTabManual');
}

function tutupModalEditProfil() {
    const modal = document.getElementById('modalEditProfil');
    if (modal) modal.classList.add('hidden');
}

// ============================================================
// FUNGSI: Switch tab di dalam modal
// ============================================================
function switchModalTab(tabId) {
    document.querySelectorAll('.modal-tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-white', 'shadow-sm');
        btn.style.color = '';
        btn.classList.add('text-on-surface-variant', 'hover:bg-white');
    });
    
    const tab = document.getElementById(tabId);
    if (tab) tab.classList.remove('hidden');
    
    const btnId = tabId + 'Btn';
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.classList.add('active', 'bg-white', 'shadow-sm');
        btn.classList.remove('text-on-surface-variant', 'hover:bg-white');
        btn.style.color = '#004349';
    }
}

// ============================================================
// FUNGSI: Simpan profil dari modal
// ============================================================
async function simpanProfilDariModal() {
    showLoading('Menyimpan profil sekolah...');
    try {
        const sb = getSupabase();
        
        // 🔧 PERBAIKAN: Tambahkan pengecekan error dari Supabase
        // Supabase JS v2 mengembalikan { data, error } dan TIDAK melempar exception
        const { data: existing, error: errCek } = await sb.from('profil_sekolah').select('id').limit(1).maybeSingle();
        
        if (errCek) {
            console.error('Error cek data existing:', errCek);
            hideLoading();
            let pesan = errCek.message;
            if (errCek.code === '42P01' || errCek.message?.includes('does not exist') || errCek.message?.includes('tidak ada')) {
                pesan = 'Tabel "profil_sekolah" BELUM ADA di database Supabase! Silakan buat tabel tersebut terlebih dahulu di Supabase SQL Editor.';
            }
            showToast('Gagal: ' + pesan, 'error');
            return;
        }
        
        const data = {
            nama_sekolah: document.getElementById('ps_nama_sekolah').value.trim(),
            npsn: document.getElementById('ps_npsn').value.trim(),
            tingkat_sekolah: document.getElementById('ps_tingkat_sekolah').value,
            status_sekolah: document.getElementById('ps_status_sekolah').value,
            alamat: document.getElementById('ps_alamat').value.trim(),
            rt_rw: document.getElementById('ps_rt_rw').value.trim(),
            kode_pos: document.getElementById('ps_kode_pos').value.trim(),
            kelurahan: document.getElementById('ps_kelurahan').value.trim(),
            kecamatan: document.getElementById('ps_kecamatan').value.trim(),
            kabupaten_kota: document.getElementById('ps_kabupaten_kota').value.trim(),
            provinsi: document.getElementById('ps_provinsi').value.trim(),
            negara: document.getElementById('ps_negara').value.trim() || 'Indonesia',
            kontak: document.getElementById('ps_kontak').value.trim(),
            nomor_fax: document.getElementById('ps_nomor_fax').value.trim(),
            email: document.getElementById('ps_email').value.trim(),
            website: document.getElementById('ps_website').value.trim(),
            lintang: document.getElementById('ps_lintang').value.trim(),
            bujur: document.getElementById('ps_bujur').value.trim(),
            nama_kepala_sekolah: document.getElementById('ps_nama_kepala_sekolah').value.trim(),
            nip_kepala_sekolah: document.getElementById('ps_nip_kepala_sekolah').value.trim(),
            nuptk: document.getElementById('ps_nuptk').value.trim(),
            visi: document.getElementById('ps_visi').value.trim(),
            misi: document.getElementById('ps_misi').value.trim()
        };
        
        if (!data.nama_sekolah) {
            hideLoading();
            showToast('Nama sekolah wajib diisi!', 'error');
            return;
        }
        
        // 🔧 PERBAIKAN: Tambahkan pengecekan error pada update/insert
        let hasil;
        if (existing && existing.id) {
            hasil = await sb.from('profil_sekolah').update(data).eq('id', existing.id);
        } else {
            hasil = await sb.from('profil_sekolah').insert(data);
        }
        
        if (hasil.error) {
            console.error('Error simpan profil:', hasil.error);
            hideLoading();
            let pesan = hasil.error.message;
            if (hasil.error.code === '42P01' || hasil.error.message?.includes('does not exist')) {
                pesan = 'Tabel "profil_sekolah" BELUM ADA di database Supabase! Silakan buat tabel tersebut terlebih dahulu.';
            } else if (hasil.error.code === '42501' || hasil.error.message?.includes('permission denied') || hasil.error.message?.includes('policy')) {
                pesan = 'Akses ditolak! Pastikan RLS (Row Level Security) di tabel "profil_sekolah" sudah diatur dengan benar atau matikan RLS untuk testing.';
            }
            showToast('Gagal menyimpan: ' + pesan, 'error');
            return;
        }
        
        if (data.nama_sekolah) {
            namaSekolah = data.nama_sekolah;
            updateTampilanNamaSekolah();
        }
        
        hideLoading();
        tutupModalEditProfil();
        showToast('Profil sekolah berhasil disimpan!', 'success');
        loadProfilSekolah(); // Refresh tampilan
    } catch (e) {
        hideLoading();
        console.error('Exception simpan profil:', e);
        showToast('Gagal menyimpan: ' + e.message, 'error');
    }
}

// ============================================================
// FUNGSI: Download Template Excel Profil Sekolah
// ============================================================
function downloadTemplateProfilSekolah() {
    // Unduh template dari folder asset/
    const link = document.createElement('a');
    link.href = 'asset/template_profil_sekolah.xlsx';
    link.download = 'template_profil_sekolah.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Template berhasil diunduh!', 'success');
}

// ============================================================
// FUNGSI: Handle Upload Template Excel
// ============================================================
function handleUploadProfilTemplate(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('namaFileProfil').textContent = file.name;
    
    if (typeof XLSX === 'undefined') {
        showToast('Library Excel belum dimuat', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 🔧 PERBAIKAN: Cari sheet bernama "Profil Sekolah" secara spesifik
            // Sebelumnya selalu mengambil sheet pertama (index 0) yang isinya "Petunjuk"
            let sheetName = null;
            
            // Prioritas 1: Cari sheet dengan nama persis "Profil Sekolah"
            if (workbook.SheetNames.includes('Profil Sekolah')) {
                sheetName = 'Profil Sekolah';
            }
            // Prioritas 2: Cari sheet yang mengandung kata "profil" (case-insensitive)
            if (!sheetName) {
                sheetName = workbook.SheetNames.find(name => 
                    name.toLowerCase().includes('profil')
                );
            }
            // Prioritas 3: Jika tidak ada, gunakan sheet terakhir (biasanya data ada di sheet terakhir)
            if (!sheetName) {
                sheetName = workbook.SheetNames[workbook.SheetNames.length - 1];
            }
            
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: '', range: 2 }); // range:2 = lewati baris 1-2, header mulai baris 3
            
            if (json.length === 0) {
                showToast('File template kosong atau format tidak sesuai. Pastikan data diisi pada baris ke-4 di sheet "Profil Sekolah".', 'error');
                return;
            }
            
            const row = json[0];
            
            // Mapping kolom Excel ke field database
            const mapping = {
                'Nama Sekolah': 'nama_sekolah', 'NPSN': 'npsn', 'Tingkat Sekolah': 'tingkat_sekolah',
                'Status Sekolah': 'status_sekolah', 'Negara': 'negara', 'Alamat': 'alamat',
                'RT/RW': 'rt_rw', 'Kode Pos': 'kode_pos', 'Kelurahan': 'kelurahan',
                'Kecamatan': 'kecamatan', 'Kabupaten/Kota': 'kabupaten_kota', 'Provinsi': 'provinsi',
                'Nomor Telepon': 'kontak', 'Nomor Fax': 'nomor_fax', 'Email': 'email',
                'Website': 'website', 'Lintang': 'lintang', 'Bujur': 'bujur',
                'Nama Kepala Sekolah': 'nama_kepala_sekolah', 'NIP': 'nip_kepala_sekolah',
                'NUPTK': 'nuptk', 'Visi': 'visi', 'Misi': 'misi'
            };
            
            // Normalisasi key dari Excel (hapus * dan spasi berlebih) agar toleran terhadap variasi
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                const cleanKey = key.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
                normalizedRow[cleanKey] = row[key];
            });
            
            // Cek apakah ada kolom wajib yang terisi
            let adaData = false;
            Object.keys(mapping).forEach(excelKey => {
                if (normalizedRow[excelKey] !== undefined && String(normalizedRow[excelKey]).trim() !== '') {
                    adaData = true;
                }
            });
            
            if (!adaData) {
                showToast('Tidak ada data yang terbaca dari template. Pastikan data diisi pada baris ke-4 di sheet "Profil Sekolah".', 'error');
                return;
            }
            
            // Isi form dengan data dari Excel
            let fieldTerisi = 0;
            Object.keys(mapping).forEach(excelKey => {
                const dbField = mapping[excelKey];
                const el = document.getElementById('ps_' + dbField);
                if (el && normalizedRow[excelKey] !== undefined && normalizedRow[excelKey] !== '') {
                    el.value = String(normalizedRow[excelKey]).trim();
                    fieldTerisi++;
                }
            });
            
            const preview = document.getElementById('previewUploadProfil');
            preview.textContent = `✅ Data dari template berhasil dimuat! ${fieldTerisi} kolom terisi. Silakan klik "Simpan Perubahan" di bawah untuk menyimpan ke database.`;
            preview.classList.remove('hidden');
            
            // Tetap di tab Template Excel sesuai permintaan pengguna
            // Data sudah terisi otomatis ke form di tab Edit Manual di belakang layar
            
            showToast(`Template berhasil dibaca! ${fieldTerisi} kolom data dimuat. Klik "Simpan Perubahan" di bawah untuk menyimpan ke database.`, 'success');
        } catch (err) {
            showToast('Gagal membaca file: ' + err.message, 'error');
            console.error('Error parsing Excel:', err);
        }
    };
    reader.readAsArrayBuffer(file);
}
function loadPage(pageName) {
    currentPage = pageName;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) item.classList.add('active');
    });
    
    document.querySelectorAll('.group\\/dropdown ul').forEach(ul => {
        ul.classList.add('hidden');
        const chevron = ul.previousElementSibling?.querySelector('.chevron');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    });
    
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;
    
    contentArea.innerHTML = '<div class="text-center py-16"><div class="loading-spinner mx-auto mb-4"></div><p class="text-on-surface-variant">Memuat halaman...</p></div>';
    
    switch(pageName) {
        case 'dashboardAdmin': loadDashboardAdmin(); break;
        case 'masterSiswa': loadMasterSiswa(); break;
            case 'masterGuru': loadMasterGuru(); break;
        case 'masterMapel': loadMasterMapel(); break;
        case 'masterJadwal': loadMasterJadwal(); break;
        case 'qrGenerator': loadQRGenerator(); break;
        case 'qrScanner': loadQRScanner(); break;
        case 'rekapAbsen': loadRekapAbsen(); break;
        case 'pusatUnduhan': loadPusatUnduhan(); break;
        case 'profilPengguna': loadProfilPengguna(); break;
        case 'profilSekolah': loadProfilSekolah(); break;
        case 'akunPengguna': loadAkunPengguna(); break;
        case 'pengaturan': loadPengaturan(); break;
        default: loadDashboardAdmin();
    }
}

function toggleDropdown(btn) {
    const ul = btn.nextElementSibling;
    const chevron = btn.querySelector('.chevron');
    ul.classList.toggle('hidden');
    if (chevron) chevron.style.transform = ul.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('hidden');
        sidebar.classList.toggle('flex');
    }
}

// ============================================================
// DASHBOARD ADMIN
// ============================================================

async function loadDashboardAdmin() {
    const contentArea = document.getElementById('content-area');
    const hariIni = formatTanggalIndo(formatTanggal(new Date()));
    
    contentArea.innerHTML = `
        <div>
            <div class="mb-stack-lg flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 class="font-headline-lg text-headline-lg text-on-surface">Dashboard</h2>
                    <p class="text-on-surface-variant font-body-lg mt-1">Ringkasan Kehadiran Hari Ini: <span class="font-bold text-on-surface">${hariIni}</span></p>
                </div>
                <button onclick="loadPage('qrScanner')" class="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2 self-start">
                    <span class="material-symbols-outlined text-sm">qr_code_scanner</span>Buka Scanner
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div class="col-span-1 md:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4" id="statsCards">
                    <div class="col-span-full text-center py-8 text-on-surface-variant">
                        <span class="material-symbols-outlined animate-spin">refresh</span>
                        <p class="mt-2 text-sm">Memuat data statistik...</p>
                    </div>
                </div>
                
                <div class="col-span-1 md:col-span-8 space-y-6">
                    <!-- Card Grafik Kehadiran Siswa -->
                    <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col" 
                         style="height: 400px;">
                        <div class="px-4 py-3 border-b border-outline-variant/30 flex justify-between items-center shrink-0" 
                             style="background: linear-gradient(to bottom right, #004349, #0d5c63); min-height: 52px;">
                            <h3 class="font-headline-sm text-headline-sm flex items-center gap-2" style="color: white;">
                                <span class="material-symbols-outlined" style="color: white;">insights</span>
                                Grafik Kehadiran Siswa
                            </h3>
                            <select id="bulanChart" onchange="loadAttendanceChart()" 
                                    class="bg-white text-on-surface text-xs rounded-lg px-2 py-1 border-0 shadow-sm">
                                <option value="Januari">Januari</option><option value="Februari">Februari</option>
                                <option value="Maret">Maret</option><option value="April">April</option>
                                <option value="Mei">Mei</option><option value="Juni">Juni</option>
                                <option value="Juli">Juli</option><option value="Agustus" selected>Agustus</option>
                                <option value="September">September</option><option value="Oktober">Oktober</option>
                                <option value="November">November</option><option value="Desember">Desember</option>
                            </select>
                        </div>
                        <div class="p-6 flex-1 min-h-0">
                            <div class="relative w-full flex items-end justify-between pt-4 pb-8 border-b border-l border-outline-variant/30 pl-2" 
                                 id="chartContainer" style="height: 100%;">
                                <div class="absolute top-0 left-0 w-full h-full flex flex-col justify-between pointer-events-none pb-8 pt-4">
                                    <div class="w-full border-t border-outline-variant/20 h-0"></div>
                                    <div class="w-full border-t border-outline-variant/20 h-0"></div>
                                    <div class="w-full border-t border-outline-variant/20 h-0"></div>
                                    <div class="w-full border-t border-outline-variant/20 h-0"></div>
                                </div>
                                <div class="absolute top-0 -left-6 h-full flex flex-col justify-between pb-8 pt-2 text-[10px] text-on-surface-variant text-right w-5">
                                    <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                                </div>
                                <div class="absolute inset-0 w-full pt-4 pl-2 flex items-end justify-around" id="barChartContainer" style="height: calc(100% - 2rem);">
                                    <p class="text-center w-full text-on-surface-variant text-sm">Memuat grafik...</p>
                                </div>
                                <div class="absolute bottom-0 left-0 w-full flex justify-around pl-2 text-[10px] font-bold text-on-surface-variant uppercase pt-2">
                                    <div class="text-center w-8">Jul</div><div class="text-center w-8">Agu</div>
                                    <div class="text-center w-8">Sep</div><div class="text-center w-8">Okt</div>
                                    <div class="text-center w-8">Nov</div><div class="text-center w-8">Des</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- CARD BARU: Statistik Siswa per Tingkat -->
                    <!-- Header hijau gradien sama dengan Grafik Kehadiran -->
                    <!-- Icon: analytics (statistik) -->
                    <!-- Tabel dinamis dari database siswa -->
                    <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                        <div class="px-4 py-3 border-b border-outline-variant/30 flex items-center" 
                             style="background: linear-gradient(to bottom right, #004349, #0d5c63); min-height: 52px;">
                            <h3 class="font-headline-sm text-headline-sm flex items-center gap-2" style="color: white;">
                                <span class="material-symbols-outlined" style="color: white;">analytics</span>
                                Statistik Siswa per Tingkat
                            </h3>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="text-label-md uppercase tracking-wider border-b border-outline-variant/30" style="background: linear-gradient(to bottom right, #004349, #0d5c63); color: white;">
                                        <th class="px-4 py-3">TINGKAT</th>
                                        <th class="px-4 py-3">JURUSAN</th>
                                        <th class="px-4 py-3 text-center">(LAKI-LAKI)</th>
                                        <th class="px-4 py-3 text-center">(PEREMPUAN)</th>
                                        <th class="px-4 py-3 text-center font-bold">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody id="statistikTingkatBody" class="text-body-md text-on-surface">
                                    <tr><td colspan="5" class="px-4 py-8 text-center text-on-surface-variant">Memuat data statistik...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="col-span-1 md:col-span-4 space-y-6">
                    <!-- Card Aktivitas Terbaru -->
                    <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col" 
                         style="height: 400px;">
                        <div class="px-4 py-3 border-b border-outline-variant/30 flex items-center shrink-0" 
                             style="background: linear-gradient(to bottom right, #004349, #0d5c63); min-height: 52px;">
                            <h3 class="font-headline-sm text-headline-sm flex items-center gap-2" style="color: white;">
                                <span class="material-symbols-outlined" style="color: white;">history</span>Aktivitas Terbaru
                            </h3>
                        </div>
                        <div class="flex-1 overflow-y-auto p-0 min-h-0" id="recentActivity">
                            <div class="p-8 text-center text-on-surface-variant"><p class="text-sm">Memuat data aktivitas...</p></div>
                        </div>
                        <a href="#" onclick="loadPage('rekapAbsen'); return false;" class="p-3 text-center text-xs font-bold text-primary border-t hover:bg-surface-container-low transition-colors shrink-0">
                            Lihat Semua Aktivitas
                        </a>
                    </div>
                    
                    <!-- Card Panduan Penggunaan - warna hijau gradien -->
                    <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-container p-6 text-on-primary shadow-sm">
                        <div class="absolute -right-10 -top-10 opacity-10"><span class="material-symbols-outlined text-9xl">help_center</span></div>
                        <h3 class="font-headline-sm font-bold mb-2 relative z-10">Panduan Penggunaan</h3>
                        <p class="text-sm text-on-primary/80 mb-4 relative z-10">Langkah cepat mengelola absensi hari ini.</p>
                        <ul class="space-y-3 relative z-10 text-sm">
                            <li class="flex items-start gap-2"><span class="material-symbols-outlined text-sm mt-0.5 bg-on-primary/20 rounded-full p-0.5">mobile_arrow_right</span>Buka menu <strong>Scanner</strong> saat jam masuk.</li>
                            <li class="flex items-start gap-2"><span class="material-symbols-outlined text-sm mt-0.5 bg-on-primary/20 rounded-full p-0.5">waves</span>Arahkan kamera ke QR Code milik siswa.</li>
                            <li class="flex items-start gap-2"><span class="material-symbols-outlined text-sm mt-0.5 bg-on-primary/20 rounded-full p-0.5">cloud_download</span>Cek log di <strong>Rekap Presensi</strong> di akhir hari.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    await loadDashboardStats();
    await loadRecentActivity();
    await loadStatistikSiswaPerTingkat(); // Fungsi baru untuk card statistik per tingkat
    loadAttendanceChart();
}

// ============================================================
// FUNGSI BARU: loadStatistikSiswaPerTingkat()
// Mengambil data siswa dari database, dikelompokkan per kelas & jurusan
// Menghitung jumlah Laki-laki, Perempuan, dan Total
// ============================================================

async function loadStatistikSiswaPerTingkat() {
    try {
        const sb = getSupabase();
        const { data: siswaList } = await sb.from('siswa')
            .select('kelas, jurusan, jenis_kelamin')
            .order('kelas')
            .order('jurusan');
        
        const tbody = document.getElementById('statistikTingkatBody');
        
        if (!siswaList || siswaList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-on-surface-variant">Tidak ada data siswa</td></tr>';
            return;
        }
        
        // Kelompokkan data berdasarkan kelas dan jurusan
        const kelompok = {};
        siswaList.forEach(s => {
            const key = `${s.kelas}|${s.jurusan}`;
            if (!kelompok[key]) {
                kelompok[key] = {
                    kelas: s.kelas,
                    jurusan: s.jurusan,
                    laki: 0,
                    perempuan: 0,
                    total: 0
                };
            }
            if (s.jenis_kelamin === 'Laki-laki') {
                kelompok[key].laki++;
            } else if (s.jenis_kelamin === 'Perempuan') {
                kelompok[key].perempuan++;
            }
            kelompok[key].total++;
        });
        
        // Urutkan hasil: kelas X dulu, lalu XI, lalu XII
        const urutanKelas = { 'X': 1, 'XI': 2, 'XII': 3 };
        const hasil = Object.values(kelompok).sort((a, b) => {
            if (urutanKelas[a.kelas] !== urutanKelas[b.kelas]) {
                return urutanKelas[a.kelas] - urutanKelas[b.kelas];
            }
            return a.jurusan.localeCompare(b.jurusan);
        });
        
        // Konversi kelas Romawi ke angka untuk tampilan (X -> Kelas 10, dst)
        const kelasLabel = { 'X': 'Kelas 10', 'XI': 'Kelas 11', 'XII': 'Kelas 12' };
        
        // Render ke tabel
        tbody.innerHTML = hasil.map((item, index) => `
            <tr class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
                <td class="px-4 py-3 font-semibold">${kelasLabel[item.kelas] || item.kelas}</td>
                <td class="px-4 py-3">${item.jurusan || '-'}</td>
                <td class="px-4 py-3 text-center">${item.laki}</td>
                <td class="px-4 py-3 text-center">${item.perempuan}</td>
                <td class="px-4 py-3 text-center font-bold text-primary">${item.total}</td>
            </tr>
        `).join('');
        
        // Tambahkan baris total di bagian bawah
        const totalLaki = hasil.reduce((sum, item) => sum + item.laki, 0);
        const totalPerempuan = hasil.reduce((sum, item) => sum + item.perempuan, 0);
        const totalSemua = hasil.reduce((sum, item) => sum + item.total, 0);
        
        tbody.innerHTML += `
            <tr class="bg-surface-container-low font-bold">
                <td class="px-4 py-3" colspan="2">TOTAL KESELURUHAN</td>
                <td class="px-4 py-3 text-center">${totalLaki}</td>
                <td class="px-4 py-3 text-center">${totalPerempuan}</td>
                <td class="px-4 py-3 text-center text-primary">${totalSemua}</td>
            </tr>
        `;
        
    } catch (e) {
        console.error('Error statistik tingkat:', e);
        const tbody = document.getElementById('statistikTingkatBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-error">Gagal memuat data statistik</td></tr>';
        }
    }
}

async function loadDashboardStats() {
    try {
        const sb = getSupabase();
        const hariIni = formatTanggal(new Date());
        
        const { count: totalSiswa } = await sb.from('siswa').select('*', { count: 'exact', head: true });
        const { data: hadir } = await sb.from('absensi').select('id').eq('tanggal', hariIni).eq('status', 'Hadir');
        const { data: terlambat } = await sb.from('absensi').select('id').eq('tanggal', hariIni).eq('status', 'Terlambat');
        const { count: totalMapel } = await sb.from('mapel').select('*', { count: 'exact', head: true });
        
        // Semua warna angka menggunakan INLINE STYLE agar pasti bekerja
        document.getElementById('statsCards').innerHTML = `
            <!-- Card Total Siswa - Biru (#2563eb) -->
            <div class="stat-card card-blue bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 relative overflow-hidden cursor-pointer">
                <div class="stat-card-icon">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">groups</span>
                </div>
                <p class="font-label-md text-on-surface-variant uppercase tracking-wide text-xs mb-2">Total Siswa</p>
                <p class="stat-card-number text-3xl font-bold tracking-tighter" style="color: #2563eb;">${totalSiswa || 0}</p>
                <p class="text-xs text-on-surface-variant mt-1">orang terdaftar</p>
            </div>
            
            <!-- Card Hadir Hari Ini - Hijau (#16a34a) -->
            <div class="stat-card card-green bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 relative overflow-hidden cursor-pointer">
                <div class="stat-card-icon">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                </div>
                <p class="font-label-md text-on-surface-variant uppercase tracking-wide text-xs mb-2">Hadir Hari Ini</p>
                <p class="stat-card-number text-3xl font-bold tracking-tighter" style="color: #16a34a;">${hadir?.length || 0}</p>
                <p class="text-xs text-on-surface-variant mt-1">siswa hadir</p>
            </div>
            
            <!-- Card Terlambat Hari Ini - Amber (#d97706) -->
            <div class="stat-card card-amber bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 relative overflow-hidden cursor-pointer">
                <div class="stat-card-icon">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">schedule</span>
                </div>
                <p class="font-label-md text-on-surface-variant uppercase tracking-wide text-xs mb-2">Terlambat Hari Ini</p>
                <p class="stat-card-number text-3xl font-bold tracking-tighter" style="color: #d97706;">${terlambat?.length || 0}</p>
                <p class="text-xs text-on-surface-variant mt-1">siswa terlambat</p>
            </div>
            
            <!-- Card Total Mata Pelajaran - Ungu (#7c3aed) -->
            <div class="stat-card card-purple bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 relative overflow-hidden cursor-pointer">
                <div class="stat-card-icon">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">menu_book</span>
                </div>
                <p class="font-label-md text-on-surface-variant uppercase tracking-wide text-xs mb-2">Total Mata Pelajaran</p>
                <p class="stat-card-number text-3xl font-bold tracking-tighter" style="color: #7c3aed;">${totalMapel || 0}</p>
                <p class="text-xs text-on-surface-variant mt-1">mata pelajaran</p>
            </div>
        `;
    } catch (e) {
        console.error('Error stats:', e);
    }
}

async function loadRecentActivity() {
    try {
        const sb = getSupabase();
        const { data } = await sb.from('absensi')
            .select('*').order('waktu', { ascending: false }).limit(10);
        
        const container = document.getElementById('recentActivity');
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-on-surface-variant"><p class="text-sm">Belum ada aktivitas hari ini</p></div>';
            return;
        }
        
        const warnaDot = { 'Hadir': 'bg-green-500', 'Terlambat': 'bg-amber-500', 'Sakit': 'bg-blue-500', 'Izin': 'bg-purple-500', 'Alpa': 'bg-red-500' };
        
        container.innerHTML = data.map(a => `
            <div class="flex items-center gap-3 p-4 border-b border-outline-variant/30 hover:bg-surface-container-low">
                <div class="w-2 h-2 rounded-full ${warnaDot[a.status] || 'bg-gray-500'} shrink-0"></div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate">${a.nama_siswa}</p>
                    <p class="text-xs text-on-surface-variant truncate">${a.mata_pelajaran || '—'} • ${a.status}</p>
                </div>
                <span class="text-xs text-outline shrink-0">${a.waktu?.slice(0, 5) || ''}</span>
            </div>
        `).join('');
    } catch (e) {
        console.error('Error activity:', e);
    }
}

function loadAttendanceChart() {
    const container = document.getElementById('barChartContainer');
    const data = [
        { x: 85, xi: 80, xii: 78 },
        { x: 90, xi: 85, xii: 88 },
        { x: 78, xi: 82, xii: 75 },
        { x: 92, xi: 88, xii: 90 },
        { x: 88, xi: 90, xii: 85 },
        { x: 0, xi: 0, xii: 0 }
    ];
    
    container.innerHTML = data.map(d => `
        <div class="flex items-end gap-1 h-full">
            <div class="w-3 bg-[#0d5c63] rounded-t-sm transition-all duration-500" style="height: ${d.x}%"></div>
            <div class="w-3 bg-[#48626e] rounded-t-sm transition-all duration-500" style="height: ${d.xi}%"></div>
            <div class="w-3 bg-[#5c310d] rounded-t-sm transition-all duration-500" style="height: ${d.xii}%"></div>
        </div>
    `).join('');
}

// ============================================================
// MASTER SISWA
// ============================================================

let allSiswaData = [];
let siswaPage = 1;
const siswaPerPage = 10;

async function loadMasterSiswa() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div>
            <div class="mb-stack-lg flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 class="text-headline-lg font-headline-lg text-on-surface mb-1">Data Siswa</h1>
                    <p class="text-body-md text-on-surface-variant">Kelola data lengkap siswa, NISN, kelas, dan jurusan.</p>
                </div>
                <!-- ⭐ TOMBOL DOWNLOAD TEMPLATE & UPLOAD EXCEL ⭐ -->
                <div class="flex gap-2 flex-wrap">
                    <button onclick="downloadTemplateSiswa()" class="flex items-center justify-center gap-2 px-4 py-2 bg-white text-primary border-2 border-primary rounded-lg hover:bg-primary/5 shadow-sm font-bold text-sm">
                        <span class="material-symbols-outlined text-[18px]">download</span>Download Template
                    </button>
                    <label class="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-lg hover:opacity-90 shadow-sm font-bold text-sm cursor-pointer">
                        <span class="material-symbols-outlined text-[18px]">upload</span>Upload Excel
                        <input type="file" accept=".xlsx,.xls" onchange="handleFileExcel(event)" class="hidden">
                    </label>
                </div>
            </div>
            
            <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-highest mb-stack-md flex flex-col md:flex-row gap-4 items-center">
                <div class="relative w-full md:w-96">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                    <input type="text" id="searchSiswa" placeholder="Cari nama atau NISN..." oninput="filterSiswa()"
                        class="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container">
                </div>
                <div class="flex gap-2 w-full md:w-auto flex-wrap justify-center md:justify-start">
                    <select id="filterKelas" onchange="filterSiswa()" class="w-full md:w-40 px-4 py-2 bg-surface border border-outline-variant rounded-lg">
                        <option value="">Semua Kelas</option>
                        <option value="X">Kelas X</option>
                        <option value="XI">Kelas XI</option>
                        <option value="XII">Kelas XII</option>
                    </select>
                    <select id="filterJurusan" onchange="filterSiswa()" class="w-full md:w-40 px-4 py-2 bg-surface border border-outline-variant rounded-lg">
                        <option value="">Semua Jurusan</option>
                        <option value="TKJ 1">TKJ 1</option>
                        <option value="TKJ 2">TKJ 2</option>
                        <option value="RPL 1">RPL 1</option>
                        <option value="RPL 2">RPL 2</option>
                        <option value="MM 1">MM 1</option>
                    </select>
                    <button onclick="showModalSiswa()" class="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm flex-1 md:flex-none w-full md:w-auto">
                        <span class="material-symbols-outlined text-[18px]">add</span>Tambah Siswa
                    </button>
                </div>
            </div>
            
            <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-label-md uppercase tracking-wider border-b" style="background: linear-gradient(to bottom right, #004349, #0d5c63); color: white; whitespace-nowrap">
                                <th class="p-3 w-12 text-center">No</th>
                                <th class="p-3">Nama Siswa</th>
                                <th class="p-3">Jenis Kelamin</th>
                                <th class="p-3">NISN</th>
                                <th class="p-3">Tempat Lahir</th>
                                <th class="p-3">Tanggal Lahir</th>
                                <th class="p-3">Kelas</th>
                                <th class="p-3">Jurusan</th>
                                <th class="p-3 w-24 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="tableSiswa" class="text-body-md text-on-surface">
                            <tr><td colspan="9" class="p-8 text-center text-on-surface-variant">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="flex justify-between items-center p-4 bg-surface border-t">
                    <span class="text-sm text-on-surface-variant" id="paginationInfo">Menampilkan 0 data</span>
                    <div class="flex gap-1" id="paginationButtons"></div>
                </div>
            </div>
        </div>
        
        <div id="modalSiswa" class="fixed inset-0 z-[9997] hidden">
            <div class="modal-overlay absolute inset-0" onclick="closeModalSiswa()"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
                <div class="p-6 border-b flex items-center justify-between shrink-0 rounded-t-xl" 
                     style="background: linear-gradient(to bottom right, #004349, #0d5c63);">
                    <h3 class="font-headline-sm font-bold flex items-center gap-2" style="color: white;">
                        <span class="material-symbols-outlined" style="color: white;">person_add</span>
                        <span id="modalSiswaTitle">Tambah Siswa Baru</span>
                    </h3>
                    <button onclick="closeModalSiswa()" class="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <span class="material-symbols-outlined" style="color: white;">close</span>
                    </button>
                </div>
                <div class="overflow-y-auto p-6">
                    <form id="formSiswa" onsubmit="event.preventDefault(); simpanDataSiswa();" class="space-y-4">
                    <input type="hidden" id="siswaId">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label class="block mb-2 font-label-md">Nama Lengkap *</label>
                            <input type="text" id="siswaNama" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-container focus:border-primary"></div>
                        <div><label class="block mb-2 font-label-md">Jenis Kelamin *</label>
                            <select id="siswaJK" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                                <option value="">Pilih...</option>
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select></div>
                        <div><label class="block mb-2 font-label-md">NIS</label>
                            <input type="text" id="siswaNIS" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                        <div><label class="block mb-2 font-label-md">NISN *</label>
                            <input type="text" id="siswaNISN" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                        <div><label class="block mb-2 font-label-md">Tempat Lahir</label>
                            <input type="text" id="siswaTempatLahir" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                        <div><label class="block mb-2 font-label-md">Tanggal Lahir</label>
                            <input type="date" id="siswaTglLahir" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                        <div><label class="block mb-2 font-label-md">Kelas *</label>
                            <select id="siswaKelas" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                                <option value="">Pilih...</option>
                                <option value="X">X (Kelas 10)</option>
                                <option value="XI">XI (Kelas 11)</option>
                                <option value="XII">XII (Kelas 12)</option>
                            </select></div>
                        <div><label class="block mb-2 font-label-md">Jurusan *</label>
                            <select id="siswaJurusan" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                                <option value="">Pilih...</option>
                                <option value="TKJ 1">TKJ 1</option>
                                <option value="TKJ 2">TKJ 2</option>
                                <option value="RPL 1">RPL 1</option>
                                <option value="RPL 2">RPL 2</option>
                                <option value="MM 1">MM 1</option>
                            </select></div>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onclick="closeModalSiswa()" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Batal</button>
                        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 shadow-sm">Simpan</button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    `;
    
    await loadAllSiswa();
}

async function loadAllSiswa() {
    try {
        const sb = getSupabase();
        const { data } = await sb.from('siswa').select('*').order('nama_lengkap');
        allSiswaData = data || [];
        filterSiswa();
    } catch (e) {
        showToast('Gagal memuat data: ' + e.message, 'error');
    }
}

function filterSiswa() {
    const search = document.getElementById('searchSiswa')?.value.toLowerCase() || '';
    const kelas = document.getElementById('filterKelas')?.value || '';
    const jurusan = document.getElementById('filterJurusan')?.value || '';
    
    let filtered = allSiswaData.filter(s => {
        const matchSearch = !search || s.nama_lengkap.toLowerCase().includes(search) || s.nisn.includes(search);
        const matchKelas = !kelas || s.kelas === kelas;
        const matchJurusan = !jurusan || s.jurusan === jurusan;
        return matchSearch && matchKelas && matchJurusan;
    });
    
    renderSiswaTable(filtered);
}

function renderSiswaTable(data) {
    const tbody = document.getElementById('tableSiswa');
    const start = (siswaPage - 1) * siswaPerPage;
    const pageData = data.slice(start, start + siswaPerPage);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-on-surface-variant">Tidak ada data siswa</td></tr>';
        document.getElementById('paginationInfo').textContent = 'Menampilkan 0 data';
        document.getElementById('paginationButtons').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = pageData.map((s, i) => {
        const statusWarna = s.status_akun === 'Aktif' ? 'bg-green-100 text-green-700' : 
                           s.status_akun === 'Belum Generate' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700';
        return `
        <tr class="border-b border-surface-container-highest table-row-hover">
            <td class="p-3 text-center text-on-surface-variant">${start + i + 1}</td>
            <td class="p-3 font-semibold">${s.nama_lengkap}</td>
            <td class="p-3">${s.jenis_kelamin || '-'}</td>
            <td class="p-3 font-mono">${s.nisn}</td>
            <td class="p-3">${s.tempat_lahir || '-'}</td>
            <td class="p-3">${s.tanggal_lahir ? formatTanggalIndo(s.tanggal_lahir) : '-'}</td>
            <td class="p-3">${s.kelas}</td>
            <td class="p-3">${s.jurusan}</td>
            <td class="p-3 text-center">
                <button onclick="editSiswa(${s.id})" class="p-1.5 text-primary hover:bg-primary/10 rounded"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                <button onclick="hapusSiswa(${s.id})" class="p-1.5 text-error hover:bg-error/10 rounded"><span class="material-symbols-outlined text-[18px]">delete</span></button>
            </td>
        </tr>`;
    }).join('');
    
    document.getElementById('paginationInfo').textContent = `Menampilkan ${start + 1}-${Math.min(start + siswaPerPage, data.length)} dari ${data.length} data`;
    
    const totalPages = Math.ceil(data.length / siswaPerPage);
    const html = renderPaginationHTML(siswaPage, totalPages, 'siswaPage', 'filterSiswa');
    document.getElementById('paginationButtons').innerHTML = html;
}

function showModalSiswa() {
    document.getElementById('modalSiswaTitle').textContent = 'Tambah Siswa Baru';
    document.getElementById('formSiswa').reset();
    document.getElementById('siswaId').value = '';
    document.getElementById('modalSiswa').classList.remove('hidden');
}

function closeModalSiswa() {
    document.getElementById('modalSiswa').classList.add('hidden');
}

async function editSiswa(id) {
    const s = allSiswaData.find(x => x.id === id);
    if (!s) return;
    document.getElementById('modalSiswaTitle').textContent = 'Edit Data Siswa';
    document.getElementById('siswaId').value = s.id;
    document.getElementById('siswaNama').value = s.nama_lengkap;
    document.getElementById('siswaJK').value = s.jenis_kelamin || '';
    document.getElementById('siswaNIS').value = s.nis || '';
    document.getElementById('siswaNISN').value = s.nisn;
    document.getElementById('siswaTempatLahir').value = s.tempat_lahir || '';
    document.getElementById('siswaTglLahir').value = s.tanggal_lahir || '';
    document.getElementById('siswaKelas').value = s.kelas;
    document.getElementById('siswaJurusan').value = s.jurusan;
    document.getElementById('modalSiswa').classList.remove('hidden');
}

async function simpanDataSiswa() {
    showLoading('Menyimpan...');
    try {
        const sb = getSupabase();
        const id = document.getElementById('siswaId').value;
        const data = {
            nama_lengkap: document.getElementById('siswaNama').value,
            jenis_kelamin: document.getElementById('siswaJK').value,
            nis: document.getElementById('siswaNIS').value,
            nisn: document.getElementById('siswaNISN').value,
            tempat_lahir: document.getElementById('siswaTempatLahir').value,
            tanggal_lahir: document.getElementById('siswaTglLahir').value,
            kelas: document.getElementById('siswaKelas').value,
            jurusan: document.getElementById('siswaJurusan').value
        };
        
        if (id) {
            await sb.from('siswa').update(data).eq('id', parseInt(id));
        } else {
            data.status_akun = 'Belum Generate';
            await sb.from('siswa').insert(data);
        }
        
        hideLoading();
        showToast('Data siswa berhasil disimpan!', 'success');
        closeModalSiswa();
        await loadAllSiswa();
        catatLog(currentUser.username, id ? 'Edit Siswa' : 'Tambah Siswa', data.nama_lengkap);
    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

function hapusSiswa(id) {
    // Cari nama dari data yang sudah ada di memori (100% aman dari karakter spesial)
    const siswa = allSiswaData.find(s => s.id === id);
    const nama = siswa ? siswa.nama_lengkap : 'siswa ini';
    showModalConfirm('Hapus Siswa', `Apakah Anda yakin menghapus ${nama}?`, async () => {
        try {
            const sb = getSupabase();
            await sb.from('siswa').delete().eq('id', id);
            showToast('Data siswa dihapus', 'success');
            await loadAllSiswa();
            catatLog(currentUser.username, 'Hapus Siswa', nama);
        } catch (e) {
            showToast('Gagal: ' + e.message, 'error');
        }
    });
}

function exportSiswa() {
    if (allSiswaData.length === 0) { showToast('Tidak ada data', 'error'); return; }
    let csv = 'Nama,Jenis Kelamin,NIS,NISN,Tempat Lahir,Tanggal Lahir,Kelas,Jurusan,Status\n';
    allSiswaData.forEach(s => {
        csv += `"${s.nama_lengkap}","${s.jenis_kelamin}","${s.nis}","${s.nisn}","${s.tempat_lahir}","${s.tanggal_lahir}","${s.kelas}","${s.jurusan}","${s.status_akun}"\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Siswa_${formatTanggal(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data diexport!', 'success');
}

// ============================================================
// MASTER MATA PELAJARAN
// ============================================================

let allMapelData = [];
let mapelPage = 1;
const mapelPerPage = 10;

async function loadMasterMapel() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div>
            <div class="mb-stack-lg">
                <div>
                    <h1 class="text-headline-lg font-headline-lg text-on-surface mb-1">Mata Pelajaran</h1>
                    <p class="text-body-md text-on-surface-variant">Kelola daftar mata pelajaran, kode, dan guru pengampu.</p>
                </div>
            </div>
            
            <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-highest mb-stack-md flex flex-col md:flex-row gap-4 items-center">
                <div class="relative w-full md:w-96">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                    <input type="text" id="searchMapel" placeholder="Cari nama atau kode mapel..." oninput="filterMapel()"
                        class="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container">
                </div>
                <div class="flex gap-2 w-full md:w-auto flex-wrap justify-center md:justify-start">
                    <select id="filterKelasMapel" onchange="filterMapel()" class="w-full md:w-40 px-4 py-2 bg-surface border border-outline-variant rounded-lg">
                        <option value="">Semua Kelas</option>
                        <option value="10">Kelas 10</option>
                        <option value="11">Kelas 11</option>
                        <option value="12">Kelas 12</option>
                    </select>
                    <button onclick="showModalMapel()" class="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm flex-1 md:flex-none w-full md:w-auto">
                        <span class="material-symbols-outlined text-[18px]">add</span>Tambah Mapel
                    </button>
                </div>
            </div>
            
            <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-label-md uppercase tracking-wider border-b" style="background: linear-gradient(to bottom right, #004349, #0d5c63); color: white;">
                                <th class="p-4 w-16 text-center">No</th>
                                <th class="p-4">Kode Mapel</th>
                                <th class="p-4">Nama Mata Pelajaran</th>
                                <th class="p-4">Guru Pengampu</th>
                                <th class="p-4">Kelas</th>
                                <th class="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="tableMapel" class="text-body-md text-on-surface">
                            <tr><td colspan="6" class="p-8 text-center text-on-surface-variant">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="flex justify-between items-center p-4 bg-surface border-t">
                    <span class="text-sm text-on-surface-variant" id="paginationInfoMapel">Menampilkan 0 data</span>
                    <div class="flex gap-1" id="paginationButtonsMapel"></div>
                </div>
            </div>
        </div>
        
        <div id="modalMapel" class="fixed inset-0 z-[9997] hidden">
            <div class="modal-overlay absolute inset-0" onclick="closeModalMapel()"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest rounded-xl shadow-xl max-w-xl w-full mx-4 overflow-hidden">
                <div class="p-6 border-b flex items-center justify-between" 
                     style="background: linear-gradient(to bottom right, #004349, #0d5c63);">
                    <h3 class="font-headline-sm font-bold flex items-center gap-2" style="color: white;">
                        <span class="material-symbols-outlined" style="color: white;">menu_book</span>
                        <span id="modalMapelTitle">Tambah Mata Pelajaran</span>
                    </h3>
                    <button onclick="closeModalMapel()" class="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <span class="material-symbols-outlined" style="color: white;">close</span>
                    </button>
                </div>
                <form id="formMapel" onsubmit="event.preventDefault(); simpanDataMapel();" class="p-6 space-y-4">
                    <input type="hidden" id="mapelId">
                    <div><label class="block mb-2 font-label-md">Kode Mapel *</label>
                        <input type="text" id="mapelKode" required placeholder="Contoh: MTK-10A" 
                            class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-container focus:border-primary"></div>
                    <div><label class="block mb-2 font-label-md">Nama Mata Pelajaran *</label>
                        <input type="text" id="mapelNama" required placeholder="Contoh: Matematika Wajib" 
                            class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-container focus:border-primary"></div>
                    <div><label class="block mb-2 font-label-md">Guru Pengampu *</label>
                        <input type="text" id="mapelGuru" required placeholder="Contoh: Budi Santoso, S.Pd" 
                            class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-container focus:border-primary"></div>
                    <div><label class="block mb-2 font-label-md">Kelas *</label>
                        <input type="text" id="mapelKelas" required placeholder="Contoh: 10, 11, 12 atau 11 MIPA" 
                            class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-container focus:border-primary">
                        <p class="text-xs text-on-surface-variant mt-1">Pisahkan dengan koma untuk banyak kelas</p></div>
                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onclick="closeModalMapel()" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Batal</button>
                        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 shadow-sm">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    await loadAllMapel();
}

async function loadAllMapel() {
    try {
        const sb = getSupabase();
        const { data } = await sb.from('mapel').select('*').order('nama_mata_pelajaran');
        allMapelData = data || [];
        filterMapel();
    } catch (e) {
        showToast('Gagal memuat: ' + e.message, 'error');
    }
}

function filterMapel() {
    const search = document.getElementById('searchMapel')?.value.toLowerCase() || '';
    const kelas = document.getElementById('filterKelasMapel')?.value || '';
    
    let filtered = allMapelData.filter(m => {
        const matchSearch = !search || m.nama_mata_pelajaran.toLowerCase().includes(search) || m.kode_mapel.toLowerCase().includes(search);
        const matchKelas = !kelas || m.kelas.includes(kelas);
        return matchSearch && matchKelas;
    });
    
    renderMapelTable(filtered);
}

function renderMapelTable(data) {
    const tbody = document.getElementById('tableMapel');
    const start = (mapelPage - 1) * mapelPerPage;
    const pageData = data.slice(start, start + mapelPerPage);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-on-surface-variant">Tidak ada data</td></tr>';
        document.getElementById('paginationInfoMapel').textContent = 'Menampilkan 0 data';
        document.getElementById('paginationButtonsMapel').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = pageData.map((m, i) => `
        <tr class="border-b border-surface-container-highest table-row-hover">
            <td class="p-4 text-center text-on-surface-variant">${start + i + 1}</td>
            <td class="p-4 font-mono font-semibold text-primary">${m.kode_mapel}</td>
            <td class="p-4 font-semibold">${m.nama_mata_pelajaran}</td>
            <td class="p-4">${m.guru_pengampu}</td>
            <td class="p-4">${m.kelas}</td>
            <td class="p-4 text-center">
                <button onclick="editMapel(${m.id})" class="p-1.5 text-primary hover:bg-primary/10 rounded"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                <button onclick="hapusMapel(${m.id})" class="p-1.5 text-error hover:bg-error/10 rounded"><span class="material-symbols-outlined text-[18px]">delete</span></button>
            </td>
        </tr>
    `).join('');
    
    document.getElementById('paginationInfoMapel').textContent = `Menampilkan ${start + 1}-${Math.min(start + mapelPerPage, data.length)} dari ${data.length} data`;
    
    const totalPages = Math.ceil(data.length / mapelPerPage);
    const html = renderPaginationHTML(mapelPage, totalPages, 'mapelPage', 'filterMapel');
    document.getElementById('paginationButtonsMapel').innerHTML = html;
}

function showModalMapel() {
    document.getElementById('modalMapelTitle').textContent = 'Tambah Mata Pelajaran';
    document.getElementById('formMapel').reset();
    document.getElementById('mapelId').value = '';
    document.getElementById('modalMapel').classList.remove('hidden');
}

function closeModalMapel() {
    document.getElementById('modalMapel').classList.add('hidden');
}

async function editMapel(id) {
    const m = allMapelData.find(x => x.id === id);
    if (!m) return;
    document.getElementById('modalMapelTitle').textContent = 'Edit Mata Pelajaran';
    document.getElementById('mapelId').value = m.id;
    document.getElementById('mapelKode').value = m.kode_mapel;
    document.getElementById('mapelNama').value = m.nama_mata_pelajaran;
    document.getElementById('mapelGuru').value = m.guru_pengampu;
    document.getElementById('mapelKelas').value = m.kelas;
    document.getElementById('modalMapel').classList.remove('hidden');
}

async function simpanDataMapel() {
    showLoading('Menyimpan...');
    try {
        const sb = getSupabase();
        const id = document.getElementById('mapelId').value;
        const data = {
            kode_mapel: document.getElementById('mapelKode').value,
            nama_mata_pelajaran: document.getElementById('mapelNama').value,
            guru_pengampu: document.getElementById('mapelGuru').value,
            kelas: document.getElementById('mapelKelas').value
        };
        
        if (id) {
            await sb.from('mapel').update(data).eq('id', parseInt(id));
        } else {
            await sb.from('mapel').insert(data);
        }
        
        hideLoading();
        showToast('Data mapel berhasil disimpan!', 'success');
        closeModalMapel();
        await loadAllMapel();
    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

function hapusMapel(id, nama) {
    showModalConfirm('Hapus Mapel', `Apakah Anda yakin menghapus ${nama}?`, async () => {
        try {
            const sb = getSupabase();
            await sb.from('mapel').delete().eq('id', id);
            showToast('Data mapel dihapus', 'success');
            await loadAllMapel();
        } catch (e) {
            showToast('Gagal: ' + e.message, 'error');
        }
    });
}

function exportMapel() {
    if (allMapelData.length === 0) { showToast('Tidak ada data', 'error'); return; }
    let csv = 'Kode Mapel,Nama Mata Pelajaran,Guru Pengampu,Kelas\n';
    allMapelData.forEach(m => {
        csv += `"${m.kode_mapel}","${m.nama_mata_pelajaran}","${m.guru_pengampu}","${m.kelas}"\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Mapel_${formatTanggal(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data diexport!', 'success');
}

// ============================================================
// MASTER JADWAL PELAJARAN
// ============================================================

let allJadwalData = [];
let jadwalPage = 1;
const jadwalPerPage = 10;

async function loadMasterJadwal() {
    const contentArea = document.getElementById('content-area');
    
    let mapelOptions = '';
    try {
        const sb = getSupabase();
        const { data } = await sb.from('mapel').select('id, kode_mapel, nama_mata_pelajaran').order('nama_mata_pelajaran');
        if (data) {
            mapelOptions = data.map(m => `<option value="${m.id}">${m.kode_mapel} - ${m.nama_mata_pelajaran}</option>`).join('');
        }
    } catch(e) {}
    
    contentArea.innerHTML = `
        <div>
            <div class="mb-stack-lg">
                <div>
                    <h1 class="text-headline-lg font-headline-lg text-on-surface mb-1">Jadwal Pelajaran</h1>
                    <p class="text-body-md text-on-surface-variant">Kelola jadwal pelajaran per kelas, hari, dan jam.</p>
                </div>
            </div>
            
            <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-highest mb-stack-md flex flex-col md:flex-row gap-4 items-center">
                <div class="relative w-full md:w-64 mb-2 md:mb-0">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                    <input type="text" id="searchJadwal" placeholder="Cari mata pelajaran..." oninput="jadwalPage=1;filterJadwal()"
                        class="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container">
                </div>
                <div class="flex gap-2 w-full md:w-auto flex-wrap justify-center md:justify-start">
                    <select id="filterJadwalKelas" onchange="jadwalPage=1;filterJadwal()" class="w-full md:w-40 px-4 py-2 bg-surface border border-outline-variant rounded-lg">
                        <option value="">Semua Kelas</option>
                        <option value="X">Kelas X</option>
                        <option value="XI">Kelas XI</option>
                        <option value="XII">Kelas XII</option>
                    </select>
                    <select id="filterJadwalHari" onchange="jadwalPage=1;filterJadwal()" class="w-full md:w-40 px-4 py-2 bg-surface border border-outline-variant rounded-lg">
                        <option value="">Semua Hari</option>
                        <option value="Senin">Senin</option>
                        <option value="Selasa">Selasa</option>
                        <option value="Rabu">Rabu</option>
                        <option value="Kamis">Kamis</option>
                        <option value="Jumat">Jumat</option>
                        <option value="Sabtu">Sabtu</option>
                    </select>
                    <button onclick="showModalJadwal()" class="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm flex-1 md:flex-none w-full md:w-auto">
                        <span class="material-symbols-outlined text-[18px]">add</span>Tambah Jadwal
                    </button>
                </div>
            </div>
            
            <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-label-md uppercase tracking-wider border-b" style="background: linear-gradient(to bottom right, #004349, #0d5c63); color: white;">
                                <th class="p-4 w-12 text-center">No</th>
                                <th class="p-4">Mata Pelajaran</th>
                                <th class="p-4">Kelas</th>
                                <th class="p-4">Jurusan</th>
                                <th class="p-4">Hari</th>
                                <th class="p-4">Jam</th>
                                <th class="p-4">Toleransi</th>
                                <th class="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="tableJadwal" class="text-body-md text-on-surface">
                            <tr><td colspan="8" class="p-8 text-center text-on-surface-variant">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>
                <!-- PAGINATION -->
                <div class="px-4 py-3 border-t border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between">
                    <span class="text-sm text-on-surface-variant" id="paginationInfoJadwal">Menampilkan 0 data</span>
                    <div class="flex gap-1" id="paginationButtonsJadwal"></div>
                </div>
            </div>
        </div>
        
        <div id="modalJadwal" class="fixed inset-0 z-[9997] hidden">
            <div class="modal-overlay absolute inset-0" onclick="closeModalJadwal()"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest rounded-xl shadow-xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b flex items-center justify-between shrink-0 rounded-t-xl" 
                     style="background: linear-gradient(to bottom right, #004349, #0d5c63);">
                    <h3 class="font-headline-sm font-bold flex items-center gap-2" style="color: white;">
                        <span class="material-symbols-outlined" style="color: white;">calendar_month</span>
                        <span id="modalJadwalTitle">Tambah Jadwal</span>
                    </h3>
                    <button onclick="closeModalJadwal()" class="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <span class="material-symbols-outlined" style="color: white;">close</span>
                    </button>
                </div>
                <form id="formJadwal" onsubmit="event.preventDefault(); simpanDataJadwal();" class="p-6 space-y-4">
                    <input type="hidden" id="jadwalId">
                    <div><label class="block mb-2 font-label-md">Mata Pelajaran *</label>
                        <select id="jadwalMapelId" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                            <option value="">Pilih Mata Pelajaran...</option>
                            ${mapelOptions}
                        </select></div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="block mb-2 font-label-md">Kelas *</label>
                            <select id="jadwalKelas" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                                <option value="">Pilih...</option>
                                <option value="X">X (Kelas 10)</option>
                                <option value="XI">XI (Kelas 11)</option>
                                <option value="XII">XII (Kelas 12)</option>
                            </select></div>
                        <div><label class="block mb-2 font-label-md">Jurusan</label>
                            <select id="jadwalJurusan" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                                <option value="">Semua Jurusan</option>
                                <option value="TKJ 1">TKJ 1</option>
                                <option value="TKJ 2">TKJ 2</option>
                                <option value="RPL 1">RPL 1</option>
                                <option value="RPL 2">RPL 2</option>
                                <option value="MM 1">MM 1</option>
                            </select></div>
                    </div>
                    <div><label class="block mb-2 font-label-md">Hari *</label>
                        <select id="jadwalHari" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                            <option value="">Pilih Hari...</option>
                            <option value="Senin">Senin</option>
                            <option value="Selasa">Selasa</option>
                            <option value="Rabu">Rabu</option>
                            <option value="Kamis">Kamis</option>
                            <option value="Jumat">Jumat</option>
                            <option value="Sabtu">Sabtu</option>
                        </select></div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="block mb-2 font-label-md">Jam Mulai *</label>
                            <input type="time" id="jadwalJamMulai" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                        <div><label class="block mb-2 font-label-md">Jam Selesai *</label>
                            <input type="time" id="jadwalJamSelesai" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                    </div>
                    <div><label class="block mb-2 font-label-md">Toleransi Keterlambatan (menit)</label>
                        <input type="number" id="jadwalToleransi" value="15" min="0" max="120" 
                            class="w-full md:w-48 bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                    
                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onclick="closeModalJadwal()" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Batal</button>
                        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 shadow-sm">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    await loadAllJadwal();
}

async function loadAllJadwal() {
    try {
        const sb = getSupabase();
        const { data } = await sb.from('jadwal_pelajaran')
            .select('*, mapel(*)')
            .order('hari')
            .order('jam_mulai');
        allJadwalData = data || [];
        filterJadwal();
    } catch (e) {
        showToast('Gagal memuat: ' + e.message, 'error');
    }
}

function filterJadwal() {
    const search = document.getElementById('searchJadwal')?.value.toLowerCase() || '';
    const kelas = document.getElementById('filterJadwalKelas')?.value || '';
    const hari = document.getElementById('filterJadwalHari')?.value || '';
    
    let filtered = allJadwalData.filter(j => {
        const matchSearch = !search || 
            (j.mapel?.nama_mata_pelajaran || '').toLowerCase().includes(search) ||
            (j.mapel?.kode_mapel || '').toLowerCase().includes(search) ||
            (j.jurusan || '').toLowerCase().includes(search);
        const matchKelas = !kelas || j.kelas === kelas;
        const matchHari = !hari || j.hari === hari;
        return matchSearch && matchKelas && matchHari;
    });
    
    renderJadwalTable(filtered);
}

function renderJadwalTable(data) {
    const tbody = document.getElementById('tableJadwal');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-on-surface-variant">Tidak ada data jadwal</td></tr>';
        document.getElementById('paginationInfoJadwal').textContent = 'Menampilkan 0 data';
        document.getElementById('paginationButtonsJadwal').innerHTML = '';
        return;
    }
    
    const start = (jadwalPage - 1) * jadwalPerPage;
    const pageData = data.slice(start, start + jadwalPerPage);
    
    tbody.innerHTML = pageData.map((j, i) => `
        <tr class="border-b border-surface-container-highest table-row-hover">
            <td class="p-4 text-center text-on-surface-variant">${start + i + 1}</td>
            <td class="p-4 font-semibold">${j.mapel?.nama_mata_pelajaran || '-'}</td>
            <td class="p-4">${j.kelas}</td>
            <td class="p-4">${j.jurusan || '<span class="text-on-surface-variant">Semua</span>'}</td>
            <td class="p-4">${j.hari}</td>
            <td class="p-4 font-mono">${j.jam_mulai?.slice(0, 5)} - ${j.jam_selesai?.slice(0, 5)}</td>
            <td class="p-4">${j.toleransi_menit || 15} menit</td>
            <td class="p-4 text-center">
                <button onclick="editJadwal(${j.id})" class="p-1.5 text-primary hover:bg-primary/10 rounded"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                <button onclick="hapusJadwal(${j.id})" class="p-1.5 text-error hover:bg-error/10 rounded"><span class="material-symbols-outlined text-[18px]">delete</span></button>
            </td>
        </tr>
    `).join('');
    
    // Update info pagination
    document.getElementById('paginationInfoJadwal').textContent = `Menampilkan ${start + 1}-${Math.min(start + jadwalPerPage, data.length)} dari ${data.length} data`;
    
    // Generate tombol halaman - SAMA PERSIS dengan Rekap Presensi
    const totalPages = Math.ceil(data.length / jadwalPerPage);
    const buttonsHtml = renderPaginationHTML(jadwalPage, totalPages, 'jadwalPage', 'filterJadwal');
    document.getElementById('paginationButtonsJadwal').innerHTML = buttonsHtml;
}

function showModalJadwal() {
    document.getElementById('modalJadwalTitle').textContent = 'Tambah Jadwal';
    document.getElementById('formJadwal').reset();
    document.getElementById('jadwalId').value = '';
    document.getElementById('jadwalToleransi').value = '15';
    document.getElementById('modalJadwal').classList.remove('hidden');
}

function closeModalJadwal() {
    document.getElementById('modalJadwal').classList.add('hidden');
}

async function editJadwal(id) {
    const j = allJadwalData.find(x => x.id === id);
    if (!j) return;
    document.getElementById('modalJadwalTitle').textContent = 'Edit Jadwal';
    document.getElementById('jadwalId').value = j.id;
    document.getElementById('jadwalMapelId').value = j.mapel_id;
    document.getElementById('jadwalKelas').value = j.kelas;
    document.getElementById('jadwalJurusan').value = j.jurusan || '';
    document.getElementById('jadwalHari').value = j.hari;
    document.getElementById('jadwalJamMulai').value = j.jam_mulai?.slice(0, 5);
    document.getElementById('jadwalJamSelesai').value = j.jam_selesai?.slice(0, 5);
    document.getElementById('jadwalToleransi').value = j.toleransi_menit || 15;
    document.getElementById('modalJadwal').classList.remove('hidden');
}

async function simpanDataJadwal() {
    showLoading('Menyimpan...');
    try {
        const sb = getSupabase();
        const id = document.getElementById('jadwalId').value;
        const data = {
            mapel_id: parseInt(document.getElementById('jadwalMapelId').value),
            kelas: document.getElementById('jadwalKelas').value,
            jurusan: document.getElementById('jadwalJurusan').value || null,
            hari: document.getElementById('jadwalHari').value,
            jam_mulai: document.getElementById('jadwalJamMulai').value + ':00',
            jam_selesai: document.getElementById('jadwalJamSelesai').value + ':00',
            toleransi_menit: parseInt(document.getElementById('jadwalToleransi').value) || 15
        };
        
        if (id) {
            await sb.from('jadwal_pelajaran').update(data).eq('id', parseInt(id));
        } else {
            await sb.from('jadwal_pelajaran').insert(data);
        }
        
        hideLoading();
        showToast('Jadwal berhasil disimpan!', 'success');
        closeModalJadwal();
        await loadAllJadwal();
    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

function hapusJadwal(id) {
    showModalConfirm('Hapus Jadwal', 'Apakah Anda yakin menghapus jadwal ini?', async () => {
        try {
            const sb = getSupabase();
            await sb.from('jadwal_pelajaran').delete().eq('id', id);
            showToast('Jadwal dihapus', 'success');
            await loadAllJadwal();
        } catch (e) {
            showToast('Gagal: ' + e.message, 'error');
        }
    });
}

// ============================================================
// QR GENERATOR & AKUN SISWA
// ============================================================

let allQRData = [];
let qrPage = 1;
const qrPerPage = 10;

async function loadQRGenerator() {
    const contentArea = document.getElementById('content-area');
    
    // Pastikan nama sekolah terbaru dimuat
    await loadNamaSekolah();
    
    let siswaData = [];
    let countBelum = 0, countAktif = 0;
    
    try {
        const sb = getSupabase();
        const { data } = await sb.from('siswa').select('*').order('nama_lengkap');
        siswaData = data || [];
        allQRData = siswaData; // Simpan ke variabel global untuk pagination
        countBelum = siswaData.filter(s => s.status_akun !== 'Aktif').length;
        countAktif = siswaData.filter(s => s.status_akun === 'Aktif').length;
    } catch(e) {}
    
    const totalSiswa = siswaData.length;
    const persentase = totalSiswa > 0 ? Math.round((countAktif / totalSiswa) * 100) : 0;
    
    contentArea.innerHTML = `
        <div>
            <header class="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 class="font-headline-lg text-headline-lg text-on-surface mb-2">Generator Akun & Kartu QR</h1>
                    <p class="font-body-lg text-body-lg text-on-surface-variant">Buat kredensial siswa dan desain kartu ID terintegrasi QR code.</p>
                </div>
            </header>
            
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                <section class="lg:col-span-4 flex flex-col gap-gutter">
                    <div class="bg-surface-container-lowest rounded-xl p-container-padding shadow-sm border border-outline-variant/30 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform duration-300 group-hover:scale-110"></div>
                        <div class="flex items-center justify-center gap-2 mb-stack-md relative z-10">
                            <span class="material-symbols-outlined text-red-500 text-[28px]">vpn_key</span>
                            <h2 class="font-headline-sm text-headline-sm text-red-500">Status Kredensial</h2>
                        </div>
                        <div class="flex items-end justify-center gap-3 mb-stack-md relative z-10">
                            <span class="text-4xl font-bold text-on-surface tracking-tighter">${countBelum}</span>
                            <span class="font-body-md text-body-md text-on-surface-variant pb-1">Siswa belum memiliki akun aktif</span>
                        </div>
                        <div class="w-full bg-surface-variant h-2 rounded-full mb-stack-lg overflow-hidden relative z-10">
                            <div class="bg-red-500 h-full rounded-full transition-all duration-500" style="width: ${persentase}%"></div>
                        </div>
                        <div class="flex flex-col gap-3 relative z-10">
                            <button onclick="generateAkunMasal()" class="w-full py-3 px-4 bg-primary text-on-primary rounded-lg flex items-center justify-center gap-2 hover:opacity-90 shadow-sm">
                                <span class="material-symbols-outlined text-[18px]">magic_button</span>Generate Akun Massal
                            </button>
                        </div>
                    </div>
                    <div class="bg-surface-container-lowest rounded-xl p-container-padding shadow-sm border border-outline-variant/30 relative overflow-hidden group flex-1 flex flex-col justify-center transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        <div class="flex items-center justify-center gap-2 mb-stack-md relative z-10">
                            <span class="material-symbols-outlined text-green-600 text-[28px]">check_circle</span>
                            <h2 class="font-headline-sm text-headline-sm text-green-600">Status Validasi</h2>
                        </div>
                        <div class="flex items-end justify-center gap-3 mb-stack-md relative z-10">
                            <span class="text-4xl font-bold text-on-surface tracking-tighter">${countAktif}</span>
                            <span class="font-body-md text-body-md text-on-surface-variant pb-1">Siswa sudah memiliki akun aktif</span>
                        </div>
                        <div class="w-full bg-surface-variant h-2 rounded-full overflow-hidden relative z-10">
                            <div class="bg-green-500 h-full rounded-full transition-all duration-500" style="width: ${persentase}%"></div>
                        </div>
                    </div>
                </section>
                
                <section class="lg:col-span-8">
                    <div class="bg-surface-container-lowest rounded-xl p-container-padding shadow-sm border border-outline-variant/30 h-full">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
                            <div>
                                <div class="flex items-center justify-center gap-2 mb-4">
                                    <span class="material-symbols-outlined text-primary">badge</span>
                                    <h2 class="font-headline-sm text-headline-sm text-on-surface">Studio Kartu Pelajar</h2>
                                </div>
                                <div class="space-y-4">
                                    <!-- UPLOAD BACKGROUND KARTU -->
                                    <div>
                                        <label class="font-label-md text-label-md text-on-surface block mb-2">Background Template Kartu (Opsional)</label>
                                        <div id="bgKartuUploadArea" class="border-2 border-dashed border-outline-variant rounded-xl p-stack-md flex flex-col items-center justify-center text-center hover:bg-surface-container-low transition-colors cursor-pointer group bg-surface-bright h-40" onclick="document.getElementById('bgKartuInput').click()">
                                            <div id="bgKartuPlaceholder" class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <span class="material-symbols-outlined text-primary">upload_file</span>
                                            </div>
                                            <img id="bgKartuPreview" class="w-full h-full object-cover rounded-lg hidden absolute inset-0" alt="Background Kartu">
                                            <p class="font-label-md text-label-md text-primary mb-1">Klik untuk upload atau drag & drop</p>
                                            <p class="text-xs text-on-surface-variant">SVG, PNG, JPG (Rasio Portrait 54x86mm)</p>
                                        </div>
                                        <input type="file" id="bgKartuInput" accept="image/jpeg,image/png,image/svg+xml" class="hidden" onchange="handleBgKartuUpload(event)">
                                    </div>
                                    
                                    <div>
                                        <label class="font-label-md text-label-md text-on-surface block mb-2">Posisi QR Code</label>
                                        <select id="qrPosition" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2">
                                            <option>Bawah Tengah</option>
                                            <option>Pojok Kanan Bawah</option>
                                            <option>Pojok Kiri Bawah</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div class="flex items-center justify-center gap-2 mb-4">
                                    <span class="material-symbols-outlined text-primary">visibility</span>
                                    <h2 class="font-headline-sm text-headline-sm text-on-surface">Pratinjau</h2>
                                </div>
                                <div class="flex items-center justify-center">
                                    <div id="idCardPreview" class="w-[215px] h-[342px] bg-white rounded-[10px] shadow-lg relative overflow-hidden border border-gray-200 flex flex-col items-center pt-6 pb-4">
                                        <!-- Background Image (jika diupload) -->
                                        <div id="idCardBgImage" class="absolute inset-0 bg-cover bg-center hidden z-0"></div>
                                        <div class="absolute top-0 left-0 w-full h-20 bg-primary"></div>
                                        <div class="absolute top-16 left-0 w-full h-4 bg-secondary-fixed"></div>
                                        <div class="relative z-10 flex flex-col items-center w-full px-4">
                                            <h3 class="text-white font-bold text-xs mb-3 tracking-wide text-center">KARTU ABSENSI DIGITAL<br><span class="text-[9px] font-normal">${namaSekolah.toUpperCase()}</span></h3>
                                            <div class="w-20 h-24 bg-gray-200 border-2 border-white shadow-sm mb-3 flex items-center justify-center">
                                                <span class="material-symbols-outlined text-gray-400 text-4xl">person</span>
                                            </div>
                                            <p class="font-bold text-gray-800 text-sm leading-tight text-center mb-1">Nama Siswa</p>
                                            <p class="text-gray-500 text-[10px] mb-3">NISN: -</p>
                                            <div class="mt-auto p-1 bg-white border border-gray-200 rounded" id="previewQR">
                                                <div class="w-16 h-16 bg-gray-100 flex items-center justify-center">
                                                    <span class="material-symbols-outlined text-gray-400">qr_code_2</span>
                                                </div>
                                            </div>
                                            <p class="text-[8px] text-gray-400 mt-1">Scan untuk Presensi</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                <section class="lg:col-span-12 mt-4">
                    <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-highest mb-stack-md flex flex-col md:flex-row gap-4 items-center">
                        <div class="relative w-full md:w-64">
                            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                            <input type="text" id="searchSiswaQR" placeholder="Cari nama atau NISN..." oninput="filterSiswaQR()"
                                class="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-primary">
                        </div>
                        <select id="filterQRKelas" onchange="filterSiswaQR()" class="w-full md:w-40 px-4 py-2 bg-surface border border-outline-variant rounded-lg">
                            <option value="">Semua Kelas</option>
                            <option value="X">Kelas X</option>
                            <option value="XI">Kelas XI</option>
                            <option value="XII">Kelas XII</option>
                        </select>
                        <select id="filterQRJurusan" onchange="filterSiswaQR()" class="w-full md:w-40 px-4 py-2 bg-surface border border-outline-variant rounded-lg">
                            <option value="">Semua Jurusan</option>
                            <option value="TKJ 1">TKJ 1</option>
                            <option value="TKJ 2">TKJ 2</option>
                            <option value="RPL 1">RPL 1</option>
                            <option value="RPL 2">RPL 2</option>
                            <option value="MM 1">MM 1</option>
                        </select>
                        <div class="flex gap-2 w-full md:w-auto">
                            <button onclick="generateTerpilih()" class="flex-1 sm:flex-none py-2 px-4 bg-primary text-on-primary rounded-lg flex items-center justify-center gap-2 hover:opacity-90 shadow-sm whitespace-nowrap">
                                <span class="material-symbols-outlined text-[18px]">print</span>Generate Terpilih
                            </button>
                        </div>
                    </div>
                    
                    <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="text-label-md uppercase tracking-wider border-b" style="background: linear-gradient(to bottom right, #004349, #0d5c63); color: white; whitespace-nowrap">
                                        <th class="p-3 w-12 text-center">
                                            <input type="checkbox" id="checkAll" onchange="toggleCheckAll()" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer">
                                        </th>
                                        <th class="p-3">Nama Siswa</th>
                                        <th class="p-3">NISN</th>
                                        <th class="p-3">Kelas</th>
                                        <th class="p-3">Status Akun</th>
                                        <th class="p-3 w-24 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody id="tableSiswaQR" class="text-body-md text-on-surface">
                                    <tr><td colspan="6" class="p-8 text-center text-on-surface-variant">Memuat data...</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <!-- PAGINATION -->
                        <div class="px-4 py-3 border-t border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between">
                            <span class="text-sm text-on-surface-variant" id="paginationInfoQR">Menampilkan 0 data</span>
                            <div class="flex gap-1" id="paginationButtonsQR"></div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const qrContainer = document.getElementById('previewQR');
        if (qrContainer && typeof QRCode !== 'undefined') {
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, { text: '0051234567', width: 64, height: 64 });
        }
        // Render tabel dengan pagination
        renderQRTable(allQRData);
        // Load background kartu jika sudah diupload
        loadBgKartu();
    }, 100);
}

// ============================================================
// FUNGSI: Handle Upload Background Kartu
// ============================================================
function handleBgKartuUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validasi ukuran file (maks 5MB untuk background)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran file maksimal 5MB!', 'error');
        return;
    }
    
    // Validasi tipe file
    if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
        showToast('Format file harus JPG, PNG, atau SVG!', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const bgData = e.target.result;
        
        // Terapkan pada preview kartu
        const bgElement = document.getElementById('idCardBgImage');
        const placeholder = document.getElementById('bgKartuPlaceholder');
        const preview = document.getElementById('bgKartuPreview');
        
        if (bgElement) {
            bgElement.style.backgroundImage = `url(${bgData})`;
            bgElement.classList.remove('hidden');
        }
        if (placeholder) placeholder.classList.add('hidden');
        if (preview) {
            preview.src = bgData;
            preview.classList.remove('hidden');
        }
        
        // Simpan ke localStorage
        try {
            localStorage.setItem('presensiQR_bgKartu', bgData);
            showToast('Background kartu berhasil diunggah!', 'success');
        } catch(e) {
            showToast('Gagal menyimpan background!', 'error');
        }
    };
    reader.readAsDataURL(file);
}

// ============================================================
// FUNGSI: Load Background Kartu saat halaman dimuat
// ============================================================
function loadBgKartu() {
    try {
        const bgData = localStorage.getItem('presensiQR_bgKartu');
        if (bgData) {
            setTimeout(() => {
                const bgElement = document.getElementById('idCardBgImage');
                const placeholder = document.getElementById('bgKartuPlaceholder');
                const preview = document.getElementById('bgKartuPreview');
                
                if (bgElement) {
                    bgElement.style.backgroundImage = `url(${bgData})`;
                    bgElement.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
                if (preview) {
                    preview.src = bgData;
                    preview.classList.remove('hidden');
                }
            }, 100);
        }
    } catch(e) {}
}

// ============================================================
// FUNGSI RENDER QR TABLE DENGAN PAGINATION
// ============================================================
function renderQRTable(data) {
    const tbody = document.getElementById('tableSiswaQR');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-on-surface-variant">Tidak ada data</td></tr>';
        document.getElementById('paginationInfoQR').textContent = 'Menampilkan 0 data';
        document.getElementById('paginationButtonsQR').innerHTML = '';
        return;
    }
    
    const start = (qrPage - 1) * qrPerPage;
    const pageData = data.slice(start, start + qrPerPage);
    
    tbody.innerHTML = pageData.map(s => {
        const statusWarna = s.status_akun === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
        return `
        <tr class="border-b border-surface-container-highest table-row-hover">
            <td class="p-3 text-center">
                <input type="checkbox" class="siswa-checkbox w-4 h-4 rounded border-outline-variant text-primary cursor-pointer" value="${s.id}" data-nama="${s.nama_lengkap}" data-nisn="${s.nisn}" data-kelas="${s.kelas}" data-jurusan="${s.jurusan}">
            </td>
            <td class="p-3 font-semibold">${s.nama_lengkap}</td>
            <td class="p-3 font-mono">${s.nisn}</td>
            <td class="p-3">${s.kelas} ${s.jurusan}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusWarna}">${s.status_akun}</span></td>
            <td class="p-3 text-center">
                <button onclick="editStatusAkunSiswa(${s.id}, '${s.status_akun}')" class="p-1.5 text-primary hover:bg-primary/10 rounded" title="Edit Status Akun">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onclick="generateKartuIndividu('${s.nisn}')" class="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Download Kartu">
                    <span class="material-symbols-outlined text-[18px]">download</span>
                </button>
            </td>
        </tr>`;
    }).join('');
    
    // Update info pagination
    document.getElementById('paginationInfoQR').textContent = `Menampilkan ${start + 1}-${Math.min(start + qrPerPage, data.length)} dari ${data.length} data`;
    
    // Generate tombol halaman
    const totalPages = Math.ceil(data.length / qrPerPage);
    const buttonsHtml = renderPaginationHTML(qrPage, totalPages, 'qrPage', 'renderQRTable(window.currentQRFiltered || allQRData)');
    document.getElementById('paginationButtonsQR').innerHTML = buttonsHtml;
}

function toggleCheckAll() {
    const checkAll = document.getElementById('checkAll');
    document.querySelectorAll('.siswa-checkbox').forEach(cb => cb.checked = checkAll.checked);
}

function filterSiswaQR() {
    const search = document.getElementById('searchSiswaQR')?.value.toLowerCase() || '';
    const filterKelas = document.getElementById('filterQRKelas')?.value || '';
    const filterJurusan = document.getElementById('filterQRJurusan')?.value || '';
    qrPage = 1; // Reset ke halaman 1 saat filter berubah
    
    if (!search && !filterKelas && !filterJurusan) {
        window.currentQRFiltered = null;
        renderQRTable(allQRData);
        return;
    }
    
    window.currentQRFiltered = allQRData.filter(s => {
        const matchSearch = !search || 
            s.nama_lengkap?.toLowerCase().includes(search) || 
            s.nisn?.toLowerCase().includes(search);
        const matchKelas = !filterKelas || s.kelas === filterKelas;
        const matchJurusan = !filterJurusan || s.jurusan === filterJurusan;
        return matchSearch && matchKelas && matchJurusan;
    });
    
    renderQRTable(window.currentQRFiltered);
}

// ============================================================
// FUNGSI: Edit Status Akun Siswa (Popup Modal)
// ============================================================
function editStatusAkunSiswa(id, statusAkun) {
    // Cari nama dari data yang sudah ada di memori (100% aman dari karakter spesial)
    const siswa = allQRData.find(s => s.id === id);
    const namaDecode = siswa ? siswa.nama_lengkap : 'Siswa';
    // Buat modal secara dinamis
    const modalHtml = `
        <div id="modalEditStatus" class="fixed inset-0 z-[9998] flex items-center justify-center">
            <div class="modal-overlay absolute inset-0 bg-black/50" onclick="closeModalEditStatus()"></div>
            <div class="relative bg-surface-container-lowest rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
                <div class="p-6 border-b flex items-center justify-between" style="background: linear-gradient(to bottom right, #004349, #0d5c63);">
                    <h3 class="font-headline-sm text-white">Edit Status Akun</h3>
                    <button onclick="closeModalEditStatus()" class="p-2 rounded-lg hover:bg-white/10">
                        <span class="material-symbols-outlined text-white">close</span>
                    </button>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="block mb-2 font-label-md text-on-surface-variant">Nama Siswa</label>
                        <input type="text" value="${namaDecode}" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface font-semibold" readonly>
                    </div>
                    <div>
                        <label class="block mb-2 font-label-md text-on-surface-variant">Status Akun</label>
                        <select id="editStatusAkun" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none">
                            <option value="Belum Generate" ${statusAkun === 'Belum Generate' ? 'selected' : ''}>Belum Generate</option>
                            <option value="Aktif" ${statusAkun === 'Aktif' ? 'selected' : ''}>Aktif</option>
                        </select>
                    </div>
                    <p class="text-xs text-on-surface-variant bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <span class="material-symbols-outlined text-amber-600 text-sm align-middle">warning</span>
                        Mengubah menjadi "Aktif" akan otomatis membuat akun user dengan username = NISN dan password = tanggal lahir.
                    </p>
                </div>
                <div class="p-6 border-t flex justify-end gap-3 bg-surface-container-low">
                    <button onclick="closeModalEditStatus()" class="px-5 py-2 rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container-highest">Batal</button>
                    <button onclick="simpanStatusAkun(${id})" class="px-5 py-2 rounded-lg font-label-md bg-primary text-on-primary hover:opacity-90 shadow-sm">Simpan</button>
                </div>
            </div>
        </div>
    `;
    
    // Hapus modal lama jika ada
    const oldModal = document.getElementById('modalEditStatus');
    if (oldModal) oldModal.remove();
    
    // Tambahkan modal ke body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeModalEditStatus() {
    const modal = document.getElementById('modalEditStatus');
    if (modal) modal.remove();
}

async function simpanStatusAkun(siswaId) {
    const statusBaru = document.getElementById('editStatusAkun').value;
    const siswa = allQRData.find(s => s.id === siswaId);
    if (!siswa) return;
    
    showLoading('Menyimpan...');
    
    try {
        const sb = getSupabase();
        
        if (statusBaru === 'Aktif' && siswa.status_akun !== 'Aktif') {
            // Buat akun user baru
            let password = '123456';
            if (siswa.tanggal_lahir) {
                const tgl = new Date(siswa.tanggal_lahir);
                password = String(tgl.getDate()).padStart(2, '0') + 
                           String(tgl.getMonth() + 1).padStart(2, '0') + 
                           String(tgl.getFullYear()).slice(-2);
            }
            
            // Cek apakah user sudah ada
            const { data: existingUser } = await sb.from('users').select('*').eq('username', siswa.nisn).maybeSingle();
            
            if (!existingUser) {
                await sb.from('users').insert({
                    username: siswa.nisn,
                    password: password,
                    level: 'siswa',
                    status: 'Aktif',
                    siswa_id: siswaId
                });
            } else {
                // Update status user yang sudah ada
                await sb.from('users').update({ status: 'Aktif' }).eq('id', existingUser.id);
            }
            
            // Update status siswa
            await sb.from('siswa').update({ status_akun: 'Aktif' }).eq('id', siswaId);
            
        } else if (statusBaru === 'Belum Generate' && siswa.status_akun === 'Aktif') {
            // Nonaktifkan akun user
            await sb.from('users').update({ status: 'Tidak Aktif' }).eq('siswa_id', siswaId);
            
            // Update status siswa
            await sb.from('siswa').update({ status_akun: 'Belum Generate' }).eq('id', siswaId);
        }
        
        hideLoading();
        closeModalEditStatus();
        showToast('Status akun berhasil diperbarui!', 'success');
        
        // Refresh data
        const { data: refreshedData } = await sb.from('siswa').select('*').order('nama_lengkap');
        allQRData = refreshedData || [];
        renderQRTable(window.currentQRFiltered || allQRData);
        
        // Update card status
        loadQRGenerator();
        
    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

function previewKartuSiswa(nama, nisn, kelas) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(nisn)}`;
    const w = window.open('', '_blank', 'width=450,height=700');
    w.document.write(`
        <html><head><title>Kartu - ${nama}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
        <style>
            body{margin:0;padding:20px;font-family:Arial;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;gap:16px}
            .download-btn{padding:10px 24px;background:#004349;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15)}
            .download-btn:hover{background:#0d5c63}
            .download-btn:disabled{opacity:0.6;cursor:not-allowed}
            .card{width:300px;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);overflow:hidden}
            .card-header{background:#004349;color:white;padding:16px;text-align:center}
            .card-header h2{margin:0;font-size:14px}
            .card-body{padding:20px;text-align:center}
            .card-body img{width:200px;height:200px;border:4px solid #f0f0f0;border-radius:8px}
            .card-body h3{margin:12px 0 4px;font-size:16px;color:#191c1d}
            .card-body p{margin:2px 0;font-size:12px;color:#666}
            .card-footer{background:#f8fafa;padding:12px;text-align:center;font-size:10px;color:#999}
        </style></head><body>
            <div class="card" id="kartuAbsen">
                <div class="card-header"><h2>KARTU ABSENSI DIGITAL</h2><p style="margin:4px 0 0;font-size:10px;opacity:0.8">${namaSekolah.toUpperCase()}</p></div>
                <div class="card-body">
                    <img src="${qrUrl}" alt="QR" crossorigin="anonymous">
                    <h3>${nama}</h3><p>NISN: ${nisn}</p><p>${kelas}</p>
                </div>
                <div class="card-footer">PresensiQR © 2026</div>
            </div>
            <button class="download-btn" id="downloadBtn" onclick="downloadKartu()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Gambar
            </button>
            <script>
                async function downloadKartu() {
                    const btn = document.getElementById('downloadBtn');
                    btn.disabled = true;
                    btn.innerHTML = 'Memproses...';
                    try {
                        const kartu = document.getElementById('kartuAbsen');
                        const canvas = await html2canvas(kartu, {
                            scale: 2,
                            useCORS: true,
                            allowTaint: true,
                            backgroundColor: '#ffffff'
                        });
                        const link = document.createElement('a');
                        link.download = 'Kartu_Absen_${nama.replace(/\\s+/g, '_')}.png';
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                    } catch (e) {
                        alert('Gagal mendownload: ' + e.message);
                    }
                    btn.disabled = false;
                    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Gambar';
                }
            <\/script>
        </body></html>
    `);
    w.document.close();
}

function generateKartuIndividu(nisn) {
    // Cari data lengkap dari memori berdasarkan NISN (100% aman dari karakter spesial)
    const siswa = allQRData.find(s => s.nisn === nisn);
    if (!siswa) {
        showToast('Data siswa tidak ditemukan', 'error');
        return;
    }
    previewKartuSiswa(siswa.nama_lengkap, siswa.nisn, siswa.kelas + ' ' + siswa.jurusan);
}

// ============================================================
// FUNGSI HELPER: Progress Modal untuk Generate Akun
// ============================================================
function showProgressModal(judul, totalSiswa) {
    // Hapus modal lama jika ada
    const oldModal = document.getElementById('progressGenerateModal');
    if (oldModal) oldModal.remove();
    
    const modalHtml = `
        <div id="progressGenerateModal" class="fixed inset-0 z-[9999] flex items-center justify-center">
            <div class="modal-overlay absolute inset-0 bg-black/50"></div>
            <div class="relative bg-surface-container-lowest rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
                <div class="p-6 border-b flex items-center justify-between" style="background: linear-gradient(to bottom right, #004349, #0d5c63);">
                    <h3 class="font-headline-sm text-white">${judul}</h3>
                    <span id="progressCount" class="text-white/80 text-sm font-medium">0 / ${totalSiswa}</span>
                </div>
                <div class="p-6">
                    <!-- Progress Bar -->
                    <div class="w-full bg-surface-variant h-3 rounded-full overflow-hidden mb-4">
                        <div id="progressBar" class="bg-primary h-full rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                    
                    <!-- Status Container -->
                    <div id="progressStatusList" class="space-y-2 max-h-64 overflow-y-auto mb-4 text-sm">
                        <!-- Item status akan ditambahkan di sini -->
                    </div>
                    
                    <!-- Summary -->
                    <div class="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                        <div class="flex items-center gap-4">
                            <span class="flex items-center gap-1 text-green-600">
                                <span class="material-symbols-outlined text-[18px]">check_circle</span>
                                <span id="progressBerhasil">0</span>
                            </span>
                            <span class="flex items-center gap-1 text-red-500">
                                <span class="material-symbols-outlined text-[18px]">cancel</span>
                                <span id="progressGagal">0</span>
                            </span>
                        </div>
                        <button id="progressCloseBtn" onclick="closeProgressModal()" class="hidden px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function updateProgressModal(index, total, namaSiswa, status) {
    const countEl = document.getElementById('progressCount');
    const barEl = document.getElementById('progressBar');
    const listEl = document.getElementById('progressStatusList');
    const berhasilEl = document.getElementById('progressBerhasil');
    const gagalEl = document.getElementById('progressGagal');
    
    if (!countEl) return;
    
    const progress = Math.round(((index + 1) / total) * 100);
    countEl.textContent = `${index + 1} / ${total}`;
    barEl.style.width = `${progress}%`;
    
    // Tambahkan item status
    const icon = status === 'berhasil' || status === 'sudah_ada' ? 'check_circle' : 'cancel';
    const color = status === 'berhasil' || status === 'sudah_ada' ? 'text-green-600' : 'text-red-500';
    const label = status === 'berhasil' ? 'Berhasil' : status === 'sudah_ada' ? 'Sudah ada' : 'Gagal';
    
    const itemHtml = `
        <div class="flex items-center gap-2 py-1 animate-fadeIn">
            <span class="material-symbols-outlined text-[18px] ${color}">${icon}</span>
            <span class="text-on-surface truncate flex-1">${namaSiswa}</span>
            <span class="text-xs ${color} font-medium">${label}</span>
        </div>
    `;
    listEl.insertAdjacentHTML('beforeend', itemHtml);
    listEl.scrollTop = listEl.scrollHeight;
    
    // Update counter
    if (status === 'berhasil' || status === 'sudah_ada') {
        berhasilEl.textContent = parseInt(berhasilEl.textContent) + 1;
    } else {
        gagalEl.textContent = parseInt(gagalEl.textContent) + 1;
    }
}

function finishProgressModal() {
    const closeBtn = document.getElementById('progressCloseBtn');
    if (closeBtn) closeBtn.classList.remove('hidden');
}

function closeProgressModal() {
    const modal = document.getElementById('progressGenerateModal');
    if (modal) modal.remove();
}

async function generateAkunMasal() {
    showModalConfirm('Generate Akun Massal', 
        'Ini akan membuat akun untuk semua siswa yang belum aktif. Password default adalah tanggal lahir (DDMMYY). Lanjutkan?', 
        async () => {
            try {
                const sb = getSupabase();
                const { data: siswaList } = await sb.from('siswa')
                    .select('*')
                    .neq('status_akun', 'Aktif');
                
                if (!siswaList || siswaList.length === 0) {
                    showToast('Semua siswa sudah memiliki akun aktif', 'info');
                    return;
                }
                
                // Tampilkan progress modal
                showProgressModal('Generate Akun Massal', siswaList.length);
                
                // Ambil semua username yang sudah ada di users
                const { data: existingUsers } = await sb.from('users').select('username');
                const existingUsernames = new Set((existingUsers || []).map(u => u.username));
                
                let berhasil = 0;
                let gagal = 0;
                
                for (let i = 0; i < siswaList.length; i++) {
                    const s = siswaList[i];
                    let status = 'gagal';
                    
                    try {
                        // Cek apakah NISN sudah ada di tabel users
                        if (existingUsernames.has(s.nisn)) {
                            const { data: existingUser } = await sb.from('users')
                                .select('*').eq('username', s.nisn).maybeSingle();
                            
                            if (existingUser) {
                                await sb.from('users').update({ status: 'Aktif' }).eq('id', existingUser.id);
                                await sb.from('siswa').update({
                                    status_akun: 'Aktif',
                                    user_id: existingUser.id
                                }).eq('id', s.id);
                                status = 'sudah_ada';
                                berhasil++;
                            }
                        } else {
                            let password = '123456';
                            if (s.tanggal_lahir) {
                                const tgl = new Date(s.tanggal_lahir);
                                password = String(tgl.getDate()).padStart(2, '0') + 
                                           String(tgl.getMonth() + 1).padStart(2, '0') + 
                                           String(tgl.getFullYear()).slice(-2);
                            }
                            
                            const { data: userData } = await sb.from('users').insert({
                                username: s.nisn,
                                password: password,
                                level: 'siswa',
                                id_referensi: s.id,
                                status: 'Aktif'
                            }).select();
                            
                            if (userData && userData.length > 0) {
                                await sb.from('siswa').update({
                                    status_akun: 'Aktif',
                                    user_id: userData[0].id
                                }).eq('id', s.id);
                                status = 'berhasil';
                                berhasil++;
                                existingUsernames.add(s.nisn);
                            }
                        }
                    } catch (e) {
                        gagal++;
                        console.warn(`Gagal buat akun ${s.nama_lengkap}:`, e.message);
                    }
                    
                    // Update progress modal
                    updateProgressModal(i, siswaList.length, s.nama_lengkap, status);
                    
                    // Delay kecil agar animasi terlihat
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                // Selesai
                finishProgressModal();
                showToast(`Berhasil: ${berhasil}, Gagal: ${gagal}`, berhasil > 0 ? 'success' : 'error');
                catatLog(currentUser.username, 'Generate Akun Massal', `${berhasil} akun dibuat/diaktifkan`);
                loadQRGenerator();
                
            } catch (e) {
                closeProgressModal();
                showToast('Gagal: ' + e.message, 'error');
            }
        });
}

async function generateTerpilih() {
    const checked = document.querySelectorAll('.siswa-checkbox:checked');
    if (checked.length === 0) {
        showToast('Pilih minimal 1 siswa', 'warning');
        return;
    }
    
    const selectedIds = Array.from(checked).map(cb => parseInt(cb.value));
    const selectedSiswa = allQRData.filter(s => selectedIds.includes(s.id) && s.status_akun !== 'Aktif');
    
    if (selectedSiswa.length === 0) {
        showToast('Semua siswa yang dipilih sudah memiliki akun aktif', 'info');
        return;
    }
    
    showModalConfirm('Generate Akun Terpilih', 
        `Ini akan membuat akun untuk ${selectedSiswa.length} siswa yang dipilih. Password default adalah tanggal lahir (DDMMYY). Lanjutkan?`, 
        async () => {
            try {
                const sb = getSupabase();
                
                // Tampilkan progress modal
                showProgressModal('Generate Akun Terpilih', selectedSiswa.length);
                
                // Ambil semua username yang sudah ada di users
                const { data: existingUsers } = await sb.from('users').select('username');
                const existingUsernames = new Set((existingUsers || []).map(u => u.username));
                
                let berhasil = 0;
                let gagal = 0;
                
                for (let i = 0; i < selectedSiswa.length; i++) {
                    const s = selectedSiswa[i];
                    let status = 'gagal';
                    
                    try {
                        // Cek apakah NISN sudah ada di tabel users
                        if (existingUsernames.has(s.nisn)) {
                            const { data: existingUser } = await sb.from('users')
                                .select('*').eq('username', s.nisn).maybeSingle();
                            
                            if (existingUser) {
                                await sb.from('users').update({ status: 'Aktif' }).eq('id', existingUser.id);
                                await sb.from('siswa').update({
                                    status_akun: 'Aktif',
                                    user_id: existingUser.id
                                }).eq('id', s.id);
                                status = 'sudah_ada';
                                berhasil++;
                                existingUsernames.add(s.nisn);
                            }
                        } else {
                            let password = '123456';
                            if (s.tanggal_lahir) {
                                const tgl = new Date(s.tanggal_lahir);
                                password = String(tgl.getDate()).padStart(2, '0') + 
                                           String(tgl.getMonth() + 1).padStart(2, '0') + 
                                           String(tgl.getFullYear()).slice(-2);
                            }
                            
                            const { data: userData } = await sb.from('users').insert({
                                username: s.nisn,
                                password: password,
                                level: 'siswa',
                                id_referensi: s.id,
                                status: 'Aktif'
                            }).select();
                            
                            if (userData && userData.length > 0) {
                                await sb.from('siswa').update({
                                    status_akun: 'Aktif',
                                    user_id: userData[0].id
                                }).eq('id', s.id);
                                status = 'berhasil';
                                berhasil++;
                                existingUsernames.add(s.nisn);
                            }
                        }
                    } catch(e) {
                        gagal++;
                        console.warn(`Gagal buat akun ${s.nama_lengkap}:`, e.message);
                    }
                    
                    // Update progress modal
                    updateProgressModal(i, selectedSiswa.length, s.nama_lengkap, status);
                    
                    // Delay kecil agar animasi terlihat
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                // Selesai
                finishProgressModal();
                showToast(`Berhasil: ${berhasil}, Gagal: ${gagal}`, berhasil > 0 ? 'success' : 'error');
                
                // Refresh data
                const { data: refreshedData } = await sb.from('siswa').select('*').order('nama_lengkap');
                allQRData = refreshedData || [];
                renderQRTable(window.currentQRFiltered || allQRData);
                
                // Update card status
                loadQRGenerator();
                
            } catch (e) {
                hideLoading();
                showToast('Gagal: ' + e.message, 'error');
            }
        });
}

function downloadZipKartu() {
    showToast('Gunakan Generate Terpilih untuk mendownload kartu per siswa.', 'info');
}

async function downloadKredensial() {
    try {
        const sb = getSupabase();
        const { data: users } = await sb.from('users').select('*, siswa:siswa(nama_lengkap, kelas, jurusan)').eq('level', 'siswa');
        
        if (!users || users.length === 0) {
            showToast('Tidak ada akun siswa', 'error');
            return;
        }
        
        let csv = 'Nama,NISN (Username),Password,Kelas,Jurusan,Status\n';
        users.forEach(u => {
            csv += `"${u.siswa?.nama_lengkap || '-'}","${u.username}","${u.password}","${u.siswa?.kelas || '-'}","${u.siswa?.jurusan || '-'}","${u.status}"\n`;
        });
        
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Kredensial_Siswa_${formatTanggal(new Date())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Kredensial didownload!', 'success');
    } catch (e) {
        showToast('Gagal: ' + e.message, 'error');
    }
}

// ============================================================
// QR SCANNER PAGE
// ============================================================

function loadQRScanner() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div>
            <header class="mb-stack-lg">
                <h1 class="font-headline-lg text-headline-lg text-on-surface mb-2">Scanner QR Code</h1>
                <p class="font-body-lg text-on-surface-variant">Arahkan kamera ke kartu QR siswa untuk mencatat absensi otomatis.</p>
            </header>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
                <div class="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                    <div class="px-4 py-3 flex items-center justify-between" 
                         style="background: linear-gradient(to bottom right, #004349, #0d5c63); height: 52px; min-height: 52px;">
                        <h2 class="font-headline-sm text-headline-sm flex items-center gap-2" style="color: white;">
                            <span class="material-symbols-outlined" style="color: white;">videocam</span>Kamera Scanner
                        </h2>
                        <div class="flex gap-2">
                            <button onclick="initScanner()" id="btnMulaiScanner" class="px-3 py-1.5 bg-white text-primary rounded-lg text-sm hover:bg-surface-container-low transition-colors flex items-center gap-1 font-semibold">
                                <span class="material-symbols-outlined text-[16px]">play_arrow</span>Mulai
                            </button>
                            <button onclick="berhentiScanner()" id="btnBerhentiScanner" class="px-3 py-1.5 bg-white text-error rounded-lg text-sm hover:bg-surface-container-low transition-colors flex items-center gap-1 font-semibold hidden">
                                <span class="material-symbols-outlined text-[16px]">stop</span>Berhenti
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div id="qr-reader" class="w-full max-w-md mx-auto rounded-xl overflow-hidden border-2 border-dashed border-outline-variant bg-surface-container-low"></div>
                        <div class="mt-4 text-center">
                            <p id="scannerStatus" class="font-semibold text-on-surface">⏸️ Scanner Belum Aktif</p>
                            <p id="scannerMessage" class="text-sm text-on-surface-variant mt-1">Klik "Mulai" untuk mengaktifkan kamera</p>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
                        <div class="px-4 py-3 flex items-center justify-between" 
                             style="background: linear-gradient(to bottom right, #004349, #0d5c63); height: 52px; min-height: 52px;">
                            <h2 class="font-headline-sm text-headline-sm flex items-center gap-2" style="color: white;">
                                <span class="material-symbols-outlined" style="color: white;">info</span>Info Jam Pelajaran
                            </h2>
                            <div class="w-[88px]"></div>
                        </div>
                        <div class="p-5">
                            <div id="infoJadwalSekarang" class="text-sm">
                                <p class="text-on-surface-variant">Memuat jadwal...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div id="manual-input-container" class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5 hidden">
                        <h3 class="font-headline-sm text-on-surface mb-4 flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary">edit_note</span>Input Manual NISN
                        </h3>
                        <div class="flex gap-2">
                            <input type="text" id="manualNisn" placeholder="Masukkan NISN..." 
                                class="flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg focus:border-primary"
                                onkeypress="if(event.key==='Enter')scanManualNISN()">
                            <button onclick="scanManualNISN()" class="px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90">
                                <span class="material-symbols-outlined">check</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    loadInfoJadwalSekarang();
}

async function loadInfoJadwalSekarang() {
    try {
        const sb = getSupabase();
        const sekarang = new Date();
        const hariIni = getNamaHari(sekarang);
        const jamSekarang = formatWaktu(sekarang);
        
        const { data: peng } = await sb
            .from('pengaturan_sistem').select('nilai')
            .eq('pengaturan', 'Hari_Kerja').single();
        
        const hariKerja = peng?.nilai?.split(',') || ['Senin','Selasa','Rabu','Kamis','Jumat'];
        const isHariKerja = hariKerja.includes(hariIni);
        
        let html = `<p class="mb-2"><strong>Hari:</strong> ${hariIni}</p>`;
        html += `<p class="mb-2"><strong>Jam:</strong> ${jamSekarang.slice(0, 5)}</p>`;
        
        if (!isHariKerja) {
            html += `<div class="mt-3 p-3 bg-purple-100 text-purple-700 rounded-lg text-sm">📅 Hari ini bukan hari sekolah</div>`;
        } else {
            const { data: jadwal } = await sb
                .from('jadwal_pelajaran')
                .select('*, mapel(*)')
                .eq('hari', hariIni)
                .order('jam_mulai');
            
            if (jadwal && jadwal.length > 0) {
                html += `<div class="mt-3 space-y-2">`;
                jadwal.forEach(j => {
                    const sedangAktif = jamSekarang >= j.jam_mulai && jamSekarang <= j.jam_selesai;
                    html += `
                        <div class="p-2 rounded-lg ${sedangAktif ? 'bg-green-100 border border-green-300' : 'bg-surface'} text-xs">
                            <div class="flex justify-between items-center">
                                <span class="font-semibold">${j.mapel.nama_mata_pelajaran}</span>
                                ${sedangAktif ? '<span class="text-green-600 font-bold">AKTIF</span>' : ''}
                            </div>
                            <div class="text-on-surface-variant">${j.kelas} • ${j.jam_mulai.slice(0, 5)} - ${j.jam_selesai.slice(0, 5)}</div>
                        </div>
                    `;
                });
                html += `</div>`;
            } else {
                html += `<p class="text-on-surface-variant mt-2">Tidak ada jadwal hari ini</p>`;
            }
        }
        
        document.getElementById('infoJadwalSekarang').innerHTML = html;
    } catch (e) {
        console.error(e);
    }
}

// ============================================================
// PROFIL PENGGUNA
// ============================================================
function loadProfilPengguna() {
    const contentArea = document.getElementById('content-area');
    
    // Ambil data user dari session
    const userData = currentUser || {};
    const namaUser = userData.nama_lengkap || userData.username || 'Admin Guru';
    const username = userData.username || 'admin';
    const level = userData.level || 'Administrator';
    const inisial = namaUser.charAt(0).toUpperCase();
    
    contentArea.innerHTML = `
        <div>
            <div class="mb-stack-lg">
                <h2 class="font-headline-lg text-headline-lg text-on-surface mb-2">Biodata Admin</h2>
                <p class="font-body-md text-body-md text-on-surface-variant">Kelola informasi profil dan kredensial akun administrator Anda.</p>
            </div>

            <!-- Grid Layout - Card kiri dibuat lebih lebar (5/12) -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-stack-md">

                <!-- Profile Picture Card (Left Col - Lebih lebar 5/12) -->
                <div class="md:col-span-5 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant flex flex-col text-center">
                    <div class="bg-primary-container rounded-t-xl p-6 flex flex-col items-center text-center">
                        <div class="relative mb-4 group">
                            <div class="w-32 h-32 rounded-full bg-primary flex items-center justify-center border-4 border-surface shadow-md">
                                <span class="text-on-primary font-bold text-headline-lg">${inisial}</span>
                            </div>
                            <button onclick="document.getElementById('fotoProfilInput').click()" class="absolute bottom-0 right-0 bg-surface-container-high text-primary w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-surface-container-highest transition-colors">
                                <span class="material-symbols-outlined text-sm">photo_camera</span>
                            </button>
                            <input type="file" id="fotoProfilInput" accept="image/*" class="hidden" onchange="handleFotoProfilUpload(event)">
                        </div>
                        <h3 class="font-headline-sm text-headline-sm text-on-primary mb-1">${namaUser}</h3>
                        <p class="font-label-md text-label-md text-on-primary-container bg-primary/20 px-3 py-1 rounded-full inline-block">${level === 'admin' ? 'Super Admin' : level}</p>
                    </div>
                    <div class="p-container-padding flex flex-col items-center">
                        <div class="w-full space-y-3 text-left mb-stack-md">
                            <div class="flex justify-between items-center">
                                <span class="text-on-surface-variant font-label-md">Username</span>
                                <span class="text-on-surface font-body-md font-bold">${username}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-on-surface-variant font-label-md">Level Akses</span>
                                <span class="text-on-surface font-body-md">Administrator</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-on-surface-variant font-label-md">Status</span>
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-green-400"></span>
                                    <span class="text-on-surface font-body-md">Aktif</span>
                                </div>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-on-surface-variant font-label-md">Instansi</span>
                                <span class="text-on-surface font-body-md">${namaSekolah}</span>
                            </div>
                        </div>
                        <div class="w-full border-t border-outline-variant pt-stack-md">
                            <button onclick="document.getElementById('fotoProfilInput').click()" class="w-full font-label-md py-2 px-4 rounded-lg transition-colors border border-primary flex items-center justify-center gap-2 text-primary hover:bg-primary/5">
                                <span class="material-symbols-outlined text-sm">upload</span>
                                Unggah Foto Baru
                            </button>
                            <button onclick="loadPage('pengaturan')" class="w-full mt-3 bg-surface-container-lowest hover:bg-surface-container text-primary font-label-md py-2 px-4 rounded-lg transition-colors border flex items-center justify-center gap-2 border-primary">
                                <span class="material-symbols-outlined text-sm">manage_accounts</span>
                                Kelola Akun Admin
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Form Card (Right Col - 7/12) -->
                <div class="md:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant">
                    <div class="flex items-center gap-2 mb-stack-md p-6 bg-primary-container rounded-t-xl text-on-primary">
                        <span class="material-symbols-outlined">person</span>
                        <h3 class="font-headline-sm text-headline-sm">Informasi Pribadi</h3>
                    </div>
                    <form class="space-y-stack-md px-container-padding pb-container-padding" onsubmit="event.preventDefault(); simpanProfilPengguna();">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                            <!-- Full Name -->
                            <div>
                                <label class="block font-label-md text-label-md text-on-surface-variant mb-1" for="fullName">Nama Lengkap</label>
                                <input class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2 text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" id="fullName" type="text" value="${namaUser}">
                            </div>
                            <!-- NIP -->
                            <div>
                                <label class="block font-label-md text-label-md text-on-surface-variant mb-1" for="nip">NIP / ID Pegawai</label>
                                <input class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2 text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" id="nip" type="text" value="198001012005011003">
                            </div>
                            <!-- Email -->
                            <div class="md:col-span-2">
                                <label class="block font-label-md text-label-md text-on-surface-variant mb-1" for="email">Alamat Email</label>
                                <input class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2 text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" id="email" type="email" value="admin.guru@smkn1.sch.id">
                            </div>
                            <!-- Phone -->
                            <div class="md:col-span-2">
                                <label class="block font-label-md text-label-md text-on-surface-variant mb-1" for="phone">Nomor Telepon</label>
                                <input class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2 text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" id="phone" type="tel" value="+62 812 3456 7890">
                            </div>
                            <!-- Address -->
                            <div class="md:col-span-2">
                                <label class="block font-label-md text-label-md text-on-surface-variant mb-1" for="address">Alamat Lengkap</label>
                                <textarea class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2 text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all resize-none" id="address" rows="3">Jl. Pendidikan No. 123, Kota Pelajar, Provinsi Ilmu Pengetahuan</textarea>
                            </div>
                        </div>
                        <div class="flex justify-end gap-3 mt-stack-lg pt-stack-md border-t border-outline-variant">
                            <button class="px-6 py-2 rounded-lg font-label-md text-primary border border-transparent hover:bg-surface-container transition-colors" type="button" onclick="loadProfilPengguna()">
                                Batal
                            </button>
                            <button class="px-6 py-2 rounded-lg font-label-md bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm" type="submit">
                                Simpan Perubahan
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    `;
}

// ============================================================
// FUNGSI: Handle Upload Foto Profil
// ============================================================
function handleFotoProfilUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran file maksimal 2MB!', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            localStorage.setItem('presensiQR_fotoProfil', e.target.result);
            showToast('Foto profil berhasil diunggah!', 'success');
            loadProfilPengguna(); // Reload untuk menampilkan foto baru
        } catch(err) {
            showToast('Gagal menyimpan foto!', 'error');
        }
    };
    reader.readAsDataURL(file);
}

// ============================================================
// FUNGSI: Simpan Profil Pengguna
// ============================================================
function simpanProfilPengguna() {
    showLoading('Menyimpan...');
    setTimeout(() => {
        // Simpan data sederhana (dalam implementasi nyata, simpan ke database)
        const profil = {
            nama_lengkap: document.getElementById('fullName').value,
            nip: document.getElementById('nip').value,
            email: document.getElementById('email').value,
            telepon: document.getElementById('phone').value,
            alamat: document.getElementById('address').value
        };
        
        try {
            localStorage.setItem('presensiQR_profilAdmin', JSON.stringify(profil));
            // Update currentUser
            if (currentUser) {
                currentUser.nama_lengkap = profil.nama_lengkap;
            }
            hideLoading();
            showToast('Profil berhasil disimpan!', 'success');
        } catch(e) {
            hideLoading();
            showToast('Gagal menyimpan profil!', 'error');
        }
    }, 500);
}

// ============================================================
// FUNGSI: Export Jadwal Pelajaran
// ============================================================
function exportJadwal() {
    if (!allJadwalData || allJadwalData.length === 0) {
        showToast('Tidak ada data jadwal untuk diexport', 'error');
        return;
    }
    
    let csv = 'No,Kode Mapel,Nama Mata Pelajaran,Kelas,Jurusan,Hari,Jam Mulai,Jam Selesai,Toleransi (Menit)\n';
    allJadwalData.forEach((j, i) => {
        csv += `${i + 1},"${j.mapel?.kode_mapel || ''}","${j.mapel?.nama_mata_pelajaran || ''}","${j.kelas || ''}","${j.jurusan || ''}","${j.hari || ''}","${j.jam_mulai?.slice(0, 5) || ''}","${j.jam_selesai?.slice(0, 5) || ''}","${j.toleransi_menit || 15}"\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jadwal_Pelajaran_${formatTanggal(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Jadwal Pelajaran diexport!', 'success');
}

// ============================================================
// PUSAT UNDUHAN
// ============================================================
function loadPusatUnduhan() {
    const contentArea = document.getElementById('content-area');
    
    contentArea.innerHTML = `
        <div>
            <header class="mb-stack-lg">
                <div>
                    <h1 class="font-headline-lg text-headline-lg text-on-surface mb-2">Pusat Unduhan</h1>
                    <p class="font-body-lg text-body-lg text-on-surface-variant">Unduh berbagai data dan laporan sistem dalam format file.</p>
                </div>
            </header>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                
                <!-- Card: Data Siswa -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="p-container-padding">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-primary text-[24px]">person</span>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Data Siswa</h3>
                                <p class="text-sm text-on-surface-variant">Daftar lengkap siswa beserta NISN, kelas, jurusan, dan informasi lainnya.</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                            <span class="text-xs text-on-surface-variant">Format: CSV / Excel</span>
                            <button onclick="exportSiswa()" class="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm text-sm">
                                <span class="material-symbols-outlined text-[18px]">download</span>Unduh
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Card: Mata Pelajaran -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="p-container-padding">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-secondary text-[24px]">book</span>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Mata Pelajaran</h3>
                                <p class="text-sm text-on-surface-variant">Daftar mata pelajaran lengkap dengan kode, guru pengampu, dan kelas.</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                            <span class="text-xs text-on-surface-variant">Format: CSV / Excel</span>
                            <button onclick="exportMapel()" class="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm text-sm">
                                <span class="material-symbols-outlined text-[18px]">download</span>Unduh
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Card: Jadwal Pelajaran -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="p-container-padding">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-tertiary text-[24px]">calendar_month</span>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Jadwal Pelajaran</h3>
                                <p class="text-sm text-on-surface-variant">Jadwal lengkap pelajaran per kelas, hari, dan jam pelajaran.</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                            <span class="text-xs text-on-surface-variant">Format: CSV / Excel</span>
                            <button onclick="exportJadwal()" class="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm text-sm">
                                <span class="material-symbols-outlined text-[18px]">download</span>Unduh
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Card: Rekap Presensi -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="p-container-padding">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-green-600 text-[24px]">assessment</span>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Rekap Presensi</h3>
                                <p class="text-sm text-on-surface-variant">Laporan rekapitulasi kehadiran siswa per mata pelajaran dan kelas.</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                            <span class="text-xs text-on-surface-variant">Format: CSV / Excel</span>
                            <button onclick="exportRekapExcel()" class="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm text-sm">
                                <span class="material-symbols-outlined text-[18px]">download</span>Unduh
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Card: Kartu Presensi Siswa -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="p-container-padding">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-amber-600 text-[24px]">badge</span>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Kartu Presensi Siswa</h3>
                                <p class="text-sm text-on-surface-variant">Kumpulan kartu identitas siswa dengan QR code untuk presensi.</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                            <span class="text-xs text-on-surface-variant">Format: ZIP / PDF</span>
                            <button onclick="downloadZipKartu()" class="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm text-sm">
                                <span class="material-symbols-outlined text-[18px]">download</span>Unduh
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Card: Kredensial Akun Siswa -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="p-container-padding">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-blue-600 text-[24px]">vpn_key</span>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Kredensial Akun Siswa</h3>
                                <p class="text-sm text-on-surface-variant">Daftar username dan password akun siswa untuk login ke sistem.</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                            <span class="text-xs text-on-surface-variant">Format: Excel</span>
                            <button onclick="downloadKredensial()" class="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm text-sm">
                                <span class="material-symbols-outlined text-[18px]">download</span>Unduh
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Card: Profil Sekolah -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="p-container-padding">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-indigo-600 text-[24px]">school</span>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Profil Sekolah</h3>
                                <p class="text-sm text-on-surface-variant">Data identitas lengkap sekolah, alamat, kontak, dan informasi kepala sekolah.</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                            <span class="text-xs text-on-surface-variant">Format: Excel</span>
                            <button onclick="showToast('Fitur unduh Profil Sekolah belum tersedia.', 'info')" class="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm text-sm">
                                <span class="material-symbols-outlined text-[18px]">download</span>Unduh
                            </button>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    `;
}

// ============================================================
// REKAP ABSENSI
// ============================================================

let rekapPage = 1;
const rekapPerPage = 10;
let allRekapData = []; // Variabel global untuk menyimpan data rekap di memori

async function loadRekapAbsen() {
    const contentArea = document.getElementById('content-area');
    
    let mapelOptions = '<option value="">Semua Mata Pelajaran</option>';
    try {
        const sb = getSupabase();
        const { data } = await sb.from('mapel').select('nama_mata_pelajaran').order('nama_mata_pelajaran');
        if (data) {
            mapelOptions += data.map(m => `<option value="${m.nama_mata_pelajaran}">${m.nama_mata_pelajaran}</option>`).join('');
        }
    } catch(e) {}
    
    contentArea.innerHTML = `
        <div>
            <header class="mb-stack-lg pb-stack-sm">
                <div>
                    <h1 class="font-headline-lg text-headline-lg text-on-surface mb-2">Rekap & Penilaian Absensi</h1>
                    <p class="font-body-lg text-body-lg text-on-surface-variant">Pantau rekapitulasi kehadiran dan nilai absensi per mata pelajaran & kelas.</p>
                </div>
            </header>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-stack-md">
                <div class="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div class="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform duration-300 group-hover:scale-125"></div>
                    <p class="font-label-md text-on-surface-variant uppercase tracking-wide text-xs mb-2">Rata-rata Hadir</p>
                    <p class="text-3xl font-bold text-on-surface tracking-tighter" id="statRataHadir">-%</p>
                </div>
                <div class="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div class="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform duration-300 group-hover:scale-125"></div>
                    <p class="font-label-md text-on-surface-variant uppercase tracking-wide text-xs mb-2">Rata-rata Terlambat</p>
                    <p class="text-3xl font-bold text-on-surface tracking-tighter" id="statRataTerlambat">-%</p>
                </div>
                <div class="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div class="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform duration-300 group-hover:scale-125"></div>
                    <p class="font-label-md text-on-surface-variant uppercase tracking-wide text-xs mb-2">Total Sakit/Izin</p>
                    <p class="text-3xl font-bold text-on-surface tracking-tighter" id="statTotalSakit">-</p>
                </div>
                <div class="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div class="absolute top-0 right-0 w-20 h-20 bg-error/10 rounded-bl-full -mr-4 -mt-4 transition-transform duration-300 group-hover:scale-125"></div>
                    <p class="font-label-md text-on-surface-variant uppercase tracking-wide text-xs mb-2">Total Alpa</p>
                    <p class="text-3xl font-bold text-on-surface tracking-tighter" id="statTotalAlpa">-</p>
                </div>
            </div>
            
            <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 mb-stack-lg flex flex-col md:flex-row gap-4 items-end">
                <div class="w-full md:w-64">
                    <label class="block mb-2 font-label-md text-on-surface-variant uppercase tracking-wider text-xs">Mata Pelajaran</label>
                    <select id="filterMapelRekap" onchange="loadRekapData()" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                        ${mapelOptions}
                    </select>
                </div>
                <div class="w-full md:w-48">
                    <label class="block mb-2 font-label-md text-on-surface-variant uppercase tracking-wider text-xs">Kelas</label>
                    <select id="filterKelasRekap" onchange="loadRekapData()" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                        <option value="">Semua Kelas</option>
                        <option value="X">Kelas X</option>
                        <option value="XI">Kelas XI</option>
                        <option value="XII">Kelas XII</option>
                    </select>
                </div>
                <div class="w-full md:w-48">
                    <label class="block mb-2 font-label-md text-on-surface-variant uppercase tracking-wider text-xs">Bulan</label>
                    <select id="filterBulanRekap" onchange="loadRekapData()" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                        <option value="01">Januari</option><option value="02">Februari</option>
                        <option value="03">Maret</option><option value="04">April</option>
                        <option value="05">Mei</option><option value="06">Juni</option>
                        <option value="07">Juli</option><option value="08" selected>Agustus</option>
                        <option value="09">September</option><option value="10">Oktober</option>
                        <option value="11">November</option><option value="12">Desember</option>
                    </select>
                </div>
                <button onclick="exportRekapExcel()" class="px-5 py-2.5 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm flex items-center gap-2 w-full md:w-auto justify-center">
                    <span class="material-symbols-outlined text-[18px]">table_view</span>Export Excel
                </button>
            </div>
            
            <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-label-md uppercase tracking-wider border-b" style="background: linear-gradient(to bottom right, #004349, #0d5c63); color: white;">
                                <th class="p-4 w-16 text-center">No</th>
                                <th class="p-4">Nama Siswa</th>
                                <th class="p-4">Kelas</th>
                                <th class="p-4 text-center">Hadir</th>
                                <th class="p-4 text-center">Terlambat</th>
                                <th class="p-4 text-center">Sakit</th>
                                <th class="p-4 text-center">Izin</th>
                                <th class="p-4 text-center">Alpa</th>
                                <th class="p-4 text-center">% Kehadiran</th>
                                <th class="p-4 text-center">Nilai Angka</th>
                            </tr>
                        </thead>
                        <tbody id="tableRekap" class="text-body-md text-on-surface">
                            <tr><td colspan="10" class="p-8 text-center text-on-surface-variant">Memuat data rekap...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="flex justify-between items-center p-4 bg-surface border-t">
                    <span class="text-body-md text-sm text-on-surface-variant" id="paginationRekap">Menampilkan 0 data</span>
                    <div class="flex gap-1" id="paginationButtonsRekap"></div>
                </div>
            </div>
        </div>
    `;
    
    await loadRekapData();
}

async function loadRekapData() {
    showLoading('Memuat rekap...');
    try {
        const sb = getSupabase();
        const filterMapel = document.getElementById('filterMapelRekap')?.value || '';
        const filterKelas = document.getElementById('filterKelasRekap')?.value || '';
        const filterBulan = document.getElementById('filterBulanRekap')?.value || '08';
        const tahun = new Date().getFullYear();
        
        let query = sb.from('absensi').select('*')
            .gte('tanggal', `${tahun}-${filterBulan}-01`)
            .lte('tanggal', `${tahun}-${filterBulan}-31`);
        
        if (filterMapel) query = query.eq('mata_pelajaran', filterMapel);
        if (filterKelas) query = query.eq('kelas', filterKelas);
        
        const { data: absensi } = await query;
        
        let siswaQuery = sb.from('siswa').select('*').order('nama_lengkap');
        if (filterKelas) siswaQuery = siswaQuery.eq('kelas', filterKelas);
        const { data: siswaList } = await siswaQuery;
        
        const rekap = {};
        (siswaList || []).forEach(s => {
            rekap[s.id] = {
                nama: s.nama_lengkap,
                kelas: s.kelas,
                jurusan: s.jurusan,
                hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0
            };
        });
        
        (absensi || []).forEach(a => {
            if (rekap[a.siswa_id]) {
                const status = a.status.toLowerCase();
                if (rekap[a.siswa_id][status] !== undefined) {
                    rekap[a.siswa_id][status]++;
                }
            }
        });
        
        // Simpan ke variabel global untuk digunakan saat pindah halaman (tanpa loading)
        allRekapData = Object.values(rekap);
        rekapPage = 1; // Reset ke halaman 1 saat filter berubah
        
        // Update statistik
        let totalHadir = 0, totalTerlambat = 0, totalSakit = 0, totalIzin = 0, totalAlpa = 0;
        allRekapData.forEach(r => {
            totalHadir += r.hadir;
            totalTerlambat += r.terlambat;
            totalSakit += r.sakit;
            totalIzin += r.izin;
            totalAlpa += r.alpa;
        });
        
        const totalAll = totalHadir + totalTerlambat + totalSakit + totalIzin + totalAlpa || 1;
        document.getElementById('statRataHadir').textContent = Math.round((totalHadir / totalAll) * 100) + '%';
        document.getElementById('statRataTerlambat').textContent = Math.round((totalTerlambat / totalAll) * 100) + '%';
        document.getElementById('statTotalSakit').textContent = totalSakit + totalIzin;
        document.getElementById('statTotalAlpa').textContent = totalAlpa;
        
        // Render tabel dari data yang sudah ada di memori (TANPA loading)
        renderRekapTable();
        
        hideLoading();
        
    } catch (e) {
        hideLoading();
        showToast('Gagal memuat: ' + e.message, 'error');
    }
}

// ============================================================
// FUNGSI: Render tabel rekap dari data di memori (TANPA loading)
// Dipanggil saat pindah halaman pagination
// ============================================================
function renderRekapTable() {
    const tbody = document.getElementById('tableRekap');
    const rekapArray = allRekapData;
    
    if (rekapArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-on-surface-variant">Tidak ada data rekap.</td></tr>';
        document.getElementById('paginationRekap').textContent = 'Menampilkan 0 data';
        document.getElementById('paginationButtonsRekap').innerHTML = '';
        return;
    }
    
    const start = (rekapPage - 1) * rekapPerPage;
    const pageData = rekapArray.slice(start, start + rekapPerPage);
    
    tbody.innerHTML = pageData.map((r, i) => {
        const total = r.hadir + r.terlambat + r.sakit + r.izin + r.alpa || 1;
        const persentase = Math.round(((r.hadir + r.terlambat) / total) * 100);
        const nilai = Math.max(0, 100 - (r.alpa * 5) - (r.terlambat * 2));
        
        const persenColor = persentase >= 90 ? 'text-green-600 bg-green-100' : 
                           persentase >= 75 ? 'text-amber-600 bg-amber-100' : 'text-error bg-error-container';
        const nilaiColor = nilai >= 90 ? 'text-green-600' : nilai >= 75 ? 'text-amber-600' : 'text-error';
        
        return `
        <tr class="border-b border-surface-container-highest table-row-hover">
            <td class="p-4 text-center text-on-surface-variant">${start + i + 1}</td>
            <td class="p-4 font-semibold">${r.nama}</td>
            <td class="p-4">${r.kelas} ${r.jurusan}</td>
            <td class="p-4 text-center font-semibold text-green-600">${r.hadir}</td>
            <td class="p-4 text-center text-amber-600">${r.terlambat}</td>
            <td class="p-4 text-center text-blue-600">${r.sakit}</td>
            <td class="p-4 text-center text-purple-600">${r.izin}</td>
            <td class="p-4 text-center text-error">${r.alpa}</td>
            <td class="p-4 text-center">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${persenColor}">${persentase}%</span>
            </td>
            <td class="p-4 text-center font-bold ${nilaiColor} text-lg">${nilai}</td>
        </tr>`;
    }).join('');
    
    // Update info pagination
    document.getElementById('paginationRekap').textContent = `Menampilkan ${start + 1}-${Math.min(start + rekapPerPage, rekapArray.length)} dari ${rekapArray.length} data`;
    
    // Generate tombol halaman (panggil renderRekapTable, BUKAN loadRekapData)
    const totalPages = Math.ceil(rekapArray.length / rekapPerPage);
    const buttonsHtml = renderPaginationHTML(rekapPage, totalPages, 'rekapPage', 'renderRekapTable');
    document.getElementById('paginationButtonsRekap').innerHTML = buttonsHtml;
}

function exportRekapExcel() {
    const rows = document.querySelectorAll('#tableRekap tr');
    if (rows.length === 0 || rows[0].querySelector('td[colspan]')) {
        showToast('Tidak ada data untuk diexport', 'error');
        return;
    }
    
    let csv = 'No,Nama Siswa,Kelas,Hadir,Terlambat,Sakit,Izin,Alpa,Persentase,Nilai\n';
    rows.forEach((row, i) => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 10) {
            csv += `${i + 1},"${cols[1].textContent.trim()}","${cols[2].textContent.trim()}",${cols[3].textContent.trim()},${cols[4].textContent.trim()},${cols[5].textContent.trim()},${cols[6].textContent.trim()},${cols[7].textContent.trim()},"${cols[8].textContent.trim()}",${cols[9].textContent.trim()}\n`;
        }
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Absensi_${formatTanggal(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Rekap diexport!', 'success');
}

// ============================================================
// PENGATURAN SISTEM
// ============================================================

async function loadPengaturan() {
    const contentArea = document.getElementById('content-area');
    
    let pengaturan = {};
    try {
        const sb = getSupabase();
        const { data } = await sb.from('pengaturan_sistem').select('*');
        if (data) data.forEach(p => pengaturan[p.pengaturan] = p.nilai);
    } catch(e) {}
    
    const hariKerja = pengaturan.Hari_Kerja?.split(',') || ['Senin','Selasa','Rabu','Kamis','Jumat'];
    const hariList = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    
    contentArea.innerHTML = `
        <div>
            <header class="mb-stack-lg pb-stack-sm">
                <h1 class="font-headline-lg text-headline-lg text-on-surface mb-2">Pengaturan Sistem</h1>
                <p class="font-body-lg text-body-lg text-on-surface-variant">Konfigurasi parameter sistem absensi dan pengaturan akun pengguna.</p>
            </header>
            
            <!-- TAB MENU: WARNA HIJAU GRADIEN, DIPERLEBAR, TEKS SEMBUNYI DI MOBILE -->
            <div class="flex gap-1 mb-stack-lg p-1 rounded-xl w-full max-w-4xl" 
                 style="background: linear-gradient(to bottom right, #004349, #0d5c63);">
                <button onclick="switchTab('tabAbsensi')" class="tab-btn active flex-1 px-2 sm:px-4 py-2 rounded-lg font-label-md transition-all bg-white shadow-sm whitespace-nowrap" data-tab="tabAbsensi" style="color: #004349;">
                    <span class="material-symbols-outlined text-[18px] align-middle sm:mr-1">schedule</span><span class="hidden sm:inline">Jam Absensi</span>
                </button>
                <button onclick="switchTab('tabAkun')" class="tab-btn flex-1 px-2 sm:px-4 py-2 rounded-lg font-label-md transition-all whitespace-nowrap" data-tab="tabAkun" style="color: white;">
                    <span class="material-symbols-outlined text-[18px] align-middle sm:mr-1">manage_accounts</span><span class="hidden sm:inline">Akun</span>
                </button>
                <button onclick="switchTab('tabSistem')" class="tab-btn flex-1 px-2 sm:px-4 py-2 rounded-lg font-label-md transition-all whitespace-nowrap" data-tab="tabSistem" style="color: white;">
                    <span class="material-symbols-outlined text-[18px] align-middle sm:mr-1">tune</span><span class="hidden sm:inline">Konfigurasi Sistem</span>
                </button>
            </div>
            
            <div id="tabAbsensi" class="tab-content">
                <!-- CARD PENGATURAN JAM & HARI KERJA DENGAN HEADER HIJAU -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden max-w-4xl">
                    <!-- HEADER CARD: WARNA HIJAU GRADIEN, ICON & TULISAN PUTIH -->
                    <div class="px-container-padding py-3 flex items-center gap-2" 
                         style="background: linear-gradient(to bottom right, #004349, #0d5c63); min-height: 52px;">
                        <span class="material-symbols-outlined" style="color: white;">schedule</span>
                        <h2 class="font-headline-sm text-headline-sm" style="color: white;">Pengaturan Jam & Hari Kerja</h2>
                    </div>
                    <!-- BODY CARD -->
                    <div class="p-container-padding">
                        <form id="formAbsensi" onsubmit="event.preventDefault(); simpanPengaturanAbsensi();" class="space-y-5">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div><label class="block mb-2 font-label-md">Jam Masuk</label>
                                    <input type="time" id="jamMasuk" value="${pengaturan.Jam_Masuk || '07:00'}" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                                <div><label class="block mb-2 font-label-md">Jam Pulang</label>
                                    <input type="time" id="jamPulang" value="${pengaturan.Jam_Pulang || '14:00'}" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                            </div>
                            <div><label class="block mb-2 font-label-md">Waktu Toleransi Keterlambatan (menit)</label>
                                <input type="number" id="waktuToleransi" min="0" max="120" value="${pengaturan.Waktu_Toleransi || 15}" class="w-full md:w-48 bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                                <p class="text-xs text-on-surface-variant mt-1">Melebihi waktu ini akan dianggap terlambat</p></div>
                            <div><label class="block mb-2 font-label-md">Hari Kerja</label>
                                <div class="flex flex-wrap gap-2">
                                    ${hariList.map(h => `
                                        <label class="flex items-center gap-2 px-4 py-2 bg-surface-bright border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low">
                                            <input type="checkbox" name="hariKerja" value="${h}" ${hariKerja.includes(h) ? 'checked' : ''} class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary">
                                            <span class="font-body-md">${h}</span>
                                        </label>
                                    `).join('')}
                                </div></div>
                            <div><label class="block mb-2 font-label-md">Total Hari Efektif (per bulan)</label>
                                <input type="number" id="totalHariEfektif" min="1" max="31" value="${pengaturan.Total_Hari_Efektif || 22}" class="w-full md:w-48 bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                            <div class="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onclick="loadPengaturan()" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Reset</button>
                                <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 shadow-sm">Simpan Pengaturan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <div id="tabAkun" class="tab-content">
                <!-- CARD KEAMANAN AKUN DENGAN HEADER HIJAU -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden max-w-4xl">
                    <!-- HEADER CARD: WARNA HIJAU GRADIEN, ICON & TULISAN PUTIH -->
                    <div class="px-container-padding py-3 flex items-center gap-2" 
                         style="background: linear-gradient(to bottom right, #004349, #0d5c63); min-height: 52px;">
                        <span class="material-symbols-outlined" style="color: white;">lock</span>
                        <h2 class="font-headline-sm text-headline-sm" style="color: white;">Keamanan Akun</h2>
                    </div>
                    <!-- BODY CARD -->
                    <div class="p-container-padding">
                        <div class="p-4 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                            <p class="font-label-md text-primary font-semibold">Informasi Akun</p>
                            <p class="text-sm text-on-surface-variant mt-1">Username: <span class="font-mono font-semibold">${currentUser?.username || '-'}</span></p>
                            <p class="text-sm text-on-surface-variant mt-1">Level: <span class="font-semibold">${currentUser?.level === 'admin' ? 'Admin Guru' : 'Siswa'}</span></p>
                        </div>
                        <form id="formAkun" onsubmit="event.preventDefault(); ubahPassword();" class="space-y-5">
                            <div><label class="block mb-2 font-label-md">Password Lama</label>
                                <input type="password" id="passwordLama" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                            <div><label class="block mb-2 font-label-md">Password Baru</label>
                                <input type="password" id="passwordBaru" required minlength="6" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                                <p class="text-xs text-on-surface-variant mt-1">Minimal 6 karakter</p></div>
                            <div><label class="block mb-2 font-label-md">Konfirmasi Password Baru</label>
                                <input type="password" id="passwordKonfirmasi" required minlength="6" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5"></div>
                            <div class="flex justify-end gap-3 pt-4 border-t">
                                <button type="reset" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Batal</button>
                                <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 shadow-sm">Ubah Password</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- TAB BARU: KONFIGURASI SISTEM -->
            <div id="tabSistem" class="tab-content">
                <!-- CARD KONFIGURASI SISTEM DENGAN HEADER HIJAU -->
                <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden max-w-4xl">
                    <div class="px-container-padding py-3 flex items-center gap-2" 
                         style="background: linear-gradient(to bottom right, #004349, #0d5c63); min-height: 52px;">
                        <span class="material-symbols-outlined" style="color: white;">tune</span>
                        <h2 class="font-headline-sm text-headline-sm" style="color: white;">Konfigurasi Sistem</h2>
                    </div>
                    <div class="p-container-padding">
                        <p class="text-sm text-on-surface-variant mb-5">Pengaturan fitur untuk sisi siswa</p>
                        
                        <form id="formSistem" onsubmit="event.preventDefault(); simpanPengaturanSistem();" class="space-y-4">
                            
                            <!-- TOGGLE 1: Hide/Unhide Scanner -->
                            <div class="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                                <div class="flex-1 pr-4">
                                    <p class="font-medium text-on-surface">Hide/Unhide Scanner</p>
                                    <p class="text-xs text-on-surface-variant mt-0.5">Mengaktifkan atau menonaktifkan menu Scanner di dashboard siswa</p>
                                </div>
                                <label class="toggle-switch shrink-0">
                                    <input type="checkbox" id="siswaScannerAktif" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                            
                            <!-- TOGGLE 2: Aktif/Nonaktif Tampilan -->
                            <div class="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                                <div class="flex-1 pr-4">
                                    <p class="font-medium text-on-surface">Aktif/Nonaktif Tampilan</p>
                                    <p class="text-xs text-on-surface-variant mt-0.5">Mengaktifkan atau menonaktifkan ikon mode tampilan (Dark/Light) di sisi siswa</p>
                                </div>
                                <label class="toggle-switch shrink-0">
                                    <input type="checkbox" id="siswaModeTampilanAktif" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                            
                            <div class="flex justify-end gap-3 pt-4">
                                <button type="button" onclick="loadPengaturan()" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Reset</button>
                                <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 shadow-sm">Simpan Pengaturan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Inisialisasi: pastikan tab Jam Absensi aktif otomatis
    if (typeof switchTab === 'function') switchTab('tabAbsensi');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-white', 'shadow-sm');
        btn.style.color = 'white'; // Tab tidak aktif: tulisan putih
    });
    
    document.getElementById(tabId).classList.add('active');
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-white', 'shadow-sm');
        activeBtn.style.color = '#004349'; // Tab aktif: tulisan hijau primary
    }
}

// ============================================================
// FUNGSI: Handle Upload Logo Sekolah
// ============================================================
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validasi ukuran file (maks 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran file maksimal 2MB!', 'error');
        return;
    }
    
    // Validasi tipe file
    if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
        showToast('Format file harus JPG, PNG, atau SVG!', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const logoData = e.target.result;
        
        // Tampilkan preview
        document.getElementById('logoPreviewImg').src = logoData;
        document.getElementById('logoPreviewImg').classList.remove('hidden');
        document.getElementById('logoPlaceholderIcon').classList.add('hidden');
        
        // Simpan ke localStorage
        try {
            localStorage.setItem('presensiQR_logoSekolah', logoData);
            showToast('Logo berhasil diunggah!', 'success');
        } catch(e) {
            showToast('Gagal menyimpan logo!', 'error');
        }
    };
    reader.readAsDataURL(file);
}

// ============================================================
// FUNGSI: Load Logo Sekolah saat halaman dimuat
// ============================================================
function loadLogoSekolah() {
    try {
        const logoData = localStorage.getItem('presensiQR_logoSekolah');
        if (logoData) {
            setTimeout(() => {
                const previewImg = document.getElementById('logoPreviewImg');
                const placeholderIcon = document.getElementById('logoPlaceholderIcon');
                if (previewImg && placeholderIcon) {
                    previewImg.src = logoData;
                    previewImg.classList.remove('hidden');
                    placeholderIcon.classList.add('hidden');
                }
            }, 100);
        }
    } catch(e) {}
}

async function simpanPengaturanSekolah() {
    showLoading('Menyimpan...');
    try {
        const sb = getSupabase();
        const data = [
            { pengaturan: 'Nama_Sekolah', nilai: document.getElementById('namaSekolah').value },
            { pengaturan: 'NPSN', nilai: document.getElementById('npsnSekolah').value },
            { pengaturan: 'Tingkat_Sekolah', nilai: document.getElementById('tingkatSekolah').value },
            { pengaturan: 'Status_Sekolah', nilai: document.getElementById('statusSekolah').value },
            { pengaturan: 'Email_Sekolah', nilai: document.getElementById('emailSekolah').value },
            { pengaturan: 'Website', nilai: document.getElementById('websiteSekolah').value },
            { pengaturan: 'Kontak', nilai: document.getElementById('kontakSekolah').value },
            { pengaturan: 'Alamat', nilai: document.getElementById('alamatSekolah').value }
        ];
        
        for (const item of data) {
            await sb.from('pengaturan_sistem').upsert(item, { onConflict: 'pengaturan' });
        }
        
        // Update variabel global nama sekolah secara langsung
        namaSekolah = document.getElementById('namaSekolah').value || namaSekolah;
        // Update tampilan di sidebar
        updateTampilanNamaSekolah();
        
        hideLoading();
        showToast('Pengaturan sekolah disimpan!', 'success');
    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

async function simpanPengaturanAbsensi() {
    showLoading('Menyimpan...');
    try {
        const sb = getSupabase();
        const hariKerja = [];
        document.querySelectorAll('input[name="hariKerja"]:checked').forEach(cb => hariKerja.push(cb.value));
        
        const data = [
            { pengaturan: 'Jam_Masuk', nilai: document.getElementById('jamMasuk').value },
            { pengaturan: 'Jam_Pulang', nilai: document.getElementById('jamPulang').value },
            { pengaturan: 'Waktu_Toleransi', nilai: document.getElementById('waktuToleransi').value },
            { pengaturan: 'Hari_Kerja', nilai: hariKerja.join(',') },
            { pengaturan: 'Total_Hari_Efektif', nilai: document.getElementById('totalHariEfektif').value }
        ];
        
        for (const item of data) {
            await sb.from('pengaturan_sistem').upsert(item, { onConflict: 'pengaturan' });
        }
        
        hideLoading();
        showToast('Pengaturan absensi disimpan!', 'success');
    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

// ============================================================
// FUNGSI: Simpan Pengaturan Sistem
// ============================================================
async function simpanPengaturanSistem() {
    showLoading('Menyimpan...');
    try {
        const sb = getSupabase();
        
        const data = [
            { pengaturan: 'Siswa_Scanner_Aktif', nilai: document.getElementById('siswaScannerAktif').checked ? 'true' : 'false' },
            { pengaturan: 'Siswa_Mode_Tampilan_Aktif', nilai: document.getElementById('siswaModeTampilanAktif').checked ? 'true' : 'false' }
        ];
        
        for (const item of data) {
            await sb.from('pengaturan_sistem').upsert(item, { onConflict: 'pengaturan' });
        }
        
        hideLoading();
        showToast('Pengaturan sistem disimpan!', 'success');
    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

// ============================================================
// INISIALISASI SAAT HALAMAN DIMUAT
// ============================================================

(async function() {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) {
        console.log('Bukan halaman dashboard, inisialisasi main.js dilewati.');
        return;
    }
    
    // Muat nama sekolah dari database terlebih dahulu
    await loadNamaSekolah();
    
    if (currentUser) {
        const initial = getInitial(currentUser.nama);
        const elInitial = document.getElementById('sidebarUserInitial');
        const elName = document.getElementById('sidebarUserName');
        const elLevel = document.getElementById('sidebarUserLevel');
        const elMobileInitial = document.getElementById('mobileUserInitial');
        
        if (elInitial) elInitial.textContent = initial;
        if (elName) elName.textContent = currentUser.nama;
        if (elLevel) elLevel.textContent = currentUser.level === 'admin' ? namaSekolah : `${currentUser.kelas} ${currentUser.jurusan}`;
        if (elMobileInitial) elMobileInitial.textContent = initial;
        
        document.querySelectorAll('.admin-menu').forEach(el => {
            el.style.display = currentUser.level === 'admin' ? '' : 'none';
        });
        document.querySelectorAll('.siswa-menu').forEach(el => {
            el.style.display = currentUser.level === 'siswa' ? '' : 'none';
        });
    }
    
    if (currentUser?.level === 'admin') {
        loadPage('dashboardAdmin');
    } else {
        loadPage('dashboardSiswa');
    }
})();


// ============================================================
// ⭐ FITUR UPLOAD DATA SISWA DARI EXCEL ⭐
// Alur: Saat upload → status akun = Nonaktif
//       Saat QR Code di-generate → status akun = Aktif
// ============================================================

let dataExcelSiswa = [];

// Fungsi: Download template Excel dari folder asset
function downloadTemplateSiswa() {
    const link = document.createElement('a');
    link.href = 'asset/template_data_siswa.xlsx';
    link.download = 'template_data_siswa.xlsx';
    link.click();
    showToast('Template sedang diunduh...', 'info');
    if (typeof catatLog === 'function' && currentUser) {
        catatLog(currentUser.username, 'Download Template', 'Template data siswa');
    }
}

// ============================================================
// FUNGSI HELPER: Parsing tanggal format Indonesia & Internasional
// Mendukung: 
//   - "11 Agustus 2026", "11/08/2026", "11-08-2026", "11.08.2026" (DD/MM/YYYY)
//   - "2026/08/11", "2026-08-11", "2026.08.11" (YYYY/MM/DD)
//   - Format Excel serial number
// ============================================================
function parseTanggalIndo(str) {
    if (!str) return null;
    str = String(str).trim();
    
    const bulanMap = {
        'januari': 0, 'jan': 0, 'jan.': 0, '1': 0, '01': 0,
        'februari': 1, 'feb': 1, 'feb.': 1, '2': 1, '02': 1,
        'maret': 2, 'mar': 2, 'mar.': 2, '3': 2, '03': 2,
        'april': 3, 'apr': 3, 'apr.': 3, '4': 3, '04': 3,
        'mei': 4, 'mey': 4, '5': 4, '05': 4,
        'juni': 5, 'jun': 5, 'jun.': 5, '6': 5, '06': 5,
        'juli': 6, 'jul': 6, 'jul.': 6, '7': 6, '07': 6,
        'agustus': 7, 'agu': 7, 'agu.': 7, 'agt': 7, '8': 7, '08': 7,
        'september': 8, 'sep': 8, 'sep.': 8, 'sept': 8, '9': 8, '09': 8,
        'oktober': 9, 'okt': 9, 'okt.': 9, '10': 9,
        'november': 10, 'nov': 10, 'nov.': 10, '11': 10,
        'desember': 11, 'des': 11, 'des.': 11, '12': 11
    };
    
    // Format 1: "2026/08/11" atau "2026-08-11" atau "2026.08.11" (YYYY/MM/DD)
    let match = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (match) {
        const tahun = parseInt(match[1]);
        const bulan = parseInt(match[2]) - 1;
        const hari = parseInt(match[3]);
        if (hari >= 1 && hari <= 31 && bulan >= 0 && bulan <= 11 && tahun >= 1900 && tahun <= 2100) {
            return new Date(tahun, bulan, hari);
        }
    }
    
    // Format 2: "11 Agustus 2026" atau "11-Agustus-2026"
    match = str.match(/^(\d{1,2})[\s\-\/\.]+([a-zA-Z]+)[\s\-\/\.]+(\d{4})$/);
    if (match) {
        const hari = parseInt(match[1]);
        const bulan = bulanMap[match[2].toLowerCase()];
        const tahun = parseInt(match[3]);
        if (bulan !== undefined && hari >= 1 && hari <= 31 && tahun >= 1900 && tahun <= 2100) {
            return new Date(tahun, bulan, hari);
        }
    }
    
    // Format 3: "11/08/2026" atau "11-08-2026" atau "11.08.2026" (DD/MM/YYYY)
    match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (match) {
        const hari = parseInt(match[1]);
        const bulan = parseInt(match[2]) - 1;
        const tahun = parseInt(match[3]);
        if (hari >= 1 && hari <= 31 && bulan >= 0 && bulan <= 11 && tahun >= 1900 && tahun <= 2100) {
            return new Date(tahun, bulan, hari);
        }
    }
    
    return null;
}

// Fungsi: Handle saat user memilih file Excel
function handleFileExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const ekstensi = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ekstensi)) {
        showToast('File harus berformat Excel (.xlsx atau .xls)', 'error');
        event.target.value = '';
        return;
    }
    
    if (typeof XLSX === 'undefined') {
        showToast('Library Excel belum siap. Refresh halaman dan coba lagi.', 'error');
        return;
    }
    
    showLoading('Membaca file Excel...');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            // Cari baris header (cari baris yang mengandung kata "NISN" dan "Nama")
            let idxHeader = -1;
            for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
                const baris = jsonData[i].map(h => String(h || '').trim().toLowerCase());
                if (baris.some(h => h.includes('nisn')) && baris.some(h => h.includes('nama'))) {
                    idxHeader = i;
                    break;
                }
            }
            
            if (idxHeader === -1) {
                hideLoading();
                showToast('Tidak menemukan header kolom! Gunakan template yang benar.', 'error');
                return;
            }
            
            const header = jsonData[idxHeader].map(h => String(h || '').trim());
            
            // Helper cari index kolom (cocokkan kata utuh, bukan substring)
            const cariKolom = (kataKunci) => {
                return header.findIndex(h => {
                    const hClean = String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    const kClean = kataKunci.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return hClean === kClean || hClean.startsWith(kClean + '_') || hClean.endsWith('_' + kClean);
                });
            };
            
            // Helper cari kolom dengan banyak alternatif (prioritas urutan)
            const cariKolomAlternatif = (daftarKataKunci) => {
                for (const kunci of daftarKataKunci) {
                    const idx = cariKolom(kunci);
                    if (idx !== -1) return idx;
                }
                // Fallback: cari dengan includes (lebih longgar)
                for (const kunci of daftarKataKunci) {
                    const idx = header.findIndex(h => String(h || '').trim().toLowerCase().includes(kunci.toLowerCase()));
                    if (idx !== -1) return idx;
                }
                return -1;
            };
            
            // Mapping semua kolom (urutan penting: cari yang spesifik dulu)
            const idxNISN = cariKolomAlternatif(['nisn', 'nisn_siswa', 'nomor_induk_siswa_nasional']);
            const idxNama = cariKolomAlternatif(['nama lengkap', 'nama_lengkap', 'nama', 'nama_siswa']);
            const idxJK = cariKolomAlternatif(['jenis kelamin', 'jenis_kelamin', 'jk', 'kelamin', 'gender']);
            // Cari NIS: pastikan bukan kolom NISN
            let idxNIS = cariKolomAlternatif(['nis', 'nis_siswa', 'nomor_induk_siswa']);
            if (idxNIS === idxNISN) idxNIS = -1; // Hindari tertukar dengan NISN
            const idxTempatLahir = cariKolomAlternatif(['tempat lahir', 'tempat_lahir', 'tmp_lahir', 'tempat']);
            const idxTglLahir = cariKolomAlternatif(['tanggal lahir', 'tanggal_lahir', 'tgl_lahir', 'tgl lahir', 'lahir']);
            const idxKelas = cariKolomAlternatif(['kelas', 'tingkat']);
            const idxJurusan = cariKolomAlternatif(['jurusan', 'program keahlian', 'program_keahlian', 'keahlian']);
            
            // Validasi kolom wajib
            const kolomWajib = [];
            if (idxNama === -1) kolomWajib.push('Nama Lengkap');
            if (idxJK === -1) kolomWajib.push('Jenis Kelamin');
            if (idxNISN === -1) kolomWajib.push('NISN');
            if (idxKelas === -1) kolomWajib.push('Kelas');
            if (idxJurusan === -1) kolomWajib.push('Jurusan');
            
            if (kolomWajib.length > 0) {
                hideLoading();
                showToast('Kolom wajib tidak ditemukan: ' + kolomWajib.join(', '), 'error');
                return;
            }
            
            // Parse data baris demi baris
            dataExcelSiswa = [];
            for (let i = idxHeader + 1; i < jsonData.length; i++) {
                const baris = jsonData[i];
                
                const nisn = baris[idxNISN] ? String(baris[idxNISN]).trim() : '';
                const nama = baris[idxNama] ? String(baris[idxNama]).trim() : '';
                
                // Skip jika nama kosong
                if (!nama) continue;
                
                // Jika NISN kosong, generate NISN sementara dari nama + nomor baris
                let nisnFinal = nisn;
                if (!nisnFinal) {
                    nisnFinal = 'TEMP_' + nama.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase() + '_' + i;
                }
                
                // Konversi tanggal lahir
                let tglLahir = '';
                if (idxTglLahir !== -1 && baris[idxTglLahir]) {
                    const tgl = baris[idxTglLahir];
                    if (tgl instanceof Date) {
                        tglLahir = formatTanggal(tgl);
                    } else if (typeof tgl === 'number') {
                        const date = new Date((tgl - 25569) * 86400 * 1000);
                        tglLahir = formatTanggal(date);
                    } else {
                        const strTgl = String(tgl).trim();
                        const tglObj = parseTanggalIndo(strTgl);
                        if (tglObj) {
                            tglLahir = formatTanggal(tglObj);
                        } else {
                            // Fallback: coba Date standar
                            const tglStandar = new Date(strTgl);
                            if (!isNaN(tglStandar.getTime())) {
                                tglLahir = formatTanggal(tglStandar);
                            } else {
                                tglLahir = ''; // Kosongkan jika format tidak dikenali
                            }
                        }
                    }
                }
                
                // Normalisasi Jenis Kelamin
                let jk = idxJK !== -1 && baris[idxJK] ? String(baris[idxJK]).trim() : '';
                const jkLower = jk.toLowerCase();
                if (['l', 'laki', 'lakilaki', 'laki-laki', 'pria', 'm', 'male', '1'].includes(jkLower)) {
                    jk = 'Laki-laki';
                } else if (['p', 'perempuan', 'wanita', 'f', 'female', '2'].includes(jkLower)) {
                    jk = 'Perempuan';
                }
                
                // Normalisasi kelas (pastikan format romawi jika angka)
                let kelas = String(baris[idxKelas] || '').trim();
                const kelasMap = {'10': 'X', '11': 'XI', '12': 'XII'};
                if (kelasMap[kelas]) kelas = kelasMap[kelas];
                
                // Bersihkan nama (hapus spasi berlebih, huruf kapital setiap kata)
                const namaClean = nama.replace(/\s+/g, ' ').trim()
                    .split(' ')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ');
                
                dataExcelSiswa.push({
                    nama_lengkap: namaClean,
                    jenis_kelamin: jk,
                    nis: idxNIS !== -1 && baris[idxNIS] ? String(baris[idxNIS]).trim() : '',
                    nisn: nisnFinal,
                    nisn_asli: nisn, // simpan NISN asli (kosong jika dari template)
                    is_nisn_temp: !nisn, // flag apakah NISN digenerate sementara
                    tempat_lahir: idxTempatLahir !== -1 && baris[idxTempatLahir] ? String(baris[idxTempatLahir]).trim() : '',
                    tanggal_lahir: tglLahir,
                    kelas: kelas,
                    jurusan: String(baris[idxJurusan] || '').trim()
                });
            }
            
            hideLoading();
            
            if (dataExcelSiswa.length === 0) {
                showToast('Tidak ada data valid yang ditemukan!', 'error');
                return;
            }
            
            tampilkanPreviewExcel(dataExcelSiswa);
            showToast('Berhasil membaca ' + dataExcelSiswa.length + ' data siswa', 'success');
            
        } catch (error) {
            hideLoading();
            console.error('Error baca Excel:', error);
            showToast('Gagal membaca file Excel: ' + error.message, 'error');
        }
    };
    
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// Fungsi: Tampilkan preview data Excel
function tampilkanPreviewExcel(data) {
    let modal = document.getElementById('modalPreviewExcel');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalPreviewExcel';
        modal.className = 'fixed inset-0 z-[9996] hidden';
        document.body.appendChild(modal);
    }
    
    const previewData = data.slice(0, 6);
    const lebih = data.length > 6 ? data.length - 6 : 0;
    
    modal.innerHTML = `
        <div class="modal-overlay absolute inset-0" onclick="tutupPreviewExcel()"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[85vh] flex flex-col">
            <div class="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
                <div>
                    <h3 class="font-headline-sm text-on-surface">Preview Data Siswa</h3>
                    <p class="text-sm text-on-surface-variant mt-1">Total: <strong>${data.length}</strong> data siswa • Status: <span class="text-amber-600 font-bold">BELUM GENERATE</span> (akan aktif saat QR di-generate)</p>
                </div>
                <button onclick="tutupPreviewExcel()" class="text-on-surface-variant hover:text-on-surface">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1">
                <div class="overflow-x-auto">
                    <table class="w-full text-xs border-collapse">
                        <thead>
                            <tr class="bg-surface-container text-on-surface-variant uppercase font-bold">
                                <th class="px-2 py-2 text-left border-b">Nama Lengkap</th>
                                <th class="px-2 py-2 text-left border-b">JK</th>
                                <th class="px-2 py-2 text-left border-b">NIS</th>
                                <th class="px-2 py-2 text-left border-b">NISN</th>
                                <th class="px-2 py-2 text-left border-b">Tmp Lahir</th>
                                <th class="px-2 py-2 text-left border-b">Tgl Lahir</th>
                                <th class="px-2 py-2 text-left border-b">Kelas</th>
                                <th class="px-2 py-2 text-left border-b">Jurusan</th>
                                <th class="px-2 py-2 text-left border-b">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${previewData.map(s => `
                                <tr class="border-b border-outline-variant/20 hover:bg-surface-container-low">
                                    <td class="px-2 py-2">${s.nama_lengkap}</td>
                                    <td class="px-2 py-2">${s.jenis_kelamin || '-'}</td>
                                    <td class="px-2 py-2 font-mono">${s.nis || '-'}</td>
                                    <td class="px-2 py-2 font-mono">${s.is_nisn_temp ? '<span class="text-amber-600" title="NISN kosong di template">⚠️ Auto-gen</span>' : s.nisn}</td>
                                    <td class="px-2 py-2">${s.tempat_lahir || '-'}</td>
                                    <td class="px-2 py-2">${s.tanggal_lahir || '-'}</td>
                                    <td class="px-2 py-2">${s.kelas}</td>
                                    <td class="px-2 py-2">${s.jurusan}</td>
                                    <td class="px-2 py-2">${s.is_nisn_temp ? '<span class="text-amber-600 text-xs">⚠️ NISN perlu diisi</span>' : '<span class="text-green-600 text-xs">✓ Siap upload</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${lebih > 0 ? '<p class="mt-3 text-xs text-on-surface-variant">...dan ' + lebih + ' data lainnya</p>' : ''}
            </div>
            <div class="px-6 py-4 border-t border-outline-variant/30 flex justify-end gap-3">
                <button onclick="tutupPreviewExcel()" class="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Batal</button>
                <button onclick="simpanDataExcelKeDatabase()" class="px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">upload</span>
                    Simpan Semua Data
                </button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function tutupPreviewExcel() {
    const modal = document.getElementById('modalPreviewExcel');
    if (modal) modal.classList.add('hidden');
}

// Fungsi: Simpan data Excel ke Supabase (status = Nonaktif) - VERSI ROBUST
async function simpanDataExcelKeDatabase() {
    if (dataExcelSiswa.length === 0) {
        showToast('Tidak ada data untuk disimpan!', 'error');
        return;
    }
    
    showModalConfirm('Konfirmasi Upload', 
        'Anda akan mengupload ' + dataExcelSiswa.length + ' data siswa.\n\n⚠️ Akun siswa akan berstatus "BELUM GENERATE" dan akan AKTIF otomatis saat QR Code di-generate di menu QR Generator.\n\nLanjutkan?', 
        async function() {
            tutupPreviewExcel();
            showLoading('Menyimpan ' + dataExcelSiswa.length + ' data siswa... (0/' + dataExcelSiswa.length + ')');
            
            try {
                const sb = getSupabase();
                if (!sb) {
                    hideLoading();
                    showToast('❌ Koneksi Supabase tidak tersedia!', 'error');
                    return;
                }
                
                let berhasil = 0;
                let gagal = 0;
                let pesanGagal = [];
                let dilewati = 0;
                
                // Pre-fetch semua NISN dan nama yang sudah ada di database untuk cek cepat
                console.log('🔍 Mengambil data existing untuk pengecekan duplikat...');
                const { data: existingSiswa, error: errExisting } = await sb
                    .from('siswa')
                    .select('id, nisn, nama_lengkap');
                
                const existingNISN = new Set();
                const existingNama = new Map();
                
                if (existingSiswa && !errExisting) {
                    existingSiswa.forEach(s => {
                        existingNISN.add(s.nisn);
                        existingNama.set(s.nama_lengkap.toLowerCase().trim(), s.nisn);
                    });
                    console.log(`📊 Data existing: ${existingSiswa.length} siswa di database`);
                }
                
                for (let i = 0; i < dataExcelSiswa.length; i++) {
                    const siswa = dataExcelSiswa[i];
                    
                    // Update progress loading
                    if ((i + 1) % 10 === 0 || i === dataExcelSiswa.length - 1) {
                        const loadingText = document.getElementById('loadingText');
                        if (loadingText) {
                            loadingText.textContent = 'Menyimpan data... (' + (i + 1) + '/' + dataExcelSiswa.length + ') ✅' + berhasil + ' ❌' + gagal;
                        }
                    }
                    
                    try {
                        // ==========================================
                        // VALIDASI DATA SEBELUM INSERT
                        // ==========================================
                        const errorValidasi = [];
                        if (!siswa.nama_lengkap || siswa.nama_lengkap.length < 2) {
                            errorValidasi.push('Nama tidak valid');
                        }
                        if (!siswa.nisn || siswa.nisn.length < 3) {
                            errorValidasi.push('NISN tidak valid');
                        }
                        if (!siswa.kelas) {
                            errorValidasi.push('Kelas kosong');
                        }
                        if (!siswa.jurusan) {
                            errorValidasi.push('Jurusan kosong');
                        }
                        if (!siswa.jenis_kelamin || !['Laki-laki', 'Perempuan'].includes(siswa.jenis_kelamin)) {
                            errorValidasi.push('Jenis kelamin tidak valid (' + (siswa.jenis_kelamin || 'kosong') + ')');
                        }
                        if (siswa.tanggal_lahir && siswa.tanggal_lahir.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(siswa.tanggal_lahir)) {
                            errorValidasi.push('Format tanggal salah (' + siswa.tanggal_lahir + ')');
                        }
                        
                        if (errorValidasi.length > 0) {
                            gagal++;
                            pesanGagal.push(siswa.nisn + ' [' + siswa.nama_lengkap + '] - Validasi: ' + errorValidasi.join(', '));
                            continue;
                        }
                        
                        // ==========================================
                        // CEK NISN DUPLIKAT (cepat, dari cache)
                        // ==========================================
                        if (existingNISN.has(siswa.nisn)) {
                            dilewati++;
                            pesanGagal.push(siswa.nisn + ' [' + siswa.nama_lengkap + '] - NISN SUDAH ADA di database');
                            continue;
                        }
                        
                        // ==========================================
                        // CEK NAMA DUPLIKAT (peringatan saja)
                        // ==========================================
                        const namaLower = siswa.nama_lengkap.toLowerCase().trim();
                        if (existingNama.has(namaLower)) {
                            console.log('⚠️ Peringatan: Nama "' + siswa.nama_lengkap + '" mirip dengan siswa existing (NISN: ' + existingNama.get(namaLower) + ')');
                        }
                        
                        // ==========================================
                        // INSERT DATA SISWA
                        // ==========================================
                        const dataSiswa = {
                            nama_lengkap: siswa.nama_lengkap,
                            jenis_kelamin: siswa.jenis_kelamin,
                            nis: siswa.nis && siswa.nis.trim() ? siswa.nis.trim() : null,
                            nisn: siswa.nisn,
                            tempat_lahir: siswa.tempat_lahir && siswa.tempat_lahir.trim() ? siswa.tempat_lahir.trim() : null,
                            tanggal_lahir: siswa.tanggal_lahir && siswa.tanggal_lahir.trim() ? siswa.tanggal_lahir.trim() : null,
                            kelas: siswa.kelas,
                            jurusan: siswa.jurusan,
                            status_akun: 'Belum Generate'
                        };
                        
                        console.log('📝 Inserting:', siswa.nisn, '-', siswa.nama_lengkap);
                        console.log('   📦 Data:', JSON.stringify(dataSiswa));
                        
                        const { data: siswaBaru, error: errSiswa } = await sb
                            .from('siswa')
                            .insert(dataSiswa)
                            .select()
                            .single();
                        
                        if (errSiswa) {
                            console.error('❌ Error insert siswa:', siswa.nisn, errSiswa);
                            throw errSiswa;
                        }
                        
                        // ==========================================
                        // INSERT/UPDATE USER
                        // ==========================================
                        const { data: cekUser } = await sb
                            .from('users')
                            .select('id')
                            .eq('username', siswa.nisn)
                            .maybeSingle();
                        
                        if (!cekUser) {
                            const { error: errUser } = await sb.from('users').insert({
                                username: siswa.nisn,
                                password: siswa.nisn,
                                level: 'siswa',
                                id_referensi: siswaBaru.id,
                                status: 'Belum Generate'
                            });
                            if (errUser) {
                                console.error('❌ Error insert user:', siswa.nisn, errUser);
                                throw errUser;
                            }
                        } else {
                            await sb.from('users')
                                .update({ id_referensi: siswaBaru.id, status: 'Belum Generate', level: 'siswa' })
                                .eq('id', cekUser.id);
                        }
                        
                        berhasil++;
                        existingNISN.add(siswa.nisn); // Tambahkan ke cache untuk cek duplikat internal
                        
                    } catch (err) {
                        gagal++;
                        const errMsg = err.message || JSON.stringify(err);
                        pesanGagal.push(siswa.nisn + ' [' + siswa.nama_lengkap + '] - DB: ' + errMsg);
                        console.error('💥 Gagal memproses:', siswa.nisn, siswa.nama_lengkap, err);
                    }
                }
                
                hideLoading();
                dataExcelSiswa = [];
                
                // ==========================================
                // TAMPILKAN HASIL DETAIL
                // ==========================================
                let pesan = '✅ Berhasil: ' + berhasil + ' data';
                if (dilewati > 0) pesan += ' | ⏭️ Dilewati: ' + dilewati + ' (duplikat)';
                if (gagal > 0) pesan += ' | ❌ Gagal: ' + gagal + ' data';
                
                // Tampilkan 3 error pertama di console untuk debugging
                if (pesanGagal.length > 0) {
                    console.log('\n' + '='.repeat(60));
                    console.log('📋 DETAIL MASALAH UPLOAD (' + pesanGagal.length + ' masalah):');
                    console.log('='.repeat(60));
                    pesanGagal.slice(0, 10).forEach((p, idx) => {
                        console.log((idx + 1) + '. ' + p);
                    });
                    if (pesanGagal.length > 10) {
                        console.log('...dan ' + (pesanGagal.length - 10) + ' masalah lainnya');
                    }
                    console.log('='.repeat(60));
                    console.log('💡 Buka Developer Tools (F12) → Console untuk melihat detail lengkap');
                }
                
                // Tampilkan error contoh di toast juga
                if (gagal > 0 && pesanGagal.length > 0) {
                    const contohError = pesanGagal[0].split(' - ').slice(-1)[0];
                    setTimeout(() => {
                        showToast('Contoh error: ' + contohError + ' (lihat F12→Console)', 'error');
                    }, 1500);
                }
                
                showToast(pesan, gagal > 0 ? 'warning' : 'success');
                
                if (typeof catatLog === 'function' && currentUser) {
                    catatLog(currentUser.username, 'Upload Excel', berhasil + ' berhasil, ' + dilewati + ' dilewati, ' + gagal + ' gagal');
                }
                
                if (currentPage === 'masterSiswa') {
                    loadAllSiswa();
                }
                
            } catch (error) {
                hideLoading();
                console.error('💥 FATAL ERROR:', error);
                showToast('Error FATAL: ' + error.message + ' (lihat F12→Console)', 'error');
            }
        });
}

// ============================================================
// ⭐ FUNGSI PENDUKUNG: Aktifkan akun siswa saat QR di-generate ⭐
// Panggil fungsi ini saat QR Code berhasil dibuat untuk siswa
// ============================================================
async function aktifkanAkunSiswa(siswaId, nisn) {
    try {
        const sb = getSupabase();
        
        // Update status di tabel siswa menjadi Aktif
        await sb.from('siswa')
            .update({ status_akun: 'Aktif' })
            .eq('id', siswaId);
        
        // Update status di tabel users menjadi Aktif
        await sb.from('users')
            .update({ status: 'Aktif' })
            .eq('id_referensi', siswaId)
            .eq('level', 'siswa');
        
        console.log('✅ Akun siswa ' + nisn + ' telah diaktifkan');
        return true;
    } catch (err) {
        console.error('Gagal aktifkan akun:', err.message);
        return false;
    }
}
// ============================================================
// AKHIR FITUR UPLOAD EXCEL
// ============================================================


// ============================================================
// ✅ FITUR DATA GURU (CRUD + Generate Akun Login)
// ============================================================
let allGuruData = [];
let guruPage = 1;
const guruPerPage = 10;

async function loadMasterGuru() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div>
            <div class="mb-stack-lg flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 class="text-headline-lg font-headline-lg text-on-surface mb-1">Data Guru</h1>
                    <p class="text-body-md text-on-surface-variant">Kelola data lengkap guru, NIP, NUPTK, dan akun login.</p>
                </div>
                <button onclick="showModalGuru()" class="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm font-bold text-sm">
                    <span class="material-symbols-outlined text-[18px]">add</span>Tambah Guru
                </button>
            </div>
            
            <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-highest mb-stack-md flex flex-col md:flex-row gap-4 items-center">
                <div class="relative w-full md:w-96">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                    <input type="text" id="searchGuru" placeholder="Cari nama, NIP, atau NUPTK..." oninput="filterGuru()"
                        class="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container">
                </div>
                <div class="flex gap-2 w-full md:w-auto flex-wrap justify-center md:justify-start">
<select id="filterJabatanGuru" onchange="filterGuru()" class="w-full md:w-48 px-4 py-2 bg-surface border border-outline-variant rounded-lg">
                        <option value="">Semua Jabatan</option>
                        <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                        <option value="Wali Kelas">Wali Kelas</option>
                        <option value="Kepala Sekolah">Kepala Sekolah</option>
                    </select>
                    <select id="filterStatusGuru" onchange="filterGuru()" class="w-full md:w-40 px-4 py-2 bg-surface border border-outline-variant rounded-lg">
                        <option value="">Semua Status</option>
                        <option value="Aktif">Aktif</option>
                        <option value="Tidak Aktif">Tidak Aktif</option>
                    </select>
                </div>
            </div>
            
            <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-label-md uppercase tracking-wider border-b" style="background: linear-gradient(to bottom right, #004349, #0d5c63); color: white; whitespace-nowrap">
                                <th class="p-3 w-12 text-center">No</th>
                                <th class="p-3">Nama Lengkap</th>
                                <th class="p-3">NIP</th>
                                <th class="p-3">NUPTK</th>
                                <th class="p-3 w-20 text-center">JK</th>
                                <th class="p-3">Jabatan</th>
                                <th class="p-3 w-36 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="tableGuru" class="text-body-md text-on-surface">
                            <tr><td colspan="7" class="p-8 text-center text-on-surface-variant">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="flex justify-between items-center p-4 bg-surface border-t">
                    <span class="text-sm text-on-surface-variant" id="guruPaginationInfo">Menampilkan 0 data</span>
                    <div class="flex gap-1" id="guruPaginationButtons"></div>
                </div>
            </div>
        </div>
        
        <!-- MODAL TAMBAH/EDIT GURU - FORM LENGKAP -->
        <div id="modalGuru" class="fixed inset-0 z-[9997] hidden">
            <div class="modal-overlay absolute inset-0" onclick="closeModalGuru()"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
                <div class="p-6 border-b flex items-center justify-between shrink-0 rounded-t-xl" 
                     style="background: linear-gradient(to bottom right, #004349, #0d5c63);">
                    <h3 class="font-headline-sm font-bold flex items-center gap-2" style="color: white;">
                        <span class="material-symbols-outlined" style="color: white;">person_add</span>
                        <span id="modalGuruTitle">Tambah Guru Baru</span>
                    </h3>
                    <button onclick="closeModalGuru()" class="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <span class="material-symbols-outlined" style="color: white;">close</span>
                    </button>
                </div>
                <div class="overflow-y-auto p-6">
                    <form id="formGuru" onsubmit="event.preventDefault(); simpanDataGuru();" class="space-y-5">
                    <input type="hidden" id="guruId">
                    <input type="hidden" id="guruUserId">
                    
                    <!-- IDENTITAS DASAR -->
                    <div>
                        <h4 class="font-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30">Identitas Dasar</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="block mb-2 font-label-md">Nama Lengkap *</label>
                                <input type="text" id="guruNama" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-container focus:border-primary">
                            </div>
                            <div>
                                <label class="block mb-2 font-label-md">NIP</label>
                                <input type="text" id="guruNip" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 font-mono">
                            </div>
                            <div>
                                <label class="block mb-2 font-label-md">NUPTK</label>
                                <input type="text" id="guruNuptk" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 font-mono">
                            </div>
                            <div>
                                <label class="block mb-2 font-label-md">Jenis Kelamin</label>
                                <select id="guruJK" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                                    <option value="">-- Pilih --</option>
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                            </div>
                            <div>
                                <label class="block mb-2 font-label-md">Tempat Lahir</label>
                                <input type="text" id="guruTempatLahir" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                            </div>
                            <div>
                                <label class="block mb-2 font-label-md">Tanggal Lahir</label>
                                <input type="date" id="guruTanggalLahir" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                            </div>
                        </div>
                    </div>
                    
                    <!-- KONTAK & ALAMAT -->
                    <div>
                        <h4 class="font-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30">Kontak & Alamat</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block mb-2 font-label-md">Email</label>
                                <input type="email" id="guruEmail" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                            </div>
                            <div>
                                <label class="block mb-2 font-label-md">Telepon</label>
                                <input type="tel" id="guruTelepon" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block mb-2 font-label-md">Alamat Lengkap</label>
                                <textarea id="guruAlamat" rows="2" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 resize-none"></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <!-- KEPEGAWAIAN -->
                    <div>
                        <h4 class="font-label-md text-primary uppercase tracking-wide mb-3 pb-2 border-b border-outline-variant/30">Kepegawaian</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block mb-2 font-label-md">Jabatan</label>
                                <select id="guruJabatan" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                                    <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                                    <option value="Wali Kelas">Wali Kelas</option>
                                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                                    <option value="Wakil Kepala Sekolah">Wakil Kepala Sekolah</option>
                                    <option value="Kepala Jurusan">Kepala Jurusan</option>
                                    <option value="Staf TU">Staf TU</option>
                                </select>
                            </div>
                            <div>
                                <label class="block mb-2 font-label-md">Mata Pelajaran</label>
                                <input type="text" id="guruMapel" placeholder="Misal: Matematika" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                            </div>
                            <div>
                                <label class="block mb-2 font-label-md">Status Kepegawaian</label>
                                <select id="guruStatusKepegawaian" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                                    <option value="PNS">PNS</option>
                                    <option value="PPPK">PPPK</option>
                                    <option value="Honorer">Honorer</option>
                                    <option value="Kontrak">Kontrak</option>
                                    <option value="Tetap Yayasan">Tetap Yayasan</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onclick="closeModalGuru()" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Batal</button>
                        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 shadow-sm">Simpan</button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    `;
    
    await loadAllGuru();
}

async function loadAllGuru() {
    try {
        const sb = getSupabase();
        const { data } = await sb.from('profil_guru').select('*,user:user_id(*)').order('nama_lengkap');
        allGuruData = data || [];
        filterGuru();
    } catch (e) {
        showToast('Gagal memuat data guru: ' + e.message, 'error');
    }
}

function filterGuru() {
    const search = (document.getElementById('searchGuru')?.value || '').toLowerCase();
    const jabatan = document.getElementById('filterJabatanGuru')?.value || '';
    const status = document.getElementById('filterStatusGuru')?.value || '';
    
    let filtered = allGuruData.filter(g => {
        const matchSearch = !search || 
            (g.nama_lengkap || '').toLowerCase().includes(search) ||
            (g.nip || '').includes(search) ||
            (g.nuptk || '').includes(search);
        const matchJabatan = !jabatan || g.jabatan === jabatan;
        const matchStatus = !status || g.status_aktif === status;
        return matchSearch && matchJabatan && matchStatus;
    });
    
    guruPage = 1;
    renderGuruTable(filtered);
}

function renderGuruTable(data) {
    const tbody = document.getElementById('tableGuru');
    const start = (guruPage - 1) * guruPerPage;
    const pageData = data.slice(start, start + guruPerPage);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-on-surface-variant">Tidak ada data guru</td></tr>';
        document.getElementById('guruPaginationInfo').textContent = 'Menampilkan 0 data';
        document.getElementById('guruPaginationButtons').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = pageData.map((g, i) => {
        const akunWarna = g.user ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
        const jk = g.jenis_kelamin ? g.jenis_kelamin.charAt(0) : '-';
        const jkWarna = g.jenis_kelamin === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 
                       g.jenis_kelamin === 'Perempuan' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600';
        return `
        <tr class="border-b border-surface-container-highest table-row-hover">
            <td class="p-3 text-center text-on-surface-variant">${start + i + 1}</td>
            <td class="p-3 font-semibold">${g.nama_lengkap || '-'}</td>
            <td class="p-3 font-mono text-sm">${g.nip || '-'}</td>
            <td class="p-3 font-mono text-sm">${g.nuptk || '-'}</td>
            <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${jkWarna}">${jk}</span></td>
            <td class="p-3">${g.jabatan || '-'}</td>
            <td class="p-3 text-center">
                <button onclick="editGuru('${g.id}')" class="p-1.5 text-primary hover:bg-primary/10 rounded" title="Edit">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                ${!g.user ? `<button onclick="buatAkunGuru('${g.id}')" class="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Buat Akun">
                    <span class="material-symbols-outlined text-[18px]">person_add</span>
                </button>` : ''}
                <button onclick="hapusGuru('${g.id}')" class="p-1.5 text-error hover:bg-error/10 rounded" title="Hapus">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </td>
        </tr>`;
    }).join('');
    
    document.getElementById('guruPaginationInfo').textContent = `Menampilkan ${start + 1}-${Math.min(start + guruPerPage, data.length)} dari ${data.length} data`;
    const totalPages = Math.ceil(data.length / guruPerPage);
    document.getElementById('guruPaginationButtons').innerHTML = renderPaginationHTML(guruPage, totalPages, 'guruPage', 'filterGuru');
}

function showModalGuru() {
    document.getElementById('modalGuruTitle').textContent = 'Tambah Guru Baru';
    document.getElementById('formGuru').reset();
    document.getElementById('guruId').value = '';
    document.getElementById('guruUserId').value = '';
    document.getElementById('modalGuru').classList.remove('hidden');
}

function closeModalGuru() {
    document.getElementById('modalGuru').classList.add('hidden');
}

async function editGuru(id) {
    const g = allGuruData.find(x => String(x.id) === String(id));
    if (!g) return;
    
    document.getElementById('modalGuruTitle').textContent = 'Edit Data Guru';
    document.getElementById('guruId').value = g.id;
    document.getElementById('guruUserId').value = g.user_id || '';
    document.getElementById('guruNama').value = g.nama_lengkap || '';
    document.getElementById('guruNip').value = g.nip || '';
    document.getElementById('guruNuptk').value = g.nuptk || '';
    document.getElementById('guruJK').value = g.jenis_kelamin || '';
    document.getElementById('guruTempatLahir').value = g.tempat_lahir || '';
    document.getElementById('guruTanggalLahir').value = g.tanggal_lahir || '';
    document.getElementById('guruEmail').value = g.email || '';
    document.getElementById('guruTelepon').value = g.telepon || '';
    document.getElementById('guruAlamat').value = g.alamat || '';
    document.getElementById('guruJabatan').value = g.jabatan || 'Guru Mata Pelajaran';
    document.getElementById('guruMapel').value = g.mata_pelajaran || '';
    document.getElementById('guruStatusKepegawaian').value = g.status_kepegawaian || 'PNS';
    document.getElementById('guruStatus').value = g.status_aktif || 'Aktif';
    document.getElementById('modalGuru').classList.remove('hidden');
}

async function simpanDataGuru() {
    showLoading('Menyimpan data guru...');
    try {
        const sb = getSupabase();
        const id = document.getElementById('guruId').value;
        
        const dataGuru = {
            nama_lengkap: document.getElementById('guruNama').value.trim(),
            nip: document.getElementById('guruNip').value.trim() || null,
            nuptk: document.getElementById('guruNuptk').value.trim() || null,
            jenis_kelamin: document.getElementById('guruJK').value || null,
            tempat_lahir: document.getElementById('guruTempatLahir').value.trim() || null,
            tanggal_lahir: document.getElementById('guruTanggalLahir').value || null,
            email: document.getElementById('guruEmail').value.trim() || null,
            telepon: document.getElementById('guruTelepon').value.trim() || null,
            alamat: document.getElementById('guruAlamat').value.trim() || null,
            jabatan: document.getElementById('guruJabatan').value,
            mata_pelajaran: document.getElementById('guruMapel').value.trim() || null,
            status_kepegawaian: document.getElementById('guruStatusKepegawaian').value,
            status_aktif: 'Aktif'
        };
        
        if (!dataGuru.nama_lengkap) {
            hideLoading();
            showToast('Nama lengkap wajib diisi!', 'error');
            return;
        }
        
        // ===== LOGIKA BARU SESUAI PERMINTAAN =====
        // Data Guru HANYA menyimpan data master ke tabel 'profil_guru'
        // Akun login dibuat TERSEPISAH di menu "Akun Pengguna"
        // (pilih level = Guru, lalu pilih nama guru dari referensi)
        
        if (id) {
            // UPDATE data guru yang sudah ada
            const { error } = await sb.from('profil_guru').update(dataGuru).eq('id', id);
            if (error) throw error;
            hideLoading();
            closeModalGuru();
            showToast('Data guru berhasil diperbarui!', 'success');
        } else {
            // INSERT data guru BARU
            const { error } = await sb.from('profil_guru').insert(dataGuru);
            if (error) {
                // Jika error karena user_id NOT NULL, berikan pesan jelas
                if (error.message && error.message.includes('user_id') && error.message.includes('null')) {
                    throw new Error('Kolom user_id di tabel profil_guru belum diubah.\nSilakan buka Supabase → tabel profil_guru → ubah kolom user_id dari NOT NULL menjadi NULLABLE (boleh kosong).');
                }
                throw error;
            }
            hideLoading();
            closeModalGuru();
            showToast('✅ Data guru berhasil disimpan!\nBuat akun loginnya di menu: Akun Pengguna → Tambah Akun → pilih level "Guru"', 'success');
        }
        
        await loadAllGuru();
        if (currentUser) catatLog(currentUser.username, id ? 'Edit Guru' : 'Tambah Guru', dataGuru.nama_lengkap);
        
    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

async function buatAkunGuru(id) {
    const g = allGuruData.find(x => String(x.id) === String(id));
    if (!g) return;
    
    const username = g.nip || g.nuptk;
    if (!username) {
        showToast('Guru ini belum memiliki NIP atau NUPTK. Edit data terlebih dahulu.', 'warning');
        return;
    }
    
    showModalConfirm('Buat Akun Login', 
        'Buat akun login untuk ' + g.nama_lengkap + '?\nUsername: ' + username + '\nPassword: 123456',
        async function() {
            showLoading('Membuat akun...');
            try {
                const sb = getSupabase();
                const { data: userBaru, error } = await sb.from('users').insert({
                    username: username,
                    password: '123456',
                    level: 'guru',
                    status: 'Aktif',
                    id_referensi: g.id
                }).select().single();
                
                if (error) throw error;
                
                await sb.from('profil_guru').update({ user_id: userBaru.id }).eq('id', g.id);
                
                hideLoading();
                showToast('✅ Akun berhasil dibuat! Username: ' + username, 'success');
                await loadAllGuru();
                catatLog(currentUser.username, 'Buat Akun Guru', g.nama_lengkap);
            } catch (e) {
                hideLoading();
                showToast('Gagal: ' + e.message, 'error');
            }
        });
}

async function hapusGuru(id) {
    const g = allGuruData.find(x => String(x.id) === String(id));
    if (!g) return;
    
    showModalConfirm('Hapus Data Guru', 
        'Yakin ingin menghapus ' + g.nama_lengkap + '?\nData akun login juga akan ikut terhapus.',
        async function() {
            showLoading('Menghapus...');
            try {
                const sb = getSupabase();
                // Hapus akun user dulu jika ada
                if (g.user_id) {
                    await sb.from('users').delete().eq('id', g.user_id);
                }
                // Hapus profil guru
                await sb.from('profil_guru').delete().eq('id', id);
                
                hideLoading();
                showToast('Data guru berhasil dihapus!', 'success');
                await loadAllGuru();
                catatLog(currentUser.username, 'Hapus Guru', g.nama_lengkap);
            } catch (e) {
                hideLoading();
                showToast('Gagal: ' + e.message, 'error');
            }
        });
}
// ============================================================
// ✅ AKHIR FITUR DATA GURU
// ============================================================


// ============================================================
// ✅ MENU AKUN PENGGUNA - Terpusat (Admin, Guru, Siswa)
// ============================================================
let allAkunData = [];
let akunPage = 1;
let akunTabAktif = 'semua';
const akunPerPage = 10;
const DOMAIN_EMAIL = 'presensiqr.sch.id';
const PASSWORD_DEFAULT = '12345678';

// Fungsi bantu: buat username email dari nama
function buatUsernameDariNama(nama, level) {
    if (!nama) return '';
    // Untuk admin, gunakan format khusus
    if (level === 'admin') {
        return 'administrator@' + DOMAIN_EMAIL;
    }
    // Bersihkan nama: lowercase, ganti spasi dengan titik, hapus karakter khusus
    let username = nama.toLowerCase().trim();
    username = username.replace(/[^a-z0-9\s]/g, ''); // Hanya huruf, angka, spasi
    username = username.replace(/\s+/g, ''); // Spasi jadi titik
    username = username.replace(/\.+/g, '.'); // Hilangkan titik ganda
    username = username.replace(/^\.|\.$/g, ''); // Hilangkan titik di awal/akhir
    if (!username) return '';
    return username + '@' + DOMAIN_EMAIL;
}

async function loadAkunPengguna() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div>
            <div class="mb-stack-lg flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 class="text-headline-lg font-headline-lg text-on-surface mb-1">Akun Pengguna</h1>
                    <p class="text-body-md text-on-surface-variant">Kelola akun login untuk Admin, Guru, dan Siswa secara terpusat.</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="showModalGenerateMasal()" class="flex items-center justify-center gap-2 px-4 py-2 bg-surface-container-lowest border border-primary text-primary rounded-lg hover:bg-primary/5 shadow-sm font-bold text-sm">
                        <span class="material-symbols-outlined text-[18px]">bolt</span>Generate Masal
                    </button>
                    <button onclick="showModalAkun()" class="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm font-bold text-sm">
                        <span class="material-symbols-outlined text-[18px]">add</span>Tambah Akun
                    </button>
                </div>
            </div>
            
            <!-- TAB FILTER -->
            <div class="flex gap-1 mb-stack-md bg-surface-container p-1 rounded-lg w-fit">
                <button onclick="gantiTabAkun('semua')" id="tab-semua" class="akun-tab px-4 py-2 rounded-md text-sm font-medium transition-all bg-white text-primary shadow-sm">
                    Semua Akun
                </button>
                <button onclick="gantiTabAkun('admin')" id="tab-admin" class="akun-tab px-4 py-2 rounded-md text-sm font-medium transition-all text-on-surface-variant hover:bg-white/50">
                    Admin
                </button>
                <button onclick="gantiTabAkun('guru')" id="tab-guru" class="akun-tab px-4 py-2 rounded-md text-sm font-medium transition-all text-on-surface-variant hover:bg-white/50">
                    Guru
                </button>
                <button onclick="gantiTabAkun('siswa')" id="tab-siswa" class="akun-tab px-4 py-2 rounded-md text-sm font-medium transition-all text-on-surface-variant hover:bg-white/50">
                    Siswa
                </button>
            </div>
            
            <!-- FILTER & PENCARIAN -->
            <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-surface-container-highest mb-stack-md flex flex-col md:flex-row gap-4 items-center">
                <div class="relative w-full md:w-96">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                    <input type="text" id="searchAkun" placeholder="Cari username atau nama..." oninput="filterAkun()"
                        class="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container">
                </div>
                <div class="flex gap-2 w-full md:w-auto">
                    <select id="filterStatusAkun" onchange="filterAkun()" class="w-full md:w-40 px-4 py-2 bg-surface border border-outline-variant rounded-lg">
                        <option value="">Semua Status</option>
                        <option value="Aktif">Aktif</option>
                        <option value="Tidak Aktif">Tidak Aktif</option>
                    </select>
                </div>
            </div>
            
            <!-- TABEL -->
            <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-label-md uppercase tracking-wider border-b" style="background: linear-gradient(to bottom right, #004349, #0d5c63); color: white; whitespace-nowrap">
                                <th class="p-3 w-12 text-center">No</th>
                                <th class="p-3">Username</th>
                                <th class="p-3 w-28 text-center">Level</th>
                                <th class="p-3">Nama Pengguna</th>
                                <th class="p-3 w-24 text-center">Status</th>
                                <th class="p-3 w-44 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="tableAkun" class="text-body-md text-on-surface">
                            <tr><td colspan="6" class="p-8 text-center text-on-surface-variant">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="flex justify-between items-center p-4 bg-surface border-t">
                    <span class="text-sm text-on-surface-variant" id="akunPaginationInfo">Menampilkan 0 data</span>
                    <div class="flex gap-1" id="akunPaginationButtons"></div>
                </div>
            </div>
        </div>
        
        <!-- MODAL TAMBAH/EDIT AKUN -->
        <div id="modalAkun" class="fixed inset-0 z-[9997] hidden">
            <div class="modal-overlay absolute inset-0" onclick="closeModalAkun()"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
                <div class="p-6 border-b flex items-center justify-between shrink-0 rounded-t-xl" 
                     style="background: linear-gradient(to bottom right, #004349, #0d5c63);">
                    <h3 class="font-headline-sm font-bold flex items-center gap-2" style="color: white;">
                        <span class="material-symbols-outlined" style="color: white;">person_add</span>
                        <span id="modalAkunTitle">Tambah Akun Baru</span>
                    </h3>
                    <button onclick="closeModalAkun()" class="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <span class="material-symbols-outlined" style="color: white;">close</span>
                    </button>
                </div>
                <div class="overflow-y-auto p-6">
                    <form id="formAkun" onsubmit="event.preventDefault(); simpanAkun();" class="space-y-4">
                    <input type="hidden" id="akunId">
                    
                    <div>
                        <label class="block mb-2 font-label-md">Level Pengguna *</label>
                        <select id="akunLevel" onchange="updateSaranUsername()" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                            <option value="">-- Pilih Level --</option>
                            <option value="admin">Admin</option>
                            <option value="guru">Guru</option>
                            <option value="siswa">Siswa</option>
                        </select>
                    </div>
                    
                    <div id="fieldReferensi" style="display:none;">
                        <label class="block mb-2 font-label-md" id="labelReferensi">Pilih Guru</label>
                        <!-- CUSTOM DROPDOWN: search ada di dalam popup -->
                        <div class="custom-dropdown relative" id="customDropdownReferensi">
                            <div class="dropdown-toggle w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 cursor-pointer flex items-center justify-between hover:border-primary transition-colors"
                                 onclick="toggleCustomDropdown(event)">
                                <span id="dropdownLabel" class="text-on-surface-variant">-- Pilih --</span>
                                <span class="material-symbols-outlined text-on-surface-variant text-base">arrow_drop_down</span>
                            </div>
                            <div class="dropdown-menu absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl z-50 hidden overflow-hidden">
                                <div class="p-2 border-b border-outline-variant/30 bg-surface-container-low">
                                    <div class="relative">
                                        <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-base">search</span>
                                        <input type="text" id="searchReferensi" placeholder="Cari nama atau NISN..." oninput="filterReferensiCustom()"
                                            class="w-full pl-9 pr-3 py-2 bg-surface-bright border border-outline-variant rounded-md text-sm focus:outline-none focus:border-primary">
                                    </div>
                                </div>
                                <div id="dropdownOptions" class="max-h-60 overflow-y-auto">
                                    <!-- Opsi akan diisi oleh JavaScript -->
                                </div>
                            </div>
                        </div>
                        <input type="hidden" id="akunReferensi" value="">
                        <p class="text-xs text-on-surface-variant mt-1">Klik dropdown, ketik untuk mencari, lalu pilih nama</p>
                    </div>
                    
                    <div>
                        <label class="block mb-2 font-label-md">Username *</label>
                        <input type="text" id="akunUsername" required placeholder="nama@presensiqr.sch.id" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 font-mono">
                        <p class="text-xs text-on-surface-variant mt-1">Format: <code class="bg-surface-container px-1.5 py-0.5 rounded">nama@presensiqr.sch.id</code></p>
                    </div>
                    
                    <div>
                        <label class="block mb-2 font-label-md">Password *</label>
                        <input type="text" id="akunPassword" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 font-mono" value="${PASSWORD_DEFAULT}">
                        <p class="text-xs text-on-surface-variant mt-1">Password default: <code class="bg-surface-container px-1.5 py-0.5 rounded">${PASSWORD_DEFAULT}</code></p>
                    </div>
                    
                    <div>
                        <label class="block mb-2 font-label-md">Status</label>
                        <select id="akunStatus" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                            <option value="Aktif">Aktif</option>
                            <option value="Tidak Aktif">Tidak Aktif</option>
                        </select>
                    </div>
                    
                    <div class="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <p class="text-sm text-amber-800 mb-1 font-medium">⚠️ Catatan</p>
                        <p class="text-xs text-amber-700">Untuk Guru/Siswa, sebaiknya data master sudah dibuat terlebih dahulu di menu Data Guru / Data Siswa agar akun bisa terhubung.</p>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onclick="closeModalAkun()" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Batal</button>
                        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 shadow-sm">Simpan Akun</button>
                    </div>
                </form>
                </div>
            </div>
        </div>
        
        <!-- MODAL GENERATE MASAL -->
        <div id="modalGenerateMasal" class="fixed inset-0 z-[9997] hidden">
            <div class="modal-overlay absolute inset-0" onclick="closeModalGenerateMasal()"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest rounded-xl shadow-xl max-w-lg w-full mx-4">
                <div class="p-6 border-b flex items-center justify-between" 
                     style="background: linear-gradient(to bottom right, #004349, #0d5c63);">
                    <h3 class="font-headline-sm font-bold flex items-center gap-2" style="color: white;">
                        <span class="material-symbols-outlined" style="color: white;">bolt</span>
                        Generate Akun Masal
                    </h3>
                    <button onclick="closeModalGenerateMasal()" class="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <span class="material-symbols-outlined" style="color: white;">close</span>
                    </button>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="block mb-2 font-label-md">Generate untuk level *</label>
                        <select id="generateLevel" onchange="cekDataGenerate()" class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5">
                            <option value="">-- Pilih Level --</option>
                            <option value="guru">Guru (yang belum punya akun)</option>
                            <option value="siswa">Siswa (yang belum punya akun)</option>
                        </select>
                    </div>
                    
                    <div id="infoGenerate" class="hidden bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p class="text-sm text-blue-800 mb-2 font-medium">📋 Informasi Generate</p>
                        <div id="isiInfoGenerate" class="text-xs text-blue-700 space-y-1"></div>
                    </div>
                    
                    <div class="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <p class="text-sm text-amber-800 mb-1 font-medium">📌 Format yang akan dibuat</p>
                        <p class="text-xs text-amber-700 space-y-0.5">
                            • Username: <code>nama@${DOMAIN_EMAIL}</code><br>
                            • Password: <code>${PASSWORD_DEFAULT}</code> (semua sama)<br>
                            • Hanya data yang <b>BELUM</b> punya akun yang akan dibuatkan
                        </p>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-2 border-t">
                        <button type="button" onclick="closeModalGenerateMasal()" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Batal</button>
                        <button type="button" onclick="jalankanGenerateMasal()" id="btnGenerateMasal" disabled class="px-5 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            Mulai Generate
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- MODAL RESET PASSWORD -->
        <div id="modalResetPassword" class="fixed inset-0 z-[9997] hidden">
            <div class="modal-overlay absolute inset-0" onclick="closeModalResetPassword()"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest rounded-xl shadow-xl max-w-md w-full mx-4">
                <div class="p-6 border-b flex items-center justify-between" 
                     style="background: linear-gradient(to bottom right, #004349, #0d5c63);">
                    <h3 class="font-headline-sm font-bold flex items-center gap-2" style="color: white;">
                        <span class="material-symbols-outlined" style="color: white;">key</span>
                        Reset Password
                    </h3>
                    <button onclick="closeModalResetPassword()" class="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <span class="material-symbols-outlined" style="color: white;">close</span>
                    </button>
                </div>
                <div class="p-6 space-y-4">
                    <input type="hidden" id="resetAkunId">
                    <p class="text-sm text-on-surface-variant">Reset password untuk akun:</p>
                    <p id="resetAkunUsername" class="font-mono text-on-surface font-semibold bg-surface-container p-3 rounded-lg"></p>
                    <div>
                        <label class="block mb-2 font-label-md">Password Baru *</label>
                        <input type="text" id="resetPasswordBaru" required class="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 font-mono" value="${PASSWORD_DEFAULT}">
                    </div>
                    <div class="flex justify-end gap-3 pt-2 border-t">
                        <button type="button" onclick="closeModalResetPassword()" class="px-5 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest">Batal</button>
                        <button type="button" onclick="simpanResetPassword()" class="px-5 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 shadow-sm">Reset Password</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    await loadAllAkun();
}

async function loadAllAkun() {
    try {
        const sb = getSupabase();
        
        // Load SEMUA data sekaligus (paralel) - LEBIH CEPAT
        const [usersResult, siswaResult, guruResult, adminResult] = await Promise.all([
            sb.from('users').select('*').order('username'),
            sb.from('siswa').select('id, nama_lengkap'),
            sb.from('profil_guru').select('id, user_id, nama_lengkap'),
            sb.from('profil_admin').select('user_id, nama_lengkap')
        ]);
        
        allAkunData = usersResult.data || [];
        
        // Buat mapping untuk pencarian cepat (tanpa query ulang)
        const mapSiswa = {};
        const mapGuruByUserId = {};
        const mapGuruById = {};
        const mapAdmin = {};
        
        (siswaResult.data || []).forEach(s => { mapSiswa[s.id] = s.nama_lengkap; });
        (guruResult.data || []).forEach(g => { 
            if (g.user_id) mapGuruByUserId[g.user_id] = g.nama_lengkap;
            mapGuruById[g.id] = { nama: g.nama_lengkap, user_id: g.user_id };
        });
        (adminResult.data || []).forEach(a => { mapAdmin[a.user_id] = a.nama_lengkap; });
        
        // Simpan mapping untuk dipakai fungsi lain
        window._mapSiswa = mapSiswa;
        window._mapGuruByUserId = mapGuruByUserId;
        window._mapGuruById = mapGuruById;
        window._mapAdmin = mapAdmin;
        
        // Isi nama_pengguna secara lokal (SANGAT CEPAT)
        for (const u of allAkunData) {
            if (u.level === 'siswa' && u.id_referensi) {
                u.nama_pengguna = mapSiswa[u.id_referensi] || '-';
            } else if (u.level === 'guru') {
                u.nama_pengguna = mapGuruByUserId[u.id] || '-';
            } else if (u.level === 'admin') {
                u.nama_pengguna = mapAdmin[u.id] || 'Administrator';
            } else {
                u.nama_pengguna = '-';
            }
        }
        
        filterAkun();
    } catch (e) {
        showToast('Gagal memuat data akun: ' + e.message, 'error');
    }
}

function gantiTabAkun(tab) {
    akunTabAktif = tab;
    akunPage = 1;
    
    // Update style tab
    document.querySelectorAll('.akun-tab').forEach(btn => {
        btn.classList.remove('bg-white', 'text-primary', 'shadow-sm');
        btn.classList.add('text-on-surface-variant', 'hover:bg-white/50');
    });
    const aktif = document.getElementById('tab-' + tab);
    if (aktif) {
        aktif.classList.add('bg-white', 'text-primary', 'shadow-sm');
        aktif.classList.remove('text-on-surface-variant', 'hover:bg-white/50');
    }
    
    filterAkun();
}

function filterAkun() {
    const search = (document.getElementById('searchAkun')?.value || '').toLowerCase();
    const status = document.getElementById('filterStatusAkun')?.value || '';
    
    let filtered = allAkunData.filter(u => {
        const matchTab = akunTabAktif === 'semua' || u.level === akunTabAktif;
        const matchSearch = !search || 
            (u.username || '').toLowerCase().includes(search) ||
            (u.nama_pengguna || '').toLowerCase().includes(search);
        
        // ===== PERUBAHAN LOGIKA FILTER STATUS =====
        // - Jika filter kosong ("Semua Status"): tampilkan semua
        // - Jika filter "Aktif": hanya yang status === 'Aktif'
        // - Jika filter "Tidak Aktif": SEMUA yang BUKAN 'Aktif' 
        //   (termasuk 'Belum Generate', 'Tidak Aktif', dll)
        let matchStatus = true;
        if (status) {
            if (status === 'Aktif') {
                matchStatus = u.status === 'Aktif';
            } else {
                // "Tidak Aktif" mencakup semua yang BUKAN aktif
                matchStatus = u.status !== 'Aktif';
            }
        }
        // ===== AKHIR PERUBAHAN =====
        
        return matchTab && matchSearch && matchStatus;
    });
    
    renderAkunTable(filtered);
}

function renderAkunTable(data) {
    const tbody = document.getElementById('tableAkun');
    const start = (akunPage - 1) * akunPerPage;
    const pageData = data.slice(start, start + akunPerPage);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-on-surface-variant">Tidak ada data akun</td></tr>';
        document.getElementById('akunPaginationInfo').textContent = 'Menampilkan 0 data';
        document.getElementById('akunPaginationButtons').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = pageData.map((u, i) => {
        const levelWarna = {
            'admin': 'bg-blue-100 text-blue-700',
            'guru': 'bg-purple-100 text-purple-700',
            'siswa': 'bg-orange-100 text-orange-700'
        };
        // ===== PERUBAHAN TAMPILAN STATUS =====
        // Jika status = 'Aktif'  → tampilkan "Aktif" (hijau)
        // Selain itu (termasuk 'Belum Generate', 'Tidak Aktif', dll)
        //                  → tampilkan "Tidak Aktif" (abu-abu)
        const isAktif = u.status === 'Aktif';
        const statusTampil = isAktif ? 'Aktif' : 'Tidak Aktif';
        const statusWarna = isAktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
        // ===== AKHIR PERUBAHAN =====
        const levelLabel = { 'admin': 'Admin', 'guru': 'Guru', 'siswa': 'Siswa' };
        
        return `
        <tr class="border-b border-surface-container-highest table-row-hover">
            <td class="p-3 text-center text-on-surface-variant">${start + i + 1}</td>
            <td class="p-3 font-mono text-sm">${u.username || '-'}</td>
            <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${levelWarna[u.level] || 'bg-gray-100'}">${levelLabel[u.level] || u.level}</span></td>
            <td class="p-3">${u.nama_pengguna || '-'}</td>
            <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusWarna}">${statusTampil}</span></td>
            <td class="p-3 text-center">
                <button onclick="editAkun('${u.id}')" class="p-1.5 text-primary hover:bg-primary/10 rounded" title="Edit">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onclick="resetPasswordAkun('${u.id}', '${u.username}')" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Reset Password">
                    <span class="material-symbols-outlined text-[18px]">key</span>
                </button>
                <button onclick="hapusAkun('${u.id}', '${u.username}')" class="p-1.5 text-error hover:bg-error/10 rounded" title="Hapus">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </td>
        </tr>`;
    }).join('');
    
    document.getElementById('akunPaginationInfo').textContent = `Menampilkan ${start + 1}-${Math.min(start + akunPerPage, data.length)} dari ${data.length} data`;
    const totalPages = Math.ceil(data.length / akunPerPage);
    document.getElementById('akunPaginationButtons').innerHTML = renderPaginationHTML(akunPage, totalPages, 'akunPage', 'filterAkun');
}

// ============================================================
// MODAL TAMBAH/EDIT AKUN
// ============================================================
function showModalAkun() {
    document.getElementById('modalAkunTitle').textContent = 'Tambah Akun Baru';
    document.getElementById('formAkun').reset();
    document.getElementById('akunId').value = '';
    document.getElementById('akunPassword').value = PASSWORD_DEFAULT;
    document.getElementById('akunLevel').disabled = false; // ⭐ Pastikan level bisa dipilih
    document.getElementById('fieldReferensi').style.display = 'none';
    resetCustomDropdown(); // Reset dropdown referensi
    document.getElementById('modalAkun').classList.remove('hidden');
}

function closeModalAkun() {
    document.getElementById('modalAkun').classList.add('hidden');
    document.getElementById('akunLevel').disabled = false; // ⭐ Aktifkan kembali level
}

async function updateSaranUsername() {
    const level = document.getElementById('akunLevel').value;
    const fieldRef = document.getElementById('fieldReferensi');
    const labelRef = document.getElementById('labelReferensi');
    resetCustomDropdown();
    const selectRef = document.getElementById('akunReferensi');
    
    if (!level) {
        fieldRef.style.display = 'none';
        return;
    }
    
    if (level === 'admin') {
        fieldRef.style.display = 'none';
        document.getElementById('akunUsername').value = 'administrator@' + DOMAIN_EMAIL;
        return;
    }
    
    // Tampilkan field referensi untuk guru/siswa
    fieldRef.style.display = 'block';
    labelRef.textContent = level === 'guru' ? 'Pilih Guru' : 'Pilih Siswa';
    
    // Bersihkan kolom pencarian dan select
    document.getElementById('searchReferensi').value = '';
    
    // Load data referensi (cepat, dari mapping atau DB)
    if (!window._refData || window._refDataLevel !== level) {
        try {
            const sb = getSupabase();
            window._refData = [];
            
            if (level === 'guru') {
                if (window._mapGuruById) {
                    Object.keys(window._mapGuruById).forEach(id => {
                        const g = window._mapGuruById[id];
                        if (!g.user_id) {
                            window._refData.push({ id: parseInt(id), nama: g.nama, kode: g.nip || '' });
                        }
                    });
                } else {
                    const { data } = await sb.from('profil_guru').select('id, nama_lengkap, nip, user_id').order('nama_lengkap');
                    if (data) {
                        data.forEach(g => {
                            if (g.user_id) return;
                            window._refData.push({ id: g.id, nama: g.nama_lengkap, kode: g.nip || '' });
                        });
                    }
                }
            } else if (level === 'siswa') {
                const { data } = await sb.from('siswa').select('id, nama_lengkap, nisn, user_id').order('nama_lengkap');
                if (data) {
                    data.forEach(s => {
                        if (s.user_id) return;
                        window._refData.push({ id: s.id, nama: s.nama_lengkap, kode: s.nisn || '' });
                    });
                }
            }
            window._refDataLevel = level;
        } catch (e) {
            showToast('Gagal memuat data referensi: ' + e.message, 'error');
            return;
        }
    }
    
    // Isi dropdown dengan semua data
    isiDropdownReferensi(window._refData);
}

// Isi custom dropdown dengan data - format: "Nama(Kode)"
function isiDropdownReferensi(dataList) {
    const container = document.getElementById('dropdownOptions');
    if (!container) return;
    
    if (dataList.length === 0) {
        container.innerHTML = '<div class="dropdown-empty">Tidak ada data yang cocok</div>';
        return;
    }
    
    container.innerHTML = '';
    dataList.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-option';
        div.dataset.id = item.id;
        div.dataset.nama = item.nama;
        div.dataset.kode = item.kode || '';
        div.textContent = item.kode ? item.nama + '(' + item.kode + ')' : item.nama;
        div.onclick = function() { pilihOpsiCustom(this); };
        container.appendChild(div);
    });
}

// Toggle buka/tutup custom dropdown
function toggleCustomDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('customDropdownReferensi');
    dropdown.classList.toggle('open');
    if (dropdown.classList.contains('open')) {
        const input = document.getElementById('searchReferensi');
        if (input) { input.focus(); input.value = ''; }
        filterReferensiCustom();
    }
}

// Tutup dropdown saat klik di luar
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('customDropdownReferensi');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

// Saat user memilih opsi
function pilihOpsiCustom(element) {
    const id = element.dataset.id;
    const nama = element.dataset.nama;
    const kode = element.dataset.kode;
    
    document.getElementById('akunReferensi').value = id;
    const label = document.getElementById('dropdownLabel');
    label.textContent = kode ? nama + '(' + kode + ')' : nama;
    label.classList.remove('text-on-surface-variant');
    label.classList.add('text-on-surface', 'font-medium');
    
    document.getElementById('customDropdownReferensi').classList.remove('open');
    
    // Update username otomatis
    const level = document.getElementById('akunLevel').value;
    document.getElementById('akunUsername').value = buatUsernameDariNama(nama, level);
}

// Filter custom dropdown berdasarkan pencarian - cari di nama ATAU kode (NISN/NIP)
function filterReferensiCustom() {
    const keyword = document.getElementById('searchReferensi').value.toLowerCase().trim();
    if (!window._refData) return;
    
    if (!keyword) {
        isiDropdownReferensi(window._refData);
        return;
    }
    
    const filtered = window._refData.filter(r => 
        r.nama.toLowerCase().includes(keyword) || 
        (r.kode && r.kode.toLowerCase().includes(keyword))
    );
    isiDropdownReferensi(filtered);
}

// Alias untuk kompatibilitas
function filterReferensi() {
    filterReferensiCustom();
}

// Reset tampilan custom dropdown
function resetCustomDropdown() {
    const hiddenInput = document.getElementById('akunReferensi');
    if (hiddenInput) hiddenInput.value = '';
    const label = document.getElementById('dropdownLabel');
    if (label) {
        label.textContent = '-- Pilih --';
        label.classList.add('text-on-surface-variant');
        label.classList.remove('text-on-surface', 'font-medium');
    }
    const searchInput = document.getElementById('searchReferensi');
    if (searchInput) searchInput.value = '';
    const dropdown = document.getElementById('customDropdownReferensi');
    if (dropdown) dropdown.classList.remove('open');
}

// Alias lama - tetap ada agar tidak error
function onPilihReferensi() {}

async function editAkun(id) {
    const u = allAkunData.find(x => String(x.id) === String(id));
    if (!u) return;
    
    document.getElementById('modalAkunTitle').textContent = 'Edit Akun';
    document.getElementById('akunId').value = u.id;
    document.getElementById('akunLevel').value = u.level;
    document.getElementById('akunLevel').disabled = true; // Level tidak bisa diubah
    document.getElementById('akunUsername').value = u.username || '';
    document.getElementById('akunPassword').value = u.password || '';
    document.getElementById('akunStatus').value = u.status || 'Aktif';
    document.getElementById('fieldReferensi').style.display = 'none';
    document.getElementById('modalAkun').classList.remove('hidden');
}

async function simpanAkun() {
    showLoading('Menyimpan akun...');
    try {
        const sb = getSupabase();
        const id = document.getElementById('akunId').value;
        const level = document.getElementById('akunLevel').value;
        const username = document.getElementById('akunUsername').value.trim();
        const password = document.getElementById('akunPassword').value;
        const status = document.getElementById('akunStatus').value;
        const refVal = document.getElementById('akunReferensi').value;
        
        if (!level || !username || !password) {
            hideLoading();
            showToast('Lengkapi semua field yang wajib!', 'error');
            return;
        }
        
        let id_referensi = null;
        if (refVal && level !== 'admin') {
            // Sekarang value select langsung berisi ID (integer)
            id_referensi = parseInt(refVal) || null;
        }
        
        const dataAkun = {
            username: username,
            password: password,
            level: level,
            status: status,
            id_referensi: id_referensi
        };
        
        if (id) {
            // UPDATE
            const { error } = await sb.from('users').update(dataAkun).eq('id', id);
            if (error) throw error;
            
            // Jika ada id_referensi untuk guru, update juga user_id di profil_guru
            if (level === 'guru' && id_referensi) {
                await sb.from('profil_guru').update({ user_id: id }).eq('id', id_referensi);
            }
            // Jika ada id_referensi untuk siswa, update juga user_id di siswa
            if (level === 'siswa' && id_referensi) {
                await sb.from('siswa').update({ user_id: id }).eq('id', id_referensi);
            }
            
            hideLoading();
            closeModalAkun();
            showToast('Akun berhasil diperbarui!', 'success');
        } else {
            // INSERT
            const { data: akunBaru, error } = await sb.from('users').insert(dataAkun).select().single();
            if (error) throw error;
            
            // Update user_id di tabel referensi
            if (level === 'guru' && id_referensi) {
                await sb.from('profil_guru').update({ user_id: akunBaru.id }).eq('id', id_referensi);
            }
            if (level === 'siswa' && id_referensi) {
                await sb.from('siswa').update({ user_id: akunBaru.id }).eq('id', id_referensi);
            }
            // Jika admin, coba buat juga profil_admin jika belum ada
            if (level === 'admin') {
                try {
                    const { data: ada } = await sb.from('profil_admin').select('id').eq('user_id', akunBaru.id).maybeSingle();
                    if (!ada) {
                        await sb.from('profil_admin').insert({
                            user_id: akunBaru.id,
                            nama_lengkap: 'Administrator'
                        });
                    }
                } catch (e) {}
            }
            
            hideLoading();
            closeModalAkun();
            showToast('✅ Akun berhasil dibuat! Username: ' + username + ' | Password: ' + password, 'success');
        }
        
        await loadAllAkun();
        if (currentUser) catatLog(currentUser.username, id ? 'Edit Akun' : 'Tambah Akun', username);
        
    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

// ============================================================
// RESET PASSWORD
// ============================================================
function resetPasswordAkun(id, username) {
    document.getElementById('resetAkunId').value = id;
    document.getElementById('resetAkunUsername').textContent = username;
    document.getElementById('resetPasswordBaru').value = PASSWORD_DEFAULT;
    document.getElementById('modalResetPassword').classList.remove('hidden');
}

function closeModalResetPassword() {
    document.getElementById('modalResetPassword').classList.add('hidden');
}

async function simpanResetPassword() {
    showLoading('Reset password...');
    try {
        const sb = getSupabase();
        const id = document.getElementById('resetAkunId').value;
        const passwordBaru = document.getElementById('resetPasswordBaru').value;
        
        if (!passwordBaru || passwordBaru.length < 6) {
            hideLoading();
            showToast('Password minimal 6 karakter!', 'error');
            return;
        }
        
        const { error } = await sb.from('users').update({ password: passwordBaru }).eq('id', id);
        if (error) throw error;
        
        hideLoading();
        closeModalResetPassword();
        showToast('Password berhasil direset! Password baru: ' + passwordBaru, 'success');
    } catch (e) {
        hideLoading();
        showToast('Gagal: ' + e.message, 'error');
    }
}

// ============================================================
// HAPUS AKUN
// ============================================================
async function hapusAkun(id, username) {
    showModalConfirm('Hapus Akun', 
        'Yakin ingin menghapus akun ' + username + '?\nData master (Guru/Siswa) tidak akan ikut terhapus.',
        async function() {
            showLoading('Menghapus...');
            try {
                const sb = getSupabase();
                await sb.from('users').delete().eq('id', id);
                
                hideLoading();
                showToast('Akun berhasil dihapus!', 'success');
                await loadAllAkun();
                catatLog(currentUser.username, 'Hapus Akun', username);
            } catch (e) {
                hideLoading();
                showToast('Gagal: ' + e.message, 'error');
            }
        });
}

// ============================================================
// GENERATE MASAL
// ============================================================
function showModalGenerateMasal() {
    document.getElementById('generateLevel').value = '';
    document.getElementById('infoGenerate').classList.add('hidden');
    document.getElementById('btnGenerateMasal').disabled = true;
    document.getElementById('modalGenerateMasal').classList.remove('hidden');
}

function closeModalGenerateMasal() {
    document.getElementById('modalGenerateMasal').classList.add('hidden');
}

async function cekDataGenerate() {
    const level = document.getElementById('generateLevel').value;
    const infoDiv = document.getElementById('infoGenerate');
    const isiInfo = document.getElementById('isiInfoGenerate');
    const btnGenerate = document.getElementById('btnGenerateMasal');
    
    if (!level) {
        infoDiv.classList.add('hidden');
        btnGenerate.disabled = true;
        return;
    }
    
    try {
        const sb = getSupabase();
        let dataBelumPunyaAkun = [];
        
        if (level === 'guru') {
            const { data } = await sb.from('profil_guru').select('id, nama_lengkap').is('user_id', null).order('nama_lengkap');
            dataBelumPunyaAkun = data || [];
        } else if (level === 'siswa') {
            const { data } = await sb.from('siswa').select('id, nama_lengkap').is('user_id', null).order('nama_lengkap');
            dataBelumPunyaAkun = data || [];
        }
        
        infoDiv.classList.remove('hidden');
        isiInfo.innerHTML = `
            • Jumlah data yang <b>belum</b> punya akun: <b>${dataBelumPunyaAkun.length}</b> ${level === 'guru' ? 'Guru' : 'Siswa'}<br>
            • Format username: <code>nama@${DOMAIN_EMAIL}</code><br>
            • Password: <code>${PASSWORD_DEFAULT}</code>
        `;
        
        btnGenerate.disabled = dataBelumPunyaAkun.length === 0;
        window._dataGenerateMasal = dataBelumPunyaAkun;
        window._levelGenerateMasal = level;
        
    } catch (e) {
        showToast('Gagal cek data: ' + e.message, 'error');
    }
}

async function jalankanGenerateMasal() {
    const dataList = window._dataGenerateMasal || [];
    const level = window._levelGenerateMasal;
    
    if (dataList.length === 0) {
        showToast('Tidak ada data untuk digenerate!', 'warning');
        return;
    }
    
    showModalConfirm('Konfirmasi Generate Masal',
        `Akan dibuatkan ${dataList.length} akun ${level === 'guru' ? 'Guru' : 'Siswa'} sekaligus.\nLanjutkan?`,
        async function() {
            showLoading(`Generate ${dataList.length} akun...`);
            let berhasil = 0;
            let gagal = 0;
            
            try {
                const sb = getSupabase();
                
                for (const item of dataList) {
                    try {
                        const username = buatUsernameDariNama(item.nama_lengkap, level);
                        if (!username) { gagal++; continue; }
                        
                        // Insert ke users
                        const { data: akunBaru, error } = await sb.from('users').insert({
                            username: username,
                            password: PASSWORD_DEFAULT,
                            level: level,
                            status: 'Aktif',
                            id_referensi: item.id
                        }).select().single();
                        
                        if (error) { gagal++; continue; }
                        
                        // Update user_id di tabel referensi
                        if (level === 'guru') {
                            await sb.from('profil_guru').update({ user_id: akunBaru.id }).eq('id', item.id);
                        } else if (level === 'siswa') {
                            await sb.from('siswa').update({ user_id: akunBaru.id }).eq('id', item.id);
                        }
                        
                        berhasil++;
                    } catch (e) {
                        gagal++;
                    }
                }
                
                hideLoading();
                closeModalGenerateMasal();
                showToast(`✅ Berhasil: ${berhasil} akun | Gagal: ${gagal} akun`, berhasil > 0 ? 'success' : 'warning');
                await loadAllAkun();
                catatLog(currentUser.username, 'Generate Masal Akun', `${level}: ${berhasil} berhasil, ${gagal} gagal`);
                
            } catch (e) {
                hideLoading();
                showToast('Gagal: ' + e.message, 'error');
            }
        });
}
// ============================================================
// ✅ AKHIR MENU AKUN PENGGUNA
// ============================================================
