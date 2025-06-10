// Optimized Desktop State Management - Improved minimize/restore and cleaner architecture

import { debounce } from '../components/utils.js';
import { DataManager } from './data-manager.js';

// === CONSTANTS ===
const STORAGE_KEY = 'warmbos-desktop-state';
const STATE_VERSION = '1.1';
const MAX_STATE_AGE = 24 * 60 * 60 * 1000; // 24 hours
const SAVE_DELAY = 1000; // 1 second debounce

// === STATE MANAGEMENT CLASS ===
class DesktopStateManager {
    constructor() {
        this.debouncedSave = debounce(() => this.saveState(), SAVE_DELAY);
        this.isInitialized = false;
    }

    // === PUBLIC INTERFACE ===
    saveState() {
        const state = this.collectCurrentState();
        if (this.isValidState(state)) {
            this.writeToStorage(state);
            console.log('Desktop state saved:', state.openWindows.length, 'windows');
        }
    }

    loadState() {
        try {
            const savedState = this.readFromStorage();
            if (!savedState || this.isStateExpired(savedState)) {
                this.clearStorage();
                return;
            }

            console.log('Restoring desktop state:', savedState.openWindows.length, 'windows');
            this.restoreWindows(savedState.openWindows);
        } catch (error) {
            console.error('Failed to load desktop state:', error);
            this.clearStorage();
        }
    }

