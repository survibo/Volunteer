import { useState } from 'react'
import { getAvatarUrl } from '../lib/storageApi'
import ImageViewer from './ImageViewer'

export default function UserAvatar({ avatarPath }) {
  const [viewerOpen, setViewerOpen] = useState(false)

  if (!avatarPath) return null

  return (
    <>
      <img
        className="h-14 w-14 cursor-pointer rounded-full object-cover md:h-16 md:w-16"
        src={getAvatarUrl(avatarPath)}
        alt=""
        onClick={() => setViewerOpen(true)}
      />
      {viewerOpen && (
        <ImageViewer
          images={[getAvatarUrl(avatarPath)]}
          initialIndex={0}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}
