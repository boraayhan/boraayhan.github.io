if (window.location.href.includes('portfolio')) {
  window.location.replace('https://boraayhan.github.io/assets/portfolio.pdf');
}

const COVER_VIDEOS = [
  // Video title, Speed (1 = default, 0.5 = half speed)
  ['tar_drone_flight.mov', 1.3],
  ['shooting_targeting_algorithm.MOV', 1],
  ['grace_lidar.mp4', 1.5],
  ['flight_controls_demo.mov', 1],
  ['ARIA_goofing_off.MOV', 1],
  ['uav_cad.mp4', 1],
];

const COVER_VIDEO_DIR = '/assets/cover_video/';

const layers =
    Array.from(document.querySelectorAll('#opening-bg .opening-bg-layer'));

if (layers.length === 2 && COVER_VIDEOS.length > 0) {
  const clip = (i) => COVER_VIDEOS[i % COVER_VIDEOS.length];
  let index = 0;
  let failures = 0;
  let current = layers[0];
  let next = layers[1];

  const prime = (video, i) => {
    const [file, rate] = clip(i);
    video.dataset.rate = rate;
    video.src = COVER_VIDEO_DIR + file;
    video.playbackRate = rate;
    video.load();
  };

  const advance = () => {
    index += 1;

    const incoming = next;
    const outgoing = current;

    incoming.playbackRate = Number(incoming.dataset.rate);
    incoming.currentTime = 0;
    incoming.play().catch(() => {});

    incoming.classList.add('is-active');
    outgoing.classList.remove('is-active');

    current = incoming;
    next = outgoing;

    prime(outgoing, index + 1);
  };

  layers.forEach((video) => {
    video.addEventListener('ended', () => {
      if (video === current) advance();
    });
    video.addEventListener('loadedmetadata', () => {
      video.playbackRate = Number(video.dataset.rate);
      failures = 0;
    });
    video.addEventListener('error', () => {
      console.warn('cover video failed to load:', video.getAttribute('src'));
      failures += 1;
      if (failures >= COVER_VIDEOS.length) return;
      if (video === current)
        advance();
      else
        prime(video, index + 2);
    });
  });

  prime(current, 0);
  current.play().catch(() => {});
  prime(next, 1);
}

const EXPERIENCE_DATA = '/data/experience.json';

const experienceMount = document.getElementById('experience');

const buildOrgIcon = (entry) => {
  if (entry.logo) {
    const logo = document.createElement('img');
    logo.className = entry.logoLight ? 'org-icon org-icon-light' : 'org-icon';
    if (entry.logoCover) logo.classList.add('org-icon-cover');
    if (entry.logoContentWidth != null) {
      const tile = document.createElement('span');
      tile.className = 'org-icon org-icon-scaled';
      logo.className = 'org-icon-artwork';
      logo.style.transform =
          `scale(${entry.logoScale / entry.logoContentWidth})`;
      logo.src = entry.logo;
      logo.alt = (entry.org || entry.title || '') + ' logo';
      tile.appendChild(logo);
      return tile;
    }
    if (entry.logoScale != null) {
      logo.style.padding =
          `calc(56px * var(--bullet-scale) * ${(1 - entry.logoScale) / 2})`;
    }
    logo.src = entry.logo;
    logo.alt = (entry.org || entry.title || '') + ' logo';
    return logo;
  }

  const mark = document.createElement('span');
  mark.className = 'org-icon org-icon-mono';
  mark.textContent = entry.monogram || (entry.title || '?').slice(0, 2);
  mark.setAttribute('aria-hidden', 'true');
  return mark;
};

