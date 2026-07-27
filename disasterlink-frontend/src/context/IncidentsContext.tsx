import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../lib/axios';
import echo from '../lib/echo';
import { useAuth } from './AuthContext';

interface IncidentsContextType {
  incidents: any[];
  setIncidents: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
  fetchIncidents: (force?: boolean) => Promise<void>;
}

const IncidentsContext = createContext<IncidentsContextType | undefined>(undefined);

export const IncidentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  // Only show loading true initially. Once loaded, background refetches don't trigger loading state
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async (force: boolean = false) => {
    try {
      if (force) setLoading(true); // show loader on manual sync
      const response = await axiosInstance.get(force ? '/incidents/sync' : '/incidents');
      if (Array.isArray(response.data)) {
        setIncidents(response.data);
      }
    } catch (error) {
      console.warn("API Offline, check Laravel server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchIncidents();
    // Auto-refresh in the background every 15s as a fallback.
    const interval = setInterval(fetchIncidents, 15000);

    // Real-time WebSocket listener
    const channel = echo.channel('incidents');
    channel.listen('.incident.event', (e: any) => {
      console.log('Global Real-time Incident Event:', e);
      fetchIncidents(); // Fast refresh the global state without spinners
    });

    return () => {
      clearInterval(interval);
      echo.leaveChannel('incidents');
    };
  }, [isAuthenticated]);

  return (
    <IncidentsContext.Provider value={{ incidents, setIncidents, loading, fetchIncidents }}>
      {children}
    </IncidentsContext.Provider>
  );
};

export const useIncidents = () => {
  const context = useContext(IncidentsContext);
  if (context === undefined) {
    throw new Error('useIncidents must be used within an IncidentsProvider');
  }
  return context;
};
