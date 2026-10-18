/**
 * Task E - Application Controller (ES Module)
 * Orchestrates Web Speech API, NLP parsing, task CRUD, reordering,
 * Google Authentication, PWA Service Worker registration, and UI interactions.
 */

import { parseSpeech, formatDisplayTime, toLocalISOString } from './parser.js';
import {
  loadTasks,
  saveTasks,
  addTasks,
  updateTask,
  deleteTask,
  reorderTasks,
  clearCompleted,
  exportJSON,
  exportPlainText,
  formatAsPlainText,
  importTasksFromJSON,
  loadSettings,
  saveSettings
} from './storage.js';
import {
  initAuth,
  getCurrentUser,
  getGoogleClientId,
  setGoogleClientId,
  quickSignIn,
  signOut,
  renderGoogleButton
} from './auth.js';

// Application State
const state = {
  tasks: [],
  user: null,
  filterStatus: 'all', // 'all' | 'active' | 'completed'
  filterCategory: 'all',
  searchQuery: '',
  isListening: false,
  recognition: null,
  finalTranscript: '',
  interimTranscript: '',
  recentlyDeleted: null,
  undoTimer: null,
  deferredPrompt: null
};

// DOM Elements
const elements = {
  // Navigation & Theme
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIconSun: document.getElementById('themeIconSun'),
  themeIconMoon: document.getElementById('themeIconMoon'),
  unsupportedBanner: document.getElementById('unsupportedBanner'),

  // Google Authentication Elements
  authContainer: document.getElementById('authContainer'),
  authBtn: document.getElementById('authBtn'),
  authBtnText: document.getElementById('authBtnText'),
  userDropdown: document.getElementById('userDropdown'),
  userName: document.getElementById('userName'),
  userEmail: document.getElementById('userEmail'),
  configGoogleBtn: document.getElementById('configGoogleBtn'),
  signOutBtn: document.getElementById('signOutBtn'),
  authModal: document.getElementById('authModal'),
  closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
  closeAuthBtn: document.getElementById('closeAuthBtn'),
  quickSignInBtn: document.getElementById('quickSignInBtn'),
  customClientIdInput: document.getElementById('customClientIdInput'),
  saveClientIdBtn: document.getElementById('saveClientIdBtn'),
  gIdSigninContainer: document.getElementById('g_id_signin_container'),

  // Voice Interaction
  micWrapper: document.getElementById('micWrapper'),
  micBtn: document.getElementById('micBtn'),
  micIconIdle: document.getElementById('micIconIdle'),
  micIconStop: document.getElementById('micIconStop'),
  voiceStatus: document.getElementById('voiceStatus'),
  transcriptCard: document.getElementById('transcriptCard'),
  finalTranscript: document.getElementById('finalTranscript'),
  interimTranscript: document.getElementById('interimTranscript'),
  clearTranscriptBtn: document.getElementById('clearTranscriptBtn'),
  parseTranscriptBtn: document.getElementById('parseTranscriptBtn'),

  // Fallback Manual Input
  drawerToggleBtn: document.getElementById('drawerToggleBtn'),
  manualInputContainer: document.getElementById('manualInputContainer'),
  manualTextInput: document.getElementById('manualTextInput'),
  manualParseBtn: document.getElementById('manualParseBtn'),

  // Task List & Filters
  searchInput: document.getElementById('searchInput'),
  statusTabs: document.querySelectorAll('.tab-btn'),
  categoryFilter: document.getElementById('categoryFilter'),
  taskCountText: document.getElementById('taskCountText'),
  clearCompletedBtn: document.getElementById('clearCompletedBtn'),
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),

  // Modals & Toasts
  editModal: document.getElementById('editModal'),
  closeEditModalBtn: document.getElementById('closeEditModalBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  editTaskForm: document.getElementById('editTaskForm'),
  editTaskId: document.getElementById('editTaskId'),
  editTaskTitle: document.getElementById('editTaskTitle'),
  editTaskCategory: document.getElementById('editTaskCategory'),
  editTaskPriority: document.getElementById('editTaskPriority'),
  editTaskDue: document.getElementById('editTaskDue'),

  exportModal: document.getElementById('exportModal'),
  exportModalBtn: document.getElementById('exportModalBtn'),
  closeExportModalBtn: document.getElementById('closeExportModalBtn'),
  closeExportBtn: document.getElementById('closeExportBtn'),
  copyTextBtn: document.getElementById('copyTextBtn'),
  downloadTextBtn: document.getElementById('downloadTextBtn'),
  downloadJsonBtn: document.getElementById('downloadJsonBtn'),
  importFileInput: document.getElementById('importFileInput'),
  toastContainer: document.getElementById('toastContainer')
};

