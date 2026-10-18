export default function YouTubePlayer({ videoId, title }: { videoId: string; title?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative mx-auto aspect-video w-full max-w-4xl">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
          title={title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  )
}
