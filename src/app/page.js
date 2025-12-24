"use client";

import dynamic from 'next/dynamic';

const ExperimentalShooter = dynamic(() => import('@/components/games/experimental/ExperimentalShooter'), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="w-full h-full">
      <ExperimentalShooter />
    </div>
  );
}