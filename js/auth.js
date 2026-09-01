// ============================================================
// js/auth.js - VERSI DUKUNGAN LEVEL GURU
// Logika autentikasi login, logout, dan session
// ============================================================
let currentUser = null;
// ============================================================
// LOGIN
// ============================================================
async function doLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showToast('Username dan password tidak boleh kosong', 'error');
        return;
    }
    
    showLoading('Memverifikasi...');
    
    try {
        const sb = getSupabase();
        if (!sb) { hideLoading(); return; }
        
        // Cari user di database
        const { data: userData, error } = await sb
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('status', 'Aktif')
            .single();
        
        if (error || !userData) {
            hideLoading();
            showToast('Username atau password salah!', 'error');
            catatLog(username, 'Login Gagal', 'Username tidak ditemukan');
            return;
        }
        
        // Verifikasi password
        if (userData.password !== password) {
            hideLoading();
            showToast('Username atau password salah!', 'error');
            catatLog(username, 'Login Gagal', 'Password salah');
            return;
        }
        
        // Build session user
        currentUser = {
            id: userData.id,
            username: userData.username,
            level: userData.level,
            id_referensi: userData.id_referensi,
            status: userData.status
        };
        
        // === AMBIL DATA PROFIL SESUAI LEVEL ===
        
        // Level SISWA
        if (userData.level === 'siswa' && userData.id_referensi) {
            const { data: siswa } = await sb
                .from('siswa')
                .select('*')
                .eq('id', userData.id_referensi)
                .single();
            
            if (siswa) {
                currentUser.nama = siswa.nama_lengkap;
                currentUser.nama_lengkap = siswa.nama_lengkap;
                currentUser.kelas = siswa.kelas;
                currentUser.jurusan = siswa.jurusan;
                currentUser.nisn = siswa.nisn;
                currentUser.siswa_id = siswa.id;
            }
        }
        // Level GURU
        else if (userData.level === 'guru') {
            const { data: profilGuru } = await sb
                .from('profil_guru')
                .select('*')
                .eq('user_id', userData.id)
                .maybeSingle();
            
            if (profilGuru) {
                currentUser.nama = profilGuru.nama_lengkap;
                currentUser.nama_lengkap = profilGuru.nama_lengkap;
                currentUser.guru_id = profilGuru.id;
                currentUser.nip = profilGuru.nip;
                currentUser.nuptk = profilGuru.nuptk;
                currentUser.jabatan = profilGuru.jabatan;
                currentUser.mata_pelajaran = profilGuru.mata_pelajaran;
                currentUser.foto_profil = profilGuru.foto_profil;
                // Simpan foto ke localStorage agar sidebar bisa tampil
                if (profilGuru.foto_profil) {
                    localStorage.setItem('presensiQR_fotoProfil', profilGuru.foto_profil);
                }
            } else {
                currentUser.nama = 'Guru';
            }
        }
        // Level ADMIN
        else if (userData.level === 'admin') {
            const { data: profilAdmin } = await sb
                .from('profil_admin')
                .select('*')
                .eq('user_id', userData.id)
                .maybeSingle();
            
            if (profilAdmin) {
                currentUser.nama = profilAdmin.nama_lengkap || 'Administrator';
                currentUser.nama_lengkap = profilAdmin.nama_lengkap;
                currentUser.admin_id = profilAdmin.id;
                currentUser.nip = profilAdmin.nip;
                currentUser.nuptk = profilAdmin.nuptk;
                currentUser.jabatan = profilAdmin.jabatan;
                currentUser.foto_profil = profilAdmin.foto_profil;
                if (profilAdmin.foto_profil) {
                    localStorage.setItem('presensiQR_fotoProfil', profilAdmin.foto_profil);
                }
            } else {
                currentUser.nama = 'Administrator';
            }
        }
        
        // Simpan ke localStorage
        localStorage.setItem('presensiQR_user', JSON.stringify(currentUser));
        
        catatLog(username, 'Login', 'Berhasil');
        
        hideLoading();
        showToast(`Selamat datang, ${currentUser.nama}!`, 'success');
        
        // Redirect sesuai level
        setTimeout(() => {
            if (currentUser.level === 'admin') {
                window.location.href = 'dashboard-admin.html';
            } else if (currentUser.level === 'guru') {
                window.location.href = 'dashboard-guru.html';
            } else {
                window.location.href = 'dashboard-siswa.html';
            }
        }, 500);
        
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}
// ============================================================
// CEK SESSION (dipanggil di setiap halaman dashboard)
// ============================================================
function checkSession(requiredLevel = null) {
    const stored = localStorage.getItem('presensiQR_user');
    
    if (!stored) {
        window.location.href = 'index.html';
        return null;
    }
    
    try {
        currentUser = JSON.parse(stored);
        
        if (requiredLevel && currentUser.level !== requiredLevel) {
            // Alihkan ke dashboard yang sesuai levelnya
            if (currentUser.level === 'admin') {
                window.location.href = 'dashboard-admin.html';
            } else if (currentUser.level === 'guru') {
                window.location.href = 'dashboard-guru.html';
            } else {
                window.location.href = 'dashboard-siswa.html';
            }
            return null;
        }
        
        return currentUser;
    } catch (e) {
        localStorage.removeItem('presensiQR_user');
        window.location.href = 'index.html';
        return null;
    }
}
// ============================================================
// LOGOUT
// ============================================================
function doLogout() {
    showModalConfirm('Konfirmasi', 'Apakah Anda yakin ingin keluar?', function() {
        if (currentUser) catatLog(currentUser.username, 'Logout', 'User keluar');
        localStorage.removeItem('presensiQR_user');
        localStorage.removeItem('presensiQR_fotoProfil');
        currentUser = null;
        window.location.href = 'index.html';
    });
}
// ============================================================
// CATAT LOG AKTIVITAS
// ============================================================
async function catatLog(pengguna, aktivitas, keterangan = '') {
    try {
        const sb = getSupabase();
        if (!sb) return;
        await sb.from('log_aktivitas').insert({ pengguna, aktivitas, keterangan });
    } catch (e) {
        console.warn('Gagal catat log:', e.message);
    }
}
// ============================================================
// UBAH PASSWORD
// ============================================================
async function ubahPassword() {
    const lama = document.getElementById('passwordLama').value;
    const baru = document.getElementById('passwordBaru').value;
    const konfirmasi = document.getElementById('passwordKonfirmasi').value;
    
    if (baru !== konfirmasi) {
        showToast('Password baru dan konfirmasi tidak cocok!', 'error');
        return;
    }
    if (baru.length < 6) {
        showToast('Password minimal 6 karakter!', 'error');
        return;
    }
    
    showLoading('Memproses...');
    
    try {
        const sb = getSupabase();
        const { data: userData } = await sb
            .from('users')
            .select('password')
            .eq('id', currentUser.id)
            .single();
        
        if (userData.password !== lama) {
            hideLoading();
            showToast('Password lama salah!', 'error');
            return;
        }
        
        await sb.from('users').update({ password: baru }).eq('id', currentUser.id);
        
        hideLoading();
        showToast('Password berhasil diubah!', 'success');
        document.getElementById('formAkun').reset();
        
    } catch (error) {
        hideLoading();
        showToast('Gagal: ' + error.message, 'error');
    }
}
