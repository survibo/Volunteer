export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

export function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} ${hh}:${mm}`
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

export function deadlineDdayText(iso, now = new Date()) {
  if (!iso) return ''

  const deadline = new Date(iso)
  const diff = deadline - now

  if (diff <= 0) return '마감됨'
  if (diff >= 86400000) return `D-${Math.ceil(diff / 86400000)}`

  const totalSeconds = Math.floor(diff / 1000)

  if (totalSeconds <= 60) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${pad2(minutes)}:${pad2(seconds)}`
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${pad2(hours)}:${pad2(minutes)}`
}
