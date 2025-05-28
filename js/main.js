import { initializeWindowCreation } from './window-creation.js';
import { initializeStartMenuToggle } from './start-menu.js';
import { initializeClock } from './clock.js';
import { bringWindowToFront } from './window-helpers.js';
import { loadDesktopState, initializeStateManagement } from './desktop-state.js';

// Load and apply background from settings
async function loadBackground() {
    try {
        const response = await fetch('/settings.json');
        const settings = await response.json();
        if (settings.backgroundImage) {
            const desktop = document.querySelector('.desktop');
            desktop.style.backgroundImage = `url('${settings.backgroundImage}')`;
            desktop.style.backgroundSize = 'cover';
            desktop.style.backgroundPosition = 'center';
        }
    } catch (error) {
        console.log('No custom background set');
    }
}

// Load UI components and initialize features
Promise.all([
    fetch('/components/taskbar.html').then(r => r.text()).then(html => document.getElementById('taskbar').innerHTML = html),
    fetch('/components/start-menu.html').then(r => r.text()).then(html => document.getElementById('start-menu').innerHTML = html),
    fetch('/components/desktop-icons.html').then(r => r.text()).then(html => document.getElementById('desktop-icons').innerHTML = html)
]).then(() => {
    initializeWindowCreation();
    initializeStartMenuToggle();
    initializeClock();
    loadBackground();

    // Load shortcuts and render UI
    fetch('/shortcuts.json')
        .then(response => response.json())
        .then(data => {
            let desktopList = [], taskbarList = [], startMenuList = [];
            if (Array.isArray(data)) {
                desktopList = data;
            } else {
                if (data.desktop) desktopList = data.desktop;
                if (data.taskbar) taskbarList = data.taskbar;
                if (data.startMenu) startMenuList = data.startMenu;
            }
            // Render desktop icons
            const desktopIconsContainer = document.getElementById('desktop-icons');
            desktopIconsContainer.innerHTML = '';
            if (desktopList.length) {
                desktopList.forEach(icon => {
                    const iconUrl = icon.icon || icon.iconUrl;
                    const contentPath = icon.url || icon.contentPath;
                    if (!icon.title || !iconUrl) return;
                    const a = document.createElement('a');
                    a.href = '#';
                    a.className = 'open-window';
                    a.dataset.title = icon.title;
                    a.dataset.content = contentPath || '';
                    a.dataset.icon = iconUrl || '';
                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'icon';
                    const img = document.createElement('img');
                    img.src = iconUrl;
                    img.alt = 'icon';
                    const span = document.createElement('span');
                    span.textContent = icon.title;
                    iconDiv.appendChild(img);
                    iconDiv.appendChild(span);
                    a.appendChild(iconDiv);
                    desktopIconsContainer.appendChild(a);
                });
            } else {
                desktopIconsContainer.innerHTML = '<div style="color:#ccc;text-align:center;margin-top:2em;">No desktop icons configured in shortcuts.json</div>';
            }
            makeDesktopIconsDraggable(desktopIconsContainer);

            // Render taskbar items
            const taskbarItemsContainer = document.querySelector('.taskbar-items');
            if (taskbarItemsContainer) {
                taskbarItemsContainer.innerHTML = '';
                if (taskbarList.length) {
                    taskbarList.forEach(icon => {
                        const iconUrl = icon.icon || icon.iconUrl;
                        const contentPath = icon.url || icon.contentPath;
                        if (!icon.title || !iconUrl) return;
                        const btn = document.createElement('button');
                        btn.className = 'taskbar-item open-window';
                        btn.dataset.title = icon.title;
                        btn.dataset.content = contentPath || '';
                        btn.dataset.icon = iconUrl || '';
                        const img = document.createElement('img');
                        img.src = iconUrl;
                        img.alt = 'icon';
                        btn.appendChild(img);
                        btn.appendChild(document.createTextNode(icon.title));
                        taskbarItemsContainer.appendChild(btn);
                    });
                }
            }
            // Render start menu items
            const startMenuContainer = document.querySelector('.start-menu-item-group');
            if (startMenuContainer) {
                startMenuContainer.innerHTML = '';
                if (startMenuList.length) {
                    startMenuList.forEach(icon => {
                        const iconUrl = icon.icon || icon.iconUrl;
                        const contentPath = icon.url || icon.contentPath;
                        if (!icon.title || !iconUrl) return;
                        const a = document.createElement('a');
                        a.href = '#';
                        a.className = 'start-menu-item open-window';
                        a.dataset.title = icon.title;
                        a.dataset.content = contentPath || '';
                        a.dataset.icon = iconUrl || '';
                        const img = document.createElement('img');
                        img.src = iconUrl;
                        img.alt = 'icon';
                        const span = document.createElement('span');
                        span.textContent = icon.title;
                        a.appendChild(img);
                        a.appendChild(span);
                        startMenuContainer.appendChild(a);
                    });
                }
            }
            initializeWindowCreation();

            // Focus window if already open when clicking desktop icon
            desktopIconsContainer.addEventListener('click', function(e) {
                const link = e.target.closest('a.open-window');
                if (!link) return;
                const title = link.dataset.title;
                if (!title) return;
                const openWindows = document.querySelectorAll('.desktop .window');
                for (const win of openWindows) {
                    const winTitle = win.querySelector('.window-title-text')?.textContent;
                    if (winTitle === title) {
                        bringWindowToFront(win);
                        break;
                    }
                }
            });
            // Focus window if already open when clicking taskbar item
            if (taskbarItemsContainer) {
                taskbarItemsContainer.addEventListener('click', function(e) {
                    const btn = e.target.closest('button.open-window');
                    if (!btn) return;
                    const title = btn.dataset.title;
                    if (!title) return;
                    const openWindows = document.querySelectorAll('.desktop .window');
                    for (const win of openWindows) {
                        const winTitle = win.querySelector('.window-title-text')?.textContent;
                        if (winTitle === title) {
                            bringWindowToFront(win);
                            break;
                        }
                    }
                });
            }
            // Focus window if already open when clicking start menu item
            if (startMenuContainer) {
                startMenuContainer.addEventListener('click', function(e) {
                    const link = e.target.closest('a.open-window');
                    if (!link) return;
                    const title = link.dataset.title;
                    if (!title) return;
                    const openWindows = document.querySelectorAll('.desktop .window');
                    for (const win of openWindows) {
                        const winTitle = win.querySelector('.window-title-text')?.textContent;
                        if (winTitle === title) {
                            bringWindowToFront(win);
                            break;
                        }
                    }
                });
            }

            // Initialize state management and load saved state
            initializeStateManagement();
            loadDesktopState();
        })
        .catch(e => {
            const desktopIconsContainer = document.getElementById('desktop-icons');
            if (desktopIconsContainer) {
                desktopIconsContainer.innerHTML = `<div style="color:#f66;text-align:center;margin-top:2em;">Failed to load desktop icons: ${e}</div>`;
            }
        });
});

