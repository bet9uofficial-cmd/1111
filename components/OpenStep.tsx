import React, { useState } from 'react';
import { RedPacketConfig, User } from '../types';

interface Props {
  config: RedPacketConfig;
  sender: User;
  onOpen: () => void;
}

export const OpenStep: React.FC<Props> = ({ config, sender, onOpen }) => {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpen = () => {
    setIsOpening(true);
    // Simulate network delay and animation time
    setTimeout(() => {
      onOpen();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-red-700 flex flex-col items-center justify-between overflow-hidden">
      
      {/* Top Curve Decoration */}
      <div className="absolute top-0 w-[150%] h-[60vh] bg-red-600 rounded-b-[100%] shadow-2xl z-0"></div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center mt-20 w-full animate-fade-in">
        {/* Sender Info */}
        <div className="flex flex-col items-center gap-3">
          <img 
            src={sender.avatarUrl} 
            alt="Sender" 
            className="w-20 h-20 rounded-full border-4 border-yellow-200 shadow-lg object-cover"
          />
          <h2 className="text-yellow-100 text-lg font-medium">{sender.name} sent a Red Packet</h2>
          <p className="text-yellow-200 text-2xl font-serif font-bold text-center max-w-[80%] leading-tight">
            "{config.wishing}"
          </p>
        </div>
      </div>

      {/* The "Kai" (Open) Button Area */}
      <div className="relative z-20 mb-32 flex justify-center items-center">
         <button
            onClick={handleOpen}
            disabled={isOpening}
            className={`
              w-28 h-28 rounded-full bg-yellow-200 border-4 border-yellow-400 shadow-[0_0_40px_rgba(253,224,71,0.6)]
              flex items-center justify-center text-red-600 font-bold text-4xl font-serif
              transition-all duration-700 ease-in-out
              ${isOpening ? 'rotate-[720deg] scale-0 opacity-0' : 'hover:scale-110 active:scale-95'}
            `}
         >
           <span className={`${isOpening ? 'opacity-0' : ''}`}>Open</span>
         </button>
      </div>

      {/* Bottom Decoration */}
      <div className="absolute bottom-4 text-red-900/40 text-sm font-medium z-10">
        Tap to open lucky money
      </div>
    </div>
  );
};