const buildEntry = (entry) => {
  const li = document.createElement('li');
  li.className = 'entry';
  if (entry.fullOnly) {
    li.dataset.fullOnly = '';
    li.hidden = !experienceExpanded;
  }
  if (entry.education) li.classList.add('education');

  const hasLink = Boolean(entry.href);
  const link = document.createElement(hasLink ? 'a' : 'span');
  link.className = hasLink ? 'org-link' : 'org-link org-link-static';
  if (hasLink) {
    link.target = '_blank';
    link.rel = 'noopener';
    link.href = entry.href;
    link.setAttribute('aria-label', entry.org || entry.title || '');
  }
  link.appendChild(buildOrgIcon(entry));

  const text = document.createElement('div');
  text.className = 'entry-text';

  const title = document.createElement('span');
  title.className = 'entry-role';
  title.textContent = entry.title || '';
  text.appendChild(title);

  if (entry.org) {
    const org = document.createElement('span');
    org.className = 'entry-org';
    org.textContent = entry.org;
    text.appendChild(org);
  }

  li.append(link, text);

  if (entry.date || entry.location) {
    const timing = document.createElement('div');
    timing.className = 'entry-timing';
    timing.hidden = !experienceExpanded;
    if (entry.date) {
      const date = document.createElement('span');
      date.className = 'entry-date';
      date.textContent = entry.date;
      timing.appendChild(date);
    }
    if (entry.location) {
      const location = document.createElement('span');
      location.className = 'entry-meta';
      location.textContent = entry.location;
      timing.appendChild(location);
    }
    li.appendChild(timing);
  }

  const description =
      Array.isArray(entry.description) ? entry.description : [];
  const skills = Array.isArray(entry.skills) ? entry.skills : [];

  if (description.length > 0 || skills.length > 0) {
    const details = document.createElement('div');
    details.className = 'entry-details';

    const inner = document.createElement('div');
    inner.className = 'entry-details-inner';

    if (description.length > 0) {
      const list = document.createElement('ul');
      list.className = 'entry-description';
      description.forEach((line) => {
        const item = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'typewriter';
        span.dataset.text = line;
        item.appendChild(span);
        list.appendChild(item);
      });
      inner.appendChild(list);
    }

    if (skills.length > 0) {
      const chips = document.createElement('ul');
      chips.className = 'entry-skills';
      skills.forEach((skill) => {
        const chip = document.createElement('li');
        chip.textContent = skill;
        chips.appendChild(chip);
      });
      inner.appendChild(chips);
    }

    details.appendChild(inner);
    li.appendChild(details);
  }

  return li;
};

const SLIDE_DURATION = 380;
const STAGGER = 70;
const TYPE_SPEED = 9;
const UNTYPE_SPEED = 4;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runTokens = new WeakMap();

const isCurrent = (details, token) => runTokens.get(details) === token;

const typeText = async (details, span, token) => {
  const text = span.dataset.text || '';
  for (let i = 1; i <= text.length; i++) {
    if (!isCurrent(details, token)) return false;
    span.textContent = text.slice(0, i);
    await wait(TYPE_SPEED);
  }
  return true;
};

const untypeText = async (details, span, token) => {
  const text = span.textContent;
  for (let i = text.length; i >= 0; i--) {
    if (!isCurrent(details, token)) return false;
    span.textContent = text.slice(0, i);
    await wait(UNTYPE_SPEED);
  }
  return true;
};

const measure = (details) =>
    details.firstElementChild ? details.firstElementChild.scrollHeight : 0;

const openEntryDetails = async (details, delay) => {
  const token = Symbol('open');
  runTokens.set(details, token);

  if (delay) await wait(delay);
  if (!isCurrent(details, token)) return;

  details.classList.add('is-open');
  details.style.maxHeight = measure(details) + 'px';

  if (reducedMotion.matches) {
    details.querySelectorAll('.typewriter')
        .forEach((span) => (span.textContent = span.dataset.text || ''));
    details.style.maxHeight = measure(details) + 'px';
    return;
  }

  await wait(SLIDE_DURATION);
  if (!isCurrent(details, token)) return;

  details.classList.add('is-typing');
  for (const span of details.querySelectorAll('.typewriter')) {
    if (!await typeText(details, span, token)) return;
    details.style.maxHeight = measure(details) + 'px';
  }
  details.classList.remove('is-typing');
  recalcLayout();
};

