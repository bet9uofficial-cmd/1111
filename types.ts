export interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface PacketRecord {
  userId: string;
  userName: string;
  avatarUrl: string;
  amount: number;
  isBestLuck: boolean;
  timestamp: number;
}

export interface RedPacketConfig {
  totalAmount: number;
  totalShares: number;
  wishing: string;
}

export enum GameStage {
  LOADING = 'LOADING',
  CREATE = 'CREATE',
  CLOSED = 'CLOSED',
  OPENING = 'OPENING',
  RESULT = 'RESULT',
}

export interface AIAnalysis {
  message: string;
  luckLevel: string;
}