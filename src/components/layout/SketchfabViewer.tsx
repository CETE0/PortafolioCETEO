export default function SketchfabViewer({ modelId, title }: { modelId: string; title?: string }) {
  return (
    <div className="h-full w-full">
      <iframe
        title={title || 'Sketchfab viewer'}
        src={`https://sketchfab.com/models/${modelId}/embed`}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        loading="lazy"
      />
    </div>
  )
}
