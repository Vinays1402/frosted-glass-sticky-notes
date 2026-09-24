// ==========================================================================
// LIQUID GLASS POLYMORPHIC STICKY NOTES - APP CONTROLLER
// Flipped hover fanning, 3s opacity morph layer, Spread View (Categories, Multi-select, Sort)
// ==========================================================================

// Centralized Issue Logger
window.onerror = function (message, source, lineno, colno, error) {
  if (window.api && window.api.logIssue) {
    window.api.logIssue('ERROR', `Renderer Error: ${message} at ${source}:${lineno}:${colno}`, error ? error.stack : '');
  }
};
window.onunhandledrejection = function (event) {
  if (window.api && window.api.logIssue) {
    const reason = event.reason;
    window.api.logIssue('ERROR', `Renderer Promise Rejection: ${reason ? reason.message || reason : 'Unknown'}`, reason ? reason.stack : '');
  }
};

let notes = [];
let activeNoteId = null;
let isSpreadMode = false;
let isPinned = true;
let isOpaqueBlock = false;
let saveDebounceTimer = null;
let noteToDeleteId = null;
let isDeletingMultiple = false;

// Spread View State
let categories = ['All Notes', 'General', 'Work', 'Personal', 'Ideas', 'Tasks'];
let activeCategory = 'All Notes';
let selectedNoteIds = new Set();
let currentSort = 'newest';
let draggedNoteId = null;

// Settings state
let userSettings = {
  blur: 24,
  opacity: 84,
  refraction: 40,
  innerRim: 16,
  radius: 28,
  showFormatBar: true,
  showTodo: true,
  showTime: true,
  showPalette: true
};

try {
  const saved = localStorage.getItem('glass_user_settings');
  if (saved) userSettings = { ...userSettings, ...JSON.parse(saved) };
} catch (e) {}

// DOM Elements
const deckViewport = document.getElementById('deckViewport');
const cardsStage = document.getElementById('cardsStage');
const spreadLayout = document.getElementById('spreadLayout');
const spreadSidebar = document.getElementById('spreadSidebar');
const categoriesList = document.getElementById('categoriesList');
const btnAddCategory = document.getElementById('btnAddCategory');
const currentCategoryLabel = document.getElementById('currentCategoryLabel');
const selectionPill = document.getElementById('selectionPill');
const selectedCountText = document.getElementById('selectedCountText');
const btnSelectAll = document.getElementById('btnSelectAll');
const sortSelect = document.getElementById('sortSelect');
const btnDeleteSelected = document.getElementById('btnDeleteSelected');
const deleteSelectedBadge = document.getElementById('deleteSelectedBadge');
const btnCloseSpread = document.getElementById('btnCloseSpread');
const spreadCardsGrid = document.getElementById('spreadCardsGrid');

const deletePopup = document.getElementById('deletePopup');
const deletePopupTitle = document.getElementById('deletePopupTitle');
const deletePopupSubtitle = document.getElementById('deletePopupSubtitle');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');
const settingsHost = document.getElementById('settingsHost');
const svgDisplacement = document.getElementById('svgDisplacement');

// Tactile Roller & Spread Toolbar Elements
const stackRoller = document.getElementById('stackRoller');
const btnRollerUp = document.getElementById('btnRollerUp');
const btnRollerDown = document.getElementById('btnRollerDown');
const rollerCylinder = document.getElementById('rollerCylinder');
const rollerRibs = document.getElementById('rollerRibs');
const rollerBadge = document.getElementById('rollerBadge');
const rollerIndex = document.getElementById('rollerIndex');
const rollerTitle = document.getElementById('rollerTitle');
const btnSpreadNewNote = document.getElementById('btnSpreadNewNote');
const btnSnapGrid = document.getElementById('btnSnapGrid');

