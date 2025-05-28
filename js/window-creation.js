import { makeWindowDraggable, addWindowControls } from './window-helpers.js';

export function createWindow(title, content) {
    console.log("[createWindow] Creating:", title, content);
    const template = document.getElementById('window-template');
    if (!template) return console.error('[createWindow] Template not found');

    const windowClone = template.content.cloneNode(true);
    windowClone.querySelector('.window-title-text').textContent = title;

    const contentElement = windowClone.querySelector('.window-content-text');
    if (content.endsWith('.html')) {
        fetch(content)
            .then(r => r.ok ? r.text() : Promise.reject())
            .then(html => contentElement.innerHTML = html)
            .catch(() => contentElement.textContent = 'Failed to load content.');
    } else {
        contentElement.textContent = content;
    }

    // Append and then select from DOM
    document.querySelector('.desktop').appendChild(windowClone);

    // Wait for DOM to update
    requestAnimationFrame(() => {
        const windowEl = document.querySelector('.desktop .window:last-of-type');
        if (!windowEl) return console.error('[createWindow] Failed to find newly inserted window');
        console.log("[createWindow] Window added to DOM");

        makeWindowDraggable(windowEl);
        addWindowControls(windowEl);
    });
}

export function initializeWindowCreation() {
    document.querySelectorAll('.open-window').forEach(link =>
        link.addEventListener('click', e => {
            e.preventDefault();
            createWindow(link.dataset.title, link.dataset.content);
        })
    );
}
