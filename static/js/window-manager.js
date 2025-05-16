// window-manager.js - Main entry point that combines all window management modules

import WindowCore from './window-core.js';
import WindowState from './window-state.js';

class WindowUI extends WindowCore {
    constructor() {
        super();
        this.taskbarButtons = document.getElementById('taskbar-buttons');
        this.taskbarUniqueButtons = document.getElementById('taskbar-unique-buttons');
        this.stateManager = new WindowState(this);
        this.setupGlobalEventListeners();
    }

    // Event handling
    setupGlobalEventListeners() {
        window.addEventListener('mousemove', e => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
    }

    handleMouseMove(e) {
        if (this.dragging) {
            const { window: win, dx, dy } = this.dragging;
            win.style.left = `${e.clientX - dx}px`;
            win.style.top = `${e.clientY - dy}px`;
            this.stateManager.updateWindowPosition(win.dataset.id, win.style.left, win.style.top);
        }
        if (this.resizing) {
            const { window: win, width, height, x, y } = this.resizing;
            win.style.width = `${Math.max(300, width + e.clientX - x)}px`;
            win.style.height = `${Math.max(200, height + e.clientY - y)}px`;
            this.stateManager.updateWindowSize(win.dataset.id, win.style.width, win.style.height);
        }
    }

    handleMouseUp() {
        if (this.dragging) {
            this.dragging.window.classList.remove('dragging');
            this.dragging.bar.style.cursor = 'grab';
            this.dragging.iframe.style.pointerEvents = '';
            this.dragging = null;
        }
        if (this.resizing) {
            this.resizing.window.classList.remove('resizing');
            this.resizing.iframe.style.pointerEvents = '';
            this.resizing = null;
        }
    }

    getIconForUrl(url) {
        // Check all taskbar buttons for a matching URL
        const allButtons = [
            ...this.taskbarButtons.querySelectorAll('button'),
            ...this.taskbarUniqueButtons.querySelectorAll('button')
        ];
        
        const matchingButton = allButtons.find(btn => 
            this.prepareUrl(btn.dataset.url) === this.prepareUrl(url)
        );
        
        return matchingButton?.dataset.icon || null;
    }

    // Window operations
    createWindow(url, title, state = {}) {
        const icon = state.icon || this.getIconForUrl(url); // Add this helper method
        const id = state.id || `win-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const preparedUrl = this.prepareUrl(url);
        
        if (this.stateManager.handleExistingWindow(preparedUrl, title)) return;

        const win = this.createWindowElement(id, preparedUrl, title, icon, state);
        this.setupWindowAnimations(win, id);
        this.attachWindowEvents(win, id, url, title, icon);
        
        this.stateManager.windowsState[id] = {
            url, title, icon,
            top: win.style.top, left: win.style.left,
            width: win.style.width, height: win.style.height,
            zIndex: win.style.zIndex, minimized: !!state.minimized
        };
        if (state.modal) {
            win.classList.add('modal');
            win.style.zIndex = this.zIndex + 1000; // Ensure modals stay on top
        }
        this.stateManager.setActiveWindow(id);
        this.stateManager.updateTaskbarHighlights(); // Use the improved method
        this.stateManager.saveState();
    }

    attachWindowEvents(win, id, url, title, icon) {
        const bar = win.querySelector('.title-bar');
        const controls = win.querySelectorAll('.window-button');
        const [btnMin, btnMax, btnClose] = controls;
        const resize = win.querySelector('.resize-handle');
        const iframe = win.querySelector('iframe');
        
        win.addEventListener('mousedown', () => {
            win.style.zIndex = ++this.zIndex;
            this.stateManager.windowsState[id].zIndex = win.style.zIndex;
            this.stateManager.setActiveWindow(id);
            this.stateManager.updateTaskbarHighlights(); // Use the improved method
            this.stateManager.saveState();
        });

        bar.addEventListener('mousedown', e => {
            win.classList.add('dragging');
            this.dragging = {
                window: win,
                dx: e.clientX - win.offsetLeft,
                dy: e.clientY - win.offsetTop,
                bar, iframe
            };
            bar.style.cursor = 'grabbing';
            iframe.style.pointerEvents = 'none';
        });

        resize.addEventListener('mousedown', e => {
            win.classList.add('resizing');
            this.resizing = {
                window: win,
                width: win.offsetWidth,
                height: win.offsetHeight,
                x: e.clientX, y: e.clientY,
                iframe
            };
            iframe.style.pointerEvents = 'none';
            e.stopPropagation();
        });

        btnMax.onclick = () => this.toggleMaximize(win);
        btnMin.onclick = () => this.minimizeWindow(id, title, icon, url);
        btnClose.onclick = () => this.closeWindow(id);
    }

    handleTaskbarButtonClick(url, title, icon, dimensions) {
    const winId = this.stateManager.findWindowIdByUrl(url);
    
    if (!winId) {
        this.createWindow(url, title, { 
            ...dimensions, 
            icon: icon || this.getIconForUrl(url)  // Add this line
        });
    } else {
        const win = document.querySelector(`.window[data-id="${winId}"]`);
        if (win) {
            const currentIcon = this.stateManager.windowsState[winId]?.icon;
            if (win.classList.contains('minimized')) {
                this.restoreWindow(winId);
            } else {
                this.minimizeWindow(winId, title, currentIcon, url);
            }
        }
    }
}

    

    restoreWindows() {
        const activeId = this.stateManager.activeWindowId;
        
        // First restore all non-active windows
        Object.entries(this.stateManager.windowsState).forEach(([id, w]) => {
            if (id !== activeId) {
                this.createWindow(w.url, w.title, { ...w, id });
            }
        });
        
        // Then restore active window last to ensure proper z-index
        if (activeId && this.stateManager.windowsState[activeId]) {
            const w = this.stateManager.windowsState[activeId];
            this.createWindow(w.url, w.title, { ...w, id: activeId });
        }
        
        // Update taskbar highlight after all windows are restored
        setTimeout(() => this.updateTaskbarHighlight(), 100);
    }
}

// Export as the main WindowManager
export default WindowUI;