const entryTemplate = document.getElementById('entry-template');
const headingTemplate = document.getElementById('heading-template');
const containers = {
  taskbar: document.getElementById('taskbar-entries'),
  main_menu: document.getElementById('main-menu-entries'),
  taskbar_unique: document.getElementById('taskbar-unique-entries')
};

// List of available local icons (update this to match your actual icons)
const LOCAL_ICONS = [
  'browser.png', 'calculator.png', 'calendar.png',
  'editor.png', 'email.png', 'files.png',
  'music.png', 'settings.png', 'terminal.png',
  'texteditor.png', 'video.png', 'about.png'
];

function createEntry(type, data = {}, isHeading = false) {
  const template = isHeading ? headingTemplate : entryTemplate;
  const clone = template.content.cloneNode(true);
  const entry = clone.querySelector('.entry');
  
  // Set heading or title
  if (isHeading) {
    const headingInput = entry.querySelector('[name="heading"]');
    if (headingInput) headingInput.value = data.heading || '';
  } else {
    const titleInput = entry.querySelector('[name="title"]');
    if (titleInput) titleInput.value = data.title || '';
    
    // Set other fields including URL
    ['url', 'width', 'height', 'icon'].forEach(k => {
      const el = entry.querySelector(`[name="${k}"]`);
      if (el) el.value = data[k] || '';
    });
  }
  
  // Rest of the function remains the same
  setupDragEvents(entry);
  const entryArea = containers[type];
  if (entryArea) {
    const addButton = entryArea.querySelector('.add-btn');
    if (addButton) {
      entryArea.insertBefore(entry, addButton);
    } else {
      entryArea.appendChild(entry);
    }
  }
  return entry;
}

function setupDragEvents(entry) {
  entry.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', '');
    entry.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    entry.parentElement.dataset.draggingId = Array.from(entry.parentElement.children).indexOf(entry);
  });
  entry.addEventListener('dragend', () => {
    entry.classList.remove('dragging');
    const placeholder = entry.parentElement.querySelector('.entry-placeholder');
    if (placeholder) placeholder.remove();
  });
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const container = entry.parentElement;
    const draggingIndex = container.dataset.draggingId;
    const targetIndex = Array.from(container.children).indexOf(entry);
    if (draggingIndex == targetIndex) return;
    const placeholder = container.querySelector('.entry-placeholder') || document.createElement('div');
    placeholder.className = 'entry-placeholder';
    draggingIndex < targetIndex ? entry.after(placeholder) : entry.before(placeholder);
  };
  entry.addEventListener('dragover', handleDragOver);
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
    targetIndex > draggingIndex ? placeholder.after(draggingElement) : placeholder.before(draggingElement);
    placeholder.remove();
  });
}

function getEntries(container) {
  return Array.from(container.children)
    .filter(el => el.classList.contains('entry'))
    .map(entry => {
      const heading = entry.querySelector('[name="heading"]');
      if (heading) return { heading: heading.value };

      const result = {};
      
      // Get all relevant fields including URL
      ['title', 'url', 'width', 'height', 'icon'].forEach(k => {
        const el = entry.querySelector(`[name="${k}"]`);
        if (el) result[k] = el.value; // Save even empty values
      });
      
      return result;
    });
}

