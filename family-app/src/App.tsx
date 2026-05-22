import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './services/i18n';
import { ThemeProvider } from './components/ThemeProvider';
import OfflineIndicator from './components/OfflineIndicator';
import LanguageSelector from './components/LanguageSelector';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { UpdatesScreen } from './screens/UpdatesScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { AlertScreen } from './screens/AlertScreen';
import { useAuthStore } from './stores/authStore';

const Stack = createStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  const { user } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize app
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <View style={styles.spinner} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                  <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                  <>
                    <Stack.Screen name="FamilyHome" component={HomeScreen} />
                    <Stack.Screen name="FamilyUpdates" component={UpdatesScreen} />
                    <Stack.Screen name="FamilyMessages" component={MessagesScreen} />
                    <Stack.Screen name="FamilyAlerts" component={AlertScreen} />
                  </>
                )}
              </Stack.Navigator>
            </NavigationContainer>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#2563EB',
    borderTopColor: 'transparent',
  },
});
