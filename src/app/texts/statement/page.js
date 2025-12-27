'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useMemo } from 'react';

export default function Statement() {
  const { lang } = useLanguage();

  const statementText = useMemo(() => {
    if (lang === 'es') {
      return `Rechazar fundamentalmente las concepciones de relacionarnos con la tecnología.

Entretenidas las contradicciones inherentes de nuestra era digital, no así el rumbo por el cual nos está llevando la agenda que erige el desarrollo tecnológico actual.

Utilizar lógicas intencionalmente disfuncionales a partir de técnicas y materialidades precarias junto a complejos sistemas tecnológicos buscando materializar las contradicciones de nuestras expectativas tecnológicas a través de su propia naturaleza paradójica.

Construir dispositivos que fallan, máquinas que evidencian el engaño.`;
    }
    return `Fundamentally reject the conceptions of how we relate to technology.

Entertained by the inherent contradictions of our digital era, but not by the direction in which the agenda that erects current technological development is taking us.

Use intentionally dysfunctional logics from precarious techniques and materialities alongside complex technological systems seeking to materialize the contradictions of our technological expectations through their own paradoxical nature.

Build devices that fail, machines that reveal the deception.`;
  }, [lang]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 md:p-8 relative"
      style={{
        backgroundImage: 'url(/images/statement/cepaea%20.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
          >
      <div className="max-w-4xl w-full relative z-10 bg-white/45 backdrop-blur-sm p-8 md:p-10 shadow-lg">
        <div className="prose prose-lg max-w-none text-center">
          <div className="text-gray-800 text-base md:text-lg leading-relaxed space-y-6">
              {statementText.split('\n\n').map((paragraph, index) => (
                <p key={index} className="font-light">
                  {paragraph}
                </p>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
}
