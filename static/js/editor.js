const URL_PREFIX = "{{ URL_PREFIX }}";
const templates = {
  taskbar: document.getElementById('entry-template'),
  main_menu: document.getElementById('entry-template'),
  taskbar_unique: document.getElementById('entry-template')
};

const containers = {
  taskbar: document.getElementById('taskbar-entries'),
  main_menu: document.getElementById('main-menu-entries'),
  taskbar_unique: document.getElementById('taskbar-unique-entries')
};

function toggleSection(header) {
  const section = header.nextElementSibling;
  section.style.display = section.style.display === 'block' ? 'none' : 'block';
}

function addEntry(type, data = {}) {
  const clone = templates[type].content.cloneNode(true);
  const entry = clone.querySelector('.entry');
  for (const [k, v] of Object.entries(data)) {
    const input = entry.querySelector(`[name="${k}"]`);
    if (input) input.value = v;
  }
  setupDragEvents(entry);
  const entryArea = containers[type];
  entryArea.insertBefore(clone, entryArea.querySelector('.add-btn'));
}

function addHeading(type, text = '') {
  const template = document.getElementById('heading-template');
  const clone = template.content.cloneNode(true);
  const entry = clone.querySelector('.entry');
  if (text) entry.querySelector('[name="heading"]').value = text;
  setupDragEvents(entry);
  const entryArea = containers[type];
  entryArea.insertBefore(clone, entryArea.querySelector('.add-btn'));
}

function setupDragEvents(entry) {
  entry.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
    entry.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    entry.parentElement.dataset.draggingId = Array.from(entry.parentElement.children).indexOf(entry);
  });

  entry.addEventListener('dragend', () => {
    entry.classList.remove('dragging');
    const placeholder = entry.parentElement.querySelector('.entry-placeholder');
    if (placeholder) placeholder.remove();
  });

  entry.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const container = entry.parentElement;
    const draggingIndex = container.dataset.draggingId;
    const targetIndex = Array.from(container.children).indexOf(entry);
    
    if (draggingIndex == targetIndex) return;
    
    const placeholder = container.querySelector('.entry-placeholder') || document.createElement('div');
    placeholder.className = 'entry-placeholder';
    
    if (draggingIndex < targetIndex) {
      entry.after(placeholder);
    } else {
      entry.before(placeholder);
    }
  });

  entry.addEventListener('dragleave', (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      const placeholder = entry.parentElement.querySelector('.entry-placeholder');
      if (placeholder) placeholder.remove();
    }
  });

  entry.addEventListener('drop', (e) => {
    e.preventDefault();
    const container = entry.parentElement;
    const placeholder = container.querySelector('.entry-placeholder');
    if (!placeholder) return;
    
    const draggingIndex = container.dataset.draggingId;
    const draggingElement = container.children[draggingIndex];
    const targetIndex = Array.from(container.children).indexOf(placeholder);
    
    if (draggingIndex < targetIndex) {
      placeholder.after(draggingElement);
    } else {
      placeholder.before(draggingElement);
    }
    
    placeholder.remove();
  });
}

function getEntries(container) {
  return Array.from(container.children).filter(el => el.classList.contains('entry')).map(entry => {
    const heading = entry.querySelector('[name="heading"]');
    if (heading) return { heading: heading.value };

    const obj = {};
    ['title', 'url', 'icon', 'width', 'height'].forEach(k => {
      const el = entry.querySelector(`[name="${k}"]`);
      if (el && el.value) obj[k] = el.value;
    });
    return obj;
  });
}

document.getElementById('config-form').addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    taskbar: getEntries(containers.taskbar),
    main_menu: getEntries(containers.main_menu),
    taskbar_unique: getEntries(containers.taskbar_unique)
  };

  fetch(`${URL_PREFIX}/api/save`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(res => {
    if (res.ok) {
      alert('Saved!');
      localStorage.setItem('warmbos-reload', Date.now());
      reloadEditor();
    } else {
      alert('Failed to save.');
    }
  });
});

function reloadEditor() {
  Object.keys(containers).forEach(type => {
    containers[type].querySelectorAll('.entry').forEach(el => el.remove());
  });

  fetch(`${URL_PREFIX}/api/config`)
    .then(res => res.json())
    .then(config => {
      ['taskbar', 'main_menu', 'taskbar_unique'].forEach(type => {
        config[type].forEach(entry => {
          if (entry.heading) addHeading(type, entry.heading);
          else addEntry(type, entry);
        });
      });
    });
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
  reloadEditor();
  
  // Setup mutation observer for drag events
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.classList && node.classList.contains('entry')) {
          setupDragEvents(node);
        }
      });
    });
  });

  Object.values(containers).forEach(container => {
    observer.observe(container, { childList: true });
  });

  // Background Image Handling
  const setBgBtn = document.getElementById('set-bg-btn');
  const bgUrlInput = document.getElementById('bg-url');
  const resetBgBtn = document.getElementById('reset-bg-btn');

  // Load current background URL
  fetch(`${URL_PREFIX}/api/config`)
    .then(res => res.json())
    .then(config => {
      bgUrlInput.value = config.background_image || '';
    })
    .catch(error => {
      console.error('Error loading background config:', error);
      bgUrlInput.value = '';
    });

  // Set new background
  setBgBtn.addEventListener('click', async () => {
    const url = bgUrlInput.value.trim();
    if (!url) {
      alert('Please enter a valid URL');
      return;
    }

    try {
      // Get current config
      const response = await fetch(`${URL_PREFIX}/api/config`);
      const config = await response.json();
      
      // Update background in config
      config.background_image = url;
      
      // Save updated config
      const saveResponse = await fetch(`${URL_PREFIX}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save config');
      }

      // Notify parent window to change background
      window.parent.postMessage({
        action: 'changeBackgroundImage',
        image: url
      }, '*');

      alert('Background updated successfully!');
    } catch (error) {
      console.error('Error setting background:', error);
      alert('Failed to update background: ' + error.message);
    }
  });

  // Reset background
  resetBgBtn.addEventListener('click', async () => {
    const defaultUrl = `${URL_PREFIX}/static/images/os-bg.png`;
    
    try {
      // Get current config
      const response = await fetch(`${URL_PREFIX}/api/config`);
      const config = await response.json();
      
      // Reset to default background
      config.background_image = defaultUrl;
      
      // Save updated config
      const saveResponse = await fetch(`${URL_PREFIX}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save config');
      }

      // Update input field
      bgUrlInput.value = defaultUrl;
      
      // Notify parent window
      window.parent.postMessage({
        action: 'changeBackgroundImage',
        image: defaultUrl
      }, '*');

      alert('Background reset to default!');
    } catch (error) {
      console.error('Error resetting background:', error);
      alert('Failed to reset background: ' + error.message);
    }
  });
});