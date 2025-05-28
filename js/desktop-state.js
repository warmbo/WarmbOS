// Desktop State Management
// Saves and restores window positions and open applications

const DESKTOP_STATE_KEY = 'warmbos-desktop-state';

export function saveDesktopState() {
    const state = {
        openWindows: [],
        timestamp: Date.now()
    };
    
    // Get all open windows
    const windows = document.querySelectorAll('.desktop .window');
    windows.forEach(window => {
        const titleEl = window.querySelector('.window-title-text');
        const title = titleEl ? titleEl.textContent : '';
        
        // Find the original shortcut that opened this window
        const windowData = findWindowSource(title);
        
        if (windowData) {
            const windowState = {
                title: title,
                content: windowData.content,
                icon: windowData.icon,
                position: {
                    left: window.style.left || window.offsetLeft + 'px',
                    top: window.style.top || window.offsetTop + 'px'
                },
                size: {
                    width: window.style.width || window.offsetWidth + 'px',
                    height: window.style.height || window.offsetHeight + 'px'
                },
                isMaximized: window.classList.contains('maximized'),
                isMinimized: window.classList.contains('minimized'),
                zIndex: window.style.zIndex || '1001'
            };
            
            state.openWindows.push(windowState);
        }
    });
    
    // Save to localStorage
    try {
        localStorage.setItem(DESKTOP_STATE_KEY, JSON.stringify(state));
        console.log('Desktop state saved:', state.openWindows.length, 'windows');
    } catch (error) {
        console.error('Failed to save desktop state:', error);
    }
}

export function loadDesktopState() {
    try {
        const savedState = localStorage.getItem(DESKTOP_STATE_KEY);
        if (!savedState) return;
        
        const state = JSON.parse(savedState);
        
        // Check if state is recent (within last 24 hours)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() - state.timestamp > maxAge) {
            console.log('Desktop state expired, clearing');
            clearDesktopState();
            return;
        }
        
        console.log('Restoring desktop state:', state.openWindows.length, 'windows');
        
        // Wait for UI components to load before restoring windows
        setTimeout(() => {
            restoreWindows(state.openWindows);
        }, 500);
        
    } catch (error) {
        console.error('Failed to load desktop state:', error);
        clearDesktopState();
    }
}

function restoreWindows(windowStates) {
    // Import required modules
    Promise.all([
        import('./window-creation.js'),
        import('./window-helpers.js')
    ]).then(([windowModule, helpersModule]) => {
        windowStates.forEach((windowState, index) => {
            // Create the window
            windowModule.createWindow(
                windowState.title,
                windowState.content,
                windowState.icon,
                false // Don't skip taskbar
            );
            
            // Wait for window to be created, then restore its state
            setTimeout(() => {
                restoreWindowState(windowState, index, helpersModule);
            }, 200 * (index + 1)); // Longer delay and stagger restoration
        });
    });
}

function restoreWindowState(windowState, index, helpersModule) {
    // Find the newly created window by title
    const windows = document.querySelectorAll('.desktop .window');
    let targetWindow = null;
    
    for (const window of windows) {
        const titleEl = window.querySelector('.window-title-text');
        if (titleEl && titleEl.textContent === windowState.title) {
            // Check if this window doesn't already have restored state
            if (!window.dataset.stateRestored) {
                targetWindow = window;
                window.dataset.stateRestored = 'true';
                break;
            }
        }
    }
    
    if (!targetWindow) {
        console.warn('Could not find window to restore state:', windowState.title);
        return;
    }
    
    // Ensure window has proper event handlers
    ensureWindowHandlers(targetWindow, helpersModule);
    
    // Restore position and size
    targetWindow.style.left = windowState.position.left;
    targetWindow.style.top = windowState.position.top;
    targetWindow.style.width = windowState.size.width;
    targetWindow.style.height = windowState.size.height;
    targetWindow.style.zIndex = windowState.zIndex;
    
    // Restore maximized state
    if (windowState.isMaximized) {
        targetWindow.classList.add('maximized');
        const taskbarHeight = document.getElementById('taskbar')?.offsetHeight || 0;
        Object.assign(targetWindow.style, {
            width: '100%',
            height: `calc(100% - ${taskbarHeight}px)`,
            left: '0',
            top: '0'
        });
    }
    
    // Restore minimized state
    if (windowState.isMinimized) {
        targetWindow.classList.add('minimized');
        targetWindow.style.display = 'none';
    }
    
    console.log('Restored window state:', windowState.title);
}

