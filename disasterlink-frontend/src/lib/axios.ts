import axios from 'axios';
import { Capacitor } from '@capacitor/core';

let apiBase = import.meta.env.VITE_API_BASE_URL || 'https://darkgoldenrod-anteater-579870.hostingersite.com/api';

if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const customApiUrl = localStorage.getItem('custom_api_url');
    
    if (customApiUrl) {
        apiBase = customApiUrl + '/api';
    }
    // Capacitor's native runtime (Android/iOS)
    else if (Capacitor.isNativePlatform()) {
        apiBase = 'https://darkgoldenrod-anteater-579870.hostingersite.com/api';
    }
    // Only use Vite proxy if it's explicitly a local dev server (checking port is a good indicator, Vite uses 5173 usually)
    else if (window.location.port === '5173' || hostname.includes('.devtunnels.ms') || (hostname === 'localhost' && window.location.port !== '')) {
        apiBase = '/api';
    }
}

const axiosInstance = axios.create({
    baseURL: apiBase,
    withCredentials: true,
    adapter: 'fetch', // Force Fetch API instead of XHR to bypass Capacitor network bugs
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' // Required to bypass Ngrok warning page
    }
});

// Interceptor for Sanctum token
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

import { enqueueOfflineRequest } from './offlineQueue';

// Interceptor for 401 Unauthorized to auto-logout and Offline Queueing
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        // If offline and making a mutating request, queue it
        if (!navigator.onLine && error.config && ['post', 'put', 'delete', 'patch'].includes(error.config.method?.toLowerCase() || '')) {
            await enqueueOfflineRequest({
                method: error.config.method,
                url: error.config.url,
                data: error.config.data ? JSON.parse(error.config.data) : null,
                headers: error.config.headers
            });
            // Return a mock success response so the UI doesn't crash
            return Promise.resolve({ 
                data: { offline: true, message: 'Saved offline. Will sync when connection is restored.' }, 
                status: 200, 
                statusText: 'OK',
                headers: {},
                config: error.config
            });
        }

        if (error.response && error.response.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
