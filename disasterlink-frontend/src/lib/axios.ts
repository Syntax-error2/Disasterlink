import axios from 'axios';
import { Capacitor } from '@capacitor/core';

let apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Use the official Capacitor module to detect native environments
    if (Capacitor.isNativePlatform()) {
        apiBase = 'https://arm-syntax-discs-dont.trycloudflare.com/api';
    } 
    else if (hostname.includes('.devtunnels.ms') || hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
        // Use relative path to let Vite Proxy handle the routing securely, bypassing ALL CORS and Microsoft Proxy issues!
        apiBase = '/api';
    }
}

const axiosInstance = axios.create({
    baseURL: apiBase,
    withCredentials: true,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
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

export default axiosInstance;