const closeEntryDetails = async (details, delay) => {
  const token = Symbol('close');
  runTokens.set(details, token);

  if (delay) await wait(delay);
  if (!isCurrent(details, token)) return;

  if (reducedMotion.matches) {
    details.classList.remove('is-open', 'is-typing');
    details.style.maxHeight = '';
    details.querySelectorAll('.typewriter')
        .forEach((span) => (span.textContent = ''));
    return;
  }

  details.classList.add('is-typing');
  const spans = Array.from(details.querySelectorAll('.typewriter')).reverse();
  for (const span of spans) {
    if (!await untypeText(details, span, token)) return;
  }
  details.classList.remove('is-typing');

  details.classList.remove('is-open');
  details.style.maxHeight = '';
  recalcLayout();
};

const fullExperienceButtons = document.querySelectorAll('.experience-toggle');
let experienceExpanded = false;
let experienceToggleVersion = 0;

const scrollExperienceToTop = () => {
  const scroller = document.querySelector('#panel-experience .panel-scroll');
  if (!scroller || scroller.scrollTop <= 1) return Promise.resolve();
  if (reducedMotion.matches) {
    scroller.scrollTo({top: 0, behavior: 'instant'});
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let timer;
    const finish = () => {
      clearTimeout(timer);
      scroller.removeEventListener('scrollend', finish);
      scroller.removeEventListener('scroll', onScroll);
      resolve();
    };
    // Also detect settling on browsers without scrollend support.
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(finish, 150);
    };
    scroller.addEventListener('scrollend', finish);
    scroller.addEventListener('scroll', onScroll, {passive: true});
    scroller.scrollTo({top: 0, behavior: 'smooth'});
    onScroll();
  });
};

if (experienceMount) {
  const toggleExperience = async () => {
    const version = ++experienceToggleVersion;
    experienceExpanded = !experienceExpanded;
    fullExperienceButtons.forEach((button) => {
      button.setAttribute('aria-expanded', String(experienceExpanded));
      button.textContent = experienceExpanded ? 'Hide details' : 'See details';
    });
    if (experienceExpanded) {
      await scrollExperienceToTop();
      if (version !== experienceToggleVersion) return;
    }

    experienceMount.querySelectorAll('[data-full-only], .entry-timing')
        .forEach((element) => { element.hidden = !experienceExpanded; });

    const all = Array.from(experienceMount.querySelectorAll('.entry-details'));
    const ordered = experienceExpanded ? all : all.slice().reverse();

    ordered.forEach((details, index) => {
      const delay = index * STAGGER;
      if (experienceExpanded)
        openEntryDetails(details, delay);
      else
        closeEntryDetails(details, delay);
    });
  };
  fullExperienceButtons.forEach((button) => {
    button.addEventListener('click', toggleExperience);
  });
}

if (experienceMount) {
  fetch(EXPERIENCE_DATA)
      .then((response) => {
        if (!response.ok)
          throw new Error(response.status + ' ' + response.statusText);
        return response.json();
      })
      .then((data) => {
        const fragment = document.createDocumentFragment();

        (data.sections || []).forEach((section) => {
          if (section.label) {
            const label = document.createElement('h3');
            label.className = 'bullets-label';
            if (section.fullOnly) {
              label.dataset.fullOnly = '';
              label.hidden = !experienceExpanded;
            }
            label.textContent = section.label;
            fragment.appendChild(label);
          }

          const list = document.createElement('ul');
          list.className = 'bullets';
          if (section.fullOnly) {
            list.dataset.fullOnly = '';
            list.hidden = !experienceExpanded;
          }
          (section.entries ||
           []).forEach((entry) => list.appendChild(buildEntry(entry)));
          fragment.appendChild(list);
        });

        experienceMount.replaceChildren(fragment);
        if (experienceExpanded) {
          experienceMount.querySelectorAll('.entry-details')
              .forEach((details) => openEntryDetails(details, 0));
        }
        recalcLayout();
      })
      .catch((error) => {
        console.error('could not load experience data:', error);
      });
}

