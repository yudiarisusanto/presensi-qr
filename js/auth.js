// ============================================================
// js/auth.js
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
        
        // Jika siswa, ambil data lengkapnya
        if (userData.level === 'siswa' && userData.id_referensi) {
            const { data: siswa } = await sb
                .from('siswa')
                .select('*')
                .eq('id', userData.id_referensi)
                .single();
            
            if (siswa) {
                currentUser.nama = siswa.nama_lengkap;
                currentUser.kelas = siswa.kelas;
                currentUser.jurusan = siswa.jurusan;
                currentUser.nisn = siswa.nisn;
                currentUser.siswa_id = siswa.id;
            }
        } else if (userData.level === 'admin') {
            // Untuk admin: coba ambil data dari profil_admin jika tersedia
            currentUser.nama = 'Administrator';
            currentUser.nama_lengkap = 'Administrator';
            try {
                const { data: profilAdmin } = await sb
                    .from('profil_admin')
                    .select('nama_lengkap, jabatan, foto_profil')
                    .eq('user_id', userData.id)
                    .maybeSingle();
                
                if (profilAdmin && profilAdmin.nama_lengkap) {
                    currentUser.nama = profilAdmin.nama_lengkap;
                    currentUser.nama_lengkap = profilAdmin.nama_lengkap;
                    if (profilAdmin.jabatan) currentUser.jabatan = profilAdmin.jabatan;
                    if (profilAdmin.foto_profil) {
                        localStorage.setItem('presensiQR_fotoProfil', profilAdmin.foto_profil);
                    }
                }
            } catch (e) {
                console.warn('Gagal memuat profil admin saat login:', e.message);
            }
        } else {
            currentUser.nama = 'Pengguna';
            currentUser.nama_lengkap = 'Pengguna';
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
            window.location.href = currentUser.level === 'admin' ? 
                'dashboard-admin.html' : 'dashboard-siswa.html';
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