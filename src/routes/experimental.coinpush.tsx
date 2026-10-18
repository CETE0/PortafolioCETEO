import { createFileRoute, ClientOnly } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { pageTitle } from '@/data/site'

const CoinPushTerminal = lazy(() => import('@/components/games/experimental/CoinPushTerminal'))

export const Route = createFileRoute('/experimental/coinpush')({
  head: () => ({ meta: [{ title: pageTitle('Coin Push Terminal') }] }),
  component: () => (
    <div className="h-full w-full">
      <ClientOnly>
        <Suspense fallback={null}>
          <CoinPushTerminal />
        </Suspense>
      </ClientOnly>
    </div>
  ),
})
