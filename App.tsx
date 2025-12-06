import React, { useState, useEffect } from 'react';
import { GameStage, RedPacketConfig, PacketRecord, User } from './types';
import { generateRedPacketResults } from './services/redPacketLogic';
import { CreateStep } from './components/CreateStep';
import { OpenStep } from './components/OpenStep';
import { ResultStep } from './components/ResultStep';

// Mock Data for Sender (In a real app, this would come from the URL params or backend)
const SENDER: User = {
  id: 'u1',
  name: 'Lucky You',
  avatarUrl: 'https://picsum.photos/id/64/200/200',
};

// Default fallback if opened outside Telegram
const FALLBACK_USER: User = {
  id: 'u_guest',
  name: 'Guest User',
  avatarUrl: 'https://ui-avatars.com/api/?name=Guest&background=random',
};

// Mock Other Users for simulation
const MOCK_USERS: User[] = [
  { id: 'u2', name: 'Alice', avatarUrl: 'https://picsum.photos/id/237/200/200' },
  { id: 'u3', name: 'Bob', avatarUrl: 'https://picsum.photos/id/238/200/200' },
  { id: 'u4', name: 'Charlie', avatarUrl: 'https://picsum.photos/id/239/200/200' },
  { id: 'u5', name: 'Dave', avatarUrl: 'https://picsum.photos/id/240/200/200' },
  { id: 'u6', name: 'Eve', avatarUrl: 'https://picsum.photos/id/241/200/200' },
  { id: 'u7', name: 'Frank', avatarUrl: 'https://picsum.photos/id/242/200/200' },
];

const App: React.FC = () => {
  const [stage, setStage] = useState<GameStage>(GameStage.CREATE);
  const [config, setConfig] = useState<RedPacketConfig | null>(null);
  const [precomputedResults, setPrecomputedResults] = useState<number[]>([]);
  const [records, setRecords] = useState<PacketRecord[]>([]);
  
  // State for the current user (read from Telegram)
  const [currentUser, setCurrentUser] = useState<User>(FALLBACK_USER);

  // Initialize Telegram Web App
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const urlParams = new URLSearchParams(window.location.search);
    const debugUser = urlParams.get('user');

    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#dc2626'); // red-600

      // Read real user data from Telegram
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setCurrentUser({
          id: user.id.toString(),
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
          avatarUrl: user.photo_url || `https://ui-avatars.com/api/?name=${user.first_name}&background=random`
        });
        return;
      }
    }
    
    // If no Telegram user found, check for debug param
    if (debugUser) {
      setCurrentUser({
          id: 'u_debug_' + Date.now(),
          name: debugUser,
          avatarUrl: `https://ui-avatars.com/api/?name=${debugUser}&background=random`
      });
    }
  }, []);

  // 1. Create Stage Handler
  const handleCreate = (newConfig: RedPacketConfig) => {
    setConfig(newConfig);
    // Generate the math logic immediately upon creation
    const amounts = generateRedPacketResults(newConfig.totalAmount, newConfig.totalShares);
    setPrecomputedResults(amounts);
    setRecords([]); // Clear old records
    setStage(GameStage.CLOSED);
    
    // Optional: Trigger haptic feedback
    (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  };

  // 2. Open Stage Handler
  const handleOpen = () => {
    if (!config || precomputedResults.length === 0) return;

    // "Draw" a result for the current user (First one is reserved for current user in this logic)
    const myAmount = precomputedResults[0];
    
    // Create record for current user
    const myRecord: PacketRecord = {
      userId: currentUser.id,
      userName: currentUser.name,
      avatarUrl: currentUser.avatarUrl,
      amount: myAmount,
      isBestLuck: true, // Initially best because only one
      timestamp: Date.now(),
    };

    setRecords([myRecord]);
    setStage(GameStage.RESULT);
    
    // Optional: Trigger haptic feedback
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
  };

  // 3. Real-time Simulation Effect
  // This effect simulates other users opening the packet over time
  useEffect(() => {
    if (stage === GameStage.RESULT && config && records.length < config.totalShares) {
      // Set a random delay to simulate real network/user activity
      const delay = Math.random() * 1500 + 800; // 0.8s - 2.3s

      const timeoutId = setTimeout(() => {
        const nextIndex = records.length;
        // Safety check
        if (nextIndex >= precomputedResults.length) return;

        const amount = precomputedResults[nextIndex];
        // Cycle through mock users
        const mockUser = MOCK_USERS[(nextIndex - 1) % MOCK_USERS.length];

        const newRecord: PacketRecord = {
          userId: `mock_${Date.now()}_${nextIndex}`,
          userName: mockUser.name,
          avatarUrl: mockUser.avatarUrl,
          amount: amount,
          isBestLuck: false, // Will be recalculated
          timestamp: Date.now(),
        };

        setRecords(prev => {
          const nextRecords = [...prev, newRecord];
          // Recalculate Best Luck (King)
          const maxAmount = Math.max(...nextRecords.map(r => r.amount));
          return nextRecords.map(r => ({
            ...r,
            isBestLuck: r.amount === maxAmount && r.amount > 0
          }));
        });

      }, delay);

      return () => clearTimeout(timeoutId);
    }
  }, [stage, records, config, precomputedResults]);

  const handleReset = () => {
    setStage(GameStage.CREATE);
    setConfig(null);
    setPrecomputedResults([]);
    setRecords([]);
  };

  // Render view based on stage
  if (stage === GameStage.CREATE) {
    return <CreateStep onCreate={handleCreate} />;
  }

  if (stage === GameStage.CLOSED || stage === GameStage.OPENING) {
    if (!config) { handleReset(); return null; }
    
    return (
      <OpenStep 
        config={config} 
        sender={SENDER} 
        onOpen={handleOpen} 
      />
    );
  }

  if (stage === GameStage.RESULT) {
    if (!config) return null;
    return (
      <ResultStep 
        config={config} 
        records={records} 
        currentUserId={currentUser.id}
        onReset={handleReset}
      />
    );
  }

  return null;
};

export default App;