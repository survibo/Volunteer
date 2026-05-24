import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function getCroppedImg(imageSrc, croppedAreaPixels) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const MAX = 1200
  let outW = croppedAreaPixels.width
  let outH = croppedAreaPixels.height
  if (outW > MAX || outH > MAX) {
    if (outW > outH) {
      outH = Math.round((outH / outW) * MAX)
      outW = MAX
    } else {
      outW = Math.round((outW / outH) * MAX)
      outH = MAX
    }
  }

  canvas.width = outW
  canvas.height = outH

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outW,
    outH,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'))
        return
      }
      resolve(blob)
    }, 'image/webp', 0.8)
  })
}

export default function AvatarCropper({ imageSrc, onCropComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropChange = useCallback((location) => {
    setCrop(location)
  }, [])

  const onZoomChange = useCallback((z) => {
    setZoom(z)
  }, [])

  const onCropAreaComplete = useCallback((croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onCropComplete(blob)
    } catch (e) {
      onCropComplete(null, e.message)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-surface-base shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-80 w-full rounded-t-xl bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={3/4}
            cropShape="rect"
            showGrid={true}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-xs font-medium text-text-secondary">확대</span>
          <input
            className="flex-1 cursor-pointer accent-action-default"
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span className="text-xs font-medium text-text-secondary">축소</span>
        </div>
        <div className="flex gap-2.5 px-4 pb-4">
          <button
            className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover"
            type="button"
            onClick={handleConfirm}
          >
            확인
          </button>
          <button
            className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
            type="button"
            onClick={onCancel}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
