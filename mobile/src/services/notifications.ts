import { Platform } from 'react-native'
import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
const IS_NATIVE = Platform.OS !== 'web'

if (IS_NATIVE) {
  void import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  })
}

async function saveTokenToBackend(token: string): Promise<void> {
  const { user } = useAuthStore.getState()
  if (!user) return
  await axios.post(
    `${API}/api/v1/notifications/push-tokens`,
    { token, resident_id: user.resident_id, home_id: user.home_id },
    { headers: { Authorization: `Bearer ${user.access_token}` } }
  ).catch(console.warn)
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!IS_NATIVE) return null

  const [{ default: Device }, Notifications] = await Promise.all([
    import('expo-device'),
    import('expo-notifications'),
  ])

  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  const token = await Notifications.getExpoPushTokenAsync()
  await saveTokenToBackend(token.data)
  return token.data
}
