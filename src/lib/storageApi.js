import { supabase } from './supabase'

const bucketName = 'volunteer'

export function parseImagePaths(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : [value]
  } catch {
    return [value]
  }
}

export function getVolunteerImageUrl(path) {
  return supabase.storage.from(bucketName).getPublicUrl(path).data.publicUrl
}

export async function uploadActivityImages(kind, files) {
  const uploaded = []

  for (const file of files) {
    const ext = file.name.split('.').pop()
    const objectPath = `${kind}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(bucketName).upload(objectPath, file)

    if (error) {
      throw error
    }

    uploaded.push(objectPath)
  }

  return uploaded
}

export async function removeVolunteerImages(paths) {
  if (paths.length === 0) {
    return
  }

  const { error } = await supabase.storage.from(bucketName).remove(paths)

  if (error) {
    throw error
  }
}
