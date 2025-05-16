/**
 * Main Script - Initializes the application
 */
import WindowUI from '/os/static/js/window-manager.js';
import ConfigLoader from '/os/static/js/config-loader.js';

// Wrap in async function to allow await
(async () => {
    const windowManager = new WindowUI();
    const configLoader = new ConfigLoader(windowManager);

    // Initialize system
    await configLoader.loadConfig();
    
    // Restore window state
    windowManager.restoreWindowState();

    // Open default window if none restored
    if (Object.keys(windowManager.stateManager.windowsState).length === 0) {
        windowManager.createWindow(
            '/os/templates/pages/about.html', 
            'About',
            { 
                icon: '/static/images/ui/about.png',
                persistent: true 
            }  
        );
    }

    // Setup localStorage clearing
    const clearLocalStorageBtn = document.getElementById("clearLocalStorageBtn");
    if (clearLocalStorageBtn) {
        clearLocalStorageBtn.addEventListener("click", () => {
            localStorage.clear();
            window.location.reload();
        });
    }

    // Background image handling
    function updateBackground(imageUrl) {
        document.body.style.background = `url('${imageUrl}') no-repeat center center fixed`;
        document.body.style.backgroundSize = 'cover';
    }

    async function loadBackground() {
        try {
            const storedBg = localStorage.getItem('background_image');
            if (storedBg) return updateBackground(storedBg);
            const urlPrefix = window.URL_PREFIX || '';
            const response = await fetch(`${urlPrefix}/api/config`);
            const config = await response.json();
            updateBackground(config.background_image || `${urlPrefix}/static/images/os-bg.png`);
        } catch (error) {
            console.error('Background load error:', error);
            const urlPrefix = window.URL_PREFIX || '';
            updateBackground(`${urlPrefix}/static/images/os-bg.png`);
        }
    }

    // Initialize background
    await loadBackground();
})();

console.log()