import React, { useState } from 'react';
import { RedPacketConfig } from '../types';
import { Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  onCreate: (config: RedPacketConfig) => void;
}

export const CreateStep: React.FC<Props> = ({ onCreate }) => {
  const [totalAmount, setTotalAmount] = useState<string>('10.00');
  const [shares, setShares] = useState<string>('5');
  const [wishing, setWishing] = useState('Best Wishes!');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(totalAmount);
    const count = parseInt(shares);
    if (amount > 0 && count > 0) {
      onCreate({ totalAmount: amount, totalShares: count, wishing });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-800 rounded-full mb-3 text-yellow-200">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">Send Red Packet</h1>
          <p className="text-red-200 text-sm mt-1">Share luck with your friends</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Total Amount ($)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-xl text-lg font-semibold border-2 border-transparent focus:border-red-500 focus:bg-white outline-none transition-all text-gray-900"
                placeholder="0.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Quantity (People)</label>
            <input
              type="number"
              step="1"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-xl text-lg font-semibold border-2 border-transparent focus:border-red-500 focus:bg-white outline-none transition-all text-gray-900"
              placeholder="Number of shares"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Best Wishes</label>
            <textarea
              value={wishing}
              onChange={(e) => setWishing(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-xl text-base border-2 border-transparent focus:border-red-500 focus:bg-white outline-none transition-all resize-none text-gray-900"
              rows={2}
              placeholder="Say something nice..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Prepare Red Packet
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
      
      <p className="mt-8 text-gray-400 text-xs text-center">
        Powered by React & Gemini AI
      </p>
    </div>
  );
};
