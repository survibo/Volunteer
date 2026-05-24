import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  deleteCurrentPushSubscription,
  getCurrentPushSubscription,
  getNotificationPermission,
  getPushSupportError,
  saveCurrentPushSubscription,
} from '../lib/pushNotifications'

export function usePushNotifications(userId) {
  const queryClient = useQueryClient()
  const supportError = getPushSupportError()

  const query = useQuery({
    queryKey: ['push-subscription', userId],
    queryFn: async () => {
      if (supportError) {
        return {
          enabled: false,
          permission: getNotificationPermission(),
          supportError,
        }
      }

      const subscription = await getCurrentPushSubscription()
      if (!subscription) {
        return {
          enabled: false,
          permission: getNotificationPermission(),
          supportError: null,
        }
      }

      const { data, error } = await supabase
        .from('device_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
        .maybeSingle()

      if (error) throw error

      return {
        enabled: !!data,
        permission: getNotificationPermission(),
        supportError: null,
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })

  const enable = useMutation({
    mutationFn: () => saveCurrentPushSubscription(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription', userId] })
    },
  })

  const disable = useMutation({
    mutationFn: () => deleteCurrentPushSubscription(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription', userId] })
    },
  })

  return {
    ...query,
    enable,
    disable,
    supportError,
  }
}