function ensureWindowHandlers(windowEl, helpersModule) {
    // Re-apply window functionality to ensure it works after restoration
    try {
        // Make sure window can be dragged
        helpersModule.makeWindowDraggable(windowEl);
        
        // Make sure window controls work
        helpersModule.addWindowControls(windowEl);
        
        // Ensure window can be brought to front
        windowEl.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window')) {
                helpersModule.bringWindowToFront(windowEl);
            }
        });
        
        console.log('Ensured handlers for restored window:', windowEl.querySelector('.window-title-text')?.textContent);
    } catch (error) {
        console.error('Failed to ensure window handlers:', error);
    }
}

function findWindowSource(title) {
    // Check shortcuts.json data to find the source of this window
    const allShortcuts = [];
    
    // Check desktop icons
    const desktopIcons = document.querySelectorAll('#desktop-icons .open-window');
    desktopIcons.forEach(icon => {
        if (icon.dataset.title === title) {
            allShortcuts.push({
                title: icon.dataset.title,
                content: icon.dataset.content,
                icon: icon.dataset.icon
            });
        }
    });
    
    // Check taskbar items
    const taskbarItems = document.querySelectorAll('.taskbar .open-window');
    taskbarItems.forEach(item => {
        if (item.dataset.title === title) {
            allShortcuts.push({
                title: item.dataset.title,
                content: item.dataset.content,
                icon: item.dataset.icon
            });
        }
    });
    
    // Check start menu items
    const startMenuItems = document.querySelectorAll('.start-menu .open-window');
    startMenuItems.forEach(item => {
        if (item.dataset.title === title) {
            allShortcuts.push({
                title: item.dataset.title,
                content: item.dataset.content,
                icon: item.dataset.icon
            });
        }
    });
    
    return allShortcuts[0] || null;
}

export function clearDesktopState() {
    try {
        localStorage.removeItem(DESKTOP_STATE_KEY);
        console.log('Desktop state cleared');
    } catch (error) {
        console.error('Failed to clear desktop state:', error);
    }
}

// Auto-save state when windows change
export function initializeStateManagement() {
    // Save state when windows are moved, resized, minimized, etc.
    let saveTimeout;
    
    function scheduleStateSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveDesktopState, 1000); // Debounce saves
    }
    
    // Observer for window changes
    const observer = new MutationObserver((mutations) => {
        let shouldSave = false;
        
        mutations.forEach((mutation) => {
            // Window added or removed
            if (mutation.type === 'childList') {
                const hasWindowChanges = Array.from(mutation.addedNodes)
                    .concat(Array.from(mutation.removedNodes))
                    .some(node => node.classList && node.classList.contains('window'));
                
                if (hasWindowChanges) {
                    shouldSave = true;
                }
            }
            
            // Window attributes changed (position, size, etc.)
            if (mutation.type === 'attributes' && 
                mutation.target.classList && 
                mutation.target.classList.contains('window')) {
                shouldSave = true;
            }
        });
        
        if (shouldSave) {
            scheduleStateSave();
        }
    });
    
    // Start observing the desktop
    const desktop = document.querySelector('.desktop');
    if (desktop) {
        observer.observe(desktop, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
    
    // Save state before page unload
    window.addEventListener('beforeunload', () => {
        saveDesktopState();
    });
    
    // Save state periodically
    setInterval(saveDesktopState, 30000); // Every 30 seconds
    
    console.log('Desktop state management initialized');
}