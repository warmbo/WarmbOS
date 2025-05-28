Promise.all([
    fetch('components/taskbar.html').then(r => r.text()).then(html => document.getElementById('taskbar').innerHTML = html),
    fetch('components/start-menu.html').then(r => r.text()).then(html => document.getElementById('start-menu').innerHTML = html),
    fetch('components/desktop-icons.html').then(r => r.text()).then(html => document.getElementById('desktop-icons').innerHTML = html)
]).then(() => {
    console.log("[Init] UI components loaded");
    initializeWindowCreation();
    initializeStartMenuToggle();
    initializeClock();
});

function initializeClock() {
    const clock = document.getElementById('clock');
    if (!clock) return;
    function updateClock() {
        const now = new Date();
        let h = now.getHours();
        const m = String(now.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        clock.textContent = `${h}:${m} ${ampm}`;
    }
    updateClock();
    setInterval(updateClock, 1000);
}

function createWindow(title, content) {
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

    // Wait for DOM to reflect it
    requestAnimationFrame(() => {
        const windowEl = document.querySelector('.desktop .window:last-of-type');
        if (!windowEl) return console.error('[createWindow] Failed to find newly inserted window');
        console.log("[createWindow] Window added to DOM");

        makeWindowDraggable(windowEl);
        addWindowControls(windowEl);
    });
}

function makeWindowDraggable(el) {
    const bar = el.querySelector('.window-title-bar');
    let drag = false, offsetX = 0, offsetY = 0;
    let moved = false;

    bar.addEventListener('mousedown', e => {
        if (e.target.closest('.window-title-button')) return; // ✅ Ignore if clicking a titlebar button

        drag = true;
        moved = false;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
        el.style.zIndex = 1000;
        addDragGuard();
    });

    document.addEventListener('mousemove', e => {
        if (!drag) return;
        moved = true;
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        if (drag && !moved) {
            console.log("[drag] Mouseup with no movement — likely a click.");
        }
        drag = false;
        removeDragGuard();
    });

    addResizeHandles(el);
}


function addResizeHandles(el) {
    const sides = [
        { dir: 'right', cursor: 'ew-resize' },
        { dir: 'bottom', cursor: 'ns-resize' },
        { dir: 'corner', cursor: 'nwse-resize' }
    ];
    sides.forEach(({ dir, cursor }) => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-${dir}`;
        Object.assign(handle.style, {
            position: 'absolute',
            userSelect: 'none',
            zIndex: 1001,
            pointerEvents: 'auto',
            cursor
        });

        if (dir === 'right') Object.assign(handle.style, { right: 0, top: 0, width: '8px', height: '100%' });
        else if (dir === 'bottom') Object.assign(handle.style, { left: 0, bottom: 0, width: '100%', height: '8px' });
        else if (dir === 'corner') Object.assign(handle.style, { right: 0, bottom: 0, width: '16px', height: '16px' });

        handle.addEventListener('mousedown', e => {
            e.stopPropagation();
            let startX = e.clientX, startY = e.clientY;
            let startW = el.offsetWidth, startH = el.offsetHeight;
            addDragGuard();

            function onMove(ev) {
                if (dir === 'right') el.style.width = Math.max(200, startW + (ev.clientX - startX)) + 'px';
                if (dir === 'bottom') el.style.height = Math.max(120, startH + (ev.clientY - startY)) + 'px';
                if (dir === 'corner') {
                    el.style.width = Math.max(200, startW + (ev.clientX - startX)) + 'px';
                    el.style.height = Math.max(120, startH + (ev.clientY - startY)) + 'px';
                }
            }

            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                removeDragGuard();
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        el.appendChild(handle);
    });
}

function addDragGuard() {
    if (document.getElementById('drag-guard')) return;
    const guard = document.createElement('div');
    guard.id = 'drag-guard';
    Object.assign(guard.style, {
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: 'transparent'
    });
    document.body.appendChild(guard);
}

function removeDragGuard() {
    const guard = document.getElementById('drag-guard');
    if (guard) guard.remove();
}

function addWindowControls(el) {
    ['click', 'mousedown', 'mouseup'].forEach(eventName => {
    el.querySelector('.minimize-button')?.addEventListener(eventName, e => {
        console.log(`[${eventName}] Minimize fired`, e.target);
    });
    el.querySelector('.maximize-button')?.addEventListener(eventName, e => {
        console.log(`[${eventName}] Maximize fired`, e.target);
    });
    el.querySelector('.close-button')?.addEventListener(eventName, e => {
        console.log(`[${eventName}] Close fired`, e.target);
    });
});

    console.log("[addWindowControls] Binding buttons for window", el);

    const minimizeBtn = el.querySelector('.minimize-button');
    const maximizeBtn = el.querySelector('.maximize-button');
    const closeBtn = el.querySelector('.close-button');

    console.log("  - Minimize:", minimizeBtn);
    console.log("  - Maximize:", maximizeBtn);
    console.log("  - Close:", closeBtn);

    const taskbar = document.querySelector('.taskbar .app-group');

    minimizeBtn?.addEventListener('click', () => {
        console.log("[minimize] Clicked");
        el.style.display = 'none';
        const item = document.createElement('div');
        item.className = 'taskbar-item app-item';
        item.innerHTML = `
            <img src="https://img.icons8.com/?size=100&id=TBZPt8cpsUdF&format=png&color=000000">
            <span>${el.querySelector('.window-title-text').textContent}</span>
        `;
        item.onclick = () => {
            console.log("[minimize] Restoring window from taskbar");
            el.style.display = 'block';
            item.remove();
        };
        taskbar?.appendChild(item);
    });

    maximizeBtn?.addEventListener('click', () => {
        console.log("[maximize] Clicked");
        if (el.classList.contains('maximized')) {
            Object.assign(el.style, { width: '', height: '', left: '', top: '' });
            el.classList.remove('maximized');
        } else {
            const taskbarHeight = document.getElementById('taskbar')?.offsetHeight || 0;
            Object.assign(el.style, {
                width: '100%',
                height: `calc(100% - ${taskbarHeight}px)`,
                left: '0',
                top: '0'
            });
            el.classList.add('maximized');
        }
    });

    closeBtn?.addEventListener('click', () => {
        console.log("[close] Clicked");
        el.remove();
    });
}

function initializeWindowCreation() {
    document.querySelectorAll('.open-window').forEach(link =>
        link.addEventListener('click', e => {
            e.preventDefault();
            createWindow(link.dataset.title, link.dataset.content);
        })
    );
}

function initializeStartMenuToggle() {
    const startMenuButton = document.querySelector('.start-menu-button');
    const startMenu = document.querySelector('.start-menu');
    if (startMenuButton && startMenu) {
        startMenu.classList.remove('show');
        startMenuButton.addEventListener('click', e => {
            e.stopPropagation();
            startMenu.classList.toggle('show');
        });
        document.addEventListener('click', e => {
            if (!startMenu.contains(e.target) && !startMenuButton.contains(e.target)) {
                startMenu.classList.remove('show');
            }
        });
    }
}

// 🧪 Automatically create a test window on load
window.addEventListener('DOMContentLoaded', () => {
    console.log("[DOMContentLoaded] Creating test window");
    createWindow('Test Window', 'This is a test content block!');
});