const BLUEPRINT_DATA = '/data/blueprint.json';

const blueprint = document.querySelector('.blueprint');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const blueprintGrid = document.querySelector('.blueprint-grid');
const scrollRoot = document.querySelector('#panel-experience .panel-scroll');

let recalcLayout = () => {};

if ((blueprint || blueprintGrid) && scrollRoot && !reducedMotion.matches) {
  let ticking = false;

  const applyScroll = () => {
    const scrollable = scrollRoot.scrollHeight - scrollRoot.clientHeight;
    const pageProgress = scrollable > 0 ?
        Math.min(1, Math.max(0, scrollRoot.scrollTop / scrollable)) :
        0;

    document.documentElement.style.setProperty(
        '--page-progress', pageProgress.toFixed(4));
    document.documentElement.style.setProperty(
        '--bp-envelope', pageProgress.toFixed(4));

    ticking = false;
  };

  recalcLayout = applyScroll;

  scrollRoot.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(applyScroll);
  }, {passive: true});

  window.addEventListener('resize', applyScroll, {passive: true});
  window.addEventListener('load', applyScroll, {passive: true});

  new ResizeObserver(applyScroll).observe(scrollRoot);

  applyScroll();
}

const mountPlates = (plates) => {
  const fragment = document.createDocumentFragment();

  plates.forEach((plate) => {
    if (!plate || !plate.src) return;

    const img = document.createElement('img');
    img.className = 'blueprint-plate';
    img.src = plate.src;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';

    img.style.setProperty('--top', plate.top || '100vh');
    img.style.setProperty('--w', plate.width || '30vw');
    img.style.setProperty('--tilt', (plate.tilt || 0) + 'deg');
    if (plate.opacity != null)
      img.style.setProperty('--plate-opacity', plate.opacity);
    img.style.setProperty('--plate-left', plate.left || '50%');

    fragment.appendChild(img);
  });

  blueprint.replaceChildren(fragment);
};

if (blueprint) {
  fetch(BLUEPRINT_DATA)
      .then((response) => {
        if (!response.ok)
          throw new Error(response.status + ' ' + response.statusText);
        return response.json();
      })
      .then((data) => {
        mountPlates(data.plates || []);
        recalcLayout();
      })
      .catch((error) => {
        console.error('could not load blueprint data:', error);
      });
}

const navLinks = Array.from(document.querySelectorAll('.nav-link[data-panel]'));
const panels = Array.from(document.querySelectorAll('.panel[data-panel]'));
const panelTrack = document.querySelector('.panel-track');
const panelOrder = panels.map((panel) => panel.dataset.panel);

navLinks.forEach((link) => {
  const panel = panels.find((panel) => panel.dataset.panel === link.dataset.panel);
  const scroller = panel?.querySelector('.panel-scroll');
  const updateProgress = () => {
    const distance = scroller ? scroller.scrollHeight - scroller.clientHeight : 0;
    const progress = distance > 0 ?
        Math.min(1, Math.max(0, scroller.scrollTop / distance)) : 1;
    link.style.setProperty('--section-progress', progress);
  };
  if (scroller) {
    scroller.addEventListener('scroll', updateProgress, {passive: true});
    const observer = new ResizeObserver(updateProgress);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
  }
  window.addEventListener('load', updateProgress);
  window.addEventListener('resize', updateProgress, {passive: true});
  updateProgress();
});

const showPanel = (name) => {
  const index = panelOrder.indexOf(name);
  if (index === -1 || !panelTrack) return;

  panelTrack.style.transform =
      `translateY(calc(-${index} * var(--panel-h)))`;

  navLinks.forEach((link) => {
    link.classList.toggle('is-active', link.dataset.panel === name);
    if (link.dataset.panel === name)
      link.setAttribute('aria-current', 'page');
    else
      link.removeAttribute('aria-current');
  });

  if (name === 'experience') {
    window.requestAnimationFrame(
        () => window.requestAnimationFrame(recalcLayout));
  } else {
    document.documentElement.style.setProperty('--page-progress', 0);
  }
};