/* ==========================================================================
   Initialization
   ========================================================================== */
function init() {
  initTheme();
  initState();
  initAuthentication();
  initSpeechRecognition();
  initEventListeners();
  initServiceWorker();
  renderTasks();
}

function initState() {
  state.tasks = loadTasks();
}

/* ==========================================================================
   Google Authentication
   ========================================================================== */
function initAuthentication() {
  initAuth((user) => {
    state.user = user;
    updateAuthUI(user);
  });
}

function updateAuthUI(user) {
  if (!elements.authBtn) return;

  if (user) {
    // Authenticated state
    const firstName = user.name ? user.name.split(' ')[0] : 'User';
    elements.authBtnText.textContent = firstName;

    // Display avatar or initials
    let avatarEl = elements.authBtn.querySelector('.user-avatar-img, .user-avatar-placeholder');
    const googleIcon = elements.authBtn.querySelector('.google-icon');
    if (googleIcon) googleIcon.style.display = 'none';

    if (user.picture) {
      if (!avatarEl || avatarEl.tagName !== 'IMG') {
        if (avatarEl) avatarEl.remove();
        avatarEl = document.createElement('img');
        avatarEl.className = 'user-avatar-img';
        elements.authBtn.prepend(avatarEl);
      }
      avatarEl.src = user.picture;
      avatarEl.alt = user.name || 'User';
    } else {
      if (!avatarEl || avatarEl.tagName === 'IMG') {
        if (avatarEl) avatarEl.remove();
        avatarEl = document.createElement('span');
        avatarEl.className = 'user-avatar-placeholder';
        elements.authBtn.prepend(avatarEl);
      }
      avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
    }

    if (elements.userName) elements.userName.textContent = user.name || 'User';
    if (elements.userEmail) elements.userEmail.textContent = user.email || '';
  } else {
    // Signed out state
    elements.authBtnText.textContent = 'Sign In';
    const avatarEl = elements.authBtn.querySelector('.user-avatar-img, .user-avatar-placeholder');
    if (avatarEl) avatarEl.remove();

    const googleIcon = elements.authBtn.querySelector('.google-icon');
    if (googleIcon) googleIcon.style.display = 'inline-block';

    if (elements.userDropdown) elements.userDropdown.style.display = 'none';
  }
}

function openAuthModal() {
  if (elements.customClientIdInput) {
    elements.customClientIdInput.value = getGoogleClientId();
  }
  elements.authModal.classList.add('open');

  if (elements.gIdSigninContainer) {
    renderGoogleButton(elements.gIdSigninContainer);
  }
}

function closeAuthModal() {
  elements.authModal.classList.remove('open');
}

/* ==========================================================================
   Theme Management
   ========================================================================== */
function initTheme() {
  const settings = loadSettings();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = settings.theme || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    elements.themeIconSun.style.display = 'inline-block';
    elements.themeIconMoon.style.display = 'none';
  } else {
    elements.themeIconSun.style.display = 'none';
    elements.themeIconMoon.style.display = 'inline-block';
  }
  const settings = loadSettings();
  settings.theme = theme;
  saveSettings(settings);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ==========================================================================
   Web Speech API (SpeechRecognition) Engine
   ========================================================================== */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('SpeechRecognition API not available in this browser.');
    elements.unsupportedBanner.style.display = 'flex';
    elements.manualInputContainer.style.display = 'flex';
    elements.voiceStatus.textContent = 'Voice recognition unavailable';
    elements.micBtn.style.opacity = '0.5';
    elements.micBtn.title = 'Speech not supported in this browser';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || 'en-US';

  recognition.onstart = () => {
    state.isListening = true;
    updateMicUI(true);
    elements.voiceStatus.textContent = 'Listening... Tap to stop & parse';
    elements.transcriptCard.classList.add('visible');
  };

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript + ' ';
      } else {
        interim += transcript;
      }
    }

    if (final) {
      state.finalTranscript += final;
      elements.finalTranscript.textContent = state.finalTranscript;
    }
    state.interimTranscript = interim;
    elements.interimTranscript.textContent = interim;
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      showToast('Microphone permission denied.', 'error');
      elements.voiceStatus.textContent = 'Microphone permission blocked';
    } else if (event.error !== 'no-speech') {
      showToast(`Speech error: ${event.error}`, 'error');
    }
    stopListening();
  };

  recognition.onend = () => {
    if (state.isListening) {
      // Automatic stop: parse whatever was transcribed
      finishRecordingAndParse();
    }
  };

  state.recognition = recognition;
}

