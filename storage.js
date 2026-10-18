/**
 * Task E - Storage & Data Export Module (ES Module)
 * Handles persistence in localStorage with safe fallbacks, schema normalization,
 * JSON/Text exports, and file imports.
 */

const STORAGE_KEY = 'task_e_items_v2';
const LEGACY_STORAGE_KEY = 'voice_to_task_items_v1';
const SETTINGS_KEY = 'task_e_settings_v2';

/**
 * Loads tasks from localStorage with backward compatibility migration.
 * @returns {Array<Object>}
 */
export function loadTasks() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // Backward compatibility: migrate from legacy key if present
    if (!raw) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        localStorage.setItem(STORAGE_KEY, legacyRaw);
        raw = legacyRaw;
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load tasks from localStorage:', err);
    return [];
  }
}

/**
 * Persists tasks array to localStorage.
 * @param {Array<Object>} tasks
 * @returns {boolean}
 */
export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (err) {
    console.error('Failed to save tasks to localStorage:', err);
    return false;
  }
}

/**
 * Adds new task(s) to the front of the list.
 * @param {Object|Array<Object>} newItems
 * @param {string|null} [userId=null]
 * @returns {Array<Object>} updated task list
 */
export function addTasks(newItems, userId = null) {
  const current = loadTasks();
  const rawList = Array.isArray(newItems) ? newItems : [newItems];
  const itemsToAdd = rawList.map(item => ({
    ...item,
    userId: item.userId || userId || null
  }));

  const updated = [...itemsToAdd, ...current];
  saveTasks(updated);
  return updated;
}

/**
 * Updates a task by ID with partial fields.
 * @param {string} id
 * @param {Object} patch
 * @returns {Array<Object>}
 */
export function updateTask(id, patch) {
  const current = loadTasks();
  const updated = current.map(task => {
    if (task.id === id) {
      return { ...task, ...patch, updatedAt: new Date().toISOString() };
    }
    return task;
  });
  saveTasks(updated);
  return updated;
}

/**
 * Deletes a task by ID.
 * @param {string} id
 * @returns {{ updated: Array<Object>, deleted: Object|null }}
 */
export function deleteTask(id) {
  const current = loadTasks();
  const deleted = current.find(t => t.id === id) || null;
  const updated = current.filter(t => t.id !== id);
  saveTasks(updated);
  return { updated, deleted };
}

/**
 * Reorders tasks moving item from sourceIndex to targetIndex.
 * @param {number} sourceIndex
 * @param {number} targetIndex
 * @returns {Array<Object>}
 */
export function reorderTasks(sourceIndex, targetIndex) {
  const current = loadTasks();
  if (
    sourceIndex < 0 || sourceIndex >= current.length ||
    targetIndex < 0 || targetIndex >= current.length ||
    sourceIndex === targetIndex
  ) {
    return current;
  }

  const [moved] = current.splice(sourceIndex, 1);
  current.splice(targetIndex, 0, moved);
  saveTasks(current);
  return current;
}

/**
 * Clears all completed tasks.
 * @returns {Array<Object>}
 */
export function clearCompleted() {
  const current = loadTasks();
  const remaining = current.filter(t => !t.completed);
  saveTasks(remaining);
  return remaining;
}

/**
 * Generates and downloads a JSON export file.
 * @param {Array<Object>} [tasks]
 */
export function exportJSON(tasks = loadTasks()) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
  const filename = `task-e-${new Date().toISOString().slice(0, 10)}.json`;
  triggerDownload(dataStr, filename);
}

/**
 * Formats tasks into plain text bullet list.
 * @param {Array<Object>} [tasks]
 * @returns {string}
 */
export function formatAsPlainText(tasks = loadTasks()) {
  if (tasks.length === 0) return 'No tasks yet.';

  const lines = tasks.map(t => {
    const check = t.completed ? '[x]' : '[ ]';
    const parts = [t.title];
    if (t.dueDate) parts.push(`due: ${t.dueDate}`);
    if (t.priority && t.priority !== 'medium') parts.push(`priority: ${t.priority}`);
    if (t.category && t.category !== 'general') parts.push(`tag: ${t.category}`);
    return `${check} ${parts.join(' | ')}`;
  });

  return `# Task E Export (${new Date().toLocaleDateString()})\n\n${lines.join('\n')}\n`;
}

/**
 * Downloads tasks as a .txt file.
 * @param {Array<Object>} [tasks]
 */
export function exportPlainText(tasks = loadTasks()) {
  const text = formatAsPlainText(tasks);
  const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
  const filename = `task-e-${new Date().toISOString().slice(0, 10)}.txt`;
  triggerDownload(dataStr, filename);
}

/**
 * Imports tasks from a JSON string.
 * @param {string} jsonString
 * @param {'merge'|'replace'} [mode='merge']
 * @returns {Array<Object>}
 */
export function importTasksFromJSON(jsonString, mode = 'merge') {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) throw new Error('Invalid backup file: expected a JSON array.');

  const validated = parsed.map((item, idx) => ({
    id: item.id || `task_import_${Date.now()}_${idx}`,
    title: String(item.title || 'Untitled task'),
    completed: Boolean(item.completed),
    priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
    category: item.category || 'general',
    dueDate: item.dueDate || null,
    dueISO: item.dueISO || null,
    createdAt: item.createdAt || new Date().toISOString(),
    userId: item.userId || null
  }));

  let finalTasks;
  if (mode === 'replace') {
    finalTasks = validated;
  } else {
    const existing = loadTasks();
    const existingIds = new Set(existing.map(t => t.id));
    const newItems = validated.filter(t => !existingIds.has(t.id));
    finalTasks = [...newItems, ...existing];
  }

  saveTasks(finalTasks);
  return finalTasks;
}

/**
 * Loads user settings.
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { theme: 'auto', speechLang: 'en-US' };
  } catch {
    return { theme: 'auto', speechLang: 'en-US' };
  }
}

/**
 * Saves user settings.
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

function triggerDownload(dataUri, filename) {
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataUri);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
