// Centralized z-index logic for all windows
export function bringWindowToFront(windowEl) {
    const allWindows = document.querySelectorAll('.desktop .window');
    let maxZ = 1001;
    allWindows.forEach(w => {
        const z = parseInt(w.style.zIndex) || 1001;
        if (z > maxZ) maxZ = z;
        w.classList.remove('active-window');
    });
    // Cap at 9000
    windowEl.style.zIndex = Math.min(maxZ + 1, 9000);
    windowEl.classList.add('active-window');
}

export function makeWindowDraggable(el) {
    const bar = el.querySelector('.window-title-bar');
    let drag = false, offsetX = 0, offsetY = 0;
    let moved = false;

    bar.addEventListener('mousedown', e => {
        if (e.target.closest('.window-title-button')) return;
        if (isWindowMaximized(el)) return;
        drag = true;
        moved = false;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
        el.style.zIndex = 1000;
        // Disable animations during drag
        el.classList.add('dragging');
        addDragGuard();
    });

    document.addEventListener('mousemove', e => {
        if (!drag) return;
        moved = true;
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        if (drag && !moved) {
            console.log("[drag] Mouseup with no movement — likely a click.");
        }
        drag = false;
        // Re-enable animations after drag
        el.classList.remove('dragging');
        removeDragGuard();
    });

    addResizeHandles(el);
}

// Helper function to detect if window is maximized by checking both class and styles
function isWindowMaximized(el) {
    if (el.classList.contains('maximized')) {
        return true;
    }
    
    // Check if window has maximized-like styles (after browser refresh)
    const style = el.style;
    const taskbarHeight = document.getElementById('taskbar')?.offsetHeight || 40;
    const expectedHeight = `calc(100% - ${taskbarHeight}px)`;
    
    return (
        style.width === '100%' && 
        (style.height === expectedHeight || style.height === `calc(100% - ${taskbarHeight}px)`) &&
        style.left === '0px' && 
        style.top === '0px'
    );
}

