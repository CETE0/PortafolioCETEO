import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="relative w-full max-w-4xl px-4 py-8">
        {/* Welcome section */}
        <div className="space-y-6 text-center">
          <h2 className="text-3xl font-bold text-red-600">
            CETEO
          </h2>
        </div>

        {/* Featured work placeholder - you can customize this later */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Obra FT1
            </div>
          </div>
          <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Obra FT2
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()}  Mateo Cereceda. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}