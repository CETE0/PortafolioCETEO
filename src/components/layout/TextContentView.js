'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image'; 

export default function TextContentView({ content }) {
  if (!content) return null;

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto px-8 py-12 text-black"
    >
      <header className="mb-12">
        <h1 className="text-2xl font-light mb-2 text-black">{content.title}</h1>
        {content.date && (
          <p className="text-sm text-black/70">{content.date}</p>
        )}
      </header>

      <div className="prose prose-sm max-w-none text-black">
        <ReactMarkdown components={{
          p: ({node, ...props}) => <p className="text-black" {...props} />,
          h1: ({node, ...props}) => <h1 className="text-black" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-black" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-black" {...props} />,
          li: ({node, ...props}) => <li className="text-black" {...props} />,
          a: ({node, ...props}) => <a className="text-black underline" {...props} />
        }}>
          {content.body}
        </ReactMarkdown>
      </div>

      {content.images?.map((image, index) => (
        <figure key={index} className="my-8">
          <div className="relative w-full h-auto">
            <Image
              src={image.src}
              alt={image.alt}
              width={800}
              height={500}
              className="w-full h-auto"
            />
          </div>
          {image.caption && (
            <figcaption className="mt-2 text-sm text-black/70 text-center">
              {image.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </motion.article>
  );
}