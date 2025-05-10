/**
 * Main Script
 * Initializes the application and coordinates between modules
 */
(() => {
    const windowManager = new WindowManager();
    const configLoader = new ConfigLoader(windowManager);

    configLoader.loadConfig();

    if (Object.keys(windowManager.windowsState).length > 0) {
        windowManager.restoreWindows();
    } else {
        // Open the "About" window, same as button
        windowManager.createWindow(
            '/templates/pages/about.html',
            'About',
            { icon: '/static/images/ui/about.png' }
        );
    }

    // Select the button
    const clearLocalStorageBtn = document.getElementById("clearLocalStorageBtn");

    // Add an event listener for the button click
    if (clearLocalStorageBtn) {
        clearLocalStorageBtn.addEventListener("click", function() {
            // Clear the localStorage
            localStorage.clear();
            // Refresh the page
            window.location.reload();
        });
    }

    // Background Image Handling
    function updateBackground(imageUrl) {
    document.body.style.background = `url('${imageUrl}') no-repeat center center fixed`;
    document.body.style.backgroundSize = 'cover';
    }

    // Load background on startup
    (async function initBackground() {
    try {
        const response = await fetch(`${URL_PREFIX}/api/config`);
        const config = await response.json();
        const bgUrl = config.background_image || `${URL_PREFIX}/static/images/os-bg.png`;
        updateBackground(bgUrl);
    } catch (error) {
        console.error('Failed to load background:', error);
        updateBackground(`${URL_PREFIX}/static/images/os-bg.png`);
    }
    })();

    // Listen for background changes from editor
    window.addEventListener('message', (event) => {
    if (event.data.action === 'changeBackgroundImage') {
        updateBackground(event.data.image);
    }
    });
})();