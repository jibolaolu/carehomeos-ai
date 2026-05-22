import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AppState, StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import ThemeProvider from './components/ThemeProvider'
import { LoginScreen } from './screens/LoginScreen'
import CarerHomeScreen from './screens/carer/HomeScreen'
import RecordNoteScreen from './screens/carer/RecordNoteScreen'
import MARScreen from './screens/carer/MARScreen'
import HandoverScreen from './screens/carer/HandoverScreen'
import AlertsScreen from './screens/senior/AlertsScreen'
import NoteReviewScreen from './screens/senior/NoteReviewScreen'
import ManagerDashboardScreen from './screens/manager/DashboardScreen'
import FamilyHomeScreen from './screens/family/HomeScreen'
import FamilyUpdatesScreen from './screens/family/UpdatesScreen'
import WoundAssessmentScreen from './screens/clinical/WoundAssessmentScreen'
import VitalsEntryScreen from './screens/clinical/VitalsEntryScreen'
import FluidBalanceScreen from './screens/clinical/FluidBalanceScreen'
import NEWS2Calculator from './screens/clinical/NEWS2Calculator'
import { useAuthStore } from './stores/authStore'
import { initDatabase } from './services/db'
import { startSyncEngine, stopSyncEngine } from './services/sync'
import './services/i18n'

const Stack = createStackNavigator()
const queryClient = new QueryClient()
const CARER_IDLE_TIMEOUT_MS = 5 * 60 * 1000
const CARER_IDLE_WARNING_MS = 60 * 1000

function AppNavigator() {
  const { user, logout } = useAuthStore()
  const { t } = useTranslation()
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityAtRef = useRef<number>(Date.now())
  const appStateRef = useRef(AppState.currentState)
  const warningShownRef = useRef(false)

  const clearIdleTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    idleTimerRef.current = null
    warningTimerRef.current = null
  }, [])

  const forceIdleLogout = useCallback(() => {
    clearIdleTimers()
    warningShownRef.current = false
    queryClient.clear()
    logout()
    Alert.alert(t('login.sessionExpired'), t('errors.unauthorized'))
  }, [clearIdleTimers, logout, t])

  const scheduleIdleTimers = useCallback(() => {
    clearIdleTimers()
    warningShownRef.current = false
    if (user?.role !== 'carer') return
    warningTimerRef.current = setTimeout(() => {
      if (warningShownRef.current) return
      warningShownRef.current = true
      Alert.alert('Still there?', 'You will be signed out in 60 seconds due to inactivity.', [
        { text: 'Sign out now', style: 'destructive', onPress: forceIdleLogout },
        {
          text: 'Stay signed in',
          onPress: () => {
            warningShownRef.current = false
            lastActivityAtRef.current = Date.now()
            scheduleIdleTimers()
          },
        },
      ], { cancelable: false })
    }, Math.max(1000, CARER_IDLE_TIMEOUT_MS - CARER_IDLE_WARNING_MS))
    idleTimerRef.current = setTimeout(forceIdleLogout, CARER_IDLE_TIMEOUT_MS)
  }, [clearIdleTimers, forceIdleLogout, user?.role])

  const markActivity = useCallback(() => {
    lastActivityAtRef.current = Date.now()
    scheduleIdleTimers()
  }, [scheduleIdleTimers])

  useEffect(() => {
    clearIdleTimers()
    lastActivityAtRef.current = Date.now()
    scheduleIdleTimers()
    return clearIdleTimers
  }, [clearIdleTimers, scheduleIdleTimers, user?.role])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previous = appStateRef.current
      appStateRef.current = nextState
      if (user?.role !== 'carer') return

      if (previous.match(/inactive|background/) && nextState === 'active') {
        const idleFor = Date.now() - lastActivityAtRef.current
        if (idleFor >= CARER_IDLE_TIMEOUT_MS) {
          forceIdleLogout()
          return
        }
        markActivity()
      }
      if (nextState === 'active') markActivity()
    })
    return () => subscription.remove()
  }, [forceIdleLogout, markActivity, user?.role])

  return (
    <View
      style={styles.root}
      onTouchStart={markActivity}
      onStartShouldSetResponderCapture={() => {
        markActivity()
        return false
      }}
    >
      <NavigationContainer onStateChange={markActivity}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name='Login' component={LoginScreen} />
          ) : user.role === 'carer' ? (
            <>
              <Stack.Screen name='CarerHome' component={CarerHomeScreen} />
              <Stack.Screen name='RecordNote' component={RecordNoteScreen} />
              <Stack.Screen name='MAR' component={MARScreen} />
              <Stack.Screen name='Handover' component={HandoverScreen} />
              <Stack.Screen name='WoundAssessment' component={WoundAssessmentScreen} />
              <Stack.Screen name='VitalsEntry' component={VitalsEntryScreen} />
              <Stack.Screen name='FluidBalance' component={FluidBalanceScreen} />
              <Stack.Screen name='NEWS2Calculator' component={NEWS2Calculator} />
            </>
          ) : user.role === 'senior' ? (
            <>
              <Stack.Screen name='SeniorAlerts' component={AlertsScreen} />
              <Stack.Screen name='NoteReview' component={NoteReviewScreen} />
            </>
          ) : user.role === 'manager' ? (
            <Stack.Screen name='ManagerDashboard' component={ManagerDashboardScreen} />
          ) : (
            <>
              <Stack.Screen name='FamilyHome' component={FamilyHomeScreen} />
              <Stack.Screen name='FamilyUpdates' component={FamilyUpdatesScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initDatabase()
      .then(() => {
        startSyncEngine()
        setReady(true)
      })
      .catch(() => setReady(true))

    return () => {
      stopSyncEngine()
    }
  }, [])

  if (!ready) return null

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AppNavigator />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