function toggleRecording() {
  if (!state.recognition) {
    elements.manualInputContainer.style.display = 'flex';
    elements.manualTextInput.focus();
    showToast('Please type your task in the input box below.', 'info');
    return;
  }

  if (state.isListening) {
    stopListening();
    finishRecordingAndParse();
  } else {
    startListening();
  }
}

function startListening() {
  state.finalTranscript = '';
  state.interimTranscript = '';
  elements.finalTranscript.textContent = '';
  elements.interimTranscript.textContent = '';

  try {
    state.recognition.start();
  } catch (err) {
    console.warn('Recognition start error:', err);
  }
}

function stopListening() {
  state.isListening = false;
  updateMicUI(false);
  elements.voiceStatus.textContent = 'Tap mic to speak';
  if (state.recognition) {
    try {
      state.recognition.stop();
    } catch (e) {
      // Ignored
    }
  }
}

function updateMicUI(isListening) {
  if (isListening) {
    elements.micWrapper.classList.add('listening');
    elements.micIconIdle.style.display = 'none';
    elements.micIconStop.style.display = 'block';
  } else {
    elements.micWrapper.classList.remove('listening');
    elements.micIconIdle.style.display = 'block';
    elements.micIconStop.style.display = 'none';
  }
}

function finishRecordingAndParse() {
  const fullText = (state.finalTranscript + ' ' + state.interimTranscript).trim();
  if (fullText) {
    processTranscript(fullText);
  }
  // Reset transcript display
  state.finalTranscript = '';
  state.interimTranscript = '';
  elements.finalTranscript.textContent = '';
  elements.interimTranscript.textContent = '';
  elements.transcriptCard.classList.remove('visible');
}

/* ==========================================================================
   Natural Language Processing Pipeline
   ========================================================================== */
function processTranscript(text) {
  const parsed = parseSpeech(text);

  if (parsed.length === 0) {
    showToast('No actionable tasks detected. Try again!', 'warning');
    return;
  }

  const userId = state.user ? state.user.id : null;
  state.tasks = addTasks(parsed, userId);
  renderTasks();
  showToast(`Parsed and added ${parsed.length} new task${parsed.length > 1 ? 's' : ''}! 🎉`, 'success');
}

/* ==========================================================================
   Task Rendering & UI Interactions
   ========================================================================== */
function renderTasks() {
  const filtered = getFilteredTasks();

  elements.taskList.innerHTML = '';

  // Update Counters & Controls
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;

  elements.taskCountText.textContent = `${total} task${total === 1 ? '' : 's'} (${completed} done)`;
  elements.clearCompletedBtn.style.display = completed > 0 ? 'inline-block' : 'none';

  if (filtered.length === 0) {
    elements.emptyState.style.display = 'flex';
    return;
  }
  elements.emptyState.style.display = 'none';

  filtered.forEach((task, index) => {
    const card = createTaskCard(task, index);
    elements.taskList.appendChild(card);
  });
}

function getFilteredTasks() {
  let result = [...state.tasks];

  // Status Filter
  if (state.filterStatus === 'active') {
    result = result.filter(t => !t.completed);
  } else if (state.filterStatus === 'completed') {
    result = result.filter(t => t.completed);
  }

  // Category Filter
  if (state.filterCategory !== 'all') {
    result = result.filter(t => t.category === state.filterCategory);
  }

  // Search Filter
  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase();
    result = result.filter(t =>
      t.title.toLowerCase().includes(query) ||
      (t.category && t.category.toLowerCase().includes(query)) ||
      (t.dueDate && t.dueDate.toLowerCase().includes(query))
    );
  }

  return result;
}

