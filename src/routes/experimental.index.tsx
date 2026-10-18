import { createFileRoute, ClientOnly } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { pageTitle } from '@/data/site'

const ExperimentalShooter = lazy(() => import('@/components/games/experimental/ExperimentalShooter'))

export const Route = createFileRoute('/experimental/')({
  head: () => ({ meta: [{ title: pageTitle('Experimental') }] }),
  component: () => (
    <div className="h-full w-full">
      <ClientOnly>
        <Suspense fallback={null}>
          <ExperimentalShooter />
        </Suspense>
      </ClientOnly>
    </div>
  ),
})
