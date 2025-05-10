/**
 * Window Manager Module
 * Handles creation, movement, resizing, and state management of windows
 */
class WindowManager {
    constructor() {
      this.container = document.getElementById('window-container');
      this.taskbarButtons = document.getElementById('taskbar-buttons');
      this.taskbarUniqueButtons = document.getElementById('taskbar-unique-buttons');
      this.zIndex = 100;
      this.windowsState = {};
      this.minimizedWindows = new Map(); // Track minimized windows and their associated taskbar buttons
      
      // Load saved window state
      this.loadState();
      
      // Global event listeners for window manipulation
      this.setupGlobalEventListeners();
    }
    
    /**
     * Save current window state to localStorage
     */
    saveState() {
      localStorage.setItem('windows', JSON.stringify(this.windowsState));
    }
    
    /**
     * Load window state from localStorage
     */
    loadState() {
      try {
        this.windowsState = JSON.parse(localStorage.getItem('windows') || '{}');
      } catch (e) {
        console.error('Failed to load window state:', e);
        this.windowsState = {};
      }
    }
    
    /**
     * Set up global event listeners for window movement and resizing
     */
    setupGlobalEventListeners() {
      // Mouse move event for both dragging and resizing
      window.addEventListener('mousemove', e => this.handleMouseMove(e));
      
      // Mouse up event to end dragging or resizing
      window.addEventListener('mouseup', () => this.handleMouseUp());
    }
    
    /**
     * Handle mouse move for dragging and resizing windows
     */
    handleMouseMove(e) {
      // Handle active window dragging
      if (this.dragging) {
        const win = this.dragging.window;
        const dx = this.dragging.dx;
        const dy = this.dragging.dy;
        
        win.style.left = (e.clientX - dx) + 'px';
        win.style.top = (e.clientY - dy) + 'px';
        
        const id = win.dataset.id;
        this.windowsState[id].top = win.style.top;
        this.windowsState[id].left = win.style.left;
        this.saveState();
      }
      
      // Handle active window resizing
      if (this.resizing) {
        const win = this.resizing.window;
        const rw = this.resizing.width;
        const rh = this.resizing.height;
        const rx = this.resizing.x;
        const ry = this.resizing.y;
        
        win.style.width = Math.max(300, rw + (e.clientX - rx)) + 'px';
        win.style.height = Math.max(200, rh + (e.clientY - ry)) + 'px';
        
        const id = win.dataset.id;
        this.windowsState[id].width = win.style.width;
        this.windowsState[id].height = win.style.height;
        this.saveState();
      }
    }
    
    /**
     * Handle mouse up to end dragging or resizing
     */
    handleMouseUp() {
      if (this.dragging) {
        const bar = this.dragging.bar;
        const iframe = this.dragging.iframe; 
        
        bar.style.cursor = 'grab';
        iframe.style.pointerEvents = '';
        this.dragging = null;
      }
      
      if (this.resizing) {
        const iframe = this.resizing.iframe;
        iframe.style.pointerEvents = '';
        this.resizing = null;
      }
    }
    
