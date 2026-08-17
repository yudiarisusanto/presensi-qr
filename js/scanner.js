// ============================================================
// js/scanner.js
// Logika QR Scanner dengan pengenalan mapel otomatis
// ============================================================

let html5QrCodeInstance = null;
let scannerAktif = false;
let scanTimeout = null;

// ============================================================
// INISIALISASI SCANNER
// ============================================================
function initScanner() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        tampilkanInputManual();
        return;
    }
    
    if (typeof Html5Qrcode === 'undefined') {
        showToast('Library scanner belum siap. Refresh halaman.', 'error');
        return;
    }
    
    mulaiScanner();
}

// ============================================================
// MULAI SCANNER
// ============================================================
async function mulaiScanner() {
    const container = document.getElementById('qr-reader');
    if (!container) return;
    
    container.innerHTML = '';
    
    try {
        if (!html5QrCodeInstance) {
            html5QrCodeInstance = new Html5Qrcode("qr-reader");
        }
        
        await html5QrCodeInstance.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanBerhasil,
            () => {}
        );
        
        scannerAktif = true;
        updateStatusScanner('aktif', 'Arahkan QR Code ke kotak di atas');
        
    } catch (error) {
        console.error('Scanner error:', error);
        let pesan = 'Tidak dapat mengakses kamera.';
        if (error.name === 'NotAllowedError') pesan = '❌ Izin kamera ditolak!';
        if (error.name === 'NotFoundError') pesan = '❌ Tidak ada kamera terdeteksi.';
        
        showToast(pesan, 'error');
        tampilkanInputManual();
        updateStatusScanner('error', pesan);
    }
}

// ============================================================
// HENTIKAN SCANNER
// ============================================================
async function berhentiScanner() {
    if (html5QrCodeInstance && scannerAktif) {
        try {
            await html5QrCodeInstance.stop();
            scannerAktif = false;
            updateStatusScanner('berhenti', 'Scanner dihentikan');
        } catch (e) {}
    }
}

// ============================================================
// SAAT QR BERHASIL DIBACA
// ============================================================
async function onScanBerhasil(teks) {
    if (html5QrCodeInstance) {
        try { await html5QrCodeInstance.pause(); } catch(e) {}
    }
    
    if (scanTimeout) clearTimeout(scanTimeout);
    
    mainkanSuaraBeep();
    await prosesAbsensi(teks.trim());
    
    scanTimeout = setTimeout(async () => {
        if (html5QrCodeInstance && scannerAktif) {
            try { await html5QrCodeInstance.resume(); } catch(e) {}
        }
    }, 2500);
}

