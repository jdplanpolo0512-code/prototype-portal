const Storage = {
  _key: 'prototype-portal-data',
  _filesKey: 'prototype-portal-files',

  _defaultData: { projects: [], prototypes: [] },

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      return raw ? JSON.parse(raw) : { ...this._defaultData };
    } catch {
      return { ...this._defaultData };
    }
  },

  save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  saveFile(id, htmlContent) {
    const files = this._loadFiles();
    files[id] = htmlContent;
    localStorage.setItem(this._filesKey, JSON.stringify(files));
  },

  getFile(id) {
    const files = this._loadFiles();
    return files[id] || null;
  },

  deleteFile(id) {
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
  }
};
