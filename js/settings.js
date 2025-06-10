// Settings Editor JavaScript with integrated icon picker

let currentSettings = {};
let currentShortcuts = {};
let editingShortcut = null;
let editingSection = null;
let editingIndex = null;

// Icon picker variables
let iconManifest = null;
let selectedIconPath = '';
let allIcons = [];
let filteredIcons = [];

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
    
    // Icon picker button
    const browseBtn = document.getElementById('browseIconsBtn');
    if (browseBtn) {
        browseBtn.onclick = openIconPicker;
    }
    
    // Icon picker modal events
    setupIconPickerEvents();
    
    // Load initial data
    loadSettings();
    loadShortcuts();
}

function setupIconPickerEvents() {
    const modal = document.getElementById('iconPickerModal');
    const overlay = modal.querySelector('.icon-modal-overlay');
    const closeBtn = modal.querySelector('.icon-modal-close');
    
    // Close modal events
    [overlay, closeBtn].forEach(el => {
        el.onclick = closeIconPicker;
    });
    
    // Search and filter events
    const searchInput = document.getElementById('iconSearch');
    const categorySelect = document.getElementById('iconCategory');
    
    searchInput.oninput = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const category = categorySelect.value;
        filterAndRenderIcons(searchTerm, category);
    };
    
    categorySelect.onchange = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const category = categorySelect.value;
        filterAndRenderIcons(searchTerm, category);
    };
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeIconPicker();
        }
    });
}

function isInMenuEditor() {
    // Check if we're currently in the menu editor tab
    const menuTab = document.getElementById('menu-tab');
    return menuTab && menuTab.classList.contains('active');
}

// Icon picker functions
async function loadIconManifest() {
    try {
        const response = await fetch('/js/icon-manifest.json');
        if (response.ok) {
            iconManifest = await response.json();
            
            // Show only PNG icons, deduplicate by name to avoid exact duplicates
            const seenNames = new Set();
            
            allIcons = (iconManifest.icons || [])
                .filter(icon => {
                    // Only include PNG icons
                    if (icon.type !== 'png') {
                        return false;
                    }
                    
                    // Skip if we've seen this exact name before
                    if (seenNames.has(icon.name)) {
                        return false;
                    }
                    
                    seenNames.add(icon.name);
                    return true;
                })
                .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
            
            console.log(`Loaded ${allIcons.length} unique PNG icons (filtered from ${iconManifest.total_count} total)`);
            return true;
        }
    } catch (error) {
        console.error('Failed to load icon manifest:', error);
    }
    return false;
}

function populateCategories() {
    const categorySelect = document.getElementById('iconCategory');
    categorySelect.innerHTML = '<option value="">All Categories</option>';
    
    if (iconManifest && iconManifest.categories) {
        // Get categories that actually have icons after filtering
        const availableCategories = new Set();
        allIcons.forEach(icon => {
            if (icon.category) {
                availableCategories.add(icon.category);
            }
        });
        
        // Sort and add categories
        Array.from(availableCategories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categorySelect.appendChild(option);
        });
    }
}

function filterAndRenderIcons(searchTerm = '', category = '') {
    // Filter icons
    filteredIcons = allIcons;
    
    if (category) {
        filteredIcons = filteredIcons.filter(icon => icon.category === category);
    }
    
    if (searchTerm) {
        filteredIcons = filteredIcons.filter(icon => 
            icon.name.toLowerCase().includes(searchTerm) ||
            icon.filename.toLowerCase().includes(searchTerm)
        );
    }
    
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
    
    if (!filteredIcons || filteredIcons.length === 0) {
        if (!allIcons || allIcons.length === 0) {
            grid.innerHTML = '<div class="icon-loading">No PNG icons available. <button onclick="syncIcons()" class="btn btn-secondary">Sync Icons</button></div>';
        } else {
            grid.innerHTML = '<div class="icon-loading">No icons match your search.</div>';
        }
        return;
    }
    
    // Show fewer icons since they're larger now (64px)
    const iconsToShow = filteredIcons.slice(0, 150);
    
    const iconElements = iconsToShow.map((icon, index) => {
        // Keep the original name as-is for display
        const displayName = icon.name;
        
        // Create a safe ID for this icon
        const iconId = `icon-${index}`;
        
        return `
            <div class="icon-item" data-filename="${icon.filename}.png" data-name="${displayName}" id="${iconId}">
                <img src="${icon.path}" alt="${displayName}" onerror="this.style.opacity='0.3'" />
                <span title="${displayName}">${displayName}</span>
            </div>
        `;
    });
    
    grid.innerHTML = iconElements.join('');
    
    if (filteredIcons.length > 150) {
        grid.innerHTML += '<div class="icon-loading">Showing first 150 results. Use search to narrow down.</div>';
    }
    
    // Add click handlers programmatically using the filename
    iconsToShow.forEach((icon, index) => {
        const iconElement = document.getElementById(`icon-${index}`);
        if (iconElement) {
            iconElement.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const filename = `${icon.filename}.png`; // Use original filename + .png
                const displayName = icon.name;
                
                console.log(`Selecting PNG icon with filename: ${filename}`); // Debug log
                selectIconAndClose(filename, displayName);
            };
        }
    });
}

