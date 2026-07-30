import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../lib/axios';
import echo from '../lib/echo';
import { useAuth } from './AuthContext';

interface IncidentsContextType {
  incidents: any[];
  setIncidents: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
  fetchIncidents: (force?: boolean) => Promise<void>;
  fetchMoreIncidents: () => Promise<void>;
  hasMore: boolean;
}

const IncidentsContext = createContext<IncidentsContextType | undefined>(undefined);

export const IncidentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchIncidents = async (force: boolean = false) => {
    try {
      if (force) setLoading(true);
      const response = await axiosInstance.get(force ? '/incidents/sync' : '/incidents');
      if (response.data && Array.isArray(response.data.data)) {
        setIncidents(response.data.data);
        setNextCursor(response.data.next_cursor);
      } else if (Array.isArray(response.data)) {
        // Fallback for non-paginated endpoints just in case
        setIncidents(response.data);
      }
    } catch (error) {
      console.warn("API Offline, check Laravel server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreIncidents = async () => {
    if (!nextCursor) return;
    try {
      const response = await axiosInstance.get(`/incidents?cursor=${nextCursor}`);
      if (response.data && Array.isArray(response.data.data)) {
        setIncidents(prev => {
            // Deduplicate to avoid overlap issues during real-time sync
            const newItems = response.data.data.filter((newItem: any) => !prev.some(oldItem => oldItem.id === newItem.id));
            return [...prev, ...newItems];
        });
        setNextCursor(response.data.next_cursor);
      }
    } catch (error) {
      console.warn("Failed to load more incidents.");
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
      if (e && e.incident) {
          window.dispatchEvent(new CustomEvent('new_sos_alert', { detail: e.incident }));
      }
      fetchIncidents(); // Fast refresh the global state without spinners
    });

    return () => {
      clearInterval(interval);
      echo.leaveChannel('incidents');
    };
  }, [isAuthenticated]);

  return (
    <IncidentsContext.Provider value={{ incidents, setIncidents, loading, fetchIncidents, fetchMoreIncidents, hasMore: !!nextCursor }}>
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
