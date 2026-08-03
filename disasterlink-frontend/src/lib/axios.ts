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

// Interceptor for 401 Unauthorized to auto-logout
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
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
