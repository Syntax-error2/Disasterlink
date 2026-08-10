import { get, set } from 'idb-keyval';

export interface OfflineRequest {
    id: string;
    method: string;
    url: string;
    data?: any;
    headers?: any;
    timestamp: number;
}

const QUEUE_KEY = 'offline_request_queue';

export const getOfflineQueue = async (): Promise<OfflineRequest[]> => {
    const queue = await get<OfflineRequest[]>(QUEUE_KEY);
    return queue || [];
};

export const enqueueOfflineRequest = async (request: Omit<OfflineRequest, 'id' | 'timestamp'>) => {
    const queue = await getOfflineQueue();
    const newRequest: OfflineRequest = {
        ...request,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
    };
    queue.push(newRequest);
    await set(QUEUE_KEY, queue);
    return newRequest;
};

export const dequeueOfflineRequest = async (id: string) => {
    const queue = await getOfflineQueue();
    const filteredQueue = queue.filter(req => req.id !== id);
    await set(QUEUE_KEY, filteredQueue);
};

export const clearOfflineQueue = async () => {
    await set(QUEUE_KEY, []);
};
