import { create } from 'zustand';
import api from '../api';

const useChannelStore = create((set, get) => ({
  channels: [],
  loading: false,
  syncing: false,
  lastSynced: null,
  error: null,
  pageSize: 25,
  page: 0,

  setPageSize: (pageSize) => set({ pageSize }),
  setPage: (page) => set({ page }),

  fetchChannels: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/api/channels');
      const channelList = Array.isArray(data) ? data : data.channels || [];
      const synced = channelList.length > 0 ? channelList[0].synced_at : null;
      set({
        channels: channelList.map((ch) => ({
          id: ch.id,
          name: ch.name,
          channel_number: ch.number,
          group: ch.group_name,
          logo_url: ch.current_logo_url,
          cache_logo_url: ch.cache_logo_url,
          logo_id: ch.logo_id,
        })),
        lastSynced: synced,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  syncChannels: async () => {
    set({ syncing: true, error: null });
    try {
      await api.post('/api/channels/sync');
      await get().fetchChannels();
      set({ syncing: false });
      return true;
    } catch (err) {
      set({ syncing: false, error: err.message });
      return false;
    }
  },

  updateChannelLogo: (channelId, logoUrl, logoName) => {
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId
          ? { ...ch, logo_url: logoUrl, logo_name: logoName }
          : ch
      ),
    }));
  },
}));

export default useChannelStore;
