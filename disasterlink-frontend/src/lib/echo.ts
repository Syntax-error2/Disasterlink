import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// @ts-ignore
window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'pusher',
    key: 'a7521079a4a30fbc4ab1',
    cluster: 'ap1',
    forceTLS: true,
});

export default echo;
