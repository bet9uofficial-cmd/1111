
import React, { useState, useEffect } from 'react';
import { GameStage, RedPacketConfig, PacketRecord, User } from './types';
import { generateRedPacketResults } from './services/redPacketLogic';
import { CreateStep } from './components/CreateStep';
import { OpenStep } from './components/OpenStep';
import { ResultStep } from './components/ResultStep';
import { playCoinSound, playFanfareSound } from './services/soundService';

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

  // Initialize Telegram Web App and Check for Shared Packet URL
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const urlParams = new URLSearchParams(window.location.search);
    const debugUser = urlParams.get('user');
    const payload = urlParams.get('payload');

    // 1. Setup Telegram User
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#dc2626'); // red-600

      const user = tg.initDataUnsafe?.user;
      if (user) {
        setCurrentUser({
          id: user.id.toString(),
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
          avatarUrl: user.photo_url || `https://ui-avatars.com/api/?name=${user.first_name}&background=random`
        });
      }
    } else if (debugUser) {
      setCurrentUser({
          id: 'u_debug_' + Date.now(),
          name: debugUser,
          avatarUrl: `https://ui-avatars.com/api/?name=${debugUser}&background=random`
      });
    }

    // 2. Check for Shared Packet Payload (Skip Create Step)
    if (payload) {
      try {
        const decodedConfig: RedPacketConfig = JSON.parse(atob(payload));
        if (decodedConfig.totalAmount && decodedConfig.totalShares) {
          setConfig(decodedConfig);
          
          // Generate results locally for this session (Simulation)
          const amounts = generateRedPacketResults(decodedConfig.totalAmount, decodedConfig.totalShares);
          setPrecomputedResults(amounts);
          setRecords([]); 
          
          // Jump directly to the "Open Packet" screen
          setStage(GameStage.CLOSED);
        }
      } catch (e) {
        console.error("Failed to parse packet payload", e);
      }
    }
  }, []);

  // 1. Create Stage Handler
  const handleCreate = (newConfig: RedPacketConfig) => {
    setConfig(newConfig);
    const amounts = generateRedPacketResults(newConfig.totalAmount, newConfig.totalShares);
    setPrecomputedResults(amounts);
    setRecords([]); 
    setStage(GameStage.CLOSED);
    
    // Optional: Trigger haptic feedback
    (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  };

  // 2. Open Stage Handler
  const handleOpen = () => {
    if (!config || precomputedResults.length === 0) return;

    // "Draw" a result for the current user
    const myAmount = precomputedResults[0];
    const maxAmount = Math.max(...precomputedResults);
    
    const myRecord: PacketRecord = {
      userId: currentUser.id,
      userName: currentUser.name,
      avatarUrl: currentUser.avatarUrl,
      amount: myAmount,
      isBestLuck: true, 
      timestamp: Date.now(),
    };

    setRecords([myRecord]);
    setStage(GameStage.RESULT);
    
    if (myAmount >= maxAmount) {
      playFanfareSound();
    } else {
      playCoinSound();
    }
    
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
  };

  // 3. Real-time Simulation Effect
  useEffect(() => {
    if (stage === GameStage.RESULT && config && records.length < config.totalShares) {
      const delay = Math.random() * 1500 + 800; 

      const timeoutId = setTimeout(() => {
        const nextIndex = records.length;
        if (nextIndex >= precomputedResults.length) return;

        const amount = precomputedResults[nextIndex];
        const mockUser = MOCK_USERS[(nextIndex - 1) % MOCK_USERS.length];

        const newRecord: PacketRecord = {
          userId: `mock_${Date.now()}_${nextIndex}`,
          userName: mockUser.name,
          avatarUrl: mockUser.avatarUrl,
          amount: amount,
          isBestLuck: false, 
          timestamp: Date.now(),
        };

        setRecords(prev => {
          const nextRecords = [...prev, newRecord];
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
    // Clear URL params so we can go back to create mode cleanly
    window.history.replaceState({}, '', window.location.pathname);
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
