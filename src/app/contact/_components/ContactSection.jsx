export default function ContactSection({ id, title, children }) {
  const headingId = `contact-h-${id}`;
  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <h2 id={headingId} className="text-xl font-light text-black">
        {title}
      </h2>
      {children}
    </section>
  );
}
