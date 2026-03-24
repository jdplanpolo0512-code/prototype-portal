const Storage = {
  _key: 'prototype-portal-data',

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

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }
};
