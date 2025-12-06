import { RedPacketConfig, PacketRecord, User } from '../types';

export const api = {
  createPacket: async (config: RedPacketConfig, creatorId: string) => {
    const res = await fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, creatorId }),
    });
    if (!res.ok) throw new Error('Failed to create packet');
    return res.json();
  },

  getPacket: async (id: string) => {
    const res = await fetch(`/api/packet/${id}`);
    if (!res.ok) throw new Error('Failed to fetch packet');
    return res.json();
  },

  grabPacket: async (id: string, user: User) => {
    const res = await fetch(`/api/packet/${id}/grab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user.id, 
        userName: user.name, 
        avatarUrl: user.avatarUrl 
      }),
    });
    if (!res.ok) throw new Error('Failed to grab packet');
    return res.json();
  }
};