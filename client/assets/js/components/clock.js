export function initializeClock() {
    const clock = document.getElementById('clock');
    if (!clock) return;
    function updateClock() {
        const now = new Date();
        let h = now.getHours();
        const m = String(now.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        clock.textContent = `${h}:${m} ${ampm}`;
    }
    updateClock();
    setInterval(updateClock, 1000);
}