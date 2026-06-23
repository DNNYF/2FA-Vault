// Main App Logic
let currentUser = null;
let entries = [];
let recycleEntries = [];
let totpInterval = null;
let isRegisterMode = false;

// Initialization
async function init() {
    try {
        // Check if a user exists in DB
        const { hasUser } = await api.checkAuth();
        
        if (!hasUser) {
            // No user exists, show register screen
            isRegisterMode = true;
            document.getElementById('auth-title').textContent = 'Create Account';
            document.getElementById('auth-subtitle').textContent = 'Set up your personal 2FA master password';
            document.getElementById('auth-submit').textContent = 'Register';
            ui.showScreen('auth-screen');
            return;
        }

        // Try to fetch current user (checks JWT)
        try {
            const user = await api.me();
            currentUser = user;
            loadDashboard();
        } catch (err) {
            // Not logged in
            ui.showScreen('auth-screen');
        }
    } catch (err) {
        console.error('Initialization failed', err);
        ui.showToast('Failed to connect to server', 'error');
    }
}

// Auth Handlers
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');
    
    errorEl.textContent = '';
    
    try {
        if (isRegisterMode) {
            await api.register(username, password);
            ui.showToast('Account created successfully');
            isRegisterMode = false; // Next time it's login
        } else {
            await api.login(username, password);
            ui.showToast('Logged in successfully');
        }
        
        const user = await api.me();
        currentUser = user;
        document.getElementById('password').value = '';
        loadDashboard();
        
    } catch (err) {
        errorEl.textContent = err.message;
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await api.logout();
        currentUser = null;
        stopTotpTimer();
        ui.showScreen('auth-screen');
        ui.showToast('Logged out');
    } catch (err) {
        ui.showToast('Logout failed', 'error');
    }
});

// Dashboard Handlers
async function loadDashboard() {
    ui.showScreen('dashboard-screen');
    await fetchEntries();
    startTotpTimer();
    updateRecycleBadge();
}

async function fetchEntries() {
    try {
        entries = await api.getEntries();
        renderEntries();
    } catch (err) {
        ui.showToast('Failed to load entries', 'error');
    }
}

async function updateRecycleBadge() {
    try {
        const bin = await api.getRecycleBin();
        const badge = document.getElementById('recycle-badge');
        if (bin.length > 0) {
            badge.textContent = bin.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (err) {}
}

function calculateTOTP(secret) {
    if (secret === 'ERROR_DECRYPTING') return 'ERROR';
    try {
        // Remove spaces and standardize
        const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
        const totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(cleanSecret)
        });
        return totp.generate();
    } catch (err) {
        console.error('TOTP calculation error:', err);
        return 'INVALID';
    }
}

