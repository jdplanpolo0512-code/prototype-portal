const Storage = {
  _key: 'prototype-portal-data',
  _filesKey: 'prototype-portal-files',

  _defaultData() {
    return { projects: [], prototypes: [], tags: [] };
  },

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      const data = raw ? JSON.parse(raw) : this._defaultData();
      if (!Array.isArray(data.projects)) data.projects = [];
      if (!Array.isArray(data.prototypes)) data.prototypes = [];
      if (!Array.isArray(data.tags)) data.tags = [];
      return data;
    } catch {
      return this._defaultData();
    }
  },

  save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  saveFile(id, htmlContent) {
    if (!this.isValidId(id)) return;
    const files = this._loadFiles();
    files[id] = htmlContent;
    localStorage.setItem(this._filesKey, JSON.stringify(files));
  },

  getFile(id) {
    if (!this.isValidId(id)) return null;
    const files = this._loadFiles();
    return files[id] || null;
  },

  deleteFile(id) {
    if (!this.isValidId(id)) return;
    const files = this._loadFiles();
    delete files[id];
    localStorage.setItem(this._filesKey, JSON.stringify(files));
  },

  _loadFiles() {
    try {
      const raw = localStorage.getItem(this._filesKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  },

  isValidId(id) {
    return typeof id === 'string' && /^[a-z0-9]+$/.test(id);
  }
};

// Shared utilities
function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function escapeAttr(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const ALLOWED_TAG_COLORS = [
  '#2563eb', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#0891b2', '#4b5563'
];

function sanitizeColor(color) {
  return ALLOWED_TAG_COLORS.includes(color) ? color : ALLOWED_TAG_COLORS[0];
}

function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {}
  return '';
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
