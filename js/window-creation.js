import { makeWindowDraggable, addWindowControls, bringWindowToFront } from './window-helpers.js';

export function createWindow(title, content, iconUrl) {
    // Check if a window with this title is already open
    const openWindows = document.querySelectorAll('.desktop .window');
    for (const win of openWindows) {
        const winTitle = win.querySelector('.window-title-text')?.textContent;
        if (winTitle === title) {
            // Focus this window: bring to front and un-minimize, but do NOT maximize
            win.classList.remove('minimized');
            win.style.display = '';
            bringWindowToFront(win);
            return;
        }
    }

    console.log("[createWindow] Creating:", title, content, iconUrl);
    const template = document.getElementById('window-template');
    if (!template) return console.error('[createWindow] Template not found');

    const windowClone = template.content.cloneNode(true);
    windowClone.querySelector('.window-title-text').textContent = title;
    // Set the icon in the titlebar if provided
    if (iconUrl) {
        const iconImg = windowClone.querySelector('.window-title img');
        if (iconImg) iconImg.src = iconUrl;
    }

    const contentElement = windowClone.querySelector('.window-content-text');
    if (content.endsWith('.html')) {
        fetch(content)
            .then(r => r.ok ? r.text() : Promise.reject())
            .then(html => contentElement.innerHTML = html)
            .catch(() => contentElement.textContent = 'Failed to load content.');
    } else {
        contentElement.textContent = content;
    }

    // Append and then select from DOM
    document.querySelector('.desktop').appendChild(windowClone);

    // Wait for DOM to update
    requestAnimationFrame(() => {
        const windowEl = document.querySelector('.desktop .window:last-of-type');
        if (!windowEl) return console.error('[createWindow] Failed to find newly inserted window');
        console.log("[createWindow] Window added to DOM");

        bringWindowToFront(windowEl);
        makeWindowDraggable(windowEl);
        addWindowControls(windowEl);
        // Add taskbar item immediately when window is opened
        // Ensure windowId exists
        if (!windowEl.dataset.windowId) {
            windowEl.dataset.windowId = 'w_' + Math.random().toString(36).slice(2, 10);
        }
        // Get iconUrl for taskbar item
        const iconImg = windowEl.querySelector('.window-title img');
        const iconUrlFinal = iconImg ? iconImg.src : '';
        const titleFinal = windowEl.querySelector('.window-title-text').textContent;
        // Import addTaskbarItem from window-helpers if not already
        import('./window-helpers.js').then(mod => {
            mod.addTaskbarItem(titleFinal, windowEl, iconUrlFinal);
        });
    });
}

export function initializeWindowCreation() {
    document.querySelectorAll('.open-window').forEach(link =>
        link.addEventListener('click', e => {
            e.preventDefault();
            createWindow(link.dataset.title, link.dataset.content, link.dataset.icon);
        })
    );
}


