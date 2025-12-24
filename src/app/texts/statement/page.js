'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMemo } from 'react';

export default function Statement() {
  const { lang } = useLanguage();

  const statementText = useMemo(() => {
    if (lang === 'es') {
      return `Mi práctica artística se centra en un rechazo a los fundamentos de cómo nos relacionamos con la tecnología. Donde cuestiono directamente las contradicciones inherentes de nuestra era digital. Utilizo el absurdo, la ironía y el humor como herramientas críticas para evidenciar estas paradojas.

Construyo sistemas e instalaciones que operan bajo una lógica intencionalmente disfuncional a partir de técnicas y materialidades precarias junto a complejos sistemas tecnológicos. Buscando materializar las contradicciones de nuestras expectativas tecnológicas a través de su propia naturaleza paradójica. Son dispositivos que fallan tan rápidamente como prometen funcionar, máquinas que evidencian el engaño cotidiano de nuestras herramientas digitales, emergiendo de una reflexión sobre cómo enfrentamos estas promesas tecnológicas en nuestro día a día, observando su conexión con los sistemas de consumo que definen nuestra relación con lo digital.

Busco generar un espacio de pausa donde el espectador pueda detenerse ante lo que normalmente acepta sin cuestionar. A través del absurdo y lo inesperado, aspiro a abrir un espacio de conversación necesario para imaginar vínculos más conscientes, críticos y genuinamente humanos con nuestras herramientas tecnológicas. No busco ofrecer respuestas definitivas, sino que propongo un momento de reflexión sobre nuestra dependencia e idolatría hacia herramientas muy poderosas que hemos aceptado en nuestras vidas sin pensarlo dos veces.`;
    }
    return `My artistic practice focuses on rejecting the foundations of how we relate to technology. Where I directly question the inherent contradictions of our digital era. I use absurdity, irony, and humor as critical tools to highlight these paradoxes.

I build systems and installations that operate under intentionally dysfunctional logic using precarious techniques and materialities alongside complex technological systems. Seeking to materialize the contradictions of our technological expectations through their own paradoxical nature. They are devices that fail as quickly as they promise to work, machines that reveal the everyday deception of our digital tools, emerging from a reflection on how we face these technological promises in our daily lives, observing their connection to the consumption systems that define our relationship with the digital.

I seek to generate a space of pause where the viewer can stop before what they normally accept without questioning. Through the absurd and the unexpected, I aspire to open a necessary space for conversation to imagine more conscious, critical, and genuinely human connections with our technological tools. I do not seek to offer definitive answers, but rather I propose a moment of reflection on our dependence and idolatry towards very powerful tools that we have accepted in our lives without thinking twice.`;
  }, [lang]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <motion.div
        className="max-w-4xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-8">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-3xl md:text-4xl font-light text-black mb-4 uppercase tracking-wider border-b-2 border-red-500 inline-block">
              {lang === 'es' ? 'Statement' : 'Statement'}
            </h1>
          </motion.div>

          {/* Content */}
          <motion.div
            className="prose prose-lg max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="text-black text-base md:text-lg leading-relaxed space-y-6">
              {statementText.split('\n\n').map((paragraph, index) => (
                <p key={index} className="font-light">
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
