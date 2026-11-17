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
  let heroVisible = false;
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
    if (heroVisible && !document.hidden) incoming.play().catch(() => {});

    incoming.classList.add('is-active');
    outgoing.classList.remove('is-active');

    current = incoming;
    next = outgoing;

    outgoing.pause();
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

  const syncPlayback = () => {
    layers.forEach((video) => {
      if (video === current && heroVisible && !document.hidden)
        video.play().catch(() => {});
      else video.pause();
    });
  };
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    syncPlayback();
  }).observe(document.getElementById('panel-home'));
  document.addEventListener('visibilitychange', syncPlayback);
  layers.forEach((video) => {
    video.removeAttribute('autoplay');
    video.preload = 'metadata';
  });
  prime(current, 0);
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
        // Reserve the final line wrapping so typing never changes page height.
        const reserved = document.createElement('span');
        reserved.className = 'typewriter-reserved';
        reserved.setAttribute('aria-hidden', 'true');
        reserved.textContent = line;
        item.append(reserved, span);
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

// IntersectionObserver wakes paused writers; there are no offscreen polling timers.
const visibleTypewriters = new WeakSet();
const textJobs = new Map();
let textFrame = 0;
const typewriterObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) visibleTypewriters.add(entry.target);
    else {
      visibleTypewriters.delete(entry.target);
      for (const job of textJobs.values()) {
        if (job.span.parentElement !== entry.target) continue;
        job.last = null;
        job.span.classList.remove('is-typing');
      }
    }
  }
  scheduleTextFrame();
});

const scheduleTextFrame = () => {
  if (textFrame || document.hidden) return;
  const runnable = [...textJobs.values()].some((job) =>
      job.erasing || visibleTypewriters.has(job.span.parentElement));
  if (runnable) textFrame = requestAnimationFrame(advanceText);
};

const advanceText = (now) => {
  textFrame = 0;
  for (const [span, job] of textJobs) {
    if (!isCurrent(job.details, job.token)) {
      textJobs.delete(span);
      job.resolve(false);
      continue;
    }
    if (!job.erasing && !visibleTypewriters.has(span.parentElement)) {
      job.last = null;
      span.classList.remove('is-typing');
      continue;
    }
    span.classList.add('is-typing');
    const elapsed = job.last == null ? 0 : now - job.last;
    const count = Math.max(1, Math.floor(elapsed / job.speed));
    if (job.last != null && elapsed < job.speed) continue;
    job.last = now;
    job.length = job.erasing ? Math.max(0, job.length - count) :
        Math.min(job.text.length, job.length + count);
    span.textContent = job.text.slice(0, job.length);
    if (job.length === (job.erasing ? 0 : job.text.length)) {
      textJobs.delete(span);
      span.classList.remove('is-typing');
      job.resolve(true);
    }
  }
  scheduleTextFrame();
};

const animateText = (details, span, token, erasing) => new Promise((resolve) => {
  textJobs.set(span, {details, span, token, erasing, resolve,
    text: erasing ? span.textContent : span.dataset.text || '',
    length: span.textContent.length, last: null,
    speed: erasing ? UNTYPE_SPEED : TYPE_SPEED});
  scheduleTextFrame();
});
const typeText = (details, span, token) => animateText(details, span, token, false);
const untypeText = (details, span, token) => animateText(details, span, token, true);

const cancelTextJobs = (details) => {
  for (const [span, job] of textJobs) {
    if (job.details !== details) continue;
    textJobs.delete(span);
    span.classList.remove('is-typing');
    job.resolve(false);
  }
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(textFrame);
    textFrame = 0;
    textJobs.forEach((job) => { job.last = null; });
  } else scheduleTextFrame();
});

const measure = (details) =>
    details.firstElementChild ? details.firstElementChild.scrollHeight : 0;

const openEntryDetails = async (details, delay) => {
  const token = Symbol('open');
  runTokens.set(details, token);
  cancelTextJobs(details);

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
  }
  details.classList.remove('is-typing');
  recalcLayout();
};

