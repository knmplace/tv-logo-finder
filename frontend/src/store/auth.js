import { create } from 'zustand';
import api from '../api';

const TOKEN_KEY = 'tv-logo-finder-token';

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: null,
  setupRequired: false,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  loading: true,
  error: null,

  checkStatus: async () => {
    try {
      const data = await api.get('/api/auth/status');
      set({
        setupRequired: data.setup_required,
        isAuthenticated: data.authenticated,
        user: data.user || null,
        loading: false,
      });
    } catch {
      set({ loading: false, isAuthenticated: false });
    }
  },

  login: async (username, password) => {
    set({ error: null });
    try {
      const data = await api.post('/api/auth/login', { username, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        error: null,
      });
      return true;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  setup: async (username, password) => {
    set({ error: null });
    try {
      await api.post('/api/auth/setup', { username, password });
      set({ setupRequired: false });
      return true;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