// Reset after loading/restoration, including nested scroll positions that the
// browser can preserve independently of the document's scroll position.
window.addEventListener('pageshow', () => {
  window.scrollTo({top: 0, left: 0, behavior: 'instant'});
  document.querySelectorAll('.panels, .panel-track, .panel, .panel-scroll')
      .forEach((element) => {
        element.scrollTo({top: 0, left: 0, behavior: 'instant'});
      });
  showPanel('home');
  recalcLayout();
});

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const targetScrollRoot =
        document.querySelector(`#panel-${link.dataset.panel} .panel-scroll`);
    if (targetScrollRoot) targetScrollRoot.scrollTop = 0;
    showPanel(link.dataset.panel);
  });
});

const panelsRoot = document.querySelector('.panels');

if (panelsRoot && panelTrack && panelOrder.length > 0) {
  let wheelLocked = false;

  const currentPanelName = () =>
      navLinks.find((link) => link.classList.contains('is-active'))
          ?.dataset.panel ??
      panelOrder[0];

  panelsRoot.addEventListener('wheel', (event) => {
    const name = currentPanelName();
    const index = panelOrder.indexOf(name);

    const activeScrollRoot =
        document.querySelector(`#panel-${name} .panel-scroll`);

    if (activeScrollRoot) {
      const atTop = activeScrollRoot.scrollTop <= 0;
      const atBottom =
          activeScrollRoot.scrollTop + activeScrollRoot.clientHeight >=
          activeScrollRoot.scrollHeight - 1;

      if ((event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom))
        return;
    }

    const nextIndex = index + (event.deltaY > 0 ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= panelOrder.length) return;

    event.preventDefault();
    if (wheelLocked) return;

    wheelLocked = true;
    showPanel(panelOrder[nextIndex]);
    window.setTimeout(() => {
      wheelLocked = false;
    }, 700);
  }, {passive: false});

  const SWIPE_THRESHOLD = 48;
  let touchStartY = 0;
  let touchStartX = 0;
  let touchEdge = 0;
  let touchTracking = false;

  panelsRoot.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) {
      touchTracking = false;
      return;
    }

    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
    touchTracking = true;

    const activeScrollRoot =
        document.querySelector(`#panel-${currentPanelName()} .panel-scroll`);

    if (!activeScrollRoot) {
      touchEdge = 3;
      return;
    }

    touchEdge = 0;
    if (activeScrollRoot.scrollTop <= 0) touchEdge |= 1;
    if (activeScrollRoot.scrollTop + activeScrollRoot.clientHeight >=
        activeScrollRoot.scrollHeight - 1)
      touchEdge |= 2;
  }, {passive: true});

  panelsRoot.addEventListener('touchmove', (event) => {
    if (!touchTracking || event.touches.length !== 1) return;

    const deltaY = touchStartY - event.touches[0].clientY;
    const deltaX = touchStartX - event.touches[0].clientX;
    if (Math.abs(deltaY) < SWIPE_THRESHOLD ||
        Math.abs(deltaY) <= Math.abs(deltaX))
      return;

    const goingDown = deltaY > 0;
    if ((goingDown && !(touchEdge & 2)) || (!goingDown && !(touchEdge & 1)))
      return;

    const nextIndex = panelOrder.indexOf(currentPanelName()) +
        (goingDown ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= panelOrder.length) return;

    if (event.cancelable) event.preventDefault();
    touchTracking = false;
    if (wheelLocked) return;

    wheelLocked = true;
    showPanel(panelOrder[nextIndex]);
    window.setTimeout(() => {
      wheelLocked = false;
    }, 700);
  }, {passive: false});

  panelsRoot.addEventListener('touchend', () => {
    touchTracking = false;
  }, {passive: true});
}