const closeEntryDetails = async (details, delay) => {
  const token = Symbol('close');
  runTokens.set(details, token);
  cancelTextJobs(details);

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
  document.getElementById('panel-experience')?.scrollIntoView({
    behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start'
  });
  return Promise.resolve();
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
        experienceMount.querySelectorAll('.entry-description li')
            .forEach((line) => typewriterObserver.observe(line));
        const detailsObserver = new ResizeObserver((entries) => {
          for (const {target} of entries) {
            const details = target.parentElement;
            if (details.classList.contains('is-open'))
              details.style.maxHeight = target.scrollHeight + 'px';
          }
        });
        experienceMount.querySelectorAll('.entry-details-inner')
            .forEach((inner) => detailsObserver.observe(inner));
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
// Layout changes invalidate cached section boundaries; scrolling only reads scrollY.
const recalcLayout = () => invalidatePageGeometry();

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
// Use the actual scrolling element and tolerate fractional pixels at the bottom.
const sectionScrollProgress = (position, start, end, atBottom = false) =>
    atBottom ? 1 : end > start ?
    Math.max(0, Math.min(1, (position - start) / (end - start))) : Number(position >= end);

const navigationItems = navLinks.map((link) => ({
  link, panel: panels.find((panel) => panel.dataset.panel === link.dataset.panel),
  progress: '', active: null
}));
let pageGeometryDirty = true;
let pageMaximum = 0;
let sectionStarts = [];
let navigationFramePending = false;
const updateNavigation = () => {
  const scrollElement = document.scrollingElement || document.documentElement;
  const position = scrollElement.scrollTop;
  // Complete every layout read before writing any styles.
  if (pageGeometryDirty) {
    pageMaximum = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
    sectionStarts = navigationItems.map(({panel}) => Math.max(0,
        Math.min(pageMaximum, panel.getBoundingClientRect().top + position)));
    pageGeometryDirty = false;
  }
  const atBottom = pageMaximum <= 0 || position >= pageMaximum - 1;
  const activeIndex = atBottom ? navigationItems.length - 1 :
      sectionStarts.reduce((active, start, index) => position >= start ? index : active, 0);
  navigationItems.forEach((item, index) => {
    const progress = sectionScrollProgress(position, sectionStarts[index],
        sectionStarts[index + 1] ?? pageMaximum, atBottom).toFixed(4);
    if (progress !== item.progress) {
      item.link.style.setProperty('--section-progress', progress);
      item.progress = progress;
    }
    const active = index === activeIndex;
    if (active !== item.active) {
      item.link.classList.toggle('is-active', active);
      if (active) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
      item.active = active;
    }
  });
};
const scheduleNavigation = () => {
  if (navigationFramePending) return;
  navigationFramePending = true;
  requestAnimationFrame(() => {
    navigationFramePending = false;
    updateNavigation();
  });
};
const invalidatePageGeometry = () => {
  pageGeometryDirty = true;
  scheduleNavigation();
};
window.addEventListener('scroll', scheduleNavigation, {passive: true});
window.addEventListener('resize', invalidatePageGeometry, {passive: true});
window.addEventListener('load', invalidatePageGeometry);
document.addEventListener('load', invalidatePageGeometry, true);
document.fonts.ready.then(invalidatePageGeometry);
const navigationObserver = new ResizeObserver(invalidatePageGeometry);
panels.forEach((panel) => navigationObserver.observe(panel));
navigationObserver.observe(document.body);
navLinks.forEach((link) => { link.href = `#panel-${link.dataset.panel}`; });
window.addEventListener('pageshow', () => {
  if (!window.location.hash) window.scrollTo({top: 0, behavior: 'instant'});
  invalidatePageGeometry();
});
scheduleNavigation();

// Use a native modal above the page content.
const imageViewer = document.createElement('dialog');
imageViewer.className = 'image-viewer';
imageViewer.setAttribute('aria-label', 'Image preview');
imageViewer.innerHTML = `
  <div class="image-viewer-content">
    <img alt="">
    <button type="button" aria-label="Close image preview">&times;</button>
  </div>`;
document.body.appendChild(imageViewer);

const previewImage = imageViewer.querySelector('img');
imageViewer.querySelector('button').addEventListener('click', () => imageViewer.close());
imageViewer.addEventListener('click', (event) => {
  if (event.target === imageViewer) imageViewer.close();
});
imageViewer.addEventListener('close', () => previewImage.removeAttribute('src'));

document.querySelectorAll('.entry-attachments img, img.pfp').forEach((image) => {
  image.classList.add('image-preview-trigger');
  image.tabIndex = 0;
  image.setAttribute('role', 'button');
  image.setAttribute('aria-haspopup', 'dialog');
  image.setAttribute('aria-label', `Open ${image.alt || 'image'}`);
  const openImage = () => {
    previewImage.src = image.currentSrc || image.src;
    previewImage.alt = image.alt;
    imageViewer.showModal();
  };
  image.addEventListener('click', openImage);
  image.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openImage();
    }
  });
});

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
