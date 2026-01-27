import '../css/style.css';
import '../css/layout.css';

console.log('Revivr Studios site loaded.');

// Dynamic Year for Footer
const yearSpan = document.getElementById('current-year');
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}