function selectIconAndClose(filename, name) {
    // Construct the clean path as /icons/png/ + filename
    const cleanPath = `/icons/png/${filename}`;
    
    console.log(`PNG Filename: ${filename}`);
    console.log(`Clean path: ${cleanPath}`);
    
    // Update the icon input field immediately
    const iconInput = document.getElementById('shortcutIcon');
    if (iconInput) {
        iconInput.value = cleanPath;
        
        // Trigger input event for any listeners
        const event = new Event('input', { bubbles: true });
        iconInput.dispatchEvent(event);
        
        // Visual feedback
        iconInput.style.borderColor = '#28a745';
        setTimeout(() => {
            iconInput.style.borderColor = '';
        }, 1000);
    }
    
    // Close the modal
    closeIconPicker();
    
    console.log(`Selected PNG icon: ${name} at ${cleanPath}`);
}

function selectIcon(path, name) {
    // Remove previous selection
    document.querySelectorAll('.icon-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Select current item
    const item = document.querySelector(`[data-path="${path}"]`);
    if (item) {
        item.classList.add('selected');
        selectedIconPath = path;
        
        // Update preview in modal
        const preview = document.getElementById('selectedPreview');
        if (preview) {
            preview.innerHTML = `
                <img src="${path}" alt="${name}" />
                <span>${name}</span>
            `;
        }
    }
}

async function openIconPicker() {
    // Only allow opening icon picker in menu editor
    if (!isInMenuEditor()) {
        console.log('Icon picker only available in Menu Editor');
        return;
    }
    
    const modal = document.getElementById('iconPickerModal');
    selectedIconPath = document.getElementById('shortcutIcon').value;
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open'); // Add class for blur effect
    
    // Load manifest if not already loaded
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
    
    // Focus search input
    setTimeout(() => {
        document.getElementById('iconSearch').focus();
    }, 100);
}

function closeIconPicker() {
    document.getElementById('iconPickerModal').style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open'); // Remove blur class
    
    // Reset search
    document.getElementById('iconSearch').value = '';
    document.getElementById('iconCategory').value = '';
    
    // Reset preview
    document.getElementById('selectedPreview').innerHTML = '<span>No icon selected</span>';
    selectedIconPath = '';
}

function applySelectedIcon() {
    if (selectedIconPath) {
        document.getElementById('shortcutIcon').value = selectedIconPath;
        
        // Trigger input event for any listeners
        const event = new Event('input', { bubbles: true });
        document.getElementById('shortcutIcon').dispatchEvent(event);
    }
    closeIconPicker();
}

async function syncIcons() {
    document.getElementById('iconGrid').innerHTML = '<div class="icon-loading">Syncing icons...</div>';
    
    try {
        const response = await fetch('/api/icons/sync', { method: 'POST' });
        const result = await response.json();
        
        if (response.ok) {
            // Wait a moment for sync to complete, then reload manifest
            setTimeout(async () => {
                iconManifest = null; // Clear cache
                allIcons = [];
                const loaded = await loadIconManifest();
                if (loaded) {
                    populateCategories();
                    filterAndRenderIcons();
                    showMessage('Icons synchronized successfully!', 'success');
                } else {
                    document.getElementById('iconGrid').innerHTML = '<div class="icon-loading">Sync completed but failed to load manifest.</div>';
                }
            }, 3000);
        } else {
            throw new Error(result.error || 'Sync failed');
        }
    } catch (error) {
        document.getElementById('iconGrid').innerHTML = `<div class="icon-loading">Sync failed: ${error.message}</div>`;
    }
}

// Settings functions
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
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
        
        const response = await fetch('/settings.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            currentSettings = settings;
            showMessage('Preferences applied!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            const result = await response.json();
            showMessage(`Failed to apply preferences: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
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

// Make functions global for onclick handlers
window.closeIconPicker = closeIconPicker;
window.applySelectedIcon = applySelectedIcon;
window.selectIcon = selectIcon;
window.selectIconAndClose = selectIconAndClose;
window.syncIcons = syncIcons;

// Initialize the settings page
initSettingsPage();