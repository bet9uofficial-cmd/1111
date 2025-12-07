import React, { useEffect, useState } from 'react';
import { RedPacketConfig, PacketRecord, AIAnalysis } from '../types';
import { Crown, Star, Share2, RefreshCw, CheckCheck } from 'lucide-react';
import { generateFortune } from '../services/geminiService';

interface Props {
  config: RedPacketConfig;
  records: PacketRecord[];
  currentUserId: string;
  packetId: string;
  onReset: () => void;
}

export const ResultStep: React.FC<Props> = ({ config, records, currentUserId, packetId, onReset }) => {
  const [aiFortune, setAiFortune] = useState<AIAnalysis | null>(null);
  const [loadingFortune, setLoadingFortune] = useState(false);
  const [copied, setCopied] = useState(false);

  const myRecord = records.find(r => r.userId === currentUserId);
  const isFinished = records.length >= config.totalShares;
  
  const sortedRecords = [...records].sort((a, b) => b.amount - a.amount);

  useEffect(() => {
    if (myRecord && !aiFortune && !loadingFortune) {
      setLoadingFortune(true);
      generateFortune(myRecord.amount, config.totalAmount)
        .then(setAiFortune)
        .finally(() => setLoadingFortune(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myRecord?.amount, myRecord?.userId]); 

  const handleShare = () => {
    // 1. Construct Telegram Share URL
    // Web Share Link
    const webLink = `${window.location.origin}${window.location.pathname}?startapp=${packetId}`;
    
    // Telegram Share Link
    // format: https://t.me/share/url?url={link}&text={text}
    const shareText = encodeURIComponent(`🧧 I sent a Red Packet! ${config.wishing}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(webLink)}&text=${shareText}`;

    // 2. Try to use Telegram WebApp "Switch Inline Query"
    // This allows selecting a group and sending a button directly.
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
       // We pass the packetId as the query. The bot's inline_query handler will catch this
       // and return a nice button message.
       tg.switchInlineQuery(packetId, ['users', 'groups']);
       return;
    }

    // 3. Fallback: Copy to clipboard if not in Telegram or API not available
    navigator.clipboard.writeText(webLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy', err);
    });
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Top Half: Result */}
        <div className="relative bg-white pb-8">
          {/* Red decorative header */}
          <div className="h-16 bg-red-600 rounded-b-[50%] scale-x-125 mb-4"></div>
          
          <div className="flex flex-col items-center px-4 -mt-10">
            <img 
              src={myRecord?.avatarUrl || "https://ui-avatars.com/api/?name=User&background=random"} 
              className="w-16 h-16 rounded-full border-2 border-white shadow-md z-10"
              alt="Me"
            />
            <h2 className="mt-2 text-gray-900 font-bold text-lg">{myRecord?.userName || 'You'}</h2>
            
            <div className="mt-6 text-center">
              <p className="text-gray-500 text-sm">You won</p>
              <h1 className="text-5xl font-bold text-gray-900 mt-1 tracking-tighter">
                {myRecord ? myRecord.amount.toFixed(2) : '0.00'}
                <span className="text-xl text-gray-500 ml-1">USD</span>
              </h1>
            </div>

            {/* AI Fortune Section */}
            {myRecord && (
              <div className="mt-6 w-full max-w-sm px-2">
                  {loadingFortune ? (
                    <div className="bg-yellow-50 p-3 rounded-lg flex items-center justify-center gap-2 text-yellow-700 text-sm animate-pulse">
                      <Star size={16} className="animate-spin" />
                      Consulting the AI Spirits...
                    </div>
                  ) : aiFortune ? (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 p-4 rounded-xl shadow-sm relative overflow-hidden animate-fade-in-up">
                      <div className="absolute top-0 right-0 p-1 opacity-10">
                        <Crown size={64} />
                      </div>
                      <h3 className="text-orange-800 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <SparklesIcon /> Gemini Fortune: {aiFortune.luckLevel}
                      </h3>
                      <p className="text-gray-800 text-sm italic font-medium">"{aiFortune.message}"</p>
                    </div>
                  ) : null}
              </div>
            )}
            
            {!myRecord && (
               <div className="mt-4 text-gray-500 text-sm">
                 Better luck next time!
               </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-2 bg-gray-100 border-t border-b border-gray-200"></div>

        {/* List */}
        <div className="bg-white p-4 min-h-[300px]">
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 py-2 border-b border-dashed border-gray-100">
            <p className="text-gray-500 text-sm flex items-center gap-2">
              {records.length} / {config.totalShares} opened
              {!isFinished && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
              {isFinished && <span className="text-red-500 font-bold ml-1">(All Taken)</span>}
            </p>
          </div>

          <ul className="space-y-4">
            {sortedRecords.map((record) => (
              <li key={record.userId} className="flex items-center justify-between animate-fade-in transition-all">
                <div className="flex items-center gap-3">
                  <img src={record.avatarUrl} className="w-10 h-10 rounded-lg bg-gray-200 object-cover" alt={record.userName} />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{record.userName}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{record.amount.toFixed(2)} USD</p>
                  {record.isBestLuck && (
                    <p className="text-xs text-yellow-600 flex items-center justify-end gap-1 font-bold animate-pulse">
                      <Crown size={12} fill="currentColor" />
                      Best Luck
                    </p>
                  )}
                </div>
              </li>
            ))}
            {!isFinished && (
              <li className="flex justify-center py-4">
                 <div className="flex gap-1">
                   <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                   <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                   <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                 </div>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Action Bar (Sticky Bottom) */}
      <div className="bg-white border-t p-4 flex gap-4 w-full z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <button onClick={onReset} className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:scale-95">
            <RefreshCw size={18} />
            New Game
         </button>
         <button 
           onClick={handleShare}
           className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${copied ? 'bg-green-600 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}
         >
            {copied ? <CheckCheck size={18} /> : <Share2 size={18} />}
            {copied ? 'Link Copied!' : 'Share Packet'}
         </button>
      </div>
    </div>
  );
};

const SparklesIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
  </svg>
);