export function addResizeHandles(el) {
    const sides = [
        { dir: 'right', cursor: 'ew-resize' },
        { dir: 'bottom', cursor: 'ns-resize' },
        { dir: 'corner', cursor: 'nwse-resize' }
    ];
    sides.forEach(({ dir, cursor }) => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-${dir}`;
        Object.assign(handle.style, {
            position: 'absolute',
            userSelect: 'none',
            zIndex: 1001,
            pointerEvents: 'auto',
            cursor
        });

        if (dir === 'right') Object.assign(handle.style, { right: 0, top: 0, width: '8px', height: '100%' });
        else if (dir === 'bottom') Object.assign(handle.style, { left: 0, bottom: 0, width: '100%', height: '8px' });
        else if (dir === 'corner') Object.assign(handle.style, { right: 0, bottom: 0, width: '16px', height: '16px' });

        handle.addEventListener('mousedown', e => {
            e.stopPropagation();
            let startX = e.clientX, startY = e.clientY;
            let startW = el.offsetWidth, startH = el.offsetHeight;
            addDragGuard();

            function onMove(ev) {
                if (dir === 'right') el.style.width = Math.max(200, startW + (ev.clientX - startX)) + 'px';
                if (dir === 'bottom') el.style.height = Math.max(120, startH + (ev.clientY - startY)) + 'px';
                if (dir === 'corner') {
                    el.style.width = Math.max(200, startW + (ev.clientX - startX)) + 'px';
                    el.style.height = Math.max(120, startH + (ev.clientY - startY)) + 'px';
                }
            }

            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                removeDragGuard();
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        el.appendChild(handle);
    });
}

export function addDragGuard() {
    if (document.getElementById('drag-guard')) return;
    const guard = document.createElement('div');
    guard.id = 'drag-guard';
    Object.assign(guard.style, {
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: 'transparent'
    });
    document.body.appendChild(guard);
}

export function removeDragGuard() {
    const guard = document.getElementById('drag-guard');
    if (guard) guard.remove();
}

export function addWindowControls(el) {
    const minimizeBtn = el.querySelector('.minimize-button');
    const maximizeBtn = el.querySelector('.maximize-button');
    const closeBtn = el.querySelector('.close-button');

    minimizeBtn?.addEventListener('click', () => {
        console.log("[minimize] Clicked");
        // Add minimize animation
        el.classList.add('minimizing');
        setTimeout(() => {
            el.classList.remove('minimizing');
            el.classList.add('minimized');
            el.style.display = 'none';
            const iconImg = el.querySelector('.window-title img');
            const iconUrl = iconImg ? iconImg.src : '';
            const title = el.querySelector('.window-title-text').textContent;
            if (!el.dataset.windowId) {
                el.dataset.windowId = 'w_' + Math.random().toString(36).slice(2, 10);
            }
            addTaskbarItem(title, el, iconUrl);
        }, 300);
    });

    maximizeBtn?.addEventListener('click', () => {
        console.log("[maximize] Clicked");
        if (isWindowMaximized(el)) {
            // Restore window
            el.classList.add('restoring-size');
            setTimeout(() => {
                Object.assign(el.style, { width: '', height: '', left: '', top: '' });
                el.classList.remove('maximized', 'restoring-size');
                console.log("[maximize] Window restored to normal size");
            }, 50);
        } else {
            // Maximize window
            el.classList.add('maximizing');
            setTimeout(() => {
                const taskbarHeight = document.getElementById('taskbar')?.offsetHeight || 0;
                Object.assign(el.style, {
                    width: '100%',
                    height: `calc(100% - ${taskbarHeight}px)`,
                    left: '0',
                    top: '0'
                });
                el.classList.add('maximized');
                el.classList.remove('maximizing');
                console.log("[maximize] Window maximized");
            }, 50);
        }
    });

    closeBtn?.addEventListener('click', () => {
        console.log("[close] Clicked");
        // Add close animation
        el.classList.add('closing');
        setTimeout(() => {
            removeTaskbarItem(el);
            el.remove();
        }, 250);
    });

    el.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window')) {
            bringWindowToFront(el);
        }
    });
}

export function minimizeWindow(windowEl) {
    windowEl.classList.add('minimized');
    // Find the icon from the window titlebar
    const iconImg = windowEl.querySelector('.window-title img');
    const iconUrl = iconImg ? iconImg.src : '';
    const title = windowEl.querySelector('.window-title-text').textContent;
    // Ensure the window has a unique id for taskbar tracking
    if (!windowEl.dataset.windowId) {
        windowEl.dataset.windowId = 'w_' + Math.random().toString(36).slice(2, 10);
    }
    addTaskbarItem(title, windowEl, iconUrl);
}

export function addTaskbarItem(title, windowEl, iconUrl) {
    const taskbar = document.querySelector('.taskbar-items');
    if (!taskbar) return;

    // Prevent creating a new taskbar item if a static .open-window already exists
    const staticOpenWindow = Array.from(taskbar.querySelectorAll('.taskbar-item.open-window')).find(item => {
        return item.textContent.trim() === title.trim();
    });
    if (staticOpenWindow) {
        staticOpenWindow.dataset.windowId = windowEl.dataset.windowId;
        if (!staticOpenWindow.dataset.bound) {
            staticOpenWindow.addEventListener('click', () => {
                restoreWindow(windowEl);
            });
            staticOpenWindow.dataset.bound = 'true';
        }
        return;
    }
    const existingById = taskbar.querySelector(`[data-window-id='${windowEl.dataset.windowId}']`);
    if (existingById) {
        if (!existingById.dataset.bound) {
            existingById.addEventListener('click', () => {
                restoreWindow(windowEl);
            });
            existingById.dataset.bound = 'true';
        }
        return;
    }
    const existingByTitle = Array.from(taskbar.querySelectorAll('.taskbar-item')).find(item => {
        const itemText = item.textContent.trim();
        return itemText === title.trim() && item.dataset.static === 'true';
    });
    if (existingByTitle) {
        if (!windowEl.dataset.windowId) {
            windowEl.dataset.windowId = 'w_' + Math.random().toString(36).slice(2, 10);
        }
        existingByTitle.dataset.windowId = windowEl.dataset.windowId;
        existingByTitle.dataset.bound = 'true';
        existingByTitle.replaceWith(existingByTitle.cloneNode(true));
        const updatedItem = taskbar.querySelector(`[data-window-id='${windowEl.dataset.windowId}']`);
        if (updatedItem) {
            updatedItem.dataset.static = 'true';
            updatedItem.dataset.bound = 'true';
            updatedItem.addEventListener('click', () => {
                restoreWindow(windowEl);
            });
        }
        return;
    }
    // Create new taskbar item
    const item = document.createElement('button');
    item.className = 'taskbar-item';
    item.dataset.windowId = windowEl.dataset.windowId;
    item.dataset.bound = 'true';
    if (iconUrl) {
        const img = document.createElement('img');
        img.src = iconUrl;
        img.alt = '';
        img.className = 'taskbar-item-icon';
        item.appendChild(img);
    }
    item.appendChild(document.createTextNode(title));
    item.addEventListener('click', () => {
        restoreWindow(windowEl);
    });
    taskbar.appendChild(item);
}

// New function to handle animated restore
function restoreWindow(windowEl) {
    windowEl.classList.remove('minimized');
    windowEl.classList.add('restoring');
    windowEl.style.display = '';
    setTimeout(() => {
        windowEl.classList.remove('restoring');
        bringWindowToFront(windowEl);
    }, 300);
}

export function removeTaskbarItem(windowEl) {
    const taskbar = document.querySelector('.taskbar-items');
    if (!taskbar) return;
    const item = taskbar.querySelector(`[data-window-id='${windowEl.dataset.windowId}']`);
    // Only remove if not static (not from JSON or pre-existing)
    if (item && !item.dataset.static) {
        item.remove();
    } else if (item && item.dataset.static) {
        // If static, just visually deactivate (optional, for clarity)
        item.classList.remove('active-window');
        // Also clear the windowId and bound status so it can be reused
        delete item.dataset.windowId;
        delete item.dataset.bound;
    }
}

export function destroyWindow(windowEl) {
    // Remove all event listeners
    const listeners = windowEl._eventListeners || [];
    listeners.forEach(({element, event, handler}) => {
        element.removeEventListener(event, handler);
    });
    // Remove from DOM
    windowEl.remove();
}

// Track listeners for cleanup
function addTrackedListener(element, event, handler, windowEl) {
    element.addEventListener(event, handler);
    if (!windowEl._eventListeners) windowEl._eventListeners = [];
    windowEl._eventListeners.push({element, event, handler});
}