import { makeWindowDraggable, addWindowControls, bringWindowToFront } from '../window-helpers.js';
import { DataManager } from '../../core/data-manager.js';

export function createWindow(title, content, iconUrl, skipTaskbar) {
    // Check if a window with this title is already open
    const existingWindow = DataManager.findExistingWindow(title);
    if (existingWindow) {
        // Focus this window: bring to front and un-minimize, but do NOT maximize
        existingWindow.classList.remove('minimized');
        existingWindow.style.display = '';
        bringWindowToFront(existingWindow);
        return;
    }

    console.log("[createWindow] Creating:", title, content, iconUrl);
    const template = document.getElementById('window-template');
    if (!template) return console.error('[createWindow] Template not found');

    const windowClone = template.content.cloneNode(true);
    windowClone.querySelector('.window-title-text').textContent = title;
    // Set the icon in the titlebar if provided
    if (iconUrl) {
        const iconImg = windowClone.querySelector('.window-title img');
        if (iconImg) iconImg.src = iconUrl;
    }

    // Assign a unique windowId to the window element before adding to DOM
    const windowEl = windowClone.querySelector('.window');
    if (windowEl && !windowEl.dataset.windowId) {
        windowEl.dataset.windowId = 'w_' + Math.random().toString(36).slice(2, 10);
    }

    const contentElement = windowClone.querySelector('.window-content-text');
    
    // Handle different content types
    if (content.startsWith('http://') || content.startsWith('https://')) {
        // External URL - create an iframe to display it
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.src = content;
        
        // Clear content element and append iframe
        const windowContent = windowClone.querySelector('.window-content');
        windowContent.innerHTML = '';
        windowContent.appendChild(iframe);
    } else if (content.endsWith('.html')) {
        // Local HTML file
        fetch(content)
            .then(r => r.ok ? r.text() : Promise.reject())
            .then(html => {
                contentElement.innerHTML = html;
                
                // Execute any inline scripts in the loaded content
                const inlineScripts = contentElement.querySelectorAll('script[type="text/plain"]');
                inlineScripts.forEach(script => {
                    try {
                        const newScript = document.createElement('script');
                        newScript.textContent = script.textContent;
                        contentElement.appendChild(newScript);
                        console.log('Executed inline script for window:', title);
                    } catch (error) {
                        console.error('Error executing inline script:', error);
                    }
                });
                
                // Load and execute external scripts
                const externalScripts = contentElement.querySelectorAll('script[src][type="text/plain"]');
                externalScripts.forEach(script => {
                    const src = script.getAttribute('src');
                    if (src) {
                        fetch(src)
                            .then(response => response.text())
                            .then(jsCode => {
                                try {
                                    const newScript = document.createElement('script');
                                    newScript.textContent = jsCode;
                                    contentElement.appendChild(newScript);
                                    console.log('Executed external script:', src, 'for window:', title);
                                } catch (error) {
                                    console.error('Error executing external script:', src, error);
                                }
                            })
                            .catch(error => {
                                console.error('Error loading external script:', src, error);
                            });
                    }
                });
            })
            .catch(() => contentElement.textContent = 'Failed to load content.');
    } else {
        // Plain text or other content
        contentElement.textContent = content;
    }

    // Append and then select from DOM
    document.querySelector('.desktop').appendChild(windowClone);

    // Wait for DOM to update
    requestAnimationFrame(() => {
        const windowEl = document.querySelector(`.desktop .window[data-window-id]${windowClone.querySelector('.window') ? `[data-window-id='${windowClone.querySelector('.window').dataset.windowId}']` : ':last-of-type'}`);
        if (!windowEl) return console.error('[createWindow] Failed to find newly inserted window');
        console.log("[createWindow] Window added to DOM");

        // Add opening animation
        windowEl.classList.add('opening');
        // Remove opening animation class after animation completes
        setTimeout(() => {
            windowEl.classList.remove('opening');
        }, 300);

        bringWindowToFront(windowEl);
        makeWindowDraggable(windowEl);
        addWindowControls(windowEl);
        
        if (!skipTaskbar) {
            const iconImg = windowEl.querySelector('.window-title img');
            const iconUrlFinal = iconImg ? iconImg.src : '';
            const titleFinal = windowEl.querySelector('.window-title-text').textContent;
            import('../window-helpers.js').then(mod => {
                mod.addTaskbarItem(titleFinal, windowEl, iconUrlFinal);
            });
        }
    });
}

export function initializeWindowCreation() {
    document.querySelectorAll('.open-window').forEach(link =>
        link.addEventListener('click', e => {
            e.preventDefault();
            // If this is a static taskbar item, pass skipTaskbar=true
            const skipTaskbar = link.classList.contains('taskbar-item');
            createWindow(link.dataset.title, link.dataset.content, link.dataset.icon, skipTaskbar);
        })
    );
}