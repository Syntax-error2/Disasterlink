import axios from 'axios';
import { Capacitor } from '@capacitor/core';

let apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Allow user to manually override the API URL for testing changing Cloudflare tunnels
    const customApiUrl = localStorage.getItem('custom_api_url');
    
    if (customApiUrl) {
        apiBase = customApiUrl + '/api';
    }
    // Use the official Capacitor module to detect native environments
    else if (Capacitor.isNativePlatform()) {
        apiBase = 'https://disasterlink-api-binalbagan.loca.lt/api';
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
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true' // Required to bypass Localtunnel warning page
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
