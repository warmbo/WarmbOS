// Optimized Settings Editor - Removed duplicates and improved organization

// === STATE MANAGEMENT ===
let currentSettings = {};
let currentShortcuts = {};
let editingShortcut = null;
let editingSection = null;
let editingIndex = null;

// Icon picker state
let iconManifest = null;
let allIcons = [];
let filteredIcons = [];

// === UTILITY FUNCTIONS ===
function normalizeShortcut(shortcut) {
    return {
        title: shortcut.title || 'Untitled',
        contentPath: shortcut.contentPath || shortcut.url || '',
        iconUrl: shortcut.iconUrl || shortcut.icon || ''
    };
}

function showMessage(message, type) {
    const msgEl = document.getElementById('statusMessage');
    if (!msgEl) return;
    
    msgEl.textContent = message;
    msgEl.style.display = 'block';
    msgEl.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
    msgEl.style.color = type === 'success' ? '#155724' : '#721c24';
    
    setTimeout(() => msgEl.style.display = 'none', 3000);
}

function isInMenuEditor() {
    const menuTab = document.getElementById('menu-tab');
    return menuTab?.classList.contains('active');
}

// === EVENT SETUP ===
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });
    
    // Button handlers
    const buttonHandlers = {
        'applyPrefsBtn': applyPreferences,
        'applyMenuBtn': applyShortcuts,
        'backBtn': showMenuMain,
        'saveShortcutBtn': saveShortcut,
        'browseIconsBtn': openIconPicker
    };
    
    Object.entries(buttonHandlers).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = handler;
    });
    
    // Add shortcut buttons
    document.querySelectorAll('.add-shortcut-btn').forEach(btn => {
        btn.onclick = () => addShortcut(btn.dataset.section);
    });
    
    setupIconPickerEvents();
}

function setupIconPickerEvents() {
    const modal = document.getElementById('iconPickerModal');
    const overlay = modal.querySelector('.icon-modal-overlay');
    const closeBtn = modal.querySelector('.icon-modal-close');
    
    // Close modal events
    [overlay, closeBtn].forEach(el => {
        if (el) el.onclick = closeIconPicker;
    });
    
    // Search and filter
    const searchInput = document.getElementById('iconSearch');
    const categorySelect = document.getElementById('iconCategory');
    
    const handleFilter = () => {
        filterAndRenderIcons(searchInput.value.toLowerCase(), categorySelect.value);
    };
    
    if (searchInput) searchInput.oninput = handleFilter;
    if (categorySelect) categorySelect.onchange = handleFilter;
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeIconPicker();
        }
    });
}

// === TAB MANAGEMENT ===
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    
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

// === DATA LOADING ===
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

// === PREFERENCES FORM ===
function populatePreferencesForm() {
    const prefs = currentSettings.preferences || {};
    
    const elements = {
        'backgroundImage': currentSettings.backgroundImage || '',
        'theme': prefs.theme || 'dark',
        'fontSize': prefs.fontSize || 14
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    });
}

