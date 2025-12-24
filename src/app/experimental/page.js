'use client';

import dynamic from 'next/dynamic';

const ExperimentalShooter = dynamic(() => import('@/components/games/experimental/ExperimentalShooter'), {
  ssr: false,
});

export default function ExperimentalPage() {
  return (
    <div className="w-full h-full">
      <ExperimentalShooter />
    </div>
  );
}


