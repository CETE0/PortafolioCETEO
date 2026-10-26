import { createFileRoute, ClientOnly } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { pageTitle } from '@/data/site'
import { useLanguage } from '@/i18n/LanguageContext'
import GameFrame from '@/components/layout/GameFrame'

const CoinPushTerminal = lazy(() => import('@/components/games/experimental/CoinPushTerminal'))

export const Route = createFileRoute('/experimental/empuja-monedas')({
  head: () => ({ meta: [{ title: pageTitle('Empuja Monedas') }] }),
  component: CoinPush,
})

function CoinPush() {
  const { t } = useLanguage()
  return (
    <GameFrame title={t('games.coinpush.title')} hint={t('games.coinpush.hint')}>
      <ClientOnly>
        <Suspense fallback={null}>
          <CoinPushTerminal />
        </Suspense>
      </ClientOnly>
    </GameFrame>
  )
}
