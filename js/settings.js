// Settings Editor JavaScript

let currentSettings = {};
let currentShortcuts = {};
let editingShortcut = null;
let editingSection = null;
let editingIndex = null;

function initSettingsPage() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        };
    });
    
    // Apply buttons
    const applyPrefsBtn = document.getElementById('applyPrefsBtn');
    if (applyPrefsBtn) {
        applyPrefsBtn.onclick = applyPreferences;
    }
    
    const applyMenuBtn = document.getElementById('applyMenuBtn');
    if (applyMenuBtn) {
        applyMenuBtn.onclick = applyShortcuts;
    }
    
    // Add shortcut buttons
    document.querySelectorAll('.add-shortcut-btn').forEach(btn => {
        btn.onclick = function() {
            const section = this.dataset.section;
            addShortcut(section);
        };
    });
    
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.onclick = showMenuMain;
    }
    
    // Save shortcut button
    const saveShortcutBtn = document.getElementById('saveShortcutBtn');
    if (saveShortcutBtn) {
        saveShortcutBtn.onclick = saveShortcut;
    }
    
    // Load initial data
    loadSettings();
    loadShortcuts();
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Reset menu editor to main view when switching tabs
    if (tabName === 'menu') {
        showMenuMain();
    }
}

function showMenuMain() {
    document.getElementById('menu-main').style.display = 'block';
    document.getElementById('edit-shortcut').style.display = 'none';
}

function showEditShortcut() {
    document.getElementById('menu-main').style.display = 'none';
    document.getElementById('edit-shortcut').style.display = 'block';
}

async function loadSettings() {
    try {
        const response = await fetch('../settings.json');
        
        if (response.ok) {
            currentSettings = await response.json();
            populatePreferencesForm();
        }
    } catch (error) {
        showMessage('Failed to load settings', 'error');
    }
}

async function loadShortcuts() {
    try {
        const response = await fetch('../shortcuts.json');
        
        if (response.ok) {
            currentShortcuts = await response.json();
            renderShortcuts();
        }
    } catch (error) {
        showMessage('Failed to load shortcuts', 'error');
    }
}

function populatePreferencesForm() {
    const prefs = currentSettings.preferences || {};
    
    const bgInput = document.getElementById('backgroundImage');
    if (bgInput) {
        bgInput.value = currentSettings.backgroundImage || '';
    }
    
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.value = prefs.theme || 'dark';
    }
    
    const fontSizeSelect = document.getElementById('fontSize');
    if (fontSizeSelect) {
        fontSizeSelect.value = prefs.fontSize || 14;
    }
}

function renderShortcuts() {
    renderShortcutSection('desktop');
    renderShortcutSection('taskbar');
    renderShortcutSection('startMenu');
}

function renderShortcutSection(section) {
    const container = document.getElementById(section + '-shortcuts');
    const shortcuts = currentShortcuts[section] || [];
    
    if (!container) return;
    
    container.innerHTML = '';
    
    shortcuts.forEach((shortcut, index) => {
        const item = document.createElement('div');
        item.className = 'shortcut-item';
        
        const iconUrl = shortcut.iconUrl || shortcut.icon || '';
        const contentPath = shortcut.contentPath || shortcut.url || '';
        
        item.innerHTML = `
            <img src="${iconUrl}" alt="Icon" class="shortcut-icon" onerror="this.style.display='none'">
            <div class="shortcut-info">
                <div class="shortcut-title">${shortcut.title || 'Untitled'}</div>
                <div class="shortcut-url">${contentPath || 'No URL'}</div>
            </div>
            <div class="shortcut-actions">
                <button class="btn btn-secondary edit-btn" data-section="${section}" data-index="${index}">Edit</button>
                <button class="btn btn-secondary delete-btn" data-section="${section}" data-index="${index}">Delete</button>
            </div>
        `;
        
        container.appendChild(item);
    });
    
    // Add event listeners to edit and delete buttons
    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = function() {
            const section = this.dataset.section;
            const index = parseInt(this.dataset.index);
            editShortcut(section, index);
        };
    });
    
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = function() {
            const section = this.dataset.section;
            const index = parseInt(this.dataset.index);
            deleteShortcut(section, index);
        };
    });
}

