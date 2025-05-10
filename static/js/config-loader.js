/**
 * Config Loader Module
 * Handles loading and updating the desktop configuration
 */
class ConfigLoader {
    constructor(windowManager) {
      this.windowManager = windowManager;
      this.mainMenu = document.getElementById('main-menu');
      this.mainMenuToggle = document.getElementById('main-menu-toggle');
      this.taskbarButtons = document.getElementById('taskbar-buttons');
      this.taskbarUniqueButtons = document.getElementById('taskbar-unique-buttons');
      
      // Set up main menu toggle
      this.setupMainMenuToggle();
      
      // Set up storage event listener
      this.setupStorageListener();
    }
    
    /**
     * Set up main menu toggle button
     */
    setupMainMenuToggle() {
      this.mainMenuToggle.addEventListener('click', () => {
        this.mainMenu.classList.toggle('show');
      });
    }
    
    /**
     * Set up storage event listener for remote config changes
     */
    setupStorageListener() {
      window.addEventListener('storage', (event) => {
        if (event.key === 'warmbos-reload') {
          this.loadConfig();
        }
      });
    }
    
    /**
     * Load system configuration
     */
    loadConfig() {
      fetch(`${URL_PREFIX}/api/config`)
        .then(res => res.json())
        .then(config => {
          // Clear existing elements
          this.taskbarButtons.innerHTML = '';
          this.taskbarUniqueButtons.innerHTML = '';
          this.mainMenu.innerHTML = '';
  
          // Load taskbar buttons
          this.loadTaskbarButtons(config.taskbar);
          
          // Load unique taskbar buttons
          this.loadUniqueButtons(config.taskbar_unique);
          
          // Load main menu items
          this.loadMainMenu(config.main_menu);
          
          // Attach click events to all buttons
          this.attachClickEvents();
          
          // Recreate taskbar indicators for minimized windows
          this.recreateMinimizedIndicators();
        })
        .catch(err => {
          console.error('Failed to load config:', err);
        });
    }
    
    /**
     * Load regular taskbar buttons
     */
    loadTaskbarButtons(buttons) {
      buttons.forEach(btn => {
        const el = document.createElement('button');
        el.dataset.url = btn.url;
        el.dataset.title = btn.title;
        el.dataset.icon = btn.icon || null;
        if (btn.width) el.dataset.width = btn.width;
        if (btn.height) el.dataset.height = btn.height;
        
        // Add URL_PREFIX to icon path if needed
        let iconSrc = btn.icon;
        if (btn.icon && !btn.icon.startsWith('http') && !btn.icon.startsWith('data:')) {
          iconSrc = btn.icon.startsWith('/') ? `${URL_PREFIX}${btn.icon}` : `${URL_PREFIX}/${btn.icon}`;
        }
        
        el.innerHTML = iconSrc 
          ? `<img src="${iconSrc}" class="icon"> ${btn.title}`
          : btn.title;
        this.taskbarButtons.appendChild(el);
      });
    }
    
    /**
     * Load unique taskbar buttons (right side)
     */
    loadUniqueButtons(buttons) {
      buttons.forEach(btn => {
        const el = document.createElement('button');
        el.dataset.url = btn.url;
        el.dataset.title = btn.title;
        el.dataset.icon = btn.icon || null;
        if (btn.width) el.dataset.width = btn.width;
        if (btn.height) el.dataset.height = btn.height;
        
        // Add URL_PREFIX to icon path if needed
        let iconSrc = btn.icon;
        if (btn.icon && !btn.icon.startsWith('http') && !btn.icon.startsWith('data:')) {
          iconSrc = btn.icon.startsWith('/') ? `${URL_PREFIX}${btn.icon}` : `${URL_PREFIX}/${btn.icon}`;
        }
        
        el.innerHTML = iconSrc
          ? `<img src="${iconSrc}" class="icon"> ${btn.title}`
          : btn.title;
        this.taskbarUniqueButtons.appendChild(el);
      });
    }
    
    /**
     * Load main menu items
     */
    loadMainMenu(items) {
      items.forEach(item => {
        if (item.heading) {
          const heading = document.createElement('div');
          heading.className = 'main-menu-heading';
          heading.textContent = item.heading;
          this.mainMenu.appendChild(heading);
        } else {
          const el = document.createElement('div');
          el.className = 'main-menu-item';
          el.dataset.url = item.url;
          el.dataset.title = item.title;
          el.dataset.icon = item.icon || null;
          if (item.width) el.dataset.width = item.width;
          if (item.height) el.dataset.height = item.height;
          
          // Add URL_PREFIX to icon path if needed
          let iconSrc = item.icon;
          if (item.icon && !item.icon.startsWith('http') && !item.icon.startsWith('data:')) {
            iconSrc = item.icon.startsWith('/') ? `${URL_PREFIX}${item.icon}` : `${URL_PREFIX}/${item.icon}`;
          }
          
          el.innerHTML = iconSrc
            ? `<img src="${iconSrc}" class="icon"> ${item.title}`
            : item.title;
          this.mainMenu.appendChild(el);
        }
      });
    }
    
    /**
     * Attach click events to all buttons and menu items
     */
    attachClickEvents() {
      document.querySelectorAll('button[data-url], .main-menu-item').forEach(btn => {
        // Skip any buttons that already have custom handlers for minimized windows
        if (btn.dataset.hasCustomHandler === "true") return;
        
        btn.addEventListener('click', () => {
          // If button is associated with a minimized window, restore it
          if (btn.dataset.windowId) {
            this.windowManager.restoreWindow(btn.dataset.windowId);
          } else {
            // Otherwise create a new window
            this.windowManager.createWindow(btn.dataset.url, btn.dataset.title, {
              width: btn.dataset.width,
              height: btn.dataset.height,
              icon: btn.dataset.icon
            });
          }
          this.mainMenu.classList.remove('show');
        });
      });
    }
    
    /**
     * Recreate taskbar indicators for minimized windows
     */
    recreateMinimizedIndicators() {
      Object.entries(this.windowManager.windowsState).forEach(([id, w]) => {
        if (w.minimized) {
          this.windowManager.createTaskbarIndicator(id, w.title, w.icon, w.url);
        }
      });
    }
  }
  
  // Export the ConfigLoader
  window.ConfigLoader = ConfigLoader;