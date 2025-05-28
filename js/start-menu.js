export function initializeStartMenuToggle() {
    const startMenuButton = document.querySelector('.start-menu-button');
    const startMenu = document.querySelector('.start-menu');
    if (startMenuButton && startMenu) {
        startMenu.classList.remove('show');
        startMenuButton.addEventListener('click', e => {
            e.stopPropagation();
            startMenu.classList.toggle('show');
        });
        document.addEventListener('click', e => {
            if (!startMenu.contains(e.target) && !startMenuButton.contains(e.target)) {
                startMenu.classList.remove('show');
            }
        });
    }
}
