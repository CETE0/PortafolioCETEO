import { createFileRoute, ClientOnly } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'
import GameFrame from '@/components/layout/GameFrame'

const ExperimentalShooter = lazy(() => import('@/components/games/experimental/ExperimentalShooter'))

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { t } = useLanguage()
  return (
    <GameFrame hint={t('games.shooter.hint')}>
      <ClientOnly>
        <Suspense fallback={null}>
          <ExperimentalShooter />
        </Suspense>
      </ClientOnly>
    </GameFrame>
  )
}