    clearStorage() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('Desktop state cleared');
        } catch (error) {
            console.error('Failed to clear desktop state:', error);
        }
    }

    scheduleSave() {
        this.debouncedSave();
    }

    // === STATE COLLECTION ===
    collectCurrentState() {
        const state = {
            openWindows: [],
            timestamp: Date.now(),
            version: STATE_VERSION
        };

        document.querySelectorAll('.desktop .window').forEach(window => {
            const windowData = this.extractWindowData(window);
            if (windowData) {
                state.openWindows.push(windowData);
            }
        });

        return state;
    }

    extractWindowData(windowEl) {
        const titleEl = windowEl.querySelector('.window-title-text');
        const title = titleEl?.textContent;
        
        if (!title) return null;

        // Find shortcut data using DataManager
        const shortcutData = this.findShortcutSource(title);
        if (!shortcutData) return null;

        return {
            title,
            contentPath: shortcutData.contentPath,
            iconUrl: shortcutData.iconUrl,
            position: this.getWindowPosition(windowEl),
            size: this.getWindowSize(windowEl),
            state: this.getWindowState(windowEl),
            zIndex: windowEl.style.zIndex || '1001'
        };
    }

    getWindowPosition(windowEl) {
        return {
            left: windowEl.style.left || windowEl.offsetLeft + 'px',
            top: windowEl.style.top || windowEl.offsetTop + 'px'
        };
    }

    getWindowSize(windowEl) {
        return {
            width: windowEl.style.width || windowEl.offsetWidth + 'px',
            height: windowEl.style.height || windowEl.offsetHeight + 'px'
        };
    }

    getWindowState(windowEl) {
        return {
            isMaximized: this.isWindowMaximized(windowEl),
            isMinimized: windowEl.classList.contains('minimized')
        };
    }

    isWindowMaximized(windowEl) {
        if (windowEl.classList.contains('maximized')) {
            return true;
        }
        
        // Check styles for maximized state (after refresh)
        const style = windowEl.style;
        const taskbarHeight = document.getElementById('taskbar')?.offsetHeight || 40;
        
        return (
            style.width === '100%' && 
            style.height === `calc(100% - ${taskbarHeight}px)` &&
            style.left === '0px' && 
            style.top === '0px'
        );
    }

    findShortcutSource(title) {
        // Use DataManager for consistent shortcut finding
        return DataManager.findShortcutByTitle?.(title) || this.fallbackShortcutSearch(title);
    }

    fallbackShortcutSearch(title) {
        // Fallback if DataManager method doesn't exist yet
        const selectors = [
            '#desktop-icons .open-window',
            '.taskbar .open-window', 
            '.start-menu .open-window'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(`${selector}[data-title="${title}"]`);
            if (element) {
                return {
                    title: element.dataset.title,
                    contentPath: element.dataset.content,
                    iconUrl: element.dataset.icon
                };
            }
        }
        return null;
    }

    // === STATE RESTORATION ===
    restoreWindows(windowStates) {
        Promise.all([
            import('../components/windows/window-creation.js'),
            import('../components/window-helpers.js')
        ]).then(([windowModule, helpersModule]) => {
            windowStates.forEach((windowState, index) => {
                // Stagger window creation to avoid conflicts
                setTimeout(() => {
                    this.restoreWindow(windowState, windowModule, helpersModule);
                }, 200 * (index + 1));
            });
        }).catch(error => {
            console.error('Failed to import window modules:', error);
        });
    }

    restoreWindow(windowState, windowModule, helpersModule) {
        try {
            // Create the window
            windowModule.createWindow(
                windowState.title,
                windowState.contentPath,
                windowState.iconUrl,
                false // Don't skip taskbar
            );

            // Wait for window creation, then restore state
            setTimeout(() => {
                this.applyWindowState(windowState, helpersModule);
            }, 300);
        } catch (error) {
            console.error('Failed to restore window:', windowState.title, error);
        }
    }

    applyWindowState(windowState, helpersModule) {
        const targetWindow = this.findWindowByTitle(windowState.title);
        if (!targetWindow) {
            console.warn('Could not find window to restore state:', windowState.title);
            return;
        }

        // Mark as restored to avoid duplicate processing
        targetWindow.dataset.stateRestored = 'true';

        // Ensure window has proper handlers
        this.ensureWindowHandlers(targetWindow, helpersModule);

        // Apply position and size
        this.applyWindowGeometry(targetWindow, windowState);
        
        // Apply window state (maximized/minimized)
        this.applyWindowFlags(targetWindow, windowState);

        console.log('Restored window state:', windowState.title);
    }

    findWindowByTitle(title) {
        const windows = document.querySelectorAll('.desktop .window');
        for (const window of windows) {
            const titleEl = window.querySelector('.window-title-text');
            if (titleEl?.textContent === title && !window.dataset.stateRestored) {
                return window;
            }
        }
        return null;
    }

    applyWindowGeometry(windowEl, windowState) {
        Object.assign(windowEl.style, {
            left: windowState.position.left,
            top: windowState.position.top,
            width: windowState.size.width,
            height: windowState.size.height,
            zIndex: windowState.zIndex
        });
    }

    applyWindowFlags(windowEl, windowState) {
        if (windowState.state.isMaximized) {
            windowEl.classList.add('maximized');
            const taskbarHeight = document.getElementById('taskbar')?.offsetHeight || 0;
            Object.assign(windowEl.style, {
                width: '100%',
                height: `calc(100% - ${taskbarHeight}px)`,
                left: '0',
                top: '0'
            });
        }

        if (windowState.state.isMinimized) {
            windowEl.classList.add('minimized');
            windowEl.style.display = 'none';
        }
    }

    ensureWindowHandlers(windowEl, helpersModule) {
        try {
            helpersModule.makeWindowDraggable(windowEl);
            helpersModule.addWindowControls(windowEl);
            
            windowEl.addEventListener('mousedown', (e) => {
                if (e.target.closest('.window')) {
                    helpersModule.bringWindowToFront(windowEl);
                }
            });
        } catch (error) {
            console.error('Failed to ensure window handlers:', error);
        }
    }

    // === STORAGE OPERATIONS ===
    writeToStorage(state) {
        try {
            const serialized = JSON.stringify(state);
            localStorage.setItem(STORAGE_KEY, serialized);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded, clearing old state');
                this.clearStorage();
            } else {
                console.error('Failed to save state:', error);
            }
            return false;
        }
    }

    readFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to read state:', error);
            return null;
        }
    }

    // === VALIDATION ===
    isValidState(state) {
        return state && 
               typeof state.timestamp === 'number' &&
               Array.isArray(state.openWindows) &&
               state.version === STATE_VERSION;
    }

    isStateExpired(state) {
        return Date.now() - state.timestamp > MAX_STATE_AGE;
    }

    // === INITIALIZATION ===
    initializeObserver() {
        if (this.isInitialized) return;

        const observer = new MutationObserver((mutations) => {
            let shouldSave = false;

            mutations.forEach((mutation) => {
                // Window added or removed
                if (mutation.type === 'childList') {
                    const hasWindowChanges = Array.from(mutation.addedNodes)
                        .concat(Array.from(mutation.removedNodes))
                        .some(node => node.classList?.contains('window'));
                    
                    if (hasWindowChanges) {
                        shouldSave = true;
                    }
                }

                // Window attributes changed (position, size, etc.)
                if (mutation.type === 'attributes' && 
                    mutation.target.classList?.contains('window')) {
                    shouldSave = true;
                }
            });

            if (shouldSave) {
                this.scheduleSave();
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
            this.saveState();
        });

        // Periodic save as backup
        setInterval(() => this.saveState(), 30000); // Every 30 seconds

        this.isInitialized = true;
        console.log('Desktop state management initialized');
    }
}

// === GLOBAL INSTANCE ===
const stateManager = new DesktopStateManager();

// === EXPORTED FUNCTIONS (Maintain backward compatibility) ===
export function saveDesktopState() {
    stateManager.saveState();
}

export function loadDesktopState() {
    // Add delay to ensure UI is fully loaded
    setTimeout(() => {
        stateManager.loadState();
    }, 500);
}

export function clearDesktopState() {
    stateManager.clearStorage();
}

export function initializeStateManagement() {
    stateManager.initializeObserver();
}