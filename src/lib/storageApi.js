import { supabase } from './supabase'

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

export async function uploadActivityImages(kind, files) {
  const uploaded = []

  for (const file of files) {
    const ext = file.name.split('.').pop()
    const objectPath = `${kind}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(getBucketName(kind)).upload(objectPath, file)

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
