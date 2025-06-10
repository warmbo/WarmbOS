/**
 * Shared UI Component Library for WarmbOS
 * Reusable components for consistent UI patterns
 */

// === BUTTON COMPONENTS ===
export class Button {
    static create(text, className = 'btn btn-primary', onclick = null) {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = text;
        if (onclick) button.addEventListener('click', onclick);
        return button;
    }

    static createWithIcon(text, iconUrl, className = 'btn btn-primary', onclick = null) {
        const button = this.create(text, className, onclick);
        if (iconUrl) {
            const img = document.createElement('img');
            img.src = iconUrl;
            img.alt = '';
            img.style.width = '16px';
            img.style.height = '16px';
            img.style.marginRight = '6px';
            button.insertBefore(img, button.firstChild);
        }
        return button;
    }

    static createTaskbarItem(title, iconUrl, windowEl) {
        const button = document.createElement('button');
        button.className = 'taskbar-item';
        
        if (iconUrl) {
            const img = document.createElement('img');
            img.src = iconUrl;
            img.alt = '';
            img.className = 'taskbar-item-icon';
            button.appendChild(img);
        }
        
        button.appendChild(document.createTextNode(title));
        return button;
    }
}

// === FORM COMPONENTS ===
export class FormField {
    static createInput(id, label, type = 'text', placeholder = '', value = '') {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label;
        
        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.placeholder = placeholder;
        input.value = value;
        
        group.appendChild(labelEl);
        group.appendChild(input);
        return group;
    }

    static createSelect(id, label, options = [], selectedValue = '') {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label;
        
        const select = document.createElement('select');
        select.id = id;
        
        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === selectedValue) {
                optionEl.selected = true;
            }
            select.appendChild(optionEl);
        });
        
        group.appendChild(labelEl);
        group.appendChild(select);
        return group;
    }

    static createTextarea(id, label, placeholder = '', value = '', rows = 4) {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label;
        
        const textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.placeholder = placeholder;
        textarea.value = value;
        textarea.rows = rows;
        
        group.appendChild(labelEl);
        group.appendChild(textarea);
        return group;
    }
}

// === ICON COMPONENTS ===
export class IconComponent {
    static create(iconUrl, alt = '', size = '24px') {
        const img = document.createElement('img');
        img.src = iconUrl;
        img.alt = alt;
        img.style.width = size;
        img.style.height = size;
        img.style.borderRadius = '4px';
        return img;
    }

    static createDesktopIcon(title, iconUrl, contentPath) {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'open-window';
        link.dataset.title = title;
        link.dataset.content = contentPath;
        link.dataset.icon = iconUrl;
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon';
        
        const img = this.create(iconUrl, 'icon', '48px');
        const span = document.createElement('span');
        span.textContent = title;
        
        iconDiv.appendChild(img);
        iconDiv.appendChild(span);
        link.appendChild(iconDiv);
        
        return link;
    }

    static createStartMenuItem(title, iconUrl, contentPath) {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'start-menu-item open-window';
        link.dataset.title = title;
        link.dataset.content = contentPath;
        link.dataset.icon = iconUrl;
        
        const img = this.create(iconUrl, 'icon', '24px');
        const span = document.createElement('span');
        span.textContent = title;
        
        link.appendChild(img);
        link.appendChild(span);
        
        return link;
    }
}

// === MODAL COMPONENTS ===
export class Modal {
    static create(title, content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: var(--window-bg);
            border: var(--border);
            border-radius: 8px;
            padding: 20px;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
            color: var(--text-primary);
        `;
        
        if (title) {
            const header = document.createElement('div');
            header.className = 'modal-header';
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            `;
            
            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            titleEl.style.margin = '0';
            
            const closeBtn = Button.create('×', 'modal-close-btn', () => {
                modal.remove();
                if (options.onClose) options.onClose();
            });
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: var(--text-primary);
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            `;
            
            header.appendChild(titleEl);
            header.appendChild(closeBtn);
            modalContent.appendChild(header);
        }
        
        if (typeof content === 'string') {
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = content;
            modalContent.appendChild(contentDiv);
        } else {
            modalContent.appendChild(content);
        }
        
        modal.appendChild(modalContent);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                if (options.onClose) options.onClose();
            }
        });
        
        return modal;
    }

    static show(title, content, options = {}) {
        const modal = this.create(title, content, options);
        document.body.appendChild(modal);
        return modal;
    }

    static confirm(message, onConfirm, onCancel) {
        const content = document.createElement('div');
        content.innerHTML = `
            <p style="margin-bottom: 20px;">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn btn-secondary cancel-btn">Cancel</button>
                <button class="btn btn-primary confirm-btn">Confirm</button>
            </div>
        `;
        
        const modal = this.create('Confirm', content);
        
        content.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
            if (onCancel) onCancel();
        });
        
        content.querySelector('.confirm-btn').addEventListener('click', () => {
            modal.remove();
            if (onConfirm) onConfirm();
        });
        
        document.body.appendChild(modal);
        return modal;
    }
}

// === NOTIFICATION COMPONENTS ===
export class Notification {
    static container = null;

    static init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
    }

    static show(message, type = 'info', duration = 3000) {
        this.init();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: ${this.getTextColor(type)};
            padding: 12px 16px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: 300px;
            pointer-events: auto;
            cursor: pointer;
            transition: all 0.3s ease;
            transform: translateX(100%);
        `;
        notification.textContent = message;
        
        // Close on click
        notification.addEventListener('click', () => {
            this.hide(notification);
        });
        
        this.container.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto hide
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }
        
