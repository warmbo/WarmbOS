import { initializeWindowCreation } from './window-creation.js';
import { initializeStartMenuToggle } from './start-menu.js';
import { initializeClock } from './clock.js';

Promise.all([
    fetch('../components/taskbar.html').then(r => r.text()).then(html => document.getElementById('taskbar').innerHTML = html),
    fetch('../components/start-menu.html').then(r => r.text()).then(html => document.getElementById('start-menu').innerHTML = html),
    fetch('../components/desktop-icons.html').then(r => r.text()).then(html => document.getElementById('desktop-icons').innerHTML = html)
]).then(() => {
    console.log("[Init] UI components loaded");
    initializeWindowCreation();
    initializeStartMenuToggle();
    initializeClock();
});