const GRADIENT_DEBUG_CONTROLS = [
  {
    group: 'Grid',
    label: 'Base opacity',
    prop: '--bp-base',
    min: 0,
    max: 1,
    step: 0.01,
    value: 0.8
  },
  {
    group: 'Grid',
    label: 'Scroll multiplier',
    prop: '--bp-mult',
    min: 0,
    max: 1,
    step: 0.01,
    value: 1
  },
  {
    group: 'Grid',
    label: 'Linear fade start %',
    prop: '--bp-lin-start',
    min: 0,
    max: 100,
    step: 1,
    value: 0,
    unit: '%'
  },
  {
    group: 'Grid',
    label: 'Linear fade end %',
    prop: '--bp-lin-end',
    min: 0,
    max: 100,
    step: 1,
    value: 100,
    unit: '%'
  },
  {
    group: 'Grid',
    label: 'Radial width %',
    prop: '--bp-rad-x',
    min: 10,
    max: 150,
    step: 1,
    value: 150,
    unit: '%'
  },
  {
    group: 'Grid',
    label: 'Radial height %',
    prop: '--bp-rad-y',
    min: 10,
    max: 150,
    step: 1,
    value: 150,
    unit: '%'
  },
  {
    group: 'Grid',
    label: 'Radial inner %',
    prop: '--bp-rad-inner',
    min: 0,
    max: 100,
    step: 1,
    value: 0,
    unit: '%'
  },
  {
    group: 'Grid',
    label: 'Radial outer %',
    prop: '--bp-rad-outer',
    min: 0,
    max: 150,
    step: 1,
    value: 0,
    unit: '%'
  },
  {
    group: 'SVG plates',
    label: 'Base opacity',
    prop: '--svg-base',
    min: 0,
    max: 1,
    step: 0.01,
    value: 0.3
  },
  {
    group: 'SVG plates',
    label: 'Scroll multiplier',
    prop: '--svg-scroll-mult',
    min: 0,
    max: 1,
    step: 0.01,
    value: 1
  },
  {
    group: 'SVG plates',
    label: 'Overall multiplier',
    prop: '--svg-mult',
    min: 0,
    max: 3,
    step: 0.05,
    value: 1
  },
];

if (window.location.search.includes('debug')) {
  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed',
    'bottom:1rem',
    'right:1rem',
    'z-index:9999',
    'background:rgba(16,20,24,0.92)',
    'border:1px solid rgba(238,238,238,0.2)',
    'border-radius:8px',
    'padding:0.75rem 1rem',
    'font:12px/1.4 monospace',
    'color:#EEEEEE',
    'max-height:80vh',
    'overflow-y:auto',
    'width:260px',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = 'Gradient debug';
  title.style.cssText = 'font-weight:bold;margin-bottom:0.5rem;cursor:pointer;';
  panel.appendChild(title);

  const body = document.createElement('div');
  panel.appendChild(body);
  title.addEventListener('click', () => {
    body.style.display = body.style.display === 'none' ? '' : 'none';
  });

  let currentGroup = null;
  GRADIENT_DEBUG_CONTROLS.forEach((control) => {
    if (control.group !== currentGroup) {
      currentGroup = control.group;
      const heading = document.createElement('div');
      heading.textContent = control.group;
      heading.style.cssText = 'margin:0.5rem 0 0.25rem;color:#f4a968;';
      body.appendChild(heading);
    }

    const row = document.createElement('label');
    row.style.cssText = 'display:block;margin-bottom:0.4rem;';

    const text = document.createElement('div');
    const valueSpan = document.createElement('span');
    valueSpan.textContent = control.value;
    text.textContent = control.label + ': ';
    text.appendChild(valueSpan);
    row.appendChild(text);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    input.value = control.value;
    input.style.width = '100%';
    input.addEventListener('input', () => {
      valueSpan.textContent = input.value + (control.unit || '');
      document.documentElement.style.setProperty(
          control.prop, input.value + (control.unit || ''));
    });
    row.appendChild(input);

    body.appendChild(row);
  });

  document.body.appendChild(panel);
}
