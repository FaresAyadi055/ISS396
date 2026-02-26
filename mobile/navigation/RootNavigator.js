import React, { useContext } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { ActivityIndicator, View } from 'react-native'
import { AuthContext } from '../context/AuthContext'
import { LoginScreen } from '../screens/LoginScreen'
import { DashboardScreen } from '../screens/DashboardScreen'

const Stack = createStackNavigator()

export const RootNavigator = () => {
  const { user, isLoading } = useContext(AuthContext)

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {user ? (
          // Authenticated screens
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              animationEnabled: true,
            }}
          />
        ) : (
          // Login screen
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              animationEnabled: true,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
