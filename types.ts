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

export interface PacketData {
  id: string;
  creatorId: string;
  config: RedPacketConfig;
  records: PacketRecord[];
  isFinished: boolean;
  sharesLeft: number;
}

export enum GameStage {
  CREATE = 'CREATE',
  CLOSED = 'CLOSED', // The "Cover" (ready to open)
  OPENING = 'OPENING', // Animation state
  RESULT = 'RESULT', // Leaderboard
}

export interface AIAnalysis {
  message: string;
  luckLevel: string;
}