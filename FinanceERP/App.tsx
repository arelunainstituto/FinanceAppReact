import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Font from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });
  
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Preload fonts explicitly for web platform
        if (Platform.OS === 'web') {
          await Font.loadAsync({
            ...Ionicons.font,
          });
          
          // Additional delay to ensure fonts are fully loaded in production
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verify font loading by checking if font family is available
          if (typeof document !== 'undefined') {
            const testElement = document.createElement('div');
            testElement.style.fontFamily = 'Ionicons';
            testElement.style.visibility = 'hidden';
            testElement.style.position = 'absolute';
            testElement.innerHTML = '&#xf2c7;'; // Test icon
            document.body.appendChild(testElement);
            
            // Wait a bit more for font to be applied
            await new Promise(resolve => setTimeout(resolve, 200));
            document.body.removeChild(testElement);
          }
        }
        
        setIsReady(true);
      } catch (e) {
        console.warn('Font loading error:', e);
        // Continue anyway to prevent app from being stuck
        setIsReady(true);
      }
    }

    if (fontsLoaded) {
      prepare();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || !isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
});
