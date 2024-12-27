'use client';

export default function SketchfabViewer({ modelId }) {
  return (
    <div className="w-full h-full">
      <iframe
        title="Sketchfab Viewer"
        src={`https://sketchfab.com/models/${modelId}/embed`}
        className="w-full h-full"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        frameBorder="0"
      />
    </div>
  );
}