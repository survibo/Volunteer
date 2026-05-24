import { supabase } from './supabase'

let vapidPublicKeyPromise

export function getPushSupportError() {
  if (!window.isSecureContext) return 'HTTPS 또는 localhost에서만 푸시 알림을 사용할 수 있습니다.'
  if (!('serviceWorker' in navigator)) return '이 브라우저는 서비스워커를 지원하지 않습니다.'
  if (!('PushManager' in window)) return '이 브라우저는 푸시 알림을 지원하지 않습니다.'
  if (!('Notification' in window)) return '이 브라우저는 알림 권한을 지원하지 않습니다.'
  return null
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function getCurrentPushSubscription() {
  const supportError = getPushSupportError()
  if (supportError) return null

  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function saveCurrentPushSubscription(userId) {
  const supportError = getPushSupportError()
  if (supportError) throw new Error(supportError)
  const vapidPublicKey = await getVapidPublicKey()

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }

  if (permission !== 'granted') {
    throw new Error('브라우저 알림 권한이 허용되지 않았습니다.')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await subscribeToPush(registration, vapidPublicKey))

  const { error } = await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      token: subscription.toJSON(),
      platform: 'web',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) throw error

  return subscription
}

async function getVapidPublicKey() {
  vapidPublicKeyPromise ??= supabase
    .from('push_config')
    .select('value')
    .eq('key', 'vapid_public_key')
    .single()
    .then(({ data, error }) => {
      if (error) throw error
      const value = data?.value?.trim()
      if (!value) throw new Error('VAPID 공개키가 설정되어 있지 않습니다.')
      return value
    })

  return vapidPublicKeyPromise
}

async function subscribeToPush(registration, vapidPublicKey) {
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

  if (applicationServerKey.byteLength !== 65) {
    throw new Error('VAPID 공개키 형식이 올바르지 않습니다.')
  }

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
  } catch (error) {
    const diagnostic = [
      `origin=${window.location.origin}`,
      `secure=${window.isSecureContext}`,
      `permission=${Notification.permission}`,
      `sw=${registration.active?.state ?? 'none'}`,
    ].join(', ')

    throw new Error(
      `푸시 서비스 등록에 실패했습니다. Chrome/Edge 또는 설치된 Safari PWA에서 다시 시도해 주세요. (${error.message}; ${diagnostic})`,
      { cause: error }
    )
  }
}

export async function deleteCurrentPushSubscription(userId) {
  const supportError = getPushSupportError()
  if (supportError) return

  const subscription = await getCurrentPushSubscription()
  if (!subscription) return

  if (userId) {
    const { error } = await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)

    if (error) throw error
  }

  await subscription.unsubscribe()
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