    /**
     * Create a new window or focus existing one
     */
    createWindow(url, title, state = {}) {
      const icon = state.icon || null;
      
      // Prepare URL - load http sites directly, add URL_PREFIX for internal paths
      let preparedUrl;
      if (url.startsWith('http')) {
        // Load HTTP sites directly without proxy
        preparedUrl = url;
      } else {
        // Ensure internal URLs have the correct prefix
        preparedUrl = url.startsWith('/') ? `${URL_PREFIX}${url}` : `${URL_PREFIX}/${url}`;
      }
      
      // Check if window already exists by URL (not just ID)
      const existingWindow = Array.from(this.container.children).find(w => {
        const iframe = w.querySelector('iframe');
        return iframe && iframe.src === new URL(preparedUrl, window.location.href).href;
      });
      
      if (existingWindow) {
        if (existingWindow.classList.contains('minimized')) {
          this.restoreWindow(existingWindow.dataset.id);
        }
        existingWindow.style.zIndex = ++this.zIndex;
        return;
      }
      
      // Next check if there's any minimized window for this URL that isn't loaded yet
      const minimizedWindowId = Object.keys(this.windowsState).find(id => {
        const w = this.windowsState[id];
        return w.url === url && w.title === title && w.minimized;
      });
      
      if (minimizedWindowId) {
        // Restore the minimized window instead of creating a new one
        this.restoreWindow(minimizedWindowId);
        return;
      }
  
      const id = state.id || `win-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const win = document.createElement('div');
      win.className = 'window';
      win.dataset.id = id;
      win.style.top = state.top || '60px';
      win.style.left = state.left || '60px';
      win.style.width = state.width || '800px';
      win.style.height = state.height || '710px';
      win.style.zIndex = ++this.zIndex;
      
      // If the window was previously minimized, add the class but don't show it
      if (state.minimized) {
        win.classList.add('minimized');
      }
  
      // Check if icon exists, if so, insert it into the title-bar
      // Add URL_PREFIX to icon path if it's a relative URL
      let iconSrc = icon;
      if (icon && !icon.startsWith('http') && !icon.startsWith('data:')) {
        iconSrc = icon.startsWith('/') ? `${URL_PREFIX}${icon}` : `${URL_PREFIX}/${icon}`;
      }
      
      const iconHTML = iconSrc ? `<img src="${iconSrc}" class="icon" style="height: 18px; width: 18px; margin-right: 8px;">` : '';
  
      const minimizeIcon = `${URL_PREFIX}/static/images/ui/min.png`;
      const maximizeIcon = `${URL_PREFIX}/static/images/ui/max.png`;
      const closeIcon = `${URL_PREFIX}/static/images/ui/close.png`;
      win.innerHTML = `
        <div class="title-bar">
          <span>${iconHTML}${title}</span>
            <div style="display: flex; gap: 8px;">
            <div class="window-button minimize">
                <img src="${minimizeIcon}" alt="Minimize">
            </div>
            <div class="window-button maximize">
                <img src="${maximizeIcon}" alt="Maximize">
            </div>
            <div class="window-button close">
                <img src="${closeIcon}" alt="Close">
            </div>
            </div>
        </div>
        <iframe 
          src="${preparedUrl}" 
          style="width: 100%; height: calc(100% - 2.5rem);"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-top-navigation"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
        <div class="resize-handle"></div>
        <div class="iframe-overlay"></div>
      `;
  
      this.container.appendChild(win);
      this.attachWindowEvents(win, id, url, title, icon);
  
      this.windowsState[id] = {
        url,
        title,
        icon,
        top: win.style.top,
        left: win.style.left,
        width: win.style.width,
        height: win.style.height,
        zIndex: win.style.zIndex,
        minimized: state.minimized || false
      };
      this.saveState();
  
      // Add iframe loading handlers
      const iframe = win.querySelector('iframe');
      const overlay = win.querySelector('.iframe-overlay');
      
      iframe.onload = () => {
        overlay.style.display = 'none';
      };
  
      iframe.onerror = () => {
        overlay.style.display = 'flex';
        overlay.innerHTML = `
          <div style="padding: 20px; background: rgba(0,0,0,0.8); color: white; border-radius: 5px;">
            <p>Failed to load ${title}</p>
            <button onclick="this.closest('.window').querySelector('iframe').src='${preparedUrl}'">
              Retry
            </button>
          </div>
        `;
      };
    }
    
    /**
     * Attach interaction events to a window
     */
    attachWindowEvents(win, id, url, title, icon) {
      const bar = win.querySelector('.title-bar');
      const btnClose = win.querySelector('.close');
      const btnMax = win.querySelector('.maximize');
      const btnMin = win.querySelector('.minimize');
      const resize = win.querySelector('.resize-handle');
      const iframe = win.querySelector('iframe');
  
      // Focus window on click
      win.addEventListener('mousedown', () => {
        win.style.zIndex = ++this.zIndex;
        this.windowsState[id].zIndex = win.style.zIndex;
        this.saveState();
      });
  
      // Dragging by title bar
      bar.addEventListener('mousedown', e => {
        this.dragging = {
          window: win,
          dx: e.clientX - win.offsetLeft,
          dy: e.clientY - win.offsetTop,
          bar: bar,
          iframe: iframe
        };
        
        bar.style.cursor = 'grabbing';
        iframe.style.pointerEvents = 'none';
      });
  
      // Resizing from corner handle
      resize.addEventListener('mousedown', e => {
        this.resizing = {
          window: win,
          width: win.offsetWidth,
          height: win.offsetHeight,
          x: e.clientX,
          y: e.clientY,
          iframe: iframe
        };
        
        iframe.style.pointerEvents = 'none';
        e.stopPropagation();
      });
  
      // Window control buttons
      btnMax.onclick = () => {
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
          btnMax.textContent = '❐';
        } else {
          const o = JSON.parse(win.dataset.original);
          Object.assign(win.style, o);
          btnMax.textContent = '□';
        }
      };
      
      // Minimize button
      btnMin.onclick = () => {
        this.minimizeWindow(id, title, icon, url);
      };
  
      // Close button
      btnClose.onclick = () => {
        this.closeWindow(id);
      };
    }

    /**
     * Close window and clean up taskbar indicators
     */
    closeWindow(id) {
      const win = document.querySelector(`.window[data-id="${id}"]`);
      if (!win) return;

      // Remove the window from DOM
      win.remove();

      // Clean up taskbar indicator
      this.removeTaskbarIndicator(id);

      // Remove from state
      delete this.windowsState[id];
      this.saveState();
    }

    /**
     * Remove taskbar indicator for a window
     */
    removeTaskbarIndicator(id) {
      // Check if there is a minimized indicator for this window
      if (this.minimizedWindows.has(id)) {
        const indicator = this.minimizedWindows.get(id);
        
        // If it's a dynamically added indicator (not persistent), remove it from DOM
        if (!indicator.dataset.persistent || indicator.dataset.persistent !== "true") {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        } else {
          // If it's a persistent button, just restore its original functionality
          indicator.classList.remove('taskbar-indicator');
          
          // Restore original click handler if it had one
          if (indicator.dataset.hasCustomHandler === "true") {
            indicator.onclick = null;
            delete indicator.dataset.hasCustomHandler;
            delete indicator.dataset.windowId;
          }
        }
        
        this.minimizedWindows.delete(id);
      }
    }

    /**
     * Minimize window and create taskbar indicator if needed
     */
    minimizeWindow(id, title, icon, url) {
      const win = document.querySelector(`.window[data-id="${id}"]`);
      if (!win) return;

      // Add minimized class to trigger animation
      win.classList.add('minimized');

      // Update window state
      this.windowsState[id].minimized = true;
      this.saveState();

      // Create taskbar indicator if it doesn't exist
      this.createTaskbarIndicator(id, title, icon, url);
    }

    /**
     * Create taskbar indicator for a window
     */
    createTaskbarIndicator(id, title, icon, url) {
      // Don't create duplicates
      if (this.minimizedWindows.has(id)) return;
      
      // Check for existing buttons in the taskbar that match our URL
      const existingTaskbarButton = Array.from(this.taskbarButtons.children).find(btn => 
        btn.dataset.url === url && btn.dataset.title === title
      );
      
      let indicator;
      
      if (existingTaskbarButton) {
        // Use existing button if found
        indicator = existingTaskbarButton;
        indicator.dataset.persistent = "true";
        
        // Save original click handler if not already done
        if (!indicator.dataset.hasCustomHandler) {
          const originalClick = indicator.onclick;
          indicator.dataset.originalHandler = originalClick ? true : false;
          indicator.dataset.hasCustomHandler = "true";
          indicator.dataset.windowId = id;
          
          // Set new click handler for restore
          indicator.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.restoreWindow(id);
            return false;
          };
        }
        
        indicator.classList.add('taskbar-indicator');
      } else {
        // Create new indicator button
        indicator = document.createElement('button');
        indicator.dataset.id = id;
        indicator.className = 'taskbar-indicator';
        indicator.dataset.url = url;
        indicator.dataset.title = title;
        indicator.dataset.persistent = "false";
        
        // Add icon if available
        let iconSrc = icon;
        if (icon && !icon.startsWith('http') && !icon.startsWith('data:')) {
          iconSrc = icon.startsWith('/') ? `${URL_PREFIX}${icon}` : `${URL_PREFIX}/${icon}`;
        }
        const iconHTML = iconSrc ? `<img src="${iconSrc}" class="icon">` : '';
        indicator.innerHTML = `${iconHTML}${title}`;
        
        // Add restore functionality
        indicator.addEventListener('click', () => {
          this.restoreWindow(id);
        });
        
        // Add to taskbar
        this.taskbarButtons.appendChild(indicator);
      }
      
      // Track this indicator
      this.minimizedWindows.set(id, indicator);
    }
    
    /**
     * Restore a minimized window
     */
    restoreWindow(id) {
      const win = document.querySelector(`.window[data-id="${id}"]`);
      if (!win) return;
      
      // Remove minimized class to show window
      win.classList.remove('minimized');
      win.style.zIndex = ++this.zIndex;
      
      // Update window state
      this.windowsState[id].minimized = false;
      this.windowsState[id].zIndex = win.style.zIndex;
      this.saveState();
      
      // Update taskbar indicator
      if (this.minimizedWindows.has(id)) {
        const indicator = this.minimizedWindows.get(id);
        
        if (indicator.dataset.persistent === "true") {
          // For persistent indicators, just remove active state
          indicator.classList.remove('taskbar-indicator');
        } else {
          // For dynamically created indicators, remove them
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }
        
        this.minimizedWindows.delete(id);
      }
    }
    
    /**
     * Restore all windows from saved state
     */
    restoreWindows() {
      // First create all non-minimized windows
      Object.entries(this.windowsState).forEach(([id, w]) => {
        if (!w.minimized) {
          this.createWindow(w.url, w.title, w);
        }
      });
      
      // Then process minimized windows after taskbar is fully loaded
      setTimeout(() => {
        Object.entries(this.windowsState).forEach(([id, w]) => {
          if (w.minimized) {
            this.createWindow(w.url, w.title, w);
          }
        });
      }, 100);
    }
  }
  
  // Export the WindowManager
  window.WindowManager = WindowManager;