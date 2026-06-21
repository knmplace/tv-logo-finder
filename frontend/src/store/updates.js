import { create } from 'zustand';
import api from '../api';

const useUpdateStore = create((set, get) => ({
  updateInfo: null,
  loading: false,
  dismissed: false,
  lastChecked: null,

  checkForUpdates: async (force = false) => {
    const { lastChecked, loading } = get();
    if (loading) return;

    const now = Date.now();
    if (!force && lastChecked && now - lastChecked < 86400000) return;

    set({ loading: true });
    try {
      const includeBeta = localStorage.getItem('notify_beta') !== 'false';
      const data = await api.get(`/api/updates/check?include_beta=${includeBeta}`);
      set({ updateInfo: data, lastChecked: now, loading: false, dismissed: false });
    } catch {
      set({ loading: false });
    }
  },

  dismiss: () => set({ dismissed: true }),

  setNotifyBeta: (val) => {
    localStorage.setItem('notify_beta', val ? 'true' : 'false');
  },

  getNotifyBeta: () => localStorage.getItem('notify_beta') !== 'false',
}));

export default useUpdateStore;
