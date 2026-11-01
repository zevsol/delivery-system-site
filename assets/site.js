(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  if (menu && nav) {
    const close = () => { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); };
    menu.addEventListener('click', () => {
      const willOpen = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', willOpen);
      menu.setAttribute('aria-expanded', String(willOpen));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  }
  document.querySelectorAll('button[data-copy-target],button[data-copy-file]').forEach(button => {
    const originalLabel = button.textContent;
    button.addEventListener('click', async () => {
      try {
        let value = '';
        const file = button.getAttribute('data-copy-file');
        if (file) {
          const response = await fetch(file, {cache: 'no-cache'});
          if (!response.ok) throw new Error('Cannot load sample');
          value = await response.text();
        } else {
          value = document.getElementById(button.dataset.copyTarget)?.textContent ?? '';
        }
        if (!value) throw new Error('Nothing to copy');
        await navigator.clipboard.writeText(value);
        button.textContent = 'Copied ✓';
        button.classList.add('copied');
        window.setTimeout(() => { button.textContent = originalLabel; button.classList.remove('copied'); }, 1700);
      } catch (error) {
        button.textContent = 'Copy failed';
        window.setTimeout(() => { button.textContent = originalLabel; }, 1800);
      }
    });
  });
})();
