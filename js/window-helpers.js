// Optimized window-helpers.js - Removed duplicates and improved organization

// Generate window ID if it doesn't exist
function ensureWindowId(windowEl) {
    if (!windowEl.dataset.windowId) {
        windowEl.dataset.windowId = 'w_' + Math.random().toString(36).slice(2, 10);
    }
    return windowEl.dataset.windowId;
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

export function addResizeHandles(el) {
    const sides = [
        { dir: 'right', cursor: 'ew-resize', style: { right: 0, top: 0, width: '8px', height: '100%' } },
        { dir: 'bottom', cursor: 'ns-resize', style: { left: 0, bottom: 0, width: '100%', height: '8px' } },
        { dir: 'corner', cursor: 'nwse-resize', style: { right: 0, bottom: 0, width: '16px', height: '16px' } }
    ];
    
    sides.forEach(({ dir, cursor, style }) => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-${dir}`;
        
        // Apply base styles and specific positioning
        Object.assign(handle.style, {
            position: 'absolute',
            userSelect: 'none',
            zIndex: 1001,
            pointerEvents: 'auto',
            cursor,
            ...style
        });

        handle.addEventListener('mousedown', e => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = el.offsetWidth;
            const startH = el.offsetHeight;
            addDragGuard();

            function onMove(ev) {
                const deltaX = ev.clientX - startX;
                const deltaY = ev.clientY - startY;
                
                if (dir === 'right' || dir === 'corner') {
                    el.style.width = Math.max(200, startW + deltaX) + 'px';
                }
                if (dir === 'bottom' || dir === 'corner') {
                    el.style.height = Math.max(120, startH + deltaY) + 'px';
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
    document.getElementById('drag-guard')?.remove();
}

export function addWindowControls(el) {
    const minimizeBtn = el.querySelector('.minimize-button');
    const maximizeBtn = el.querySelector('.maximize-button');
    const closeBtn = el.querySelector('.close-button');

    // Updated minimize button handler with improved state management
    minimizeBtn?.addEventListener('click', () => {
        console.log("[minimize] Clicked");
        
        // Ensure window has ID for state tracking
        ensureWindowId(el);
        
        // Add minimize animation with better state management
        el.classList.add('minimizing');
        
        // Store pre-minimize state for better restoration
        if (!el.dataset.preMinimizeState) {
            el.dataset.preMinimizeState = JSON.stringify({
                display: el.style.display || '',
                zIndex: el.style.zIndex || '1001',
                wasMaximized: el.classList.contains('maximized')
            });
        }
        
        setTimeout(() => {
            el.classList.remove('minimizing');
            el.classList.add('minimized');
            el.style.display = 'none';
            
            const iconImg = el.querySelector('.window-title img');
            const iconUrl = iconImg?.src || '';
            const title = el.querySelector('.window-title-text').textContent;
            
            addTaskbarItem(title, el, iconUrl);
            
            // Trigger state save
            import('./desktop-state.js').then(stateModule => {
                stateModule.saveDesktopState();
            });
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

// Improved restoreWindow function
function restoreWindow(windowEl) {
    console.log("[restore] Restoring window");
    
    // Get stored pre-minimize state
    let preMinimizeState = {};
    if (windowEl.dataset.preMinimizeState) {
        try {
            preMinimizeState = JSON.parse(windowEl.dataset.preMinimizeState);
            delete windowEl.dataset.preMinimizeState;
        } catch (e) {
            console.warn('Failed to parse pre-minimize state');
        }
    }
    
    // Remove minimized state
    windowEl.classList.remove('minimized');
    windowEl.classList.add('restoring');
    
    // Restore display and z-index
    windowEl.style.display = preMinimizeState.display || '';
    if (preMinimizeState.zIndex) {
        windowEl.style.zIndex = preMinimizeState.zIndex;
    }
    
    // Restore maximized state if it was maximized before
    if (preMinimizeState.wasMaximized) {
        windowEl.classList.add('maximized');
        const taskbarHeight = document.getElementById('taskbar')?.offsetHeight || 0;
        Object.assign(windowEl.style, {
            width: '100%',
            height: `calc(100% - ${taskbarHeight}px)`,
            left: '0',
            top: '0'
        });
    }
    
    setTimeout(() => {
        windowEl.classList.remove('restoring');
        bringWindowToFront(windowEl);
        
        // Trigger state save
        import('./desktop-state.js').then(stateModule => {
            stateModule.saveDesktopState();
        });
    }, 300);
}

// Enhanced addTaskbarItem function
export function addTaskbarItem(title, windowEl, iconUrl) {
    const taskbar = document.querySelector('.taskbar-items');
    if (!taskbar) return;

    ensureWindowId(windowEl);

    // Check for existing static taskbar item first
    const staticItem = Array.from(taskbar.querySelectorAll('.taskbar-item.open-window'))
        .find(item => item.textContent.trim() === title.trim());
    
    if (staticItem) {
        return bindTaskbarItem(staticItem, windowEl);
    }

    // Check for existing item by window ID
    const existingById = taskbar.querySelector(`[data-window-id='${windowEl.dataset.windowId}']`);
    if (existingById) {
        return bindTaskbarItem(existingById, windowEl);
    }

    // Check for existing static item by title that can be reused
    const existingByTitle = Array.from(taskbar.querySelectorAll('.taskbar-item'))
        .find(item => item.textContent.trim() === title.trim() && item.dataset.static === 'true');
    
    if (existingByTitle) {
        existingByTitle.dataset.windowId = windowEl.dataset.windowId;
        return bindTaskbarItem(existingByTitle, windowEl);
    }

    // Create new dynamic taskbar item
    createDynamicTaskbarItem(taskbar, title, windowEl, iconUrl);
}

// Helper function to bind taskbar item to window
function bindTaskbarItem(item, windowEl) {
    item.dataset.windowId = windowEl.dataset.windowId;
    
    if (!item.dataset.bound) {
        // Remove any existing click handlers
        const newItem = item.cloneNode(true);
        item.replaceWith(newItem);
        
        // Add fresh click handler
        newItem.addEventListener('click', () => {
            if (windowEl.classList.contains('minimized')) {
                restoreWindow(windowEl);
            } else {
                bringWindowToFront(windowEl);
            }
        });
        
        newItem.dataset.bound = 'true';
    }
}

// Helper function to create new dynamic taskbar item
function createDynamicTaskbarItem(taskbar, title, windowEl, iconUrl) {
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
        if (windowEl.classList.contains('minimized')) {
            restoreWindow(windowEl);
        } else {
            bringWindowToFront(windowEl);
        }
    });
    
    taskbar.appendChild(item);
}

export function removeTaskbarItem(windowEl) {
    const taskbar = document.querySelector('.taskbar-items');
    if (!taskbar) return;
    
    const item = taskbar.querySelector(`[data-window-id='${windowEl.dataset.windowId}']`);
    if (!item) return;
    
    if (item.dataset.static) {
        // Static item - just reset it for reuse
        item.classList.remove('active-window');
        delete item.dataset.windowId;
        delete item.dataset.bound;
    } else {
        // Dynamic item - remove it
        item.remove();
    }
}