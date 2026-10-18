import { createFileRoute, ClientOnly } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const ExperimentalShooter = lazy(() => import('@/components/games/experimental/ExperimentalShooter'))

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="h-full w-full">
      <ClientOnly>
        <Suspense fallback={null}>
          <ExperimentalShooter />
        </Suspense>
      </ClientOnly>
    </div>
  )
}
