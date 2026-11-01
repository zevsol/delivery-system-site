(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const expanded = menu.getAttribute('aria-expanded') === 'true';
      menu.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('is-open', !expanded);
    });
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) {
        menu.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      }
    });
  }

  const phaseButtons = [...document.querySelectorAll('[data-story-step]')];
  const storyPanel = document.querySelector('[data-story-panel]');
  const storyProgress = document.querySelector('[data-story-progress]');
  const storyCounters = [...document.querySelectorAll('[data-story-counter]')];
  const storySections = [...document.querySelectorAll('[data-story-section]')];
  function activateStoryStep(index, scroll = false) {
    if (!phaseButtons.length || !storyPanel) return;
    const safeIndex = Math.max(0, Math.min(index, phaseButtons.length - 1));
    const button = phaseButtons[safeIndex];
    const template = document.querySelector(button.dataset.storyTemplate);
    phaseButtons.forEach((item, i) => {
      item.setAttribute('aria-current', i === safeIndex ? 'step' : 'false');
      item.classList.toggle('is-active', i === safeIndex);
    });
    storyPanel.querySelector('[data-panel-kicker]').textContent = button.dataset.kicker;
    storyPanel.querySelector('[data-panel-title]').textContent = button.dataset.title;
    storyPanel.querySelector('[data-panel-description]').textContent = button.dataset.description;
    const body = storyPanel.querySelector('[data-panel-content]');
    body.replaceChildren(template.content.cloneNode(true));
    if (storyProgress) storyProgress.style.width = `${((safeIndex + 1) / phaseButtons.length) * 100}%`;
    storyCounters.forEach(counter => { counter.textContent = `${String(safeIndex + 1).padStart(2, '0')} / ${String(phaseButtons.length).padStart(2, '0')}`; });
    storyPanel.dataset.activeStep = String(safeIndex + 1);
    const progressBar = storyPanel.querySelector('[role="progressbar"]');
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(safeIndex + 1));
    if (scroll) storySections[safeIndex]?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  phaseButtons.forEach((button, index) => button.addEventListener('click', () => activateStoryStep(index, true)));
  if (storySections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activateStoryStep(Number(visible.target.dataset.storySection));
    }, { rootMargin: '-30% 0px -45% 0px', threshold: [0, 0.2, 0.5, 0.8] });
    storySections.forEach(section => observer.observe(section));
  }
  activateStoryStep(0);

  const demoTabs = [...document.querySelectorAll('[data-demo-tab]')];
  const demoPanels = [...document.querySelectorAll('[data-demo-panel]')];
  demoTabs.forEach((tab, index) => tab.addEventListener('click', () => {
    demoTabs.forEach((item, i) => {
      const selected = i === index;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    demoPanels.forEach((panel, i) => { panel.hidden = i !== index; });
  }));
  demoTabs.forEach((tab, index) => tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? demoTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : demoTabs.length - 1)) % demoTabs.length;
    demoTabs[next].focus();
    demoTabs[next].click();
  }));

  document.querySelectorAll('[data-copy-url]').forEach(button => button.addEventListener('click', async () => {
    const status = button.parentElement.querySelector('[data-copy-status]') || document.querySelector('[data-copy-status]');
    try {
      const source = [...document.querySelectorAll('[data-load-markdown]')].find(item => item.dataset.loadMarkdown === button.dataset.copyUrl && item.dataset.loaded === 'true');
      let markdown = source?.textContent;
      if (!markdown) {
        const response = await fetch(button.dataset.copyUrl);
        if (!response.ok) throw new Error('Markdown source unavailable');
        markdown = await response.text();
      }
      await navigator.clipboard.writeText(markdown);
      if (status) status.textContent = button.dataset.copiedLabel || 'Copied';
    } catch {
      if (status) status.textContent = button.dataset.copyErrorLabel || 'Copy unavailable — use Download instead.';
    }
  }));

  document.querySelectorAll('[data-load-markdown]').forEach(async output => {
    try {
      const response = await fetch(output.dataset.loadMarkdown);
      if (!response.ok) throw new Error('Markdown source unavailable');
      output.textContent = await response.text();
      output.dataset.loaded = 'true';
    } catch {
      output.textContent = output.dataset.loadError || 'The recorded Markdown file could not be loaded.';
    }
  });

  document.querySelectorAll('[data-copy-target]').forEach(button => button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    const status = button.closest('.code-panel')?.querySelector('[data-copy-status]');
    try {
      await navigator.clipboard.writeText(target.innerText);
      if (status) status.textContent = button.dataset.copiedLabel || 'Copied';
    } catch {
      if (status) status.textContent = button.dataset.copyErrorLabel || 'Copy unavailable';
    }
  }));
})();
