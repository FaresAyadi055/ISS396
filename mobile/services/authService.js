import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authService = {
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      })

      if (response.data.token) {
        // Store token
        await AsyncStorage.setItem('authToken', response.data.token)
        
        // Store user info
        await AsyncStorage.setItem(
          'user',
          JSON.stringify(response.data.user)
        )
      }

      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  async getToken() {
    return await AsyncStorage.getItem('authToken')
  },

  async getUser() {
    const userStr = await AsyncStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  async logout() {
    await AsyncStorage.removeItem('authToken')
    await AsyncStorage.removeItem('user')
  },

  async isAuthenticated() {
    const token = await this.getToken()
    return !!token
  },
}
