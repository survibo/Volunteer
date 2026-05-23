import { useState } from 'react'
import { ImageIcon } from 'lucide-react'

export default function ImageWithFallback({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!src || failed) return null

  return (
    <div className="relative">
      {!loaded && (
        <div
          className={`flex items-center justify-center rounded-xl border border-border-default bg-surface-subtle ${className ?? ''}`}
          style={{ aspectRatio: '16/9' }}
        >
          <ImageIcon className="animate-pulse text-text-tertiary" size={32} />
        </div>
      )}
      <img
        className={`${className} ${!loaded ? 'absolute inset-0 opacity-0' : ''}`}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
