import axios from 'axios';

let apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Check if running inside compiled Capacitor Android App
    // @ts-ignore
    if (window.Capacitor && window.Capacitor.isNative) {
        apiBase = 'http://192.168.1.150:8000/api';
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
    const token = sessionStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default axiosInstance;
