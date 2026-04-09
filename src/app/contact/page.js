import ContactHeading from './_components/ContactHeading';
import ContactHero from './_components/ContactHero';
import ContactCV from './_components/ContactCV';

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ContactHeading />
      <ContactHero />
      <ContactCV />
    </div>
  );
}