        return notification;
    }

    static hide(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    static getBackgroundColor(type) {
        const colors = {
            success: '#d4edda',
            error: '#f8d7da',
            warning: '#fff3cd',
            info: '#d1ecf1'
        };
        return colors[type] || colors.info;
    }

    static getTextColor(type) {
        const colors = {
            success: '#155724',
            error: '#721c24',
            warning: '#856404',
            info: '#0c5460'
        };
        return colors[type] || colors.info;
    }

    static success(message, duration) {
        return this.show(message, 'success', duration);
    }

    static error(message, duration) {
        return this.show(message, 'error', duration);
    }

    static warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    static info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// === LIST COMPONENTS ===
export class ListComponent {
    static createShortcutItem(shortcut, section, index, onEdit, onDelete) {
        const item = document.createElement('div');
        item.className = 'shortcut-item';
        
        const iconUrl = shortcut.iconUrl || shortcut.icon || '';
        const contentPath = shortcut.contentPath || shortcut.url || '';
        
        item.innerHTML = `
            <img src="${iconUrl}" alt="Icon" class="shortcut-icon" onerror="this.style.display='none'">
            <div class="shortcut-info">
                <div class="shortcut-title">${shortcut.title || 'Untitled'}</div>
                <div class="shortcut-url">${contentPath || 'No URL'}</div>
            </div>
            <div class="shortcut-actions">
                <button class="btn btn-secondary edit-btn">Edit</button>
                <button class="btn btn-secondary delete-btn">Delete</button>
            </div>
        `;
        
        // Add event listeners
        const editBtn = item.querySelector('.edit-btn');
        const deleteBtn = item.querySelector('.delete-btn');
        
        if (editBtn && onEdit) {
            editBtn.addEventListener('click', () => onEdit(section, index));
        }
        
        if (deleteBtn && onDelete) {
            deleteBtn.addEventListener('click', () => onDelete(section, index));
        }
        
        return item;
    }

    static createIconGridItem(icon, index, onClick) {
        const item = document.createElement('div');
        item.className = 'icon-item';
        item.id = `icon-${index}`;
        item.dataset.filename = `${icon.filename}.png`;
        item.dataset.name = icon.name;
        
        item.innerHTML = `
            <img src="/icons/png/${icon.filename}.png" alt="${icon.name}" onerror="this.style.opacity='0.3'" />
            <span title="${icon.name}">${icon.name}</span>
        `;
        
        if (onClick) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick(icon.filename + '.png', icon.name);
            });
        }
        
        return item;
    }
}

// === LOADING COMPONENTS ===
export class LoadingSpinner {
    static create(size = '24px') {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.cssText = `
            width: ${size};
            height: ${size};
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-top: 2px solid var(--bg-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: inline-block;
        `;
        
        // Add keyframes if not already added
        if (!document.querySelector('#spinner-keyframes')) {
            const style = document.createElement('style');
            style.id = 'spinner-keyframes';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        return spinner;
    }

    static createWithText(text, size = '24px') {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text-primary);
        `;
        
        container.appendChild(this.create(size));
        
        const textEl = document.createElement('span');
        textEl.textContent = text;
        container.appendChild(textEl);
        
        return container;
    }
}

// === UTILITY FUNCTIONS ===
export class UIUtils {
    static addClass(element, className) {
        if (element && !element.classList.contains(className)) {
            element.classList.add(className);
        }
    }

    static removeClass(element, className) {
        if (element && element.classList.contains(className)) {
            element.classList.remove(className);
        }
    }

    static toggleClass(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    }

    static setAttributes(element, attributes) {
        if (element && attributes) {
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
    }

    static setDataAttributes(element, data) {
        if (element && data) {
            Object.entries(data).forEach(([key, value]) => {
                element.dataset[key] = value;
            });
        }
    }

    static empty(element) {
        if (element) {
            element.innerHTML = '';
        }
    }

    static show(element) {
        if (element) {
            element.style.display = '';
        }
    }

    static hide(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    static fadeIn(element, duration = 300) {
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.display = '';
        
        const start = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        if (!element) return;
        
        const start = performance.now();
        const startOpacity = parseFloat(window.getComputedStyle(element).opacity) || 1;
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress >= 1) {
                element.style.display = 'none';
            } else {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }
}