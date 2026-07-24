import imageCompression from 'browser-image-compression'
import { supabase } from './client'
import { writeUserData } from './database'

async function uploadStorage(dataPath, file, data, callback) {
  const compressed = file.type !== 'image/gif' ? await imageCompression(file, {
    maxWidthOrHeight: 500, maxSizeMB: 0.07, useWebWorker: true, fileType: 'image/webp'
  }) : file
  const extension = file.type === 'image/gif' ? 'gif' : 'webp'
  const storagePath = `${dataPath.replace(/^\/+|\/+$/g, '')}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('public-assets').upload(storagePath, compressed, { upsert: true })
  if (error) throw error
  const { data: publicUrl } = supabase.storage.from('public-assets').getPublicUrl(storagePath)
  return writeUserData(dataPath, { ...data, url: publicUrl.publicUrl }, callback)
}

async function downloadFile(path) {
  const { data, error } = await supabase.storage.from('public-assets').download(path)
  if (error) throw error
  return data
}

async function uploadIMG(dataPath, _folder, _filename, file, data, setData, setSuccess, urlField = 'url') {
  try {
    const result = await uploadStorage(dataPath, file, data)
    if (urlField !== 'url') {
      const updated = { ...result, [urlField]: result.url }
      delete updated.url
      await writeUserData(dataPath, updated)
      setData?.(updated)
      return updated
    }
    setData?.(result)
    return result
  } catch (error) {
    setSuccess?.(error.message)
    throw error
  }
}

export { uploadStorage, uploadIMG, downloadFile }
