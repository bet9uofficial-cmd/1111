import React, { useState, useEffect } from 'react';
import { GameStage, PacketData, PacketRecord, User, RedPacketConfig } from './types';
import { CreateStep } from './components/CreateStep';
import { OpenStep } from './components/OpenStep';
import { ResultStep } from './components/ResultStep';
import { playCoinSound, playFanfareSound } from './services/soundService';

// Default fallback if opened outside Telegram
const FALLBACK_USER: User = {
  id: 'u_' + Math.random().toString(36).substr(2, 9),
  name: 'Guest User',
  avatarUrl: 'https://ui-avatars.com/api/?name=Guest&background=random',
};

const App: React.FC = () => {
  const [stage, setStage] = useState<GameStage>(GameStage.CREATE);
  const [packetId, setPacketId] = useState<string | null>(null);
  const [packetData, setPacketData] = useState<PacketData | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(FALLBACK_USER);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initialize & Check URL for Packet ID
  useEffect(() => {
    const initApp = async () => {
      // Setup Telegram
      const tg = (window as any).Telegram?.WebApp;
      let startParam: string | null = null;

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
        // Check for Telegram start parameter (e.g., t.me/bot?startapp=PACKET_ID)
        startParam = tg.initDataUnsafe?.start_param;
      }

      // Check for Web URL parameter (e.g., ?id=PACKET_ID or ?startapp=PACKET_ID)
      const urlParams = new URLSearchParams(window.location.search);
      if (!startParam) {
        startParam = urlParams.get('startapp') || urlParams.get('id');
      }

      // Logic: If ID exists, we are a PLAYER (or returning creator). Fetch data.
      if (startParam) {
        setPacketId(startParam);
        await fetchPacketInfo(startParam);
      } else {
        // No ID, we are a CREATOR.
        setStage(GameStage.CREATE);
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  // API: Fetch Packet Info
  const fetchPacketInfo = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/packet/${id}`);
      if (!res.ok) throw new Error('Packet not found');
      
      const data: PacketData = await res.json();
      setPacketData(data);
      
      // Determine Stage:
      // If I have already grabbed it -> RESULT
      // If it is finished and I missed it -> RESULT
      // Otherwise -> CLOSED (Ready to open)
      const myRecord = data.records.find(r => r.userId === currentUser.id); // Note: currentUser.id might need to be stable
      
      if (myRecord) {
        setStage(GameStage.RESULT);
      } else if (data.isFinished) {
         setStage(GameStage.RESULT); // Or a specific "Missed it" state
      } else {
        setStage(GameStage.CLOSED);
      }
    } catch (err) {
      console.error("Fetch error", err);
      // If fetch fails, maybe go back to create or show error
      setStage(GameStage.CREATE);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Creator submits form
  const handleCreate = async (config: RedPacketConfig) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          creatorId: currentUser.id
        })
      });
      
      const data = await res.json();
      if (data.id) {
        // Successfully created! Now switch to view mode for this packet
        setPacketId(data.id);
        await fetchPacketInfo(data.id);
      }
    } catch (e) {
      console.error("Create failed", e);
      alert("Failed to create packet. Please try again.");
      setIsLoading(false);
    }
  };

  // Handler: Player opens packet
  const handleOpen = async () => {
    if (!packetId) return;

    try {
      const res = await fetch(`/api/packet/${packetId}/grab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          avatarUrl: currentUser.avatarUrl
        })
      });

      const result = await res.json();

      if (result.status === 'SUCCESS' || result.status === 'ALREADY_GRABBED') {
        const record = result.record as PacketRecord;
        
        // Refresh full data to see other winners
        await fetchPacketInfo(packetId);
        setStage(GameStage.RESULT);

        // Sound Effects
        if (record.isBestLuck) {
          playFanfareSound();
        } else {
          playCoinSound();
        }
        (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');

      } else if (result.status === 'EMPTY') {
        alert("Too slow! Red packet is empty.");
        await fetchPacketInfo(packetId);
        setStage(GameStage.RESULT);
      }

    } catch (e) {
      console.error("Grab failed", e);
    }
  };

  const handleReset = () => {
    // Reset to Create Mode
    window.history.replaceState({}, '', window.location.pathname);
    setPacketId(null);
    setPacketData(null);
    setStage(GameStage.CREATE);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-600 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-300 border-t-transparent"></div>
      </div>
    );
  }

  // View Routing
  if (stage === GameStage.CREATE) {
    return <CreateStep onCreate={handleCreate} />;
  }

  if (stage === GameStage.CLOSED || stage === GameStage.OPENING) {
    if (!packetData) return null;
    return (
      <OpenStep 
        config={packetData.config} 
        sender={{ id: packetData.creatorId, name: 'Sender', avatarUrl: 'https://ui-avatars.com/api/?name=Sender' }} // Ideally fetch sender info
        onOpen={handleOpen} 
      />
    );
  }

  if (stage === GameStage.RESULT) {
    if (!packetData) return null;
    return (
      <ResultStep 
        config={packetData.config} 
        records={packetData.records} 
        currentUserId={currentUser.id}
        packetId={packetId || ''}
        onReset={handleReset}
      />
    );
  }

  return null;
};

export default App;