// Vector SVGs
const SVGS = {
  plus: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  drop: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`,
  gear: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
  spread: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>`,
  pin: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>`,
  minimize: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  close: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  bold: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>`,
  underline: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 3v7a6 6 0 0 0 12 0V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>`,
  italic: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>`,
  strike: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M17.3 4.9c-2.3-.6-4.7-.2-6.5.9-2.3 1.4-3.1 3.9-1.9 6.2"></path><path d="M16 16c-.9 1.4-2.5 2.1-4.2 2-2.3 0-4.3-1.4-4.8-3.6"></path><line x1="4" y1="12" x2="20" y2="12"></line></svg>`,
  list: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><circle cx="3.5" cy="6" r="1.5" fill="currentColor"></circle><circle cx="3.5" cy="12" r="1.5" fill="currentColor"></circle><circle cx="3.5" cy="18" r="1.5" fill="currentColor"></circle></svg>`,
  todo: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
  clock: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  palette: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2C6.5 2 2 6.5 2 12c0 3.6 2 6.7 5 8.3 0 0 1.5-.7 1.5-2 0-1.1-.9-2-2-2-1.1 0-2-.9-2-2 0-3.3 2.7-6 6-6s6 2.7 6 6c0 1.1-.9 2-2 2-1.1 0-2 .9-2 2 0 1.3 1.5 2 1.5 2 3-1.6 5-4.7 5-8.3 0-5.5-4.5-10-10-10z"></path></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
};

// 1. APPLY USER CSS SETTINGS
function applyCssSettings() {
  document.documentElement.style.setProperty('--glass-blur', `${userSettings.blur}px`);
  document.documentElement.style.setProperty('--glass-opacity', `${userSettings.opacity / 100}`);
  document.documentElement.style.setProperty('--glass-radius', `${userSettings.radius}px`);
  document.documentElement.style.setProperty('--glass-inner-rim', `${userSettings.innerRim}px`);
  if (svgDisplacement) {
    svgDisplacement.setAttribute('scale', userSettings.refraction);
  }
}

// 2. INITIALIZE APP
async function initApp() {
  applyCssSettings();
  try {
    const wState = await window.api.getWindowState();
    if (wState && typeof wState.isPinned === 'boolean') {
      isPinned = wState.isPinned;
    }
  } catch (e) {}

  const loaded = await window.api.getAllNotes();
  if (Array.isArray(loaded) && loaded.length > 0) {
    notes = loaded.map(n => ({
      ...n,
      theme: n.theme || 'crystal',
      category: n.category || 'General'
    }));
  } else {
    notes = [
      {
        id: 'note-welcome',
        title: 'Liquid Glass Note',
        content: `<div>Welcome to your <b>liquid glass polymorphic</b> notes!</div>
<br>
<div>• <b>Rich Frosted Finish</b>: High optical density keeps text legible over any background.</div>
<div>• <b>3-Second Opacity Morph</b>: Tap the droplet button to watch the liquid glass solidify into a block over 3 seconds.</div>
<div>• <b>Spread & Categories</b>: Tap the grid button to sort, select, and filter your notes by category.</div>
<br>
<div class="todo-item"><input type="checkbox" class="todo-check" checked><span class="todo-text checked">Polymorphic liquid glass finish</span></div>
<div class="todo-item"><input type="checkbox" class="todo-check"><span class="todo-text">Ultra-low CPU & memory footprint</span></div>`,
        theme: 'crystal',
        category: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    triggerSave();
  }

  // Extract unique categories from notes
  notes.forEach(n => {
    if (n.category && !categories.includes(n.category)) {
      categories.push(n.category);
    }
  });

  activeNoteId = notes[0].id;
  renderDeck();
  applyTheme(notes[0].theme || 'crystal');
}

// Get notes filtered by active category
function getFilteredNotes() {
  if (activeCategory === 'All Notes') return notes;
  return notes.filter(n => (n.category || 'General') === activeCategory);
}

// 3. RENDER 3D STACKED DECK
function renderDeck(slideInNew = false) {
  if (isSpreadMode) {
    renderSpreadView();
    return;
  }

  cardsStage.innerHTML = '';
  const filtered = getFilteredNotes();

  if (filtered.length === 0) {
    cardsStage.innerHTML = `
      <div class="liquid-glass-card depth-0" style="display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px;">
        <div>
          <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">No notes in "${escapeHtml(activeCategory)}"</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Create a new note or switch category.</div>
          <button class="vec-btn btn-new-card" style="width: auto; height: auto; padding: 6px 14px; margin: 0 auto;">+ Create Note</button>
        </div>
      </div>
    `;
    const btn = cardsStage.querySelector('.btn-new-card');
    if (btn) btn.addEventListener('click', () => addNewNote());
    return;
  }

  // Ensure active note is at top of filtered list
  const activeIdx = filtered.findIndex(n => n.id === activeNoteId);
  if (activeIdx !== -1) {
    const activeNote = filtered.splice(activeIdx, 1)[0];
    filtered.unshift(activeNote);
  } else {
    activeNoteId = filtered[0].id;
  }

  filtered.forEach((note, index) => {
    const cardEl = document.createElement('div');
    const isTop = index === 0;
    cardEl.className = `liquid-glass-card depth-${Math.min(index, 3)} ${isTop && isOpaqueBlock ? 'opaque-block-mode' : ''} ${isTop && slideInNew ? 'slide-in' : ''}`;
    cardEl.dataset.id = note.id;

    const isActive = isTop;

    cardEl.innerHTML = `
      <!-- Dedicated 3-Second Frosted Opaque Block Crossfade Layer -->
      <div class="glass-opaque-block-layer"></div>

      <div class="card-content">
        <!-- Minimalist Card Header -->
        <div class="card-header">
          <input type="text" class="card-title-input" value="${escapeHtml(note.title || 'Untitled')}" placeholder="Title..." ${isActive ? '' : 'readonly'} />
          
          <div class="card-actions">
            <!-- New Note with Tooltip badge on hover -->
            <div class="tooltip-container">
              <button class="vec-btn btn-new-card" title="Add Note">${SVGS.plus}</button>
              <div class="hover-pill-tooltip">${notes.length} ${notes.length === 1 ? 'Note' : 'Notes'} • New</div>
            </div>

            <!-- 3-Second Opacity Shift Toggle -->
            <button class="vec-btn btn-opacity-toggle ${isOpaqueBlock ? 'active' : ''}" title="Toggle Frosted Opacity (3s Transition)">${SVGS.drop}</button>

            <!-- AetherCSS Control Center (Settings) -->
            <button class="vec-btn btn-settings" title="Customize Glass & Controls">${SVGS.gear}</button>

            <!-- Spread / Stack Toggle -->
            <button class="vec-btn btn-spread-card" title="Spread & Categories View">${SVGS.spread}</button>

            <!-- Pin Across Desktops -->
            <button class="vec-btn btn-pin-card ${isPinned ? 'active' : ''}" title="Pin Across Desktops">${SVGS.pin}</button>

            <!-- Minimize -->
            <button class="vec-btn btn-min-card" title="Minimize">${SVGS.minimize}</button>

            <!-- Close / Hide to Tray -->
            <button class="vec-btn btn-close-card danger" title="Hide to Tray">${SVGS.close}</button>
          </div>
        </div>

        ${isActive ? `
        <!-- Minimalist Vector Formatting Row (No text labels) -->
        <div class="card-format-row ${userSettings.showFormatBar ? '' : 'hidden-by-settings'}">
          <div class="format-left">
            <button class="fmt-icon-btn btn-bold" title="Bold (Ctrl+B)">${SVGS.bold}</button>
            <button class="fmt-icon-btn btn-underline" title="Underline (Ctrl+U)">${SVGS.underline}</button>
            <button class="fmt-icon-btn btn-italic" title="Italic (Ctrl+I)">${SVGS.italic}</button>
            <button class="fmt-icon-btn btn-strike" title="Strikethrough">${SVGS.strike}</button>
            <div class="fmt-divider"></div>
            <button class="fmt-icon-btn btn-list" title="Bullet List">${SVGS.list}</button>
            <button class="fmt-icon-btn btn-todo ${userSettings.showTodo ? '' : 'hidden-by-settings'}" title="Checkbox">${SVGS.todo}</button>
            <button class="fmt-icon-btn btn-time ${userSettings.showTime ? '' : 'hidden-by-settings'}" title="Timestamp">${SVGS.clock}</button>
          </div>

          <div class="format-right">
            <!-- Palette Popover -->
            <div class="palette-popover-wrapper ${userSettings.showPalette ? '' : 'hidden-by-settings'}">
              <button class="fmt-icon-btn btn-palette" title="Liquid Tint">${SVGS.palette}</button>
              <div class="palette-dropdown">
                <div class="palette-item" data-theme="crystal"><span class="color-dot crystal"></span> Ice</div>
                <div class="palette-item" data-theme="amethyst"><span class="color-dot amethyst"></span> Amethyst</div>
                <div class="palette-item" data-theme="teal"><span class="color-dot teal"></span> Teal</div>
                <div class="palette-item" data-theme="amber"><span class="color-dot amber"></span> Amber</div>
                <div class="palette-item" data-theme="rose"><span class="color-dot rose"></span> Rose</div>
                <div class="palette-item" data-theme="emerald"><span class="color-dot emerald"></span> Jade</div>
                <div class="palette-item" data-theme="obsidian"><span class="color-dot obsidian"></span> Obsidian</div>
              </div>
            </div>

            <!-- Delete Note Button -->
            <button class="fmt-icon-btn danger btn-trash" title="Delete Note">${SVGS.trash}</button>
            <div class="save-dot-status" title="Auto-saved to JSON"></div>
          </div>
        </div>
        ` : ''}

        <!-- Card Note Body -->
        <div class="card-body-editor" contenteditable="${isActive}" placeholder="Start typing your note here...">${note.content || ''}</div>
      </div>
    `;

    // Click handler on background card: pops card to front
    cardEl.addEventListener('click', (e) => {
      if (isActive && (e.target.closest('.card-body-editor') || e.target.closest('.card-title-input') || e.target.closest('.card-actions') || e.target.closest('.card-format-row'))) {
        return;
      }
      if (note.id !== activeNoteId) {
        activeNoteId = note.id;
        applyTheme(note.theme || 'crystal');
        renderDeck();
      }
    });

    if (isActive) {
      const titleInput = cardEl.querySelector('.card-title-input');
      const bodyEditor = cardEl.querySelector('.card-body-editor');

      titleInput.addEventListener('input', () => {
        note.title = titleInput.value;
        triggerSave();
      });

      bodyEditor.addEventListener('input', () => {
        note.content = bodyEditor.innerHTML;
        triggerSave();
      });

      bodyEditor.addEventListener('change', (e) => {
        if (e.target.classList.contains('todo-check')) {
          const span = e.target.nextElementSibling;
          if (span) span.classList.toggle('checked', e.target.checked);
          note.content = bodyEditor.innerHTML;
          triggerSave();
        }
      });

      // Actions
      cardEl.querySelector('.btn-new-card').addEventListener('click', (e) => {
        e.stopPropagation();
        addNewNote();
      });

      // 3-SECOND SMOOTH OPACITY TRANSITION (💧)
      cardEl.querySelector('.btn-opacity-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        isOpaqueBlock = !isOpaqueBlock;
        cardEl.classList.toggle('opaque-block-mode', isOpaqueBlock);
        cardEl.querySelector('.btn-opacity-toggle').classList.toggle('active', isOpaqueBlock);
      });

      // Settings Gear -> Open Control Center
      cardEl.querySelector('.btn-settings').addEventListener('click', (e) => {
        e.stopPropagation();
        openControlCenter();
      });

      cardEl.querySelector('.btn-spread-card').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSpread(true);
      });

      cardEl.querySelector('.btn-pin-card').addEventListener('click', async (e) => {
        e.stopPropagation();
        isPinned = !isPinned;
        cardEl.querySelector('.btn-pin-card').classList.toggle('active', isPinned);
        await window.api.togglePin(null, isPinned);
      });

      cardEl.querySelector('.btn-min-card').addEventListener('click', (e) => {
        e.stopPropagation();
        window.api.minimizeWindow();
      });

      cardEl.querySelector('.btn-close-card').addEventListener('click', (e) => {
        e.stopPropagation();
        window.api.closeWindow();
      });

      // Formatting
      cardEl.querySelector('.btn-bold')?.addEventListener('click', () => formatText('bold'));
      cardEl.querySelector('.btn-underline')?.addEventListener('click', () => formatText('underline'));
      cardEl.querySelector('.btn-italic')?.addEventListener('click', () => formatText('italic'));
      cardEl.querySelector('.btn-strike')?.addEventListener('click', () => formatText('strikeThrough'));
      cardEl.querySelector('.btn-list')?.addEventListener('click', () => formatText('insertUnorderedList'));

      cardEl.querySelector('.btn-todo')?.addEventListener('click', () => {
        bodyEditor.focus();
        document.execCommand('insertHTML', false, `<div class="todo-item"><input type="checkbox" class="todo-check"><span class="todo-text">Task item</span></div>&nbsp;`);
        note.content = bodyEditor.innerHTML;
        triggerSave();
      });

      cardEl.querySelector('.btn-time')?.addEventListener('click', () => {
        bodyEditor.focus();
        const now = new Date();
        const str = `<b>[${now.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</b>&nbsp;`;
        document.execCommand('insertHTML', false, str);
        note.content = bodyEditor.innerHTML;
        triggerSave();
      });

      // Palette
      const paletteBtn = cardEl.querySelector('.btn-palette');
      const paletteDropdown = cardEl.querySelector('.palette-dropdown');
      if (paletteBtn && paletteDropdown) {
        paletteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          paletteDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
          if (!paletteDropdown.contains(e.target) && e.target !== paletteBtn) {
            paletteDropdown.classList.remove('show');
          }
        });

        paletteDropdown.querySelectorAll('.palette-item').forEach(item => {
          item.addEventListener('click', () => {
            const t = item.dataset.theme;
            applyTheme(t);
            paletteDropdown.classList.remove('show');
          });
        });
      }

      // Trash -> Scoped Delete Confirmation
      cardEl.querySelector('.btn-trash').addEventListener('click', (e) => {
        e.stopPropagation();
        noteToDeleteId = note.id;
        isDeletingMultiple = false;
        deletePopupTitle.textContent = 'Delete Note?';
        deletePopupSubtitle.textContent = 'This action cannot be undone.';
        deletePopup.classList.add('open');
      });
    }

    cardsStage.appendChild(cardEl);
  });
  updateRollerUI();
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

// --------------------------------------------------------------------------
// TACTILE 3D ROLLER CONTROL CONTROLLER
// --------------------------------------------------------------------------
let rollerRibOffset = 0;
let isRollerDragging = false;
let rollerScrollTimer = null;

function updateRollerUI() {
  if (!stackRoller) return;
  const filtered = getFilteredNotes();
  if (filtered.length === 0 || isSpreadMode) {
    stackRoller.style.display = 'none';
    return;
  }
  stackRoller.style.display = 'flex';

  const activeIdx = Math.max(0, filtered.findIndex(n => n.id === activeNoteId));
  const activeNote = filtered[activeIdx] || filtered[0];

  if (rollerIndex) {
    rollerIndex.textContent = `${activeIdx + 1} / ${filtered.length}`;
  }
  if (rollerTitle) {
    rollerTitle.textContent = activeNote ? (activeNote.title || 'Untitled Note') : 'Empty';
  }
}

function stepStackedCard(dir) {
  const filtered = getFilteredNotes();
  if (filtered.length <= 1) return;

  let currentIdx = filtered.findIndex(n => n.id === activeNoteId);
  if (currentIdx === -1) currentIdx = 0;

  const nextIdx = (currentIdx + dir + filtered.length) % filtered.length;
  activeNoteId = filtered[nextIdx].id;

  // Animate the cylindrical roller ribs rotation
  rollerRibOffset += dir * 16;
  if (rollerRibs) {
    rollerRibs.style.transform = `translateY(${-(rollerRibOffset % 32)}px)`;
  }

  // Pop up the badge displaying card title and index
  if (stackRoller) {
    stackRoller.classList.add('scrolling');
    if (rollerScrollTimer) clearTimeout(rollerScrollTimer);
    rollerScrollTimer = setTimeout(() => {
      stackRoller.classList.remove('scrolling');
    }, 1200);
  }

  applyTheme(filtered[nextIdx].theme || 'crystal');
  renderDeck();
}

// Initialize Roller Event Listeners
if (btnRollerUp) {
  btnRollerUp.addEventListener('click', (e) => {
    e.stopPropagation();
    stepStackedCard(-1);
  });
}

if (btnRollerDown) {
  btnRollerDown.addEventListener('click', (e) => {
    e.stopPropagation();
    stepStackedCard(1);
  });
}

if (rollerCylinder) {
  rollerCylinder.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY > 0) stepStackedCard(1);
    else if (e.deltaY < 0) stepStackedCard(-1);
  }, { passive: false });

  let rollerStartY = 0;
  rollerCylinder.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isRollerDragging = true;
    rollerStartY = e.clientY;

    const onMove = (ev) => {
      if (!isRollerDragging) return;
      const diff = ev.clientY - rollerStartY;
      if (Math.abs(diff) >= 20) {
        stepStackedCard(diff > 0 ? 1 : -1);
        rollerStartY = ev.clientY;
      }
    };

    const onUp = () => {
      isRollerDragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}

// Scroll wheel over cards stage also flips cards when not scrolling inside note body
if (cardsStage) {
  cardsStage.addEventListener('wheel', (e) => {
    if (isSpreadMode) return;
    const editor = e.target.closest('.card-body-editor');
    if (editor && editor.scrollHeight > editor.clientHeight) {
      return;
    }
    if (e.deltaY > 0) stepStackedCard(1);
    else if (e.deltaY < 0) stepStackedCard(-1);
  }, { passive: true });
}

// 4. APPLY THEME
function applyTheme(themeName) {
  document.body.className = `theme-${themeName}`;
  const activeNote = notes.find(n => n.id === activeNoteId);
  if (activeNote) {
    activeNote.theme = themeName;
    triggerSave();
  }
}

// 5. FORMAT TEXT
function formatText(cmd, val = null) {
  const activeEditor = document.querySelector('.liquid-glass-card.depth-0 .card-body-editor');
  if (activeEditor) {
    activeEditor.focus();
    document.execCommand(cmd, false, val);
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (activeNote) {
      activeNote.content = activeEditor.innerHTML;
      triggerSave();
    }
  }
}

// 6. ADD NEW NOTE (INITIAL THEME IS ALWAYS UNIFIED 'crystal')
function addNewNote() {
  const newNote = {
    id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    title: 'New Note',
    content: '<div>Start typing your note here...</div>',
    theme: 'crystal', // All cards initially have the SAME colour
    category: activeCategory === 'All Notes' ? 'General' : activeCategory,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  notes.unshift(newNote);
  activeNoteId = newNote.id;
  applyTheme('crystal');

  if (isSpreadMode) {
    renderSpreadView();
  } else {
    renderDeck(true);
  }
  triggerSave();

  setTimeout(() => {
    const titleInp = document.querySelector('.liquid-glass-card.depth-0 .card-title-input');
    if (titleInp) {
      titleInp.focus();
      titleInp.select();
    }
  }, 120);
}

// 7. SPREAD / STACK TOGGLE
function toggleSpread(forceState) {
  isSpreadMode = typeof forceState === 'boolean' ? forceState : !isSpreadMode;
  deckViewport.classList.toggle('mode-spread', isSpreadMode);
  window.api.setWindowMode(isSpreadMode ? 'spread' : 'stack');
  selectedNoteIds.clear();

  if (isSpreadMode) {
    if (stackRoller) stackRoller.style.display = 'none';
    renderSpreadView();
  } else {
    if (stackRoller) stackRoller.style.display = 'flex';
    renderDeck();
  }
}

// 8. RENDER SPREAD VIEW (SIMULTANEOUSLY USABLE & DRAGGABLE POP-OUT CARDS)
let highestSpreadZ = 30;

function renderSpreadView() {
  currentCategoryLabel.textContent = activeCategory;
  if (stackRoller) stackRoller.style.display = 'none';

  // Render Category Sidebar
  categoriesList.innerHTML = '';
  categories.forEach(cat => {
    const count = cat === 'All Notes' ? notes.length : notes.filter(n => (n.category || 'General') === cat).length;
    const pill = document.createElement('div');
    pill.className = `category-pill ${cat === activeCategory ? 'active' : ''}`;
    pill.innerHTML = `
      <span>${escapeHtml(cat)}</span>
      <span class="category-count">${count}</span>
    `;
    pill.addEventListener('click', () => {
      activeCategory = cat;
      renderSpreadView();
    });
    categoriesList.appendChild(pill);
  });

  // Update selection indicator
  const selCount = selectedNoteIds.size;
  if (selCount > 0) {
    selectionPill.style.display = 'flex';
    selectedCountText.textContent = `${selCount} selected`;
    btnDeleteSelected.style.display = 'flex';
    deleteSelectedBadge.textContent = selCount;
  } else {
    selectionPill.style.display = 'none';
    btnDeleteSelected.style.display = 'none';
  }

  // Get filtered and sorted notes
  let list = getFilteredNotes().slice();
  if (currentSort === 'newest') {
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else if (currentSort === 'oldest') {
    list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  } else if (currentSort === 'title') {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  spreadCardsGrid.innerHTML = '';

  if (list.length === 0) {
    spreadCardsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; width: 100%; text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 13px;">
        <div>No notes found in "${escapeHtml(activeCategory)}".</div>
        <button class="spread-tool-btn primary" id="btnSpreadEmptyAdd" style="margin: 16px auto 0 auto;">+ Create Note</button>
      </div>
    `;
    const emptyBtn = spreadCardsGrid.querySelector('#btnSpreadEmptyAdd');
    if (emptyBtn) emptyBtn.addEventListener('click', () => addNewNoteInSpread());
    return;
  }

  list.forEach((note) => {
    const cardEl = document.createElement('div');
    const isSelected = selectedNoteIds.has(note.id);
    const isPopped = note.spreadX !== undefined && note.spreadY !== undefined;

    cardEl.className = `spread-usable-card ${isSelected ? 'selected' : ''} ${isPopped ? 'popped-out' : ''}`;
    cardEl.dataset.id = note.id;

    if (isPopped) {
      cardEl.style.left = `${note.spreadX}px`;
      cardEl.style.top = `${note.spreadY}px`;
      cardEl.style.zIndex = note.zIndex || 10;
    }

    const dateStr = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

    cardEl.innerHTML = `
      <!-- Draggable Card Header (Grab to pop out anywhere) -->
      <div class="spread-card-header" title="Drag header to move card anywhere on canvas">
        <span class="drag-grip-icon" title="Drag to move card">⠿</span>
        <input type="text" class="spread-card-title-input" value="${escapeHtml(note.title || 'Untitled Note')}" placeholder="Note Title..." />
        
        <div class="spread-card-actions">
          <!-- Multi-select checkbox -->
          <input type="checkbox" class="spread-select-checkbox" title="Select for bulk actions" ${isSelected ? 'checked' : ''} />

          <!-- Mini Palette Dropper -->
          <div class="palette-popover-wrapper">
            <button class="vec-btn btn-card-palette" style="width: 22px; height: 22px;" title="Note Color">${SVGS.palette}</button>
            <div class="palette-dropdown">
              <div class="palette-item" data-theme="crystal"><span class="color-dot crystal"></span> Ice</div>
              <div class="palette-item" data-theme="amethyst"><span class="color-dot amethyst"></span> Amethyst</div>
              <div class="palette-item" data-theme="teal"><span class="color-dot teal"></span> Teal</div>
              <div class="palette-item" data-theme="amber"><span class="color-dot amber"></span> Amber</div>
              <div class="palette-item" data-theme="rose"><span class="color-dot rose"></span> Rose</div>
              <div class="palette-item" data-theme="emerald"><span class="color-dot emerald"></span> Jade</div>
              <div class="palette-item" data-theme="obsidian"><span class="color-dot obsidian"></span> Obsidian</div>
            </div>
          </div>

          <!-- Delete single note -->
          <button class="vec-btn danger btn-trash-card" style="width: 22px; height: 22px;" title="Delete Note">${SVGS.trash}</button>
        </div>
      </div>

      <!-- Live Formatting Toolbar -->
      <div class="spread-card-format-row">
        <div class="format-left">
          <button class="fmt-icon-btn btn-fmt-bold" title="Bold">${SVGS.bold}</button>
          <button class="fmt-icon-btn btn-fmt-underline" title="Underline">${SVGS.underline}</button>
          <button class="fmt-icon-btn btn-fmt-italic" title="Italic">${SVGS.italic}</button>
          <button class="fmt-icon-btn btn-fmt-strike" title="Strikethrough">${SVGS.strike}</button>
          <div class="fmt-divider"></div>
          <button class="fmt-icon-btn btn-fmt-list" title="Bullet List">${SVGS.list}</button>
          <button class="fmt-icon-btn btn-fmt-todo" title="Checkbox">${SVGS.todo}</button>
          <button class="fmt-icon-btn btn-fmt-time" title="Timestamp">${SVGS.clock}</button>
        </div>
        <div class="format-right">
          <span class="save-dot-status" title="Saved"></span>
        </div>
      </div>

      <!-- Rich-Text Editable Note Body (Directly usable in spread view) -->
      <div class="spread-card-body-editor" contenteditable="true" placeholder="Start typing...">${note.content || ''}</div>

      <!-- Card Footer -->
      <div class="spread-card-footer">
        <span class="spread-card-cat-badge">${escapeHtml(note.category || 'General')}</span>
        <span>${dateStr}</span>
        <button class="btn-open-in-stack" title="Open as front card in stack view">
          <span>Stack</span>
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    `;

    // Elements
    const titleInput = cardEl.querySelector('.spread-card-title-input');
    const bodyEditor = cardEl.querySelector('.spread-card-body-editor');
    const selectCheckbox = cardEl.querySelector('.spread-select-checkbox');
    const headerEl = cardEl.querySelector('.spread-card-header');
    const btnPalette = cardEl.querySelector('.btn-card-palette');
    const paletteDropdown = cardEl.querySelector('.palette-dropdown');
    const btnTrash = cardEl.querySelector('.btn-trash-card');
    const btnOpenInStack = cardEl.querySelector('.btn-open-in-stack');

    // Bring card to front on mousedown
    cardEl.addEventListener('mousedown', () => {
      highestSpreadZ++;
      cardEl.style.zIndex = highestSpreadZ;
      note.zIndex = highestSpreadZ;
    });

    // 1. Live Title Editing
    titleInput.addEventListener('input', () => {
      note.title = titleInput.value;
      if (note.id === activeNoteId) {
        updateRollerUI();
      }
      triggerSave();
    });

    // 2. Live Body Editing
    bodyEditor.addEventListener('input', () => {
      note.content = bodyEditor.innerHTML;
      triggerSave();
    });

    // Checkbox toggle inside content
    bodyEditor.addEventListener('change', (e) => {
      if (e.target.classList.contains('todo-check')) {
        const span = e.target.nextElementSibling;
        if (span) span.classList.toggle('checked', e.target.checked);
        note.content = bodyEditor.innerHTML;
        triggerSave();
      }
    });

    // 3. Formatting actions for this specific card
    const applySpreadFormat = (cmd, val = null) => {
      bodyEditor.focus();
      document.execCommand(cmd, false, val);
      note.content = bodyEditor.innerHTML;
      triggerSave();
    };

    cardEl.querySelector('.btn-fmt-bold')?.addEventListener('click', (e) => { e.stopPropagation(); applySpreadFormat('bold'); });
    cardEl.querySelector('.btn-fmt-underline')?.addEventListener('click', (e) => { e.stopPropagation(); applySpreadFormat('underline'); });
    cardEl.querySelector('.btn-fmt-italic')?.addEventListener('click', (e) => { e.stopPropagation(); applySpreadFormat('italic'); });
    cardEl.querySelector('.btn-fmt-strike')?.addEventListener('click', (e) => { e.stopPropagation(); applySpreadFormat('strikeThrough'); });
    cardEl.querySelector('.btn-fmt-list')?.addEventListener('click', (e) => { e.stopPropagation(); applySpreadFormat('insertUnorderedList'); });
    cardEl.querySelector('.btn-fmt-todo')?.addEventListener('click', (e) => {
      e.stopPropagation();
      bodyEditor.focus();
      document.execCommand('insertHTML', false, `<div class="todo-item"><input type="checkbox" class="todo-check"><span class="todo-text">Task item</span></div>&nbsp;`);
      note.content = bodyEditor.innerHTML;
      triggerSave();
    });
    cardEl.querySelector('.btn-fmt-time')?.addEventListener('click', (e) => {
      e.stopPropagation();
      bodyEditor.focus();
      const now = new Date();
      const str = `<b>[${now.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</b>&nbsp;`;
      document.execCommand('insertHTML', false, str);
      note.content = bodyEditor.innerHTML;
      triggerSave();
    });

    // 4. Color Palette Dropper
    if (btnPalette && paletteDropdown) {
      btnPalette.addEventListener('click', (e) => {
        e.stopPropagation();
        paletteDropdown.classList.toggle('show');
      });

      paletteDropdown.querySelectorAll('.palette-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const t = item.dataset.theme;
          note.theme = t;
          triggerSave();
          paletteDropdown.classList.remove('show');
        });
      });
    }

    // 5. Multi-select Checkbox
    selectCheckbox.addEventListener('change', (e) => {
      e.stopPropagation();
      if (selectCheckbox.checked) {
        selectedNoteIds.add(note.id);
        cardEl.classList.add('selected');
      } else {
        selectedNoteIds.delete(note.id);
        cardEl.classList.remove('selected');
      }
      const count = selectedNoteIds.size;
      selectionPill.style.display = count > 0 ? 'flex' : 'none';
      selectedCountText.textContent = `${count} selected`;
      btnDeleteSelected.style.display = count > 0 ? 'flex' : 'none';
      deleteSelectedBadge.textContent = count;
    });

    // 6. Delete Note Button
    btnTrash.addEventListener('click', (e) => {
      e.stopPropagation();
      noteToDeleteId = note.id;
      isDeletingMultiple = false;
      deletePopupTitle.textContent = 'Delete Note?';
      deletePopupSubtitle.textContent = 'This action cannot be undone.';
      deletePopup.classList.add('open');
    });

    // 7. Open in Stack
    btnOpenInStack.addEventListener('click', (e) => {
      e.stopPropagation();
      activeNoteId = note.id;
      applyTheme(note.theme || 'crystal');
      toggleSpread(false);
    });

    // 8. POP-OUT FREE-DRAG INTERACTION
    headerEl.addEventListener('mousedown', (e) => {
      // Don't drag if user clicked input, button, or dropdown
      if (e.target.closest('input') || e.target.closest('button') || e.target.closest('.palette-dropdown')) {
        return;
      }

      e.preventDefault();
      highestSpreadZ++;
      cardEl.style.zIndex = highestSpreadZ;
      note.zIndex = highestSpreadZ;

      const canvasRect = spreadCardsGrid.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();

      let currentLeft = cardRect.left - canvasRect.left + spreadCardsGrid.scrollLeft;
      let currentTop = cardRect.top - canvasRect.top + spreadCardsGrid.scrollTop;

      // Pop out of normal flow immediately if not yet popped
      if (!cardEl.classList.contains('popped-out')) {
        cardEl.classList.add('popped-out');
        cardEl.style.left = `${currentLeft}px`;
        cardEl.style.top = `${currentTop}px`;
      }

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const originLeft = currentLeft;
      const originTop = currentTop;

      cardEl.classList.add('is-dragging');

      const onMouseMove = (moveEv) => {
        const dx = moveEv.clientX - startMouseX;
        const dy = moveEv.clientY - startMouseY;

        let newLeft = Math.max(10, originLeft + dx);
        let newTop = Math.max(10, originTop + dy);

        cardEl.style.left = `${newLeft}px`;
        cardEl.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        cardEl.classList.remove('is-dragging');
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        // Store final coordinates in note
        const finalLeft = parseFloat(cardEl.style.left) || 10;
        const finalTop = parseFloat(cardEl.style.top) || 10;
        note.spreadX = Math.round(finalLeft);
        note.spreadY = Math.round(finalTop);
        triggerSave();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    spreadCardsGrid.appendChild(cardEl);
  });
}

// Add Note inside spread view
function addNewNoteInSpread() {
  const newNote = {
    id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    title: 'New Note',
    content: '<div>Start typing your note here...</div>',
    theme: 'crystal',
    category: activeCategory === 'All Notes' ? 'General' : activeCategory,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  notes.unshift(newNote);
  activeNoteId = newNote.id;
  renderSpreadView();
  triggerSave();

  setTimeout(() => {
    const firstTitle = spreadCardsGrid.querySelector('.spread-usable-card .spread-card-title-input');
    if (firstTitle) {
      firstTitle.focus();
      firstTitle.select();
    }
  }, 100);
}

// Snap / Align cards to grid in spread view
if (btnSnapGrid) {
  btnSnapGrid.addEventListener('click', () => {
    const filtered = getFilteredNotes();
    filtered.forEach(note => {
      delete note.spreadX;
      delete note.spreadY;
      delete note.zIndex;
    });
    renderSpreadView();
    triggerSave();
  });
}

if (btnSpreadNewNote) {
  btnSpreadNewNote.addEventListener('click', () => {
    addNewNoteInSpread();
  });
}

// Event Listeners for Spread Mode Categories and Actions
btnAddCategory.addEventListener('click', () => {
  const existingInput = categoriesList.querySelector('.new-cat-inline-input');
  if (existingInput) {
    existingInput.focus();
    return;
  }
  const inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.className = 'new-cat-inline-input';
  inputEl.placeholder = 'Category name + Enter...';
  categoriesList.prepend(inputEl);
  inputEl.focus();

  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    const val = inputEl.value.trim();
    if (val && !categories.includes(val)) {
      categories.push(val);
      activeCategory = val;
    }
    renderSpreadView();
  };

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      committed = true;
      renderSpreadView();
    }
  });

  inputEl.addEventListener('blur', () => {
    commit();
  });
});

