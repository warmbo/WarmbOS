class WindowState {
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.windowsState = {};
        this.activeWindowId = null;
        this.loadState();
        
        // Setup periodic highlight check
        this.highlightCheckInterval = setInterval(() => this.updateTaskbarHighlights(), 300);
        
        // Add state validation
        window.addEventListener('load', () => this.validateWindowState());
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.validateWindowState();
            }
        });
    }

    updateTaskbarHighlights() {
        // Get all taskbar buttons
        const allButtons = [
            ...document.querySelectorAll('#taskbar-buttons button'),
            ...document.querySelectorAll('#taskbar-unique-buttons button')
        ];
        
        // Clear all highlights first
        allButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.classList.remove('window-open');
        });
        
        // Mark buttons for open windows
        Object.entries(this.windowsState).forEach(([id, windowState]) => {
            if (!windowState.minimized) {
                // Find matching button by URL and title
                const matchingButton = allButtons.find(btn => {
                    const btnUrl = this.windowManager.prepareUrl(btn.dataset.url);
                    const windowUrl = this.windowManager.prepareUrl(windowState.url);
                    return btnUrl === windowUrl && btn.dataset.title === windowState.title;
                });
                
                if (matchingButton) {
                    matchingButton.classList.add('window-open');
                    
                    // If this is the active window, also add the active class
                    if (id === this.activeWindowId) {
                        matchingButton.classList.add('active');
                    }
                }
            }
        });
        
        // Also ensure minimized windows are properly handled
        this.windowManager.minimizedWindows.forEach((button, id) => {
            // Remove any previous styling
            button.classList.remove('active');
            
            // If this is the active window (although it shouldn't be if minimized), mark it
            if (id === this.activeWindowId) {
                button.classList.add('active');
            }
        });
    }

    // Modified loadState
    loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem('windows') || '{}');
            const validWindows = {};
            
            Object.entries(saved).forEach(([key, value]) => {
                if (key === '_activeWindowId') {
                    this.activeWindowId = value;
                } else if (value && typeof value === 'object' && value.url && value.title) {
                    validWindows[key] = {
                        ...value,
                        minimized: !!value.minimized,
                        zIndex: value.zIndex || 100
                    };
                }
            });
            
            this.windowsState = validWindows;
        } catch (e) {
            console.error('Failed to load window state:', e);
            this.windowsState = {};
        }
    }

    // Modified saveState
    saveState() {
        const stateToSave = {
            ...this.windowsState,
            _activeWindowId: this.activeWindowId
        };
        localStorage.setItem('windows', JSON.stringify(stateToSave));
        this.updateTaskbarHighlights(); // Update highlights after state changes
    }

    // Clean up interval when destroyed
    destroy() {
        clearInterval(this.highlightCheckInterval);
    }

    // Rest of your methods remain unchanged...
    validateWindowState() {
        const validWindows = {};
        
        Object.entries(this.windowsState).forEach(([id, w]) => {
            if (w && typeof w === 'object' && w.url && w.title) {
                validWindows[id] = w;
            }
        });
        
        this.windowsState = validWindows;
        this.saveState();
    }

    setActiveWindow(id) {
        this.activeWindowId = id;
        this.saveState();
    }

    updateWindowPosition(id, left, top) {
        if (this.windowsState[id]) {
            this.windowsState[id].left = left;
            this.windowsState[id].top = top;
            this.saveState();
        }
    }

    updateWindowSize(id, width, height) {
        if (this.windowsState[id]) {
            this.windowsState[id].width = width;
            this.windowsState[id].height = height;
            this.saveState();
        }
    }

    findWindowIdByUrl(url) {
        const preparedUrl = this.windowManager.prepareUrl(url);
        return Object.entries(this.windowsState).find(([id, w]) => 
            this.windowManager.prepareUrl(w.url) === preparedUrl
        )?.[0];
    }

    handleExistingWindow(url, title) {
        const preparedUrl = this.windowManager.prepareUrl(url);
        const existingId = Object.keys(this.windowsState).find(id => {
            const w = this.windowsState[id];
            return this.windowManager.prepareUrl(w.url) === preparedUrl && w.title === title;
        });
        
        return !!existingId;
    }
}

export default WindowState;