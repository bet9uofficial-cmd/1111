import React, { useState, useEffect } from 'react';
import { GameStage, RedPacketConfig, PacketRecord, User } from './types';
import { CreateStep } from './components/CreateStep';
import { OpenStep } from './components/OpenStep';
import { ResultStep } from './components/ResultStep';
import { api } from './services/api';
import { Share2 } from 'lucide-react';

const FALLBACK_USER: User = {
  id: 'u_' + Math.floor(Math.random() * 10000),
  name: 'Guest User',
  avatarUrl: 'https://ui-avatars.com/api/?name=Guest&background=random',
};

const App: React.FC = () => {
  const [stage, setStage] = useState<GameStage>(GameStage.LOADING);
  const [packetId, setPacketId] = useState<string | null>(null);
  const [config, setConfig] = useState<RedPacketConfig | null>(null);
  const [records, setRecords] = useState<PacketRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(FALLBACK_USER);
  const [senderInfo, setSenderInfo] = useState<User>(FALLBACK_USER);

  // 1. Initialize Telegram & Check for Packet ID in URL
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#dc2626');

      const user = tg.initDataUnsafe?.user;
      if (user) {
        setCurrentUser({
          id: user.id.toString(),
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
          avatarUrl: user.photo_url || `https://ui-avatars.com/api/?name=${user.first_name}&background=random`
        });
      }

      // Check start_param (e.g., ?startapp=packet_uuid)
      const startParam = tg.initDataUnsafe?.start_param;
      if (startParam) {
        loadPacket(startParam);
      } else {
        setStage(GameStage.CREATE);
      }
    } else {
      // Debugging in browser without Telegram
      const urlParams = new URLSearchParams(window.location.search);
      const pid = urlParams.get('startapp') || urlParams.get('packetId');
      if (pid) {
        loadPacket(pid);
      } else {
        setStage(GameStage.CREATE);
      }
    }
  }, []);

  // 2. Poll for updates if we are in Result view (Real-time updates)
  useEffect(() => {
    let interval: any;
    if (stage === GameStage.RESULT && packetId) {
      interval = setInterval(() => {
        api.getPacket(packetId).then(data => {
          setRecords(recalculateBestLuck(data.records));
        }).catch(console.error);
      }, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [stage, packetId]);

  const recalculateBestLuck = (recs: PacketRecord[]) => {
    if (recs.length === 0) return [];
    const maxAmount = Math.max(...recs.map(r => r.amount));
    return recs.map(r => ({
      ...r,
      isBestLuck: r.amount === maxAmount && r.amount > 0
    }));
  };

  const loadPacket = async (id: string) => {
    setStage(GameStage.LOADING);
    try {
      const data = await api.getPacket(id);
      setPacketId(id);
      setConfig(data.config);
      setRecords(recalculateBestLuck(data.records));
      
      setSenderInfo({
        id: data.creatorId, 
        name: 'A Friend', 
        avatarUrl: 'https://ui-avatars.com/api/?name=Friend&background=random'
      });

      // Check if current user already grabbed it
      const myRecord = data.records.find(r => r.userId === currentUser.id);
      if (myRecord) {
        setStage(GameStage.RESULT);
      } else if (data.isFinished) {
         setStage(GameStage.RESULT); // Too late
      } else {
        setStage(GameStage.CLOSED); // Ready to open
      }
    } catch (e) {
      console.error(e);
      alert("Packet not found or expired.");
      setStage(GameStage.CREATE);
    }
  };

  const handleCreate = async (newConfig: RedPacketConfig) => {
    setStage(GameStage.LOADING);
    try {
      const { id } = await api.createPacket(newConfig, currentUser.id);
      
      // Immediately load the packet we just created
      setPacketId(id);
      setConfig(newConfig);
      setRecords([]);
      setStage(GameStage.CLOSED);
      
    } catch (e) {
      console.error(e);
      alert("Failed to create packet. Check connection.");
      setStage(GameStage.CREATE);
    }
  };

  const handleOpen = async () => {
    if (!packetId) return;

    try {
      const { record, status } = await api.grabPacket(packetId, currentUser);
      
      if (status === 'SUCCESS' && record) {
        setRecords(prev => recalculateBestLuck([...prev, record]));
        setStage(GameStage.RESULT);
        (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
      } else if (status === 'ALREADY_GRABBED') {
        // Refresh full list
        const data = await api.getPacket(packetId);
        setRecords(recalculateBestLuck(data.records));
        setStage(GameStage.RESULT);
      } else if (status === 'EMPTY') {
        alert("Too slow! Red packet is empty.");
        setStage(GameStage.RESULT);
      }
    } catch (e) {
      console.error(e);
      alert("Network error occurred.");
    }
  };

  const handleShare = () => {
    if (!packetId) return;
    const tg = (window as any).Telegram?.WebApp;
    
    // Construct the direct link to the app with the packet ID
    // Format: https://t.me/MyBot/appname?startapp=packetId
    // Note: You need to replace 'YourBotName' and 'AppName' in production environment vars or manually
    const shareUrl = `https://t.me/share/url?url=${window.location.href}`;

    if (tg) {
       // Option 1: Share via specific message with a button
       // tg.switchInlineQuery(packetId, ['users', 'groups']); 
       
       // Option 2 (Better for growth): Open native share dialog with the deep link
       const message = `🧧 I sent a Red Packet! Click to open.`;
       tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`);
    } else {
        navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard: ' + shareUrl);
    }
  };

  const handleReset = () => {
    setStage(GameStage.CREATE);
    setPacketId(null);
    setConfig(null);
    setRecords([]);
  };

  if (stage === GameStage.LOADING) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (stage === GameStage.CREATE) {
    return <CreateStep onCreate={handleCreate} />;
  }

  if (stage === GameStage.CLOSED || stage === GameStage.OPENING) {
    if (!config) return null;
    return (
      <OpenStep 
        config={config} 
        sender={senderInfo} 
        onOpen={handleOpen} 
      />
    );
  }

  if (stage === GameStage.RESULT) {
    if (!config) return null;
    return (
      <div className="relative h-full">
         <ResultStep 
            config={config} 
            records={records} 
            currentUserId={currentUser.id}
            onReset={handleReset}
          />
          {/* Floating Share Button for the Creator/Winner */}
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
             <button 
                onClick={handleShare}
                className="bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-green-500 transition-colors"
             >
                <Share2 size={20} />
                Share Packet
             </button>
          </div>
      </div>
    );
  }

  return null;
};

export default App;