// Helper functions for managing data consistently
export class DataManager {
    // Find a window that's already open by its title
    static findExistingWindow(title) {
        return Array.from(document.querySelectorAll('.desktop .window'))
            .find(win => win.querySelector('.window-title-text')?.textContent === title);
    }

    // Clean up shortcut data to handle different formats
    static normalizeShortcut(shortcut) {
        return {
            title: shortcut.title || 'Untitled',
            contentPath: shortcut.contentPath || shortcut.url || '',
            iconUrl: shortcut.iconUrl || shortcut.icon || ''
        };
    }

    // Check if shortcut data looks valid
    static isValidShortcut(shortcut) {
        return shortcut && shortcut.title && (shortcut.contentPath || shortcut.url);
    }
}