function createTaskCard(task, index) {
  const card = document.createElement('div');
  card.className = `task-card ${task.completed ? 'completed' : ''}`;
  card.setAttribute('draggable', 'true');
  card.dataset.id = task.id;
  card.dataset.index = index;

  // Due Date Badge
  let dueBadge = '';
  if (task.dueDate) {
    const isToday = task.dueDate.toLowerCase().includes('today') || task.dueDate.toLowerCase().includes('tonight');
    dueBadge = `
      <span class="badge badge-due ${isToday ? 'today' : ''}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        ${escapeHTML(task.dueDate)}
      </span>
    `;
  }

  // Priority Badge
  let priorityBadge = '';
  if (task.priority === 'high') {
    priorityBadge = `
      <span class="badge badge-priority-high">
        🔥 Urgent
      </span>
    `;
  } else if (task.priority === 'low') {
    priorityBadge = `
      <span class="badge badge-priority-low">
        Low
      </span>
    `;
  }

  // Tag Badge
  const tagClass = `badge-tag-${task.category || 'general'}`;
  const tagBadge = `
    <span class="badge ${tagClass}">
      🏷️ ${escapeHTML(task.category || 'general')}
    </span>
  `;

  card.innerHTML = `
    <!-- Checkbox -->
    <label class="task-check-wrapper" title="${task.completed ? 'Mark pending' : 'Mark completed'}">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
    </label>

    <!-- Task Body -->
    <div class="task-body">
      <span class="task-title" title="Click to edit">${escapeHTML(task.title)}</span>
      <div class="task-badges">
        ${dueBadge}
        ${priorityBadge}
        ${tagBadge}
      </div>
    </div>

    <!-- Actions & Mobile Reordering -->
    <div class="task-actions">
      <div class="reorder-controls">
        <button class="reorder-btn move-up-btn" title="Move up" aria-label="Move task up">▲</button>
        <button class="reorder-btn move-down-btn" title="Move down" aria-label="Move task down">▼</button>
      </div>
      <button class="card-btn edit-btn" title="Edit task" aria-label="Edit task">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      </button>
      <button class="card-btn delete-btn" title="Delete task" aria-label="Delete task">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  // Attach Card Events
  const checkbox = card.querySelector('.task-checkbox');
  checkbox.addEventListener('change', () => toggleTaskCompletion(task.id, checkbox.checked));

  const titleEl = card.querySelector('.task-title');
  titleEl.addEventListener('click', () => openEditModal(task));

  const editBtn = card.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => openEditModal(task));

  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => removeTaskWithUndo(task.id));

  // Mobile Reordering
  const moveUpBtn = card.querySelector('.move-up-btn');
  moveUpBtn.addEventListener('click', () => shiftTask(task.id, -1));

  const moveDownBtn = card.querySelector('.move-down-btn');
  moveDownBtn.addEventListener('click', () => shiftTask(task.id, 1));

  // Desktop Drag & Drop
  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragover', handleDragOver);
  card.addEventListener('drop', handleDrop);
  card.addEventListener('dragend', handleDragEnd);

  return card;
}

/* ==========================================================================
   Task Operations (CRUD & Reordering)
   ========================================================================== */
function toggleTaskCompletion(id, isCompleted) {
  state.tasks = updateTask(id, { completed: isCompleted });
  renderTasks();
}

function removeTaskWithUndo(id) {
  const { updated, deleted } = deleteTask(id);
  state.tasks = updated;
  state.recentlyDeleted = deleted;
  renderTasks();

  if (state.undoTimer) clearTimeout(state.undoTimer);

  showToast(`Deleted "${deleted ? deleted.title : 'task'}".`, 'info', {
    actionText: 'Undo',
    actionCallback: () => {
      if (state.recentlyDeleted) {
        state.tasks = addTasks(state.recentlyDeleted);
        state.recentlyDeleted = null;
        renderTasks();
        showToast('Task restored!', 'success');
      }
    }
  });

  state.undoTimer = setTimeout(() => {
    state.recentlyDeleted = null;
  }, 5000);
}

function shiftTask(id, direction) {
  const index = state.tasks.findIndex(t => t.id === id);
  if (index === -1) return;
  const targetIndex = index + direction;
  if (targetIndex >= 0 && targetIndex < state.tasks.length) {
    state.tasks = reorderTasks(index, targetIndex);
    renderTasks();
  }
}

/* ==========================================================================
   Drag & Drop Handlers
   ========================================================================== */
let draggedId = null;

function handleDragStart(e) {
  draggedId = this.dataset.id;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
  e.preventDefault();
  const targetCard = e.target.closest('.task-card');
  if (!targetCard || !draggedId) return;

  const targetId = targetCard.dataset.id;
  if (targetId === draggedId) return;

  const sourceIndex = state.tasks.findIndex(t => t.id === draggedId);
  const targetIndex = state.tasks.findIndex(t => t.id === targetId);

  if (sourceIndex !== -1 && targetIndex !== -1) {
    state.tasks = reorderTasks(sourceIndex, targetIndex);
    renderTasks();
  }
}

function handleDragEnd() {
  this.classList.remove('dragging');
  draggedId = null;
}

/* ==========================================================================
   Edit Task Modal
   ========================================================================== */
function openEditModal(task) {
  elements.editTaskId.value = task.id;
  elements.editTaskTitle.value = task.title;
  elements.editTaskCategory.value = task.category || 'general';
  elements.editTaskPriority.value = task.priority || 'medium';
  elements.editTaskDue.value = task.dueISO || '';

  elements.editModal.classList.add('open');
  elements.editTaskTitle.focus();
}

function closeEditModal() {
  elements.editModal.classList.remove('open');
  elements.editTaskForm.reset();
}

function handleEditFormSubmit(e) {
  e.preventDefault();
  const id = elements.editTaskId.value;
  const title = elements.editTaskTitle.value.trim();
  const category = elements.editTaskCategory.value;
  const priority = elements.editTaskPriority.value;
  const dueISO = elements.editTaskDue.value;

  let dueDate = null;
  if (dueISO) {
    const d = new Date(dueISO);
    dueDate = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${formatDisplayTime(d)}`;
  }

  state.tasks = updateTask(id, {
    title,
    category,
    priority,
    dueISO: dueISO || null,
    dueDate
  });

  closeEditModal();
  renderTasks();
  showToast('Task updated!', 'success');
}

