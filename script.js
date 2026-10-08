const menu = document.querySelector('.menu-btn');
const links = document.querySelector('.nav-links');
menu.addEventListener('click', () => { links.classList.toggle('open'); });
document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => links.classList.remove('open')));
document.querySelector('#contact-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const status = document.querySelector('.form-status');
  status.textContent = 'تم استلام رسالتك — سنعود إليك قريباً.';
  event.target.reset();
});