async function applyPreferences() {
    try {
        const settings = {
            backgroundImage: document.getElementById('backgroundImage').value.trim(),
            preferences: {
                theme: document.getElementById('theme').value || 'dark',
                fontSize: parseInt(document.getElementById('fontSize').value) || 14,
                language: currentSettings.preferences?.language || 'en-US'
            }
        };
        
        const response = await fetch('/settings.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            currentSettings = settings;
            showMessage('Preferences applied!', 'success');
            setTimeout(() => window.location.reload(), 500);
        } else {
            const result = await response.json();
            showMessage(`Failed to apply preferences: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showMessage('Failed to apply preferences', 'error');
    }
}

// === SHORTCUT MANAGEMENT ===
function renderShortcuts() {
    ['desktop', 'taskbar', 'startMenu'].forEach(renderShortcutSection);
}

function renderShortcutSection(section) {
    const container = document.getElementById(section + '-shortcuts');
    const shortcuts = currentShortcuts[section] || [];
    
    if (!container) return;
    
    container.innerHTML = shortcuts.map((shortcut, index) => {
        const normalized = normalizeShortcut(shortcut);
        return `
            <div class="shortcut-item">
                <img src="${normalized.iconUrl}" alt="Icon" class="shortcut-icon" onerror="this.style.display='none'">
                <div class="shortcut-info">
                    <div class="shortcut-title">${normalized.title}</div>
                    <div class="shortcut-url">${normalized.contentPath || 'No URL'}</div>
                </div>
                <div class="shortcut-actions">
                    <button class="btn btn-secondary edit-btn" data-section="${section}" data-index="${index}">Edit</button>
                    <button class="btn btn-secondary delete-btn" data-section="${section}" data-index="${index}">Delete</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners
    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => editShortcut(btn.dataset.section, parseInt(btn.dataset.index));
    });
    
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => deleteShortcut(btn.dataset.section, parseInt(btn.dataset.index));
    });
}

function addShortcut(section) {
    editingSection = section;
    editingIndex = null;
    editingShortcut = { title: '', contentPath: '', iconUrl: '' };
    
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
    const normalized = normalizeShortcut(editingShortcut);
    document.getElementById('shortcutTitle').value = normalized.title;
    document.getElementById('shortcutUrl').value = normalized.contentPath;
    document.getElementById('shortcutIcon').value = normalized.iconUrl;
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

async function applyShortcuts() {
    try {
        const response = await fetch('/shortcuts.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentShortcuts)
        });
        
        if (response.ok) {
            showMessage('Shortcuts applied!', 'success');
            setTimeout(() => window.location.reload(), 500);
        } else {
            throw new Error('Apply failed');
        }
    } catch (error) {
        showMessage('Failed to apply shortcuts', 'error');
    }
}

// === ICON PICKER ===
async function loadIconManifest() {
    try {
        const response = await fetch('/js/icon-manifest.json');
        if (!response.ok) return false;
        
        iconManifest = await response.json();
        
        // Filter to PNG icons only, deduplicate by name
        const seenNames = new Set();
        allIcons = (iconManifest.icons || [])
            .filter(icon => icon.type === 'png' && !seenNames.has(icon.name) && seenNames.add(icon.name))
            .sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`Loaded ${allIcons.length} unique PNG icons`);
        return true;
    } catch (error) {
        console.error('Failed to load icon manifest:', error);
        return false;
    }
}

function populateCategories() {
    const categorySelect = document.getElementById('iconCategory');
    if (!categorySelect || !iconManifest?.categories) return;
    
    // Get available categories from filtered icons
    const availableCategories = [...new Set(allIcons.map(icon => icon.category).filter(Boolean))].sort();
    
    categorySelect.innerHTML = '<option value="">All Categories</option>' + 
        availableCategories.map(category => 
            `<option value="${category}">${category.charAt(0).toUpperCase() + category.slice(1)}</option>`
        ).join('');
}

function filterAndRenderIcons(searchTerm = '', category = '') {
    filteredIcons = allIcons.filter(icon => {
        const matchesCategory = !category || icon.category === category;
        const matchesSearch = !searchTerm || 
            icon.name.toLowerCase().includes(searchTerm) ||
            icon.filename.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });
    
    // Update stats
    const statsEl = document.getElementById('iconStats');
    if (statsEl) {
        const totalText = searchTerm || category ? 
            `${filteredIcons.length} of ${allIcons.length} icons` : 
            `${allIcons.length} icons total`;
        statsEl.textContent = totalText;
    }
    
    renderIcons();
}

