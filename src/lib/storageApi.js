import { supabase } from './supabase'

const AVATARS_BUCKET = 'avatars'

function getBucketName(kind) {
  return kind === 'volunteer' ? 'volunteer' : 'education'
}

export function parseImagePaths(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : [value]
  } catch {
    return [value]
  }
}

export function getImageUrl(kind, path) {
  return supabase.storage.from(getBucketName(kind)).getPublicUrl(path).data.publicUrl
}

export function getAvatarUrl(path) {
  if (!path) return null
  return supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function uploadAvatar(blob) {
  const objectPath = `avatars/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(objectPath, blob, {
    contentType: 'image/webp',
  })
  if (error) throw error
  return objectPath
}

export async function removeAvatar(path) {
  if (!path) return
  const { error } = await supabase.storage.from(AVATARS_BUCKET).remove([path])
  if (error) throw error
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)

      let { width, height } = img
      const MAX = 1920
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height / width) * MAX)
          width = MAX
        } else {
          width = Math.round((width / height) * MAX)
          height = MAX
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Image compression failed'))
      }, 'image/webp', 0.8)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

export async function uploadActivityImages(kind, files) {
  const uploaded = []

  for (const file of files) {
    const compressed = await compressImage(file)
    const objectPath = `${kind}/${crypto.randomUUID()}.webp`
    const { error } = await supabase.storage.from(getBucketName(kind)).upload(objectPath, compressed, {
      contentType: 'image/webp',
    })

    if (error) {
      throw error
    }

    uploaded.push(objectPath)
  }

  return uploaded
}

export async function removeImages(kind, paths) {
  if (paths.length === 0) {
    return
  }

  const { error } = await supabase.storage.from(getBucketName(kind)).remove(paths)

  if (error) {
    throw error
  }
}
