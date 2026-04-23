import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [magicCode, setMagicCode] = useState('')
  const [error, setError] = useState('')
  const { login, setLoading, isLoading } = useAuthStore()

  const handleLogin = async () => {
    setError('')
    if (!email || !magicCode) {
      setError('Please enter your email and family access code.')
      return
    }

    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/api/v1/family/auth/token`, { email, magic_code: magicCode }, { timeout: 10000 })
      login({
        id: data.user_id ?? data.id,
        name: data.name,
        email: data.email,
        resident_id: data.resident_id,
        access_token: data.access_token,
      })
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        (err?.message?.includes('Network') ? `Cannot reach server at ${API}. Check the backend is running.` : null) ||
        'Could not sign in with that family access code.'
      )
    } finally {
      setLoading(false)
    }
  }

  const devBypass = () =>
    login({
      id: 'family-dev',
      name: 'Dev Family Member',
      email: 'family@carehomeos.local',
      resident_id: 'res-001',
      access_token: 'dev-family-token',
    })

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle='dark-content' backgroundColor='#f0f4ff' />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps='handled'>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}><Text style={styles.logoIcon}>CH</Text></View>
          <Text style={styles.appName}>CareHomeOS Family</Text>
          <Text style={styles.tagline}>Warm, simple updates from the care team.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Family sign in</Text>
          {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          <Text style={styles.label}>Email address</Text>
          <TextInput style={styles.input} placeholder='you@example.com' placeholderTextColor='#9ca3af' value={email} onChangeText={setEmail} autoCapitalize='none' keyboardType='email-address' />

          <Text style={styles.label}>Access code</Text>
          <TextInput style={styles.input} placeholder='Family access code' placeholderTextColor='#9ca3af' value={magicCode} onChangeText={setMagicCode} secureTextEntry />

          <TouchableOpacity style={[styles.btn, isLoading && styles.btnDisabled]} onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
            {isLoading ? <ActivityIndicator color='#fff' /> : <Text style={styles.btnText}>Sign in</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.devBtn} onPress={devBypass}>
          <Text style={styles.devBtnText}>Open local family view</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const C = { brand: '#4f46e5', dark: '#0f172a' }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f4ff' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 76, height: 76, borderRadius: 22, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: C.brand, shadowOpacity: 0.28, shadowRadius: 14, elevation: 8 },
  logoIcon: { fontSize: 22, color: '#fff', fontWeight: '900' },
  appName: { fontSize: 27, fontWeight: '800', color: C.brand, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: '#64748b', marginTop: 5, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 26, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 24, elevation: 6, marginBottom: 20 },
  heading: { fontSize: 23, fontWeight: '700', color: C.dark, marginBottom: 22 },
  errorBox: { backgroundColor: '#fff1f1', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  errorText: { color: '#dc2626', fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 7 },
  input: { backgroundColor: '#f8fafc', borderRadius: 13, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, marginBottom: 16, borderWidth: 1.5, borderColor: '#e2e8f0', color: C.dark },
  btn: { backgroundColor: C.brand, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4, shadowColor: C.brand, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  devBtn: { alignSelf: 'center', backgroundColor: '#eef2ff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  devBtnText: { color: C.brand, fontWeight: '800' },
})
