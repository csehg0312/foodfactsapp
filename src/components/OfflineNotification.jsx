import { createSignal, onMount } from 'solid-js';

function OfflineNotification() {
    const [isOnline, setIsOnline] = createSignal(navigator.onLine);

    onMount(() => {
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));
    });

    return (
        <>
            {!isOnline() && (
                <div class="offline-notification">
                    You are currently offline
                </div>
            )}
        </>
    );
}

export default OfflineNotification;