'use client';

import dynamic from 'next/dynamic';

const CoinPushTerminal = dynamic(() => import('@/components/games/experimental/CoinPushTerminal'), {
  ssr: false,
});

export default function CoinPushPage() {
  return (
    <div className="w-full h-full">
      <CoinPushTerminal />
    </div>
  );
}




