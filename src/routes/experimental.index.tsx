import { createFileRoute, ClientOnly } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { pageTitle } from '@/data/site'
import { useLanguage } from '@/i18n/LanguageContext'
import GameFrame from '@/components/layout/GameFrame'

const ExperimentalShooter = lazy(() => import('@/components/games/experimental/ExperimentalShooter'))

export const Route = createFileRoute('/experimental/')({
  head: () => ({ meta: [{ title: pageTitle('Experimental') }] }),
  component: Experimental,
})

function Experimental() {
  const { t } = useLanguage()
  return (
    <GameFrame title={t('games.shooter.title')} hint={t('games.shooter.hint')}>
      <ClientOnly>
        <Suspense fallback={null}>
          <ExperimentalShooter />
        </Suspense>
      </ClientOnly>
    </GameFrame>
  )
}