function renderIcons() {
    const grid = document.getElementById('iconGrid');
    
    if (!filteredIcons?.length) {
        const message = !allIcons?.length ? 
            'No PNG icons available. <button onclick="syncIcons()" class="btn btn-secondary">Sync Icons</button>' :
            'No icons match your search.';
        grid.innerHTML = `<div class="icon-loading">${message}</div>`;
        return;
    }
    
    const iconsToShow = filteredIcons.slice(0, 150);
    const iconElements = iconsToShow.map((icon, index) => `
        <div class="icon-item" data-filename="${icon.filename}.png" data-name="${icon.name}" id="icon-${index}">
            <img src="/icons/png/${icon.filename}.png" alt="${icon.name}" onerror="this.style.opacity='0.3'" />
            <span title="${icon.name}">${icon.name}</span>
        </div>
    `);
    
    grid.innerHTML = iconElements.join('') + 
        (filteredIcons.length > 150 ? '<div class="icon-loading">Showing first 150 results. Use search to narrow down.</div>' : '');
    
    // Add click handlers
    iconsToShow.forEach((icon, index) => {
        const iconElement = document.getElementById(`icon-${index}`);
        if (iconElement) {
            iconElement.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectIconAndClose(`${icon.filename}.png`, icon.name);
            };
        }
    });
}

function selectIconAndClose(filename, name) {
    const cleanPath = `/icons/png/${filename}`;
    const iconInput = document.getElementById('shortcutIcon');
    
    if (iconInput) {
        iconInput.value = cleanPath;
        iconInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Visual feedback
        iconInput.style.borderColor = '#28a745';
        setTimeout(() => iconInput.style.borderColor = '', 1000);
    }
    
    closeIconPicker();
    console.log(`Selected PNG icon: ${name} at ${cleanPath}`);
}

async function openIconPicker() {
    if (!isInMenuEditor()) {
        console.log('Icon picker only available in Menu Editor');
        return;
    }
    
    const modal = document.getElementById('iconPickerModal');
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    // Load manifest if needed
    if (!iconManifest) {
        document.getElementById('iconGrid').innerHTML = '<div class="icon-loading">Loading PNG icons...</div>';
        const loaded = await loadIconManifest();
        if (loaded) {
            populateCategories();
            filterAndRenderIcons();
        } else {
            document.getElementById('iconGrid').innerHTML = '<div class="icon-loading">Failed to load icons. <button onclick="syncIcons()" class="btn btn-secondary">Sync Icons</button></div>';
        }
    } else {
        filterAndRenderIcons();
    }
    
    // Focus search
    setTimeout(() => document.getElementById('iconSearch')?.focus(), 100);
}

function closeIconPicker() {
    const modal = document.getElementById('iconPickerModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    // Reset form
    const searchInput = document.getElementById('iconSearch');
    const categorySelect = document.getElementById('iconCategory');
    const preview = document.getElementById('selectedPreview');
    
    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = '';
    if (preview) preview.innerHTML = '<span>No icon selected</span>';
}

async function syncIcons() {
    const grid = document.getElementById('iconGrid');
    grid.innerHTML = '<div class="icon-loading">Syncing icons...</div>';
    
    try {
        const response = await fetch('/api/icons/sync', { method: 'POST' });
        const result = await response.json();
        
        if (response.ok) {
            setTimeout(async () => {
                iconManifest = null;
                allIcons = [];
                const loaded = await loadIconManifest();
                if (loaded) {
                    populateCategories();
                    filterAndRenderIcons();
                    showMessage('Icons synchronized successfully!', 'success');
                } else {
                    grid.innerHTML = '<div class="icon-loading">Sync completed but failed to load manifest.</div>';
                }
            }, 3000);
        } else {
            throw new Error(result.error || 'Sync failed');
        }
    } catch (error) {
        grid.innerHTML = `<div class="icon-loading">Sync failed: ${error.message}</div>`;
    }
}

// === GLOBAL FUNCTIONS FOR ONCLICK HANDLERS ===
window.closeIconPicker = closeIconPicker;
window.selectIconAndClose = selectIconAndClose;
window.syncIcons = syncIcons;

// === INITIALIZATION ===
function initSettingsPage() {
    setupEventListeners();
    loadSettings();
    loadShortcuts();
}

// Initialize
initSettingsPage();