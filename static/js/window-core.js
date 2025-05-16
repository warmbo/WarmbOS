class WindowCore {
    constructor() {
        if (typeof window.URL_PREFIX === 'undefined') {
            window.URL_PREFIX = window.location.pathname.includes('/os/') ? '/os' : '';
        }
        
        this.container = document.getElementById('window-container');
        this.zIndex = 100;
        this.dragging = null;
        this.resizing = null;
        this.pendingActions = new Map();
        this.animationLock = false;
        this.minimizedWindows = new Map();
        
        // Add state validation on visibility changes and page load
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.validateWindowState();
            }
        });
    }

    validateWindowState() {
        if (!this.stateManager?.windowsState) return;
        
        const validWindows = {};
        Object.entries(this.stateManager.windowsState).forEach(([id, w]) => {
            if (w && typeof w === 'object' && w.url && w.title) {
                validWindows[id] = w;
            } else {
                console.warn(`Removing invalid window state: ${id}`);
                this.removeTaskbarIndicator(id);
            }
        });
        
        this.stateManager.windowsState = validWindows;
        this.stateManager.saveState();
    }

    restoreWindowState() {
        if (!this.stateManager?.windowsState) return;
        
        // Clear existing windows but keep their state
        document.querySelectorAll('.window').forEach(win => win.remove());
        this.minimizedWindows.clear();
        
        // Restore windows in proper z-order
        Object.entries(this.stateManager.windowsState)
            .sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0))
            .forEach(([id, w]) => {
                const win = this.createWindowElement(id, w.url, w.title, w.icon, {
                    width: w.width,
                    height: w.height,
                    top: w.top,
                    left: w.left,
                    zIndex: w.zIndex,
                    minimized: w.minimized,
                    modal: w.modal
                });
                
                // Special handling for minimized windows
                if (w.minimized) {
                    win.classList.add('minimized');
                    win.style.display = 'none';
                    this.createTaskbarIndicator(id, w.title, w.icon, w.url);
                } else {
                    this.setupWindowAnimations(win, id);
                }
                
                this.attachWindowEvents(win, id, w.url, w.title, w.icon);
            });
        
        if (this.stateManager.activeWindowId) {
            this.stateManager.setActiveWindow(this.stateManager.activeWindowId);
        }
        this.updateTaskbarHighlight();
    }

    getFullIconPath(icon) {
        if (!icon) return '';
        if (icon.startsWith('http') || icon.startsWith('data:')) return icon;
        return icon.startsWith('/') ? `${URL_PREFIX}${icon}` : `${URL_PREFIX}/${icon}`;
    }

    createWindowElement(id, url, title, icon, state) {
        console.log('Creating window with icon:', icon); // Debug log
        const win = document.createElement('div');
        win.className = 'window';
        win.dataset.id = id;
        
        Object.assign(win.style, {
            top: state.top || '60px',
            left: state.left || '60px',
            width: state.width || '780px',
            height: state.height || '710px',
            zIndex: state.zIndex || ++this.zIndex,
            opacity: '0',
            transform: 'scale(0.95)'
        });
        
        if (state.minimized) win.classList.add('minimized');
        if (state.modal) win.classList.add('modal');
        
        const iconSrc = icon ? this.getFullIconPath(icon) : '';
        const iconHTML = iconSrc ? `<img src="${iconSrc}" class="icon" style="height:18px;width:18px;margin-right:8px;">` : '';
        
        win.innerHTML = `
            <div class="title-bar">
                <span class="title-text">${iconHTML}${title}</span>
                <div class="window-controls">
                    <div class="window-button minimize"><img src="${URL_PREFIX}/static/images/ui/min.png" alt="Minimize"></div>
                    <div class="window-button maximize"><img src="${URL_PREFIX}/static/images/ui/max.png" alt="Maximize"></div>
                    <div class="window-button close"><img src="${URL_PREFIX}/static/images/ui/close.png" alt="Close"></div>
                </div>
            </div>
            <iframe src="${url}" class="window-content" style="width:100%;height:calc(100% - 40px);border:none;" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"></iframe>
            <div class="resize-handle"></div>`;
        
        this.container.appendChild(win);
        return win;
    }

    setupWindowAnimations(win, id) {
        const transitionEndHandler = (e) => {
            if (e.propertyName === 'opacity' && win.classList.contains('closing')) {
                if (win && win.parentNode) {
                    win.remove();
                }
                this.removeTaskbarIndicator(id);
                delete this.stateManager?.windowsState[id];
                this.stateManager?.saveState();
            }
        };
        
        win.addEventListener('transitionend', transitionEndHandler);
        
        requestAnimationFrame(() => {
            win.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
            win.style.opacity = '1';
            win.style.transform = 'scale(1)';
        });
    }

    toggleMaximize(win) {
        if (win.classList.toggle('maximized')) {
            win.dataset.original = JSON.stringify({
                top: win.style.top,
                left: win.style.left,
                width: win.style.width,
                height: win.style.height
            });
            Object.assign(win.style, {
                top: '0',
                left: '0',
                width: '100vw',
                height: 'calc(100% - 56px)'
            });
        } else {
            Object.assign(win.style, JSON.parse(win.dataset.original));
        }
        this.stateManager.updateWindowSize(win.dataset.id, win.style.width, win.style.height);
    }

    closeWindow(id) {
        const win = document.querySelector(`.window[data-id="${id}"]`);
        if (!win) return;
        
        Object.assign(win.style, {
            transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
            opacity: '0',
            transform: 'scale(0.95)'
        });
        win.classList.add('closing');
        
        const cleanup = () => {
            win.remove();
            this.removeTaskbarIndicator(id);
            delete this.stateManager.windowsState[id];
            this.stateManager.saveState();
            this.stateManager.updateTaskbarHighlights(); // Use the improved method
        };
        
        const fallback = setTimeout(cleanup, 300);
        win.addEventListener('transitionend', () => {
            clearTimeout(fallback);
            cleanup();
        }, { once: true });
        
        this.stateManager.setActiveWindow(null);
    }

    minimizeWindow(id, title, icon, url) {
        if (this.animationLock || this.pendingActions.has(id)) return;

        const win = document.querySelector(`.window[data-id="${id}"]`);
        if (!win) return;

        this.animationLock = true;
        this.pendingActions.set(id, 'minimize');

        win.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
        win.style.opacity = '0';
        win.style.transform = 'translateY(100vh)';
        win.style.pointerEvents = 'none';

        const completeMinimize = () => {
            win.classList.add('minimized');
            win.style.transition = '';
            this.animationLock = false;
            this.pendingActions.delete(id);
            
            this.stateManager.windowsState[id].minimized = true;
            this.stateManager.saveState();
            this.createTaskbarIndicator(id, title, icon, url);
            this.stateManager.updateTaskbarHighlights(); // Use the improved method
        };

        win.addEventListener('transitionend', completeMinimize, { once: true });
        this.stateManager.setActiveWindow(null);
    }

    restoreWindow(id) {
        if (this.animationLock || this.pendingActions.has(id)) return;

        const win = document.querySelector(`.window[data-id="${id}"]`);
        if (!win) return;

        this.animationLock = true;
        this.pendingActions.set(id, 'restore');

        win.style.display = 'block';
        win.style.opacity = '0';
        win.style.transform = 'translateY(20px)';
        win.style.pointerEvents = 'none';
        win.classList.remove('minimized');

        void win.offsetWidth; // Force reflow

        win.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
        win.style.opacity = '1';
        win.style.transform = 'translateY(0)';
        win.style.pointerEvents = 'auto';
        win.style.zIndex = ++this.zIndex;

        const cleanup = () => {
            win.style.transition = '';
            this.animationLock = false;
            this.pendingActions.delete(id);
            
            this.stateManager.windowsState[id].minimized = false;
            this.stateManager.windowsState[id].zIndex = win.style.zIndex;
            this.stateManager.saveState();
            this.removeTaskbarIndicator(id);
        };

        win.addEventListener('transitionend', cleanup, { once: true });
        this.stateManager.setActiveWindow(id);
        this.stateManager.updateTaskbarHighlights(); // Use the improved method
    }

    createTaskbarIndicator(id, title, icon, url) {
        if (this.minimizedWindows.has(id)) return;

        const buttons = [
            ...this.taskbarUniqueButtons.querySelectorAll('button'),
            ...this.taskbarButtons.querySelectorAll('button')
        ];

        const originalButton = buttons.find(btn => 
            this.prepareUrl(btn.dataset.url) === this.prepareUrl(url) && 
            btn.dataset.title === title
        );

        if (originalButton) {
            originalButton.dataset.originalOnClick ??= originalButton.onclick?.toString() || '';
            originalButton.classList.add('window-minimized');
            originalButton.dataset.windowId = id;
            
            originalButton.onclick = (e) => {
                e.preventDefault();
                const win = document.querySelector(`.window[data-id="${id}"]`);
                win?.classList.contains('minimized') ? this.restoreWindow(id) : this.minimizeWindow(id, title, icon, url);
            };
            
            this.minimizedWindows.set(id, originalButton);
        } else {
            const indicator = document.createElement('button');
            indicator.className = 'taskbar-indicator window-minimized';
            indicator.dataset.id = id;
            indicator.dataset.url = url;
            indicator.dataset.title = title;
            
            const iconHTML = icon ? `<img src="${this.getFullIconPath(icon)}" class="icon">` : '';
            indicator.innerHTML = `${iconHTML}${title}`;
            indicator.onclick = (e) => {
                e.preventDefault();
                this.restoreWindow(id);
            };
            
            this.taskbarButtons.appendChild(indicator);
            this.minimizedWindows.set(id, indicator);
        }
    }

    removeTaskbarIndicator(id) {
        const button = this.minimizedWindows.get(id);
        if (!button) return;

        button.classList.remove('window-minimized');
        
        if (button.dataset.originalOnClick) {
            try {
                button.onclick = new Function(button.dataset.originalOnClick);
            } catch (e) {
                if (button.dataset.persistent === "true") {
                    button.onclick = () => this.createWindow(
                        button.dataset.url,
                        button.dataset.title,
                        {
                            width: button.dataset.width,
                            height: button.dataset.height
                        }
                    );
                }
            }
            delete button.dataset.originalOnClick;
        }
        
        if (button.classList.contains('taskbar-indicator') && button.dataset.persistent !== "true") {
            button.remove();
        }
        
        delete button.dataset.windowId;
        this.minimizedWindows.delete(id);
    }

    
    updateTaskbarHighlight() {
        // This method is now deprecated in favor of stateManager.updateTaskbarHighlights()
        // Just call the method from WindowState to ensure consistent behavior
        if (this.stateManager) {
            this.stateManager.updateTaskbarHighlights();
        }
    }

    

    prepareUrl(url) {
        if (url.startsWith('http')) return url;
        const prefix = url.startsWith('/static/') || url.startsWith('/templates/') ? URL_PREFIX : '';
        return url.startsWith('/') ? `${prefix}${url}` : `${prefix}/${url}`;
    }
}

export default WindowCore;