/* ==========================================================================
   Export & Import Operations
   ========================================================================== */
function openExportModal() {
  elements.exportModal.classList.add('open');
}

function closeExportModal() {
  elements.exportModal.classList.remove('open');
}

async function copyTasksToClipboard() {
  const text = formatAsPlainText(state.tasks);
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied tasks to clipboard!', 'success');
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    showToast('Failed to copy. Try downloading as file instead.', 'error');
  }
}

function handleJSONImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      state.tasks = importTasksFromJSON(content, 'merge');
      renderTasks();
      closeExportModal();
      showToast('Successfully imported tasks!', 'success');
    } catch (err) {
      showToast('Error parsing JSON backup file.', 'error');
    }
  };
  reader.readAsText(file);
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(message, type = 'info', options = {}) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  toast.appendChild(messageSpan);

  if (options.actionText && options.actionCallback) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'toast-btn';
    actionBtn.textContent = options.actionText;
    actionBtn.addEventListener('click', () => {
      options.actionCallback();
      toast.remove();
    });
    toast.appendChild(actionBtn);
  }

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

/* ==========================================================================
   Service Worker & Offline Status
   ========================================================================== */
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('Task E Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('Task E Service Worker registration failed:', err);
        });
    });
  }

  // Network Online / Offline Detection
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // PWA Install Prompt Listener
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
  });
}

function updateNetworkStatus() {
  const isOnline = navigator.onLine;
  if (isOnline) {
    elements.statusDot.classList.remove('offline');
    elements.statusText.textContent = 'Online';
  } else {
    elements.statusDot.classList.add('offline');
    elements.statusText.textContent = 'Offline';
    showToast('Offline mode active. Your tasks are safely saved locally!', 'warning');
  }
}

/* ==========================================================================
   Event Listeners Wire-up
   ========================================================================== */
function initEventListeners() {
  // Theme Toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Google Authentication Events
  if (elements.authBtn) {
    elements.authBtn.addEventListener('click', () => {
      if (state.user) {
        // Toggle user dropdown
        const isHidden = elements.userDropdown.style.display === 'none';
        elements.userDropdown.style.display = isHidden ? 'flex' : 'none';
      } else {
        openAuthModal();
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (elements.authContainer && !elements.authContainer.contains(e.target)) {
      if (elements.userDropdown) elements.userDropdown.style.display = 'none';
    }
  });

  if (elements.configGoogleBtn) {
    elements.configGoogleBtn.addEventListener('click', () => {
      if (elements.userDropdown) elements.userDropdown.style.display = 'none';
      openAuthModal();
    });
  }

  if (elements.signOutBtn) {
    elements.signOutBtn.addEventListener('click', () => {
      signOut();
      showToast('Signed out successfully.', 'info');
    });
  }

  if (elements.closeAuthModalBtn) {
    elements.closeAuthModalBtn.addEventListener('click', closeAuthModal);
  }

  if (elements.closeAuthBtn) {
    elements.closeAuthBtn.addEventListener('click', closeAuthModal);
  }

  if (elements.quickSignInBtn) {
    elements.quickSignInBtn.addEventListener('click', () => {
      quickSignIn('Demo User', 'demo.user@gmail.com');
      closeAuthModal();
      showToast('Signed in with Google Demo Account! 🎉', 'success');
    });
  }

  if (elements.saveClientIdBtn && elements.customClientIdInput) {
    elements.saveClientIdBtn.addEventListener('click', () => {
      const val = elements.customClientIdInput.value.trim();
      setGoogleClientId(val);
      showToast(val ? 'Custom Google Client ID saved!' : 'Custom Client ID cleared.', 'success');
      closeAuthModal();
    });
  }

  // Big Mic Button
  elements.micBtn.addEventListener('click', toggleRecording);

  // Live Transcript Card buttons
  elements.clearTranscriptBtn.addEventListener('click', () => {
    state.finalTranscript = '';
    state.interimTranscript = '';
    elements.finalTranscript.textContent = '';
    elements.interimTranscript.textContent = '';
    elements.transcriptCard.classList.remove('visible');
  });

  elements.parseTranscriptBtn.addEventListener('click', () => {
    stopListening();
    finishRecordingAndParse();
  });

  // Manual Text Drawer Toggle
  elements.drawerToggleBtn.addEventListener('click', () => {
    const isHidden = elements.manualInputContainer.style.display === 'none';
    elements.manualInputContainer.style.display = isHidden ? 'flex' : 'none';
  });

  // Manual Text Parse Button
  elements.manualParseBtn.addEventListener('click', () => {
    const text = elements.manualTextInput.value.trim();
    if (text) {
      processTranscript(text);
      elements.manualTextInput.value = '';
    } else {
      showToast('Please type something first!', 'warning');
    }
  });

  // Manual Text Enter Shortcut (Cmd/Ctrl + Enter)
  elements.manualTextInput.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      elements.manualParseBtn.click();
    }
  });

  // Example Prompt Chips
  document.querySelectorAll('.example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.dataset.text;
      if (text) {
        processTranscript(text);
      }
    });
  });

  // Search Input
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTasks();
  });

  // Status Filter Tabs
  elements.statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.statusTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.filterStatus = tab.dataset.filter;
      renderTasks();
    });
  });

  // Category Filter Select
  elements.categoryFilter.addEventListener('change', (e) => {
    state.filterCategory = e.target.value;
    renderTasks();
  });

  // Clear Completed Tasks
  elements.clearCompletedBtn.addEventListener('click', () => {
    state.tasks = clearCompleted();
    renderTasks();
    showToast('Cleared completed tasks!', 'info');
  });

  // Edit Modal Handlers
  elements.closeEditModalBtn.addEventListener('click', closeEditModal);
  elements.cancelEditBtn.addEventListener('click', closeEditModal);
  elements.editTaskForm.addEventListener('submit', handleEditFormSubmit);

  // Export Modal Handlers
  elements.exportModalBtn.addEventListener('click', openExportModal);
  elements.closeExportModalBtn.addEventListener('click', closeExportModal);
  elements.closeExportBtn.addEventListener('click', closeExportModal);
  elements.copyTextBtn.addEventListener('click', copyTasksToClipboard);
  elements.downloadTextBtn.addEventListener('click', () => exportPlainText(state.tasks));
  elements.downloadJsonBtn.addEventListener('click', () => exportJSON(state.tasks));
  elements.importFileInput.addEventListener('change', handleJSONImport);
}

// Utility: HTML Sanitizer
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Boot application
document.addEventListener('DOMContentLoaded', init);
