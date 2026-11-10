(() => {
  const installCloudflareBeacon = () => {
    if (window.location.hostname !== 'ds.zevsol.com') return;
    if (document.querySelector('script[data-cf-beacon]')) return;

    const beacon = document.createElement('script');
    beacon.type = 'module';
    beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    beacon.setAttribute('data-cf-beacon', JSON.stringify({ token: 'b938977f95e74883bc902ed62de72233' }));
    document.body.appendChild(beacon);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installCloudflareBeacon, { once: true });
  } else {
    installCloudflareBeacon();
  }

  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (menu && nav) {
    const closeMenu = () => {
      menu.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    };
    menu.addEventListener('click', () => {
      const expanded = menu.getAttribute('aria-expanded') === 'true';
      menu.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('is-open', !expanded);
    });
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menu.focus();
      }
    });
  }

  const phaseButtons = [...document.querySelectorAll('[data-story-step]')];
  const storyPanel = document.querySelector('[data-story-panel]');
  const storyProgress = document.querySelector('[data-story-progress]');
  const storyCounters = [...document.querySelectorAll('[data-story-counter]')];
  const storySections = [...document.querySelectorAll('[data-story-section]')];
  const storySteps = document.querySelector('.story-steps');
  let observerPaused = false;
  let observerResumeTimer;
  const resumeObserver = () => {
    observerPaused = false;
    window.clearTimeout(observerResumeTimer);
  };
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
    const progress = ((safeIndex + 1) / phaseButtons.length) * 100;
    if (storyProgress) storyProgress.style.width = `${progress}%`;
    if (storySteps) storySteps.style.setProperty('--stage-progress', `${progress}%`);
    storyCounters.forEach(counter => { counter.textContent = `${String(safeIndex + 1).padStart(2, '0')} / ${String(phaseButtons.length).padStart(2, '0')}`; });
    storyPanel.dataset.activeStep = String(safeIndex + 1);
    const progressBar = storyPanel.querySelector('[role="progressbar"]');
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(safeIndex + 1));
    if (scroll) {
      observerPaused = true;
      window.clearTimeout(observerResumeTimer);
      observerResumeTimer = window.setTimeout(resumeObserver, 1100);
      const target = window.matchMedia('(max-width: 760px)').matches ? storyPanel : storySections[safeIndex];
      target?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  phaseButtons.forEach((button, index) => button.addEventListener('click', () => activateStoryStep(index, true)));
  if (storySections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (observerPaused) return;
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activateStoryStep(Number(visible.target.dataset.storySection));
    }, { rootMargin: '-30% 0px -45% 0px', threshold: [0, 0.2, 0.5, 0.8] });
    storySections.forEach(section => observer.observe(section));
    window.addEventListener('wheel', resumeObserver, { passive: true });
    window.addEventListener('touchstart', resumeObserver, { passive: true });
    window.addEventListener('pointerdown', event => {
      if (event.clientX >= document.documentElement.clientWidth) resumeObserver();
    });
    window.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) resumeObserver();
    });
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

  const caseSelect = document.querySelector('[data-demo-case-select]');
  const casePanels = [...document.querySelectorAll('[data-case-panel]')];
  if (caseSelect && casePanels.length) {
    caseSelect.addEventListener('change', () => {
      casePanels.forEach(panel => { panel.hidden = panel.dataset.casePanel !== caseSelect.value; });
      const cases = document.querySelector('#demo-cases');
      if (cases) cases.dataset.activeCase = caseSelect.value;
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openItems = [...document.querySelectorAll('.demo-case-panel:not([hidden]) details[open]')]
      .filter(item => !item.closest('[hidden]'));
    const targetDetails = event.target.closest('details[open]');
    const visibleTargetDetails = targetDetails && !targetDetails.closest('[hidden]')
      ? targetDetails
      : null;
    const openDetails = visibleTargetDetails || openItems.at(-1);
    if (!openDetails) return;
    openDetails.open = false;
    openDetails.querySelector('summary')?.focus();
  });

  document.querySelectorAll('[data-copy-text]').forEach(button => button.addEventListener('click', async () => {
    const status = document.querySelector('[data-tech-copy-status]');
    try {
      await navigator.clipboard.writeText(button.dataset.copyText);
      if (status) status.textContent = button.dataset.copiedLabel || 'Copied';
    } catch {
      if (status) status.textContent = button.dataset.copyErrorLabel || 'Copy unavailable';
    }
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

  document.querySelectorAll('[data-copy-markdown]').forEach(button => button.addEventListener('click', async () => {
    const card = button.closest('.multi-markdown-card');
    const source = card?.querySelector('.markdown-draft-source');
    const status = card?.querySelector('[data-draft-copy-status]');
    try {
      if (!source) throw new Error('Markdown draft unavailable');
      await navigator.clipboard.writeText(source.value);
      if (status) status.textContent = button.dataset.copiedLabel || 'Copied';
    } catch {
      if (status) status.textContent = button.dataset.copyErrorLabel || 'Copy unavailable';
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