// ============================================================
// LOGIKA INTI: PROSES ABSENSI
// ============================================================
async function prosesAbsensi(nisn) {
    if (!nisn || nisn.length < 5 || !/^\d+$/.test(nisn)) {
        showToast('❌ QR Code tidak valid', 'error');
        return;
    }
    
    showLoading('Memproses absensi...');
    
    try {
        const sb = getSupabase();
        if (!sb) { hideLoading(); return; }
        
        // STEP 1: Cari siswa by NISN
        const { data: siswa, error: errSiswa } = await sb
            .from('siswa').select('*').eq('nisn', nisn).single();
        
        if (errSiswa || !siswa) {
            hideLoading();
            showToast(`❌ NISN ${nisn} tidak ditemukan!`, 'error');
            return;
        }
        
        if (siswa.status_akun !== 'Aktif') {
            hideLoading();
            showToast(`❌ Akun ${siswa.nama_lengkap} tidak aktif!`, 'error');
            return;
        }
        
        // STEP 2: Waktu saat ini
        const sekarang = new Date();
        const hariIni = getNamaHari(sekarang);
        const jamSekarang = formatWaktu(sekarang);
        const tanggalSekarang = formatTanggal(sekarang);
        
        // STEP 3: Cari mapel yang sedang berlangsung
        const { data: jadwal } = await sb.rpc('cari_mapel_saat_ini', {
            p_kelas: siswa.kelas,
            p_jurusan: siswa.jurusan,
            p_hari: hariIni,
            p_jam: jamSekarang
        });
        
        let mapelAktif = null;
        let status = 'Hadir';
        
        if (jadwal && jadwal.length > 0) {
            mapelAktif = jadwal[0];
            status = mapelAktif.status_kehadiran;
        }
        
        // Jika tidak ada mapel cocok
        if (!mapelAktif) {
            const { data: peng } = await sb
                .from('pengaturan_sistem').select('nilai')
                .eq('pengaturan', 'Hari_Kerja').single();
            
            const hariKerja = peng?.nilai?.split(',') || ['Senin','Selasa','Rabu','Kamis','Jumat'];
            
            hideLoading();
            if (!hariKerja.includes(hariIni)) {
                tampilkanHasil(siswa, null, 'Bukan Hari Sekolah', `Hari ini ${hariIni} libur`, 'info');
            } else {
                tampilkanHasil(siswa, null, 'Diluar Jam Pelajaran', 'Tidak ada mapel aktif', 'warning');
            }
            return;
        }
        
        // STEP 4: Cek double scan
        const { data: sudah } = await sb.rpc('cek_sudah_absen', {
            p_siswa_id: siswa.id,
            p_mapel_id: mapelAktif.mapel_id,
            p_tanggal: tanggalSekarang
        });
        
        if (sudah) {
            hideLoading();
            tampilkanHasil(siswa, mapelAktif, 'Sudah Absen', 'Sudah absen hari ini', 'warning');
            return;
        }
        
        // STEP 5: Simpan absensi
        await sb.from('absensi').insert({
            siswa_id: siswa.id,
            nama_siswa: siswa.nama_lengkap,
            kelas: siswa.kelas,
            jurusan: siswa.jurusan,
            tanggal: tanggalSekarang,
            waktu: jamSekarang,
            status: status,
            mapel_id: mapelAktif.mapel_id,
            mata_pelajaran: mapelAktif.nama_mata_pelajaran,
            keterangan: `Scan QR ${jamSekarang} WIB`,
            scan_source: 'QR Scanner'
        });
        
        hideLoading();
        tampilkanHasil(siswa, mapelAktif, status, 
            `${mapelAktif.nama_mata_pelajaran} berhasil dicatat!`, 'success');
        
        tambahKeAktivitas(siswa, mapelAktif, status, jamSekarang);
        
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        showToast('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// TAMPILKAN HASIL ABSENSI
// ============================================================
function tampilkanHasil(siswa, mapel, status, pesan, tipe) {
    const warna = {
        'Hadir': { badge: 'bg-green-100 text-green-700', icon: 'check_circle', iconWarna: 'text-green-500', iconBg: 'bg-green-100' },
        'Terlambat': { badge: 'bg-amber-100 text-amber-700', icon: 'schedule', iconWarna: 'text-amber-500', iconBg: 'bg-amber-100' },
        'Sudah Absen': { badge: 'bg-blue-100 text-blue-700', icon: 'info', iconWarna: 'text-blue-500', iconBg: 'bg-blue-100' },
        'Diluar Jam Pelajaran': { badge: 'bg-gray-100 text-gray-700', icon: 'schedule_send', iconWarna: 'text-gray-500', iconBg: 'bg-gray-100' },
        'Bukan Hari Sekolah': { badge: 'bg-purple-100 text-purple-700', icon: 'event_busy', iconWarna: 'text-purple-500', iconBg: 'bg-purple-100' }
    };
    
    const w = warna[status] || warna['Hadir'];
    
    const toast = document.createElement('div');
    toast.className = 'toast bg-white rounded-2xl shadow-2xl border border-outline-variant p-5 min-w-[340px]';
    
    toast.innerHTML = `
        <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-full ${w.iconBg} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined ${w.iconWarna} text-2xl">${w.icon}</span>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <span class="font-bold text-on-surface">${siswa.nama_lengkap}</span>
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${w.badge}">${status}</span>
                </div>
                <p class="text-xs text-on-surface-variant mb-2">${siswa.kelas} ${siswa.jurusan} • NISN: ${siswa.nisn}</p>
                ${mapel ? `<div class="flex items-center gap-2 mb-2 p-2 bg-surface-container-low rounded-lg">
                    <span class="material-symbols-outlined text-primary text-lg">menu_book</span>
                    <span class="text-sm font-semibold text-primary">${mapel.nama_mata_pelajaran}</span>
                </div>` : ''}
                <p class="text-sm text-on-surface-variant">${pesan}</p>
            </div>
        </div>
    `;
    
    const container = document.getElementById('toastContainer');
    container.insertBefore(toast, container.firstChild);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// ============================================================
// INPUT MANUAL (FALLBACK)
// ============================================================
function tampilkanInputManual() {
    const el = document.getElementById('manual-input-container');
    if (el) el.classList.remove('hidden');
}

async function scanManualNISN() {
    const input = document.getElementById('manualNisn');
    const nisn = input.value.trim();
    if (!nisn) { showToast('Masukkan NISN', 'error'); return; }
    await prosesAbsensi(nisn);
    input.value = '';
}

// ============================================================
// SUARA BEEP
// ============================================================
function mainkanSuaraBeep() {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; osc.type = 'sine';
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
}

// ============================================================
// UPDATE STATUS UI
// ============================================================
function updateStatusScanner(status, pesan) {
    const elStatus = document.getElementById('scannerStatus');
    const elPesan = document.getElementById('scannerMessage');
    const teks = { 'aktif': '✅ Scanner Aktif', 'berhenti': '⏸️ Berhenti', 'error': '❌ Error' };
    if (elStatus) elStatus.textContent = teks[status] || status;
    if (elPesan) elPesan.textContent = pesan;
}

// ============================================================
// TAMBAH KE LOG AKTIVITAS DASHBOARD
// ============================================================
function tambahKeAktivitas(siswa, mapel, status, waktu) {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    const loading = container.querySelector('.text-center');
    if (loading) container.innerHTML = '';
    
    const warnaDot = {
        'Hadir': 'bg-green-500', 'Terlambat': 'bg-amber-500',
        'Sakit': 'bg-blue-500', 'Izin': 'bg-purple-500', 'Alpa': 'bg-red-500'
    };
    
    const item = document.createElement('div');
    item.className = 'flex items-center gap-3 p-4 border-b border-outline-variant/30 hover:bg-surface-container-low';
    item.innerHTML = `
        <div class="w-2 h-2 rounded-full ${warnaDot[status] || 'bg-gray-500'} shrink-0"></div>
        <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">${siswa.nama_lengkap}</p>
            <p class="text-xs text-on-surface-variant truncate">${mapel ? mapel.nama_mata_pelajaran : '—'} • ${status}</p>
        </div>
        <span class="text-xs text-outline shrink-0">${waktu.slice(0, 5)}</span>
    `;
    
    container.insertBefore(item, container.firstChild);
    while (container.children.length > 10) container.removeChild(container.lastChild);
}

// Cleanup saat halaman ditutup
window.addEventListener('beforeunload', async () => { await berhentiScanner(); });