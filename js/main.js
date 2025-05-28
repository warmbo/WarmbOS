import { initializeWindowCreation } from './window-creation.js';
import { initializeStartMenuToggle } from './start-menu.js';
import { initializeClock } from './clock.js';
import { bringWindowToFront } from './window-helpers.js';

// Fetch and load UI components
Promise.all([
    fetch('../components/taskbar.html').then(r => r.text()).then(html => document.getElementById('taskbar').innerHTML = html),
    fetch('../components/start-menu.html').then(r => r.text()).then(html => document.getElementById('start-menu').innerHTML = html),
    fetch('../components/desktop-icons.html').then(r => r.text()).then(html => document.getElementById('desktop-icons').innerHTML = html)
]).then(() => {
    console.log("[Init] UI components loaded");

    // Initialize features
    initializeWindowCreation();
    initializeStartMenuToggle();
    initializeClock();

    // Load icons from JSON file and render desktop icons, taskbar items, and start menu items dynamically
    fetch('../shortcuts.json')
        .then(response => response.json())
        .then(data => {
            // Support both array and object format for backward compatibility
            let desktopList = [];
            let taskbarList = [];
            let startMenuList = [];
            if (Array.isArray(data)) {
                desktopList = data;
            } else {
                if (data.desktop) desktopList = data.desktop;
                if (data.taskbar) taskbarList = data.taskbar;
                if (data.startMenu) startMenuList = data.startMenu;
            }
            // --- Desktop Icons ---
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
                    a.style.display = '';
                    a.style.marginBottom = '';
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
            // --- Taskbar Items ---
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
            // --- Start Menu Items ---
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

            // Desktop icon focus: bring window to front if already open
            desktopIconsContainer.addEventListener('click', function(e) {
                const link = e.target.closest('a.open-window');
                if (!link) return;
                const title = link.dataset.title;
                if (!title) return;
                // Find the window with this title
                const openWindows = document.querySelectorAll('.desktop .window');
                for (const win of openWindows) {
                    const winTitle = win.querySelector('.window-title-text')?.textContent;
                    if (winTitle === title) {
                        bringWindowToFront(win);
                        break;
                    }
                }
            });
            // Taskbar item focus: bring window to front if already open
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
            // Start menu item focus: bring window to front if already open
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
        })
        .catch(e => {
            const desktopIconsContainer = document.getElementById('desktop-icons');
            if (desktopIconsContainer) {
                desktopIconsContainer.innerHTML = '<div style="color:#f66;text-align:center;margin-top:2em;">Failed to load desktop icons: ' + e + '</div>';
            }
        });
});