document.getElementById('config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = {
      taskbar: getEntries(containers.taskbar),
      main_menu: getEntries(containers.main_menu),
      taskbar_unique: getEntries(containers.taskbar_unique)
    };
    const response = await fetch(`${URL_PREFIX}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const saveBtn = document.getElementById('save-btn');
    if (response.ok) {
      saveBtn.textContent = 'Saved!';
      saveBtn.style.backgroundColor = 'green';
      localStorage.setItem('warmbos-reload', Date.now());
      reloadEditor();
      setTimeout(() => resetSaveButton(saveBtn), 3000);
    } else {
      throw new Error('Failed to save');
    }
  } catch (error) {
    const saveBtn = document.getElementById('save-btn');
    saveBtn.textContent = 'Failed to save';
    saveBtn.style.backgroundColor = 'red';
    setTimeout(() => resetSaveButton(saveBtn), 3000);
    console.error('Error:', error);
  }
});

function resetSaveButton(btn) {
  btn.textContent = 'Save';
  btn.style.backgroundColor = '';
}

async function reloadEditor() {
  try {
    const response = await fetch(`${URL_PREFIX}/api/config`);
    const config = await response.json();
    Object.keys(containers).forEach(type => {
      containers[type].querySelectorAll('.entry').forEach(el => el.remove());
      config[type]?.forEach(entry => {
        const newEntry = createEntry(type, entry, !!entry.heading);
        if (!entry.heading && newEntry) {
          const input = newEntry.querySelector('input[name="title"]');
          if (input) updateEntryTitle(input);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching config:', error);
  }
}

function toggleEntryDetails(button) {
  const entry = button.closest('.entry');
  const details = entry.querySelector('.entry-details');
  if (!details) return;
  
  if (details.style.display === 'block') {
    details.style.display = 'none';
    button.textContent = '+';
  } else {
    details.style.display = 'block';
    button.textContent = '−';
  }
}

function addEntry(type, data = {}) {
  const entry = createEntry(type, data);
  if (entry) {
    const titleInput = entry.querySelector('input[name="title"]');
    if (titleInput) titleInput.focus();
  }
  return entry;
}

function updateEntryTitle(inputEl) {
  const header = inputEl.closest('.entry').querySelector('.entry-header .entry-title');
  if (header) {
    header.textContent = inputEl.value.trim() || 
      (inputEl.name === 'heading' ? 'New Heading' : 'New Item');
  }
}

function moveEntryUp(event) {
  event.stopPropagation();
  const entry = event.target.closest('.entry');
  if (!entry) return;
  const prev = entry.previousElementSibling;
  if (prev && !prev.classList.contains('add-btn')) {
    entry.parentNode.insertBefore(entry, prev);
  }
}

function moveEntryDown(event) {
  event.stopPropagation();
  const entry = event.target.closest('.entry');
  if (!entry) return;
  const next = entry.nextElementSibling;
  if (next && !next.classList.contains('add-btn')) {
    entry.parentNode.insertBefore(next, entry);
  }
}

function confirmRemoveEntry(event) {
  event.stopPropagation();
  const entry = event.target.closest('.entry');
  if (!entry) return;
  const dialog = document.createElement('div');
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.backgroundColor = '#222';
  dialog.style.padding = '20px';
  dialog.style.borderRadius = '5px';
  dialog.style.zIndex = '9999';
  dialog.style.border = '1px solid #444';
  dialog.innerHTML = `
    <p>Are you sure you want to remove this entry?</p>
    <div style="display: flex; gap: 10px; margin-top: 15px;">
      <button id="confirm-remove" style="padding: 5px 10px; background: #a33; color: white; border: none; border-radius: 3px;">Remove</button>
      <button id="cancel-remove" style="padding: 5px 10px; background: #555; color: white; border: none; border-radius: 3px;">Cancel</button>
    </div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('#confirm-remove').addEventListener('click', () => {
    entry.remove();
    document.body.removeChild(dialog);
  });
  dialog.querySelector('#cancel-remove').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
}

function toggleSection(header) {
  const section = header.parentElement;
  const isOpen = section.querySelector('.entries').style.display === 'block';
  document.querySelectorAll('.section .entries').forEach(entries => {
    entries.style.display = 'none';
  });
  if (!isOpen) {
    section.querySelector('.entries').style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  reloadEditor();
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('move-btn')) {
      const entry = e.target.closest('.entry');
      if (!entry) return;
      if (e.target.textContent.includes('⬆')) {
        moveEntryUp(e);
      } else if (e.target.textContent.includes('⬇')) {
        moveEntryDown(e);
      }
    }
  });
});

window.addEntry = addEntry;
window.addHeading = function(type, text = '') {
  const template = document.getElementById('heading-template');
  const clone = template.content.cloneNode(true);
  const entry = clone.querySelector('.entry');
  if (text) entry.querySelector('[name="heading"]').value = text;
  setupDragEvents(entry);
  const entryArea = containers[type];
  entryArea.insertBefore(clone, entryArea.querySelector('.add-btn'));
  return entry;
};