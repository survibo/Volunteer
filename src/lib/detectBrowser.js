export function isInAppBrowser() {
  const ua = navigator.userAgent.toLowerCase()
  return /kakaotalk|fbav|fban|instagram|line|naver|daumapps/.test(ua)
}
