class ConfigLoader {
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.mainMenu = document.getElementById('main-menu');
        this.mainMenuToggle = document.getElementById('main-menu-toggle');
        this.taskbarButtons = document.getElementById('taskbar-buttons');
        this.taskbarUniqueButtons = document.getElementById('taskbar-unique-buttons');
        
        this.setupMainMenuToggle();
        this.setupStorageListener();
    }

    async loadConfig() {
        try {
            const response = await fetch(`${window.URL_PREFIX}/api/config`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const config = await response.json();
            
            // Clear existing elements
            this.taskbarButtons.innerHTML = '';
            this.taskbarUniqueButtons.innerHTML = '';
            this.mainMenu.innerHTML = '';
            
            // Load all config sections
            this.loadButtons(config.taskbar, this.taskbarButtons);
            this.loadButtons(config.taskbar_unique, this.taskbarUniqueButtons);
            this.loadMenuItems(config.main_menu);
            
            this.attachClickEvents();
            this.recreateMinimizedIndicators();
            return true;
        } catch (err) {
            console.error('Failed to load config:', err);
            return false;
        }
    }
    
    loadButtons(buttons, container) {
        buttons?.forEach(btn => {
            const el = document.createElement('button');
            el.dataset.url = btn.url;
            el.dataset.title = btn.title;
            if (btn.icon) el.dataset.icon = btn.icon;
            if (btn.width) el.dataset.width = btn.width;
            if (btn.height) el.dataset.height = btn.height;
            
            const iconHTML = btn.icon 
                ? `<img src="${this.windowManager.getFullIconPath(btn.icon)}" class="icon">`
                : '';
            el.innerHTML = `${iconHTML}${btn.title}`;
            container.appendChild(el);
        });
    }
    
    loadMenuItems(items) {
        items?.forEach(item => {
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
                if (item.icon) el.dataset.icon = item.icon;
                if (item.width) el.dataset.width = item.width;
                if (item.height) el.dataset.height = item.height;
                
                const iconHTML = item.icon 
                    ? `<img src="${this.windowManager.getFullIconPath(item.icon)}" class="icon">`
                    : '';
                el.innerHTML = `${iconHTML}${item.title}`;
                this.mainMenu.appendChild(el);
            }
        });
    }
    
    attachClickEvents() {
        document.querySelectorAll('button[data-url], .main-menu-item').forEach(btn => {
            if (btn.dataset.hasCustomHandler === "true") return;
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.windowManager.handleTaskbarButtonClick(
                    this.windowManager.prepareUrl(btn.dataset.url),
                    btn.dataset.title,
                    btn.dataset.icon,
                    {
                        width: btn.dataset.width,
                        height: btn.dataset.height
                    }
                );
                this.mainMenu.classList.remove('show');
            });
        });
    }
    
    recreateMinimizedIndicators() {
        if (!this.windowManager?.stateManager?.windowsState) return;
        
        Object.entries(this.windowManager.stateManager.windowsState).forEach(([id, w]) => {
            try {
                // Skip if window isn't minimized or data is incomplete
                if (!w?.minimized || !w?.title || !w?.url) return;
                
                this.windowManager.createTaskbarIndicator(id, w.title, w.icon, w.url);
            } catch (err) {
                console.warn(`Failed to recreate minimized indicator for window ${id}:`, err);
            }
        });
    }
    
    setupMainMenuToggle() {
        this.mainMenuToggle.addEventListener('click', () => {
            this.mainMenu.classList.toggle('show');
        });
    }
    
    setupStorageListener() {
        window.addEventListener('storage', (event) => {
            if (event.key === 'warmbos-reload') {
                this.loadConfig();
            }
        });
    }
}

export default ConfigLoader;