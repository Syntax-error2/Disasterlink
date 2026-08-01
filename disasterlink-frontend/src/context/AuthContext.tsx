import React, { createContext, useContext, useState, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import axiosInstance from '../lib/axios';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    assigned_barangay?: string;
    lgu?: {
        id: number;
        name: string;
        subdomain: string;
        latitude: number;
        longitude: number;
    };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));

    const login = async (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));

        // Register for FCM Push Notifications
        try {
            let permStatus = await PushNotifications.checkPermissions();
            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }
            if (permStatus.receive === 'granted') {
                await PushNotifications.register();
                PushNotifications.addListener('registration', async (token: any) => {
                    try {
                        await axiosInstance.post('/fcm-token', { token: token.value }, {
                            headers: { Authorization: `Bearer ${newToken}` }
                        });
                    } catch (e) {
                        console.error('Failed to update FCM token', e);
                    }
                });
            }
        } catch (e) {
            console.error('Push notification registration failed', e);
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
