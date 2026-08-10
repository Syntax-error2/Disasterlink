import { useEffect } from 'react';
import axiosInstance from '../lib/axios';
import { getOfflineQueue, dequeueOfflineRequest } from '../lib/offlineQueue';

export const OfflineSyncManager = () => {
    useEffect(() => {
        const syncOfflineRequests = async () => {
            if (!navigator.onLine) return;
            
            const queue = await getOfflineQueue();
            if (queue.length === 0) return;

            console.log(`[OfflineSync] Found ${queue.length} offline requests. Syncing now...`);

            for (const request of queue) {
                try {
                    console.log(`[OfflineSync] Syncing request to ${request.url}`);
                    await axiosInstance({
                        method: request.method,
                        url: request.url,
                        data: request.data,
                        headers: request.headers
                    });
                    
                    // Successfully synced, remove from queue
                    await dequeueOfflineRequest(request.id);
                } catch (error) {
                    console.error('[OfflineSync] Failed to sync request', error);
                    // If it failed due to network, it will just stay in the queue for next time.
                    // If it failed due to 400/500, we might want to discard it, but for now keep it simple.
                }
            }
        };

        window.addEventListener('online', syncOfflineRequests);

        // Try syncing immediately in case we reloaded while online but have queued items
        syncOfflineRequests();

        return () => window.removeEventListener('online', syncOfflineRequests);
    }, []);

    return null;
};
