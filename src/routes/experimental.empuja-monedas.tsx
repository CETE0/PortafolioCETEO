import { createFileRoute, ClientOnly } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { pageTitle } from '@/data/site'

const CoinPushTerminal = lazy(() => import('@/components/games/experimental/CoinPushTerminal'))

export const Route = createFileRoute('/experimental/empuja-monedas')({
  head: () => ({ meta: [{ title: pageTitle('Empuja Monedas') }] }),
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