/**
 * Makes desktop icons draggable and arranges them in a grid.
 * @param {HTMLElement} container - The container for desktop icons.
 */
function makeDesktopIconsDraggable(container) {
    const desktop = container.closest('.desktop');

    function getGridSize() {
        const desktopRect = desktop.getBoundingClientRect();
        const taskbar = desktop.querySelector('.taskbar');
        const taskbarHeight = taskbar ? taskbar.offsetHeight : 40;
        const cols = Math.floor(desktopRect.width / 98);
        const rows = Math.floor((desktopRect.height - taskbarHeight) / 116);
        return {cols, rows};
    }

    function renderGridAndIcons() {
        const icons = Array.from(container.querySelectorAll('.open-window'));
        icons.forEach(icon => icon.remove());
        const { cols, rows } = getGridSize();
        const totalCells = cols * rows;
        container.innerHTML = '';
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.index = i;
            container.appendChild(cell);
        }
        // Place icons in a single column (vertical stack)
        for (let i = 0; i < icons.length; i++) {
            const cellIndex = i;
            const cell = container.children[cellIndex];
            if (cell) {
                cell.classList.add('occupied');
                cell.appendChild(icons[i]);
            }
        }
    }

    renderGridAndIcons();

    let dragSrcEl = null;
    let dragSrcCell = null;

    function handleDragStart(e) {
        dragSrcEl = this;
        dragSrcCell = this.closest('.grid-cell');
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        e.preventDefault();
        const targetCell = e.target.closest('.grid-cell');
        if (!targetCell || targetCell === dragSrcCell) return;
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(e) {
        e.preventDefault();
        const targetCell = e.target.closest('.grid-cell');
        if (!targetCell || !dragSrcEl) return;
        const targetIcon = targetCell.querySelector('.open-window');
        if (targetIcon) {
            dragSrcCell.appendChild(targetIcon);
        }
        targetCell.appendChild(dragSrcEl);
        dragSrcCell.classList.toggle('occupied', !!dragSrcCell.querySelector('.open-window'));
        targetCell.classList.add('occupied');
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        dragSrcEl = null;
        dragSrcCell = null;
    }

    function addDragHandlers() {
        Array.from(container.querySelectorAll('.open-window')).forEach(icon => {
            icon.setAttribute('draggable', 'true');
            icon.removeEventListener('dragstart', handleDragStart);
            icon.removeEventListener('dragend', handleDragEnd);
            icon.addEventListener('dragstart', handleDragStart);
            icon.addEventListener('dragend', handleDragEnd);
        });
    }

    addDragHandlers();
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
        window.addEventListener('resize', () => {
            renderGridAndIcons();
            addDragHandlers();
        });
    }
