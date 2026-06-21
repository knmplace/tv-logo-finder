import { create } from 'zustand';
import api from '../api';

const useSettingsStore = create((set) => ({
  settings: {},
  loading: false,
  connectionStatus: null,
  testing: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/api/settings');
      set({ settings: data, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  saveSettings: async (data) => {
    set({ error: null });
    try {
      const result = await api.put('/api/settings', data);
      set({ settings: result });
      return true;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  testConnection: async () => {
    set({ testing: true, connectionStatus: null });
    try {
      const result = await api.post('/api/settings/test-connection');
      set({ connectionStatus: result, testing: false });
      return result;
    } catch (err) {
      set({
        connectionStatus: { success: false, message: err.message },
        testing: false,
      });
      return { success: false, message: err.message };
    }
  },

  clearConnectionStatus: () => set({ connectionStatus: null }),
}));

export default useSettingsStore;