function addShortcut(section) {
    editingSection = section;
    editingIndex = null;
    editingShortcut = {
        title: '',
        contentPath: '',
        iconUrl: ''
    };
    
    populateEditForm();
    document.getElementById('editTitle').textContent = 'Add Shortcut';
    showEditShortcut();
}

function editShortcut(section, index) {
    editingSection = section;
    editingIndex = index;
    editingShortcut = { ...currentShortcuts[section][index] };
    
    populateEditForm();
    document.getElementById('editTitle').textContent = 'Edit Shortcut';
    showEditShortcut();
}

function deleteShortcut(section, index) {
    if (confirm('Are you sure you want to delete this shortcut?')) {
        currentShortcuts[section].splice(index, 1);
        renderShortcutSection(section);
    }
}

function populateEditForm() {
    document.getElementById('shortcutTitle').value = editingShortcut.title || '';
    document.getElementById('shortcutUrl').value = editingShortcut.contentPath || editingShortcut.url || '';
    document.getElementById('shortcutIcon').value = editingShortcut.iconUrl || editingShortcut.icon || '';
}

function saveShortcut() {
    const shortcut = {
        title: document.getElementById('shortcutTitle').value,
        contentPath: document.getElementById('shortcutUrl').value,
        iconUrl: document.getElementById('shortcutIcon').value
    };
    
    if (!shortcut.title || !shortcut.contentPath) {
        alert('Please fill in title and URL/content path');
        return;
    }
    
    if (!currentShortcuts[editingSection]) {
        currentShortcuts[editingSection] = [];
    }
    
    if (editingIndex !== null) {
        currentShortcuts[editingSection][editingIndex] = shortcut;
    } else {
        currentShortcuts[editingSection].push(shortcut);
    }
    
    renderShortcutSection(editingSection);
    showMenuMain();
}

async function applyPreferences() {
    try {
        const backgroundImage = document.getElementById('backgroundImage').value.trim();
        const theme = document.getElementById('theme').value;
        const fontSize = parseInt(document.getElementById('fontSize').value);
        
        const settings = {
            backgroundImage: backgroundImage || '',
            preferences: {
                theme: theme || 'dark',
                fontSize: fontSize || 14,
                language: currentSettings.preferences?.language || 'en-US'
            }
        };
        
        console.log('Sending settings:', settings); // Debug log
        
        const response = await fetch('/settings.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentSettings = settings;
            
            // Apply background immediately
            const bgValue = settings.backgroundImage;
            if (bgValue) {
                try {
                    let desktop = document.querySelector('.desktop');
                    if (!desktop && window.parent && window.parent.document) {
                        desktop = window.parent.document.querySelector('.desktop');
                    }
                    if (!desktop && window.top && window.top.document) {
                        desktop = window.top.document.querySelector('.desktop');
                    }
                    
                    if (desktop) {
                        desktop.style.backgroundImage = `url("${bgValue}")`;
                        desktop.style.backgroundSize = 'cover';
                        desktop.style.backgroundPosition = 'center';
                    }
                } catch (error) {
                    console.warn('Could not apply background immediately:', error);
                }
            }
            
            showMessage('Preferences applied!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            console.error('Server error:', result);
            showMessage(`Failed to apply preferences: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Apply preferences error:', error);
        showMessage('Failed to apply preferences', 'error');
    }
}

async function applyShortcuts() {
    try {
        const response = await fetch('/shortcuts.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentShortcuts)
        });
        
        if (response.ok) {
            showMessage('Shortcuts applied!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            throw new Error('Apply failed');
        }
    } catch (error) {
        showMessage('Failed to apply shortcuts', 'error');
    }
}

function showMessage(message, type) {
    const msgEl = document.getElementById('statusMessage');
    if (msgEl) {
        msgEl.textContent = message;
        msgEl.style.display = 'block';
        msgEl.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
        msgEl.style.color = type === 'success' ? '#155724' : '#721c24';
        
        setTimeout(() => {
            msgEl.style.display = 'none';
        }, 3000);
    }
}

// Initialize the settings page
initSettingsPage();