import { createFileRoute } from '@tanstack/react-router'
import { useLanguage } from '@/i18n/LanguageContext'
import { pageTitle } from '@/data/site'

const STATEMENT = {
  en: [
    'Fundamentally reject the conceptions of how we relate to technology.',
    'Entertained by the inherent contradictions of our digital era, but not by the direction in which the agenda that erects current technological development is taking us.',
    'Use intentionally dysfunctional logics from precarious techniques and materialities alongside complex technological systems seeking to materialize the contradictions of our technological expectations through their own paradoxical nature.',
    'Build devices that fail, machines that reveal the deception.',
  ],
  es: [
    'Rechazar fundamentalmente las concepciones de relacionarnos con la tecnología.',
    'Entretenidas las contradicciones inherentes de nuestra era digital, no así el rumbo por el cual nos está llevando la agenda que erige el desarrollo tecnológico actual.',
    'Utilizar lógicas intencionalmente disfuncionales a partir de técnicas y materialidades precarias junto a complejos sistemas tecnológicos buscando materializar las contradicciones de nuestras expectativas tecnológicas a través de su propia naturaleza paradójica.',
    'Construir dispositivos que fallan, máquinas que evidencian el engaño.',
  ],
}

export const Route = createFileRoute('/texts/statement')({
  head: () => ({ meta: [{ title: pageTitle('Statement') }] }),
  component: Statement,
})

function Statement() {
  const { lang } = useLanguage()
  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-4 md:p-8"
      style={{ backgroundImage: 'url(/images/statement/cepaea%20.jpeg)' }}
    >
      <article className="relative z-10 w-full max-w-4xl bg-white/45 p-8 text-center shadow-lg backdrop-blur-sm md:p-10">
        <div className="space-y-6 text-base leading-relaxed font-light text-gray-800 md:text-lg">
          {STATEMENT[lang].map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>
    </div>
  )
}