function renderEntries(searchTerm = '') {
    const grid = document.getElementById('entries-grid');
    const emptyState = document.getElementById('empty-state');
    
    grid.innerHTML = '';
    
    const filtered = entries.filter(e => 
        e.service_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (e.username && e.username.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Calculate time remaining in current 30s window
    const epoch = Math.floor(Date.now() / 1000);
    const period = 30;
    const remaining = period - (epoch % period);
    const progressOffset = 113 - ((remaining / period) * 113);
    const isExpiring = remaining <= 5;
    
    filtered.forEach(entry => {
        const code = calculateTOTP(entry.secret);
        const card = document.createElement('div');
        card.className = 'account-card';
        
        card.innerHTML = `
            <div class="card-actions">
                <button class="icon-btn copy-btn" title="Copy code" data-code="${code}">
                    <i class="fa-solid fa-copy"></i>
                </button>
                <button class="icon-btn edit-btn" title="Edit" data-id="${entry.id}">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="icon-btn delete-btn" title="Delete" data-id="${entry.id}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            
            <div class="card-header">
                <div class="service-icon">${entry.icon || ui.getInitials(entry.service_name)}</div>
                <div class="service-info">
                    <h3>${entry.service_name}</h3>
                    <p>${entry.username || ''}</p>
                </div>
            </div>
            
            <div class="secret-mask" title="Secret Key">${ui.maskSecret(entry.secret)}</div>
            
            <div class="totp-container">
                <div class="totp-code ${isExpiring ? 'expiring' : ''}" id="code-${entry.id}">
                    ${code.substring(0, 3)} ${code.substring(3)}
                </div>
                
                <div class="timer-circle">
                    <svg viewBox="0 0 40 40">
                        <circle class="bg" cx="20" cy="20" r="18"></circle>
                        <circle class="progress ${isExpiring ? 'expiring' : ''}" cx="20" cy="20" r="18" style="stroke-dashoffset: ${progressOffset}"></circle>
                    </svg>
                    <div class="time-text">${remaining}</div>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    // Attach event listeners
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const code = e.currentTarget.dataset.code;
            navigator.clipboard.writeText(code).then(() => {
                ui.showToast('Code copied to clipboard');
            });
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            const entry = entries.find(x => x.id === id);
            if (entry) openModal(entry);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('Move this account to recycle bin?')) {
                const id = e.currentTarget.dataset.id;
                try {
                    await api.deleteEntry(id);
                    ui.showToast('Moved to recycle bin');
                    fetchEntries();
                    updateRecycleBadge();
                } catch (err) {
                    ui.showToast(err.message, 'error');
                }
            }
        });
    });
}

function startTotpTimer() {
    if (totpInterval) clearInterval(totpInterval);
    
    totpInterval = setInterval(() => {
        const searchTerm = document.getElementById('search-input').value;
        renderEntries(searchTerm);
    }, 1000);
}

function stopTotpTimer() {
    if (totpInterval) clearInterval(totpInterval);
}

document.getElementById('search-input').addEventListener('input', (e) => {
    renderEntries(e.target.value);
});

// Modal Logic
document.getElementById('add-btn').addEventListener('click', () => {
    openModal();
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        ui.toggleModal('entry-modal', false);
    });
});

function openModal(entry = null) {
    const form = document.getElementById('entry-form');
    form.reset();
    document.getElementById('secret-error').classList.add('hidden');
    document.getElementById('totp-preview').classList.add('hidden');
    
    if (entry) {
        document.getElementById('modal-title').textContent = 'Edit Account';
        document.getElementById('entry-id').value = entry.id;
        document.getElementById('service-name').value = entry.service_name;
        document.getElementById('service-username').value = entry.username || '';
        document.getElementById('secret-key').value = entry.secret;
        previewTotp();
    } else {
        document.getElementById('modal-title').textContent = 'Add Account';
        document.getElementById('entry-id').value = '';
    }
    
    ui.toggleModal('entry-modal', true);
}

document.getElementById('secret-key').addEventListener('input', previewTotp);

function previewTotp() {
    const secret = document.getElementById('secret-key').value;
    const previewContainer = document.getElementById('totp-preview');
    const previewCode = document.getElementById('preview-code');
    const errorEl = document.getElementById('secret-error');
    
    if (!secret) {
        previewContainer.classList.add('hidden');
        errorEl.classList.add('hidden');
        return;
    }
    
    try {
        const cleanSecret = secret.replace(/[\s\-=]/g, '').toUpperCase();
        const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(cleanSecret) });
        const code = totp.generate();
        previewCode.textContent = code;
        previewContainer.classList.remove('hidden');
        errorEl.classList.add('hidden');
    } catch (err) {
        previewContainer.classList.add('hidden');
        errorEl.classList.remove('hidden');
    }
}

document.getElementById('entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('entry-id').value;
    const service_name = document.getElementById('service-name').value;
    const username = document.getElementById('service-username').value;
    const secret = document.getElementById('secret-key').value.replace(/\s+/g, '').toUpperCase();
    
    // Validate secret
    try {
        const cleanSecret = secret.replace(/[\s\-=]/g, '').toUpperCase();
        OTPAuth.Secret.fromBase32(cleanSecret);
    } catch (err) {
        document.getElementById('secret-error').classList.remove('hidden');
        return;
    }
    
    const data = { service_name, username, secret };
    
    try {
        if (id) {
            await api.updateEntry(id, data);
            ui.showToast('Account updated');
        } else {
            await api.addEntry(data);
            ui.showToast('Account added');
        }
        ui.toggleModal('entry-modal', false);
        fetchEntries();
    } catch (err) {
        ui.showToast(err.message, 'error');
    }
});

// Recycle Bin Logic
document.getElementById('recycle-btn').addEventListener('click', () => {
    ui.showScreen('recycle-screen');
    loadRecycleBin();
});

document.getElementById('back-to-dashboard').addEventListener('click', () => {
    loadDashboard();
});

async function loadRecycleBin() {
    try {
        recycleEntries = await api.getRecycleBin();
        renderRecycleBin();
    } catch (err) {
        ui.showToast('Failed to load recycle bin', 'error');
    }
}

function renderRecycleBin() {
    const list = document.getElementById('recycle-list');
    const emptyState = document.getElementById('recycle-empty-state');
    
    list.innerHTML = '';
    
    if (recycleEntries.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    const now = new Date();
    
    recycleEntries.forEach(entry => {
        const deletedAt = new Date(entry.deleted_at + 'Z'); // SQLite datetime is UTC
        const daysSinceDeleted = Math.floor((now - deletedAt) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, 10 - daysSinceDeleted);
        
        const item = document.createElement('div');
        item.className = 'recycle-item';
        
        item.innerHTML = `
            <div class="recycle-info">
                <h4>${entry.service_name} ${entry.username ? `(${entry.username})` : ''}</h4>
                <p>Deleted on ${deletedAt.toLocaleDateString()} • Permanently deleted in ${daysLeft} days</p>
            </div>
            <div class="recycle-actions">
                <button class="btn btn-primary btn-sm restore-btn" data-id="${entry.id}">Restore</button>
                <button class="btn btn-danger btn-sm perm-del-btn" data-id="${entry.id}">Delete</button>
            </div>
        `;
        
        list.appendChild(item);
    });
    
    document.querySelectorAll('.restore-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            try {
                await api.restoreEntry(id);
                ui.showToast('Account restored');
                loadRecycleBin();
            } catch (err) {
                ui.showToast(err.message, 'error');
            }
        });
    });
    
    document.querySelectorAll('.perm-del-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('Permanently delete this account? This cannot be undone.')) {
                const id = e.target.dataset.id;
                try {
                    await api.permanentDelete(id);
                    ui.showToast('Account permanently deleted');
                    loadRecycleBin();
                } catch (err) {
                    ui.showToast(err.message, 'error');
                }
            }
        });
    });
}

document.getElementById('empty-recycle-btn').addEventListener('click', async () => {
    if (recycleEntries.length === 0) return;
    
    if (confirm('Are you sure you want to permanently delete ALL items in the recycle bin?')) {
        try {
            await api.emptyRecycleBin();
            ui.showToast('Recycle bin emptied');
            loadRecycleBin();
        } catch (err) {
            ui.showToast(err.message, 'error');
        }
    }
});

// Settings / Backup Logic
document.getElementById('settings-btn').addEventListener('click', () => {
    ui.showScreen('settings-screen');
    stopTotpTimer();
});

document.getElementById('back-to-dashboard-settings').addEventListener('click', () => {
    loadDashboard();
});

document.getElementById('export-btn').addEventListener('click', async () => {
    try {
        const data = await api.exportEntries();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `2fa_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        ui.showToast('Backup exported successfully');
    } catch (err) {
        ui.showToast('Failed to export backup', 'error');
    }
});

document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const entries = JSON.parse(event.target.result);
            const res = await api.importEntries(entries);
            ui.showToast(res.message);
            // Reset input
            e.target.value = '';
        } catch (err) {
            console.error(err);
            ui.showToast('Invalid backup file or import failed', 'error');
        }
    };
    reader.readAsText(file);
});

// Start app
init();