btnSelectAll.addEventListener('click', () => {
  const filtered = getFilteredNotes();
  if (selectedNoteIds.size === filtered.length) {
    selectedNoteIds.clear();
  } else {
    filtered.forEach(n => selectedNoteIds.add(n.id));
  }
  renderSpreadView();
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  renderSpreadView();
});

btnDeleteSelected.addEventListener('click', () => {
  if (selectedNoteIds.size === 0) return;
  isDeletingMultiple = true;
  deletePopupTitle.textContent = `Delete ${selectedNoteIds.size} Notes?`;
  deletePopupSubtitle.textContent = 'All selected notes will be permanently removed.';
  deletePopup.classList.add('open');
});

btnCloseSpread.addEventListener('click', () => {
  toggleSpread(false);
});

// 9. SCOPED DELETE POPUP CONFIRMATION
btnCancelDelete.addEventListener('click', () => {
  deletePopup.classList.remove('open');
  noteToDeleteId = null;
  isDeletingMultiple = false;
});

btnConfirmDelete.addEventListener('click', () => {
  if (isDeletingMultiple) {
    notes = notes.filter(n => !selectedNoteIds.has(n.id));
    selectedNoteIds.clear();
    if (notes.length === 0) {
      addNewNote();
    } else {
      activeNoteId = notes[0].id;
    }
    renderSpreadView();
    triggerSave();
  } else if (noteToDeleteId) {
    if (notes.length <= 1) {
      notes[0].title = 'New Note';
      notes[0].content = '';
    } else {
      notes = notes.filter(n => n.id !== noteToDeleteId);
      activeNoteId = notes.length > 0 ? notes[0].id : null;
      if (activeNoteId) {
        applyTheme(notes[0].theme || 'crystal');
      }
    }
    if (isSpreadMode) {
      renderSpreadView();
    } else {
      renderDeck();
    }
    triggerSave();
  }
  deletePopup.classList.remove('open');
  noteToDeleteId = null;
  isDeletingMultiple = false;
});

