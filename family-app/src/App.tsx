import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginScreen } from './screens/LoginScreen'
import HomeScreen from './screens/HomeScreen'
import UpdatesScreen from './screens/UpdatesScreen'
import MessagesScreen from './screens/MessagesScreen'
import AlertScreen from './screens/AlertScreen'
import { registerForPushNotifications } from './services/notifications'
import { useAuthStore } from './stores/authStore'

const Stack = createStackNavigator()
const queryClient = new QueryClient()

export default function App() {
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) void registerForPushNotifications()
  }, [user])

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {!user ? (
                <Stack.Screen name='Login' component={LoginScreen} />
              ) : (
                <>
                  <Stack.Screen name='Home' component={HomeScreen} />
                  <Stack.Screen name='Updates' component={UpdatesScreen} />
                  <Stack.Screen name='Messages' component={MessagesScreen} />
                  <Stack.Screen name='Alerts' component={AlertScreen} />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
