if (window.location.href.includes('portfolio')) {
  window.location.replace('https://boraayhan.github.io/assets/portfolio.pdf');
}

const COVER_VIDEOS = [
  // Video title, Speed (1 = default, 0.5 = half speed)
  ['uav_cad.mp4', 0.85],
  ['tar_drone_flight.mov', 1.2],
  ['flight_controls_demo.mov', 1],
  ['shooting_targeting_algorithm.MOV', 1],
  ['ARIA_goofing_off.MOV', 1],
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
      if (video === current) advance();
      else prime(video, index + 2);
    });
  });

  prime(current, 0);
  current.play().catch(() => {});
  prime(next, 1);
}

const EXPERIENCE_DATA = '/data/experience.json';

const experienceMount = document.getElementById('experience');

const buildEntry = (entry) => {
  const li = document.createElement('li');
  li.className = 'entry';
  if (entry.education) li.classList.add('education');

  const link = document.createElement('a');
  link.className = 'org-link';
  link.target = '_blank';
  link.href = entry.href || '';
  link.setAttribute('aria-label', entry.org || entry.title || '');

  const logo = document.createElement('img');
  logo.className = entry.logoLight ? 'org-icon org-icon-light' : 'org-icon';
  logo.src = entry.logo;
  logo.alt = (entry.org || '') + ' logo';
  link.appendChild(logo);

  const text = document.createElement('div');
  text.className = 'entry-text';

  const title = document.createElement('span');
  title.className = 'entry-role';
  title.textContent = entry.title || '';

  const org = document.createElement('span');
  org.className = 'entry-org';
  org.textContent = entry.org || '';

  text.append(title, org);
  li.append(link, text);

  if (Array.isArray(entry.skills) && entry.skills.length > 0) {
    const skills = document.createElement('ul');
    skills.className = 'entry-tags';
    entry.skills.forEach((skill) => {
      const chip = document.createElement('li');
      chip.textContent = skill;
      skills.appendChild(chip);
    });
    li.appendChild(skills);
  }

  return li;
};

if (experienceMount) {
  fetch(EXPERIENCE_DATA)
    .then((response) => {
      if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
      return response.json();
    })
    .then((data) => {
      const fragment = document.createDocumentFragment();

      (data.sections || []).forEach((section) => {
        if (section.label) {
          const label = document.createElement('h3');
          label.className = 'bullets-label';
          label.textContent = section.label;
          fragment.appendChild(label);
        }

        const list = document.createElement('ul');
        list.className = 'bullets';
        (section.entries || []).forEach((entry) => list.appendChild(buildEntry(entry)));
        fragment.appendChild(list);
      });

      experienceMount.replaceChildren(fragment);
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
    const driftProgress = scrollRoot.scrollTop / Math.max(scrollRoot.clientHeight, 1);
    if (blueprint) blueprint.style.setProperty('--scroll', driftProgress.toFixed(4));

    const scrollable = scrollRoot.scrollHeight - scrollRoot.clientHeight;
    const pageProgress = scrollable > 0
      ? Math.min(1, Math.max(0, scrollRoot.scrollTop / scrollable))
      : 0;
    const envelope = pageProgress;

    document.documentElement.style.setProperty('--page-progress', pageProgress.toFixed(4));
    document.documentElement.style.setProperty('--bp-envelope', envelope.toFixed(4));

    ticking = false;
  };

  recalcLayout = applyScroll;

  scrollRoot.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(applyScroll);
  }, { passive: true });

  window.addEventListener('resize', applyScroll, { passive: true });
  window.addEventListener('load', applyScroll, { passive: true });

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
    img.style.setProperty('--drift', (plate.drift == null ? 40 : plate.drift) + 'px');
    img.style.setProperty('--tilt', (plate.tilt || 0) + 'deg');
    if (plate.opacity != null) img.style.setProperty('--plate-opacity', plate.opacity);
    img.style[plate.side === 'right' ? 'right' : 'left'] = plate.offset || '0';

    fragment.appendChild(img);
  });

  blueprint.replaceChildren(fragment);
};

if (blueprint) {
  fetch(BLUEPRINT_DATA)
    .then((response) => {
      if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
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

const showPanel = (name) => {
  const index = panelOrder.indexOf(name);
  if (index === -1 || !panelTrack) return;

  panelTrack.style.transform = `translateY(-${index * 100}vh)`;

  navLinks.forEach((link) => {
    link.classList.toggle('is-active', link.dataset.panel === name);
  });

  if (name === 'experience') {
    window.requestAnimationFrame(recalcLayout);
  }
};

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    showPanel(link.dataset.panel);
  });
});