document.addEventListener('click', (e) => {
  if (deletePopup.classList.contains('open') && !deletePopup.contains(e.target) && !e.target.closest('.btn-trash') && !e.target.closest('#btnDeleteSelected')) {
    deletePopup.classList.remove('open');
    noteToDeleteId = null;
    isDeletingMultiple = false;
  }
});

// 10. DYNAMIC AETHERCSS CONTROL CENTER
function openControlCenter() {
  window.api.setWindowMode('settings');
  settingsHost.classList.add('open');

  settingsHost.innerHTML = `
    <div class="control-center-panel">
      <div class="cc-header">
        <div class="cc-title-wrap">
          <div class="cc-logo"></div>
          <div class="cc-title">AetherCSS Liquid Glass Control Center</div>
        </div>
        <button class="cc-close-btn" id="btnCloseSettings">Done</button>
      </div>

      <div class="cc-body">
        <div class="cc-sliders-col">
          <div class="slider-group">
            <div class="slider-label-row">
              <span>Backdrop Blur</span>
              <span class="slider-val" id="valBlur">${userSettings.blur}px</span>
            </div>
            <input type="range" class="cc-slider" id="slideBlur" min="0" max="40" value="${userSettings.blur}">
          </div>

          <div class="slider-group">
            <div class="slider-label-row">
              <span>Frosted Glass Opacity</span>
              <span class="slider-val" id="valOpacity">${userSettings.opacity}%</span>
            </div>
            <input type="range" class="cc-slider" id="slideOpacity" min="30" max="100" value="${userSettings.opacity}">
          </div>

          <div class="slider-group">
            <div class="slider-label-row">
              <span>Liquid Refraction Scale</span>
              <span class="slider-val" id="valRefraction">${userSettings.refraction}</span>
            </div>
            <input type="range" class="cc-slider" id="slideRefraction" min="0" max="80" value="${userSettings.refraction}">
          </div>

          <div class="slider-group">
            <div class="slider-label-row">
              <span>Inner Specular Rim</span>
              <span class="slider-val" id="valRim">${userSettings.innerRim}px</span>
            </div>
            <input type="range" class="cc-slider" id="slideRim" min="0" max="25" value="${userSettings.innerRim}">
          </div>

          <div class="slider-group">
            <div class="slider-label-row">
              <span>Card Corner Radius</span>
              <span class="slider-val" id="valRadius">${userSettings.radius}px</span>
            </div>
            <input type="range" class="cc-slider" id="slideRadius" min="14" max="38" value="${userSettings.radius}">
          </div>
        </div>

        <div class="cc-toggles-col">
          <div class="toggles-section-title">Customize Controls</div>

          <div class="cc-toggle-item">
            <span>Show Formatting Bar</span>
            <label class="cc-switch">
              <input type="checkbox" id="chkFormatBar" ${userSettings.showFormatBar ? 'checked' : ''}>
              <span class="switch-slider"></span>
            </label>
          </div>

          <div class="cc-toggle-item">
            <span>Show To-Do Checkbox</span>
            <label class="cc-switch">
              <input type="checkbox" id="chkTodo" ${userSettings.showTodo ? 'checked' : ''}>
              <span class="switch-slider"></span>
            </label>
          </div>

          <div class="cc-toggle-item">
            <span>Show Timestamp Clock</span>
            <label class="cc-switch">
              <input type="checkbox" id="chkTime" ${userSettings.showTime ? 'checked' : ''}>
              <span class="switch-slider"></span>
            </label>
          </div>

          <div class="cc-toggle-item">
            <span>Show Palette / Tint</span>
            <label class="cc-switch">
              <input type="checkbox" id="chkPalette" ${userSettings.showPalette ? 'checked' : ''}>
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach live slider event listeners
  const slideBlur = document.getElementById('slideBlur');
  const slideOpacity = document.getElementById('slideOpacity');
  const slideRefraction = document.getElementById('slideRefraction');
  const slideRim = document.getElementById('slideRim');
  const slideRadius = document.getElementById('slideRadius');

  slideBlur.addEventListener('input', () => {
    userSettings.blur = parseInt(slideBlur.value);
    document.getElementById('valBlur').textContent = `${userSettings.blur}px`;
    applyCssSettings();
  });

  slideOpacity.addEventListener('input', () => {
    userSettings.opacity = parseInt(slideOpacity.value);
    document.getElementById('valOpacity').textContent = `${userSettings.opacity}%`;
    applyCssSettings();
  });

  slideRefraction.addEventListener('input', () => {
    userSettings.refraction = parseInt(slideRefraction.value);
    document.getElementById('valRefraction').textContent = `${userSettings.refraction}`;
    applyCssSettings();
  });

  slideRim.addEventListener('input', () => {
    userSettings.innerRim = parseInt(slideRim.value);
    document.getElementById('valRim').textContent = `${userSettings.innerRim}px`;
    applyCssSettings();
  });

  slideRadius.addEventListener('input', () => {
    userSettings.radius = parseInt(slideRadius.value);
    document.getElementById('valRadius').textContent = `${userSettings.radius}px`;
    applyCssSettings();
  });

  // Toggles
  document.getElementById('chkFormatBar').addEventListener('change', (e) => {
    userSettings.showFormatBar = e.target.checked;
    renderDeck();
  });
  document.getElementById('chkTodo').addEventListener('change', (e) => {
    userSettings.showTodo = e.target.checked;
    renderDeck();
  });
  document.getElementById('chkTime').addEventListener('change', (e) => {
    userSettings.showTime = e.target.checked;
    renderDeck();
  });
  document.getElementById('chkPalette').addEventListener('change', (e) => {
    userSettings.showPalette = e.target.checked;
    renderDeck();
  });

  // Close Settings
  document.getElementById('btnCloseSettings').addEventListener('click', () => {
    localStorage.setItem('glass_user_settings', JSON.stringify(userSettings));
    settingsHost.classList.remove('open');
    settingsHost.innerHTML = ''; // Memory and CPU freed immediately
    window.api.setWindowMode(isSpreadMode ? 'spread' : 'stack');
    renderDeck();
  });
}

// 11. DEBOUNCED AUTO-SAVE TO JSON
function triggerSave() {
  const dot = document.querySelector('.save-dot-status');
  if (dot) dot.classList.add('saving');

  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (activeNote) {
      activeNote.updatedAt = new Date().toISOString();
    }
    await window.api.saveAllNotes(notes);
    if (dot) dot.classList.remove('saving');
  }, 300);
}

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    addNewNote();
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'g') {
    e.preventDefault();
    toggleSpread();
  }
});

// Start
initApp();
