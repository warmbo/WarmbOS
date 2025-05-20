document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menu-button');
    const menu = document.getElementById('menu');
    const taskbar = document.getElementById('taskbar-item-group');
    const windowsContainer = document.getElementById('windows');
    let zIndexCounter = 100;

    const dragShield = document.createElement('div');
    Object.assign(dragShield.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '9998',
        display: 'none',
    });
    document.body.appendChild(dragShield);

    menuButton.addEventListener('click', () => {
        const isVisible = getComputedStyle(menu).display !== 'none';
        menu.style.display = isVisible ? 'none' : 'block';
        menu.style.zIndex = ++zIndexCounter;
    });

    function makeWindowDraggable(win) {
        const titleBar = win.querySelector('.window-title');
        let isDragging = false, offsetX = 0, offsetY = 0;

        titleBar.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-title-button')) return;
            isDragging = true;
            offsetX = e.clientX - win.offsetLeft;
            offsetY = e.clientY - win.offsetTop;
            document.body.style.userSelect = 'none';
            dragShield.style.display = 'block';
            win.style.transition = 'none';
            win.style.zIndex = ++zIndexCounter;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            win.style.left = `${e.clientX - offsetX}px`;
            win.style.top = `${e.clientY - offsetY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = '';
                dragShield.style.display = 'none';
            }
        });
    }

    function makeWindowResizable(win) {
        const directions = ['top', 'right', 'bottom', 'left', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
        let isResizing = false, current = null;

        directions.forEach(dir => {
            const resizer = document.createElement('div');
            resizer.classList.add('resizer', dir);
            win.appendChild(resizer);
            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isResizing = true;
                current = dir;
                dragShield.style.display = 'block';
                win.style.zIndex = ++zIndexCounter;
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const rect = win.getBoundingClientRect();

            if (current.includes('right')) win.style.width = `${e.clientX - rect.left}px`;
            if (current.includes('bottom')) win.style.height = `${e.clientY - rect.top}px`;
            if (current.includes('left')) {
                const newWidth = rect.right - e.clientX;
                if (newWidth > 50) {
                    win.style.width = `${newWidth}px`;
                    win.style.left = `${e.clientX}px`;
                }
            }
            if (current.includes('top')) {
                const newHeight = rect.bottom - e.clientY;
                if (newHeight > 50) {
                    win.style.height = `${newHeight}px`;
                    win.style.top = `${e.clientY}px`;
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                current = null;
                dragShield.style.display = 'none';
            }
        });
    }

    function createTaskbarItem(title, url, isDynamic = true) {
        let item = taskbar.querySelector(`[data-title="${title}"]`);
        if (!item) {
            item = document.createElement('button');
            item.classList.add('taskbar-item');
            item.dataset.title = title;
            item.dataset.url = url;
            if (isDynamic) item.dataset.dynamic = "true";
            item.textContent = title;
            taskbar.appendChild(item);
        }
        return item;
    }

    function createWindow(url, title) {
        let win = document.querySelector(`.window[data-title="${title}"]`);
        if (win) {
            win.classList.remove('minimized');
            win.style.zIndex = ++zIndexCounter;
            updateTaskbarItemState(title, true); // Highlight taskbar item
            return;
        }

        win = document.createElement('div');
        win.className = 'window';
        win.dataset.title = title;
        win.style.zIndex = ++zIndexCounter;
        Object.assign(win.style, {
            position: 'absolute',
            left: '10vw',
            top: '10vh',
            width: '38vw',
            height: '42vh'
        });

        win.innerHTML = `
            <div class="window-title">
                <div class="window-title-text">${title}</div>
                <div class="window-title-button-group">
                    <button class="window-title-button window-minimize" title="Minimize">_</button>
                    <button class="window-title-button window-maximize" title="Maximize">□</button>
                    <button class="window-title-button window-close" title="Close">×</button>
                </div>
            </div>
            <div class="window-content">
                <iframe src="${url}" frameborder="0" style="width:100%;height:100%;"></iframe>
            </div>
        `;

        windowsContainer.appendChild(win);
        makeWindowDraggable(win);
        makeWindowResizable(win);

        win.querySelectorAll('.window-title-button').forEach(btn => btn.addEventListener('mousedown', e => e.stopPropagation()));
        createTaskbarItem(title, url, true);
        updateTaskbarItemState(title, true); // Highlight taskbar item
    }

    function updateTaskbarItemState(title, isActive) {
        const taskbarItem = taskbar.querySelector(`[data-title="${title}"]`);
        if (taskbarItem) {
            if (isActive) {
                taskbarItem.classList.add('active');
            } else {
                taskbarItem.classList.remove('active');
            }
        }
    }

    taskbar.addEventListener('click', e => {
        const item = e.target.closest('.taskbar-item');
        if (!item) return;

        const title = item.dataset.title;
        const win = document.querySelector(`.window[data-title="${title}"]`);
        const url = item.dataset.url;

        if (!win) {
            createWindow(url, title);
            return;
        }

        if (win.classList.contains('minimized')) {
            win.classList.remove('minimized');
            updateTaskbarItemState(title, true); // Highlight taskbar item
        } else {
            win.classList.add('minimized');
            updateTaskbarItemState(title, false); // Remove highlight
        }

        win.style.zIndex = ++zIndexCounter;
    });

    document.addEventListener('click', (e) => {
        const win = e.target.closest('.window');
        if (!win) return;

        const title = win.dataset.title;
        const taskbarItem = taskbar.querySelector(`[data-title="${title}"]`);

        if (e.target.classList.contains('window-close')) {
            win.remove();
            if (taskbarItem?.dataset.dynamic === "true") {
                taskbarItem.remove();
            } else {
                updateTaskbarItemState(title, false); // Remove highlight
            }
        } else if (e.target.classList.contains('window-minimize')) {
            win.classList.add('minimized');
            updateTaskbarItemState(title, false); // Remove highlight
        } else if (e.target.classList.contains('window-maximize')) {
            if (win.classList.toggle('maximized')) {
                Object.assign(win.style, { left: '0', top: '0', width: '100vw', height: '100vh' });
            } else {
                Object.assign(win.style, { width: '40vw', height: '40vh', left: '10vw', top: '10vh' });
            }
        }
    });

    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const { url, title } = btn.dataset;
            if (url && title) createWindow(url, title);
        });
    });

    // ✅ Optionally open a default window on load
     createWindow('/static/pages/welcome.html', 'Welcome');
});
