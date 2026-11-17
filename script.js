const COVER_VIDEOS = [
  // [filename, speed, optional fixed position]
  // Omit the position (or use null) to shuffle. 0 = first, 1 = second,
  // -1 = last, -2 = second-last. Positions apply to every playback cycle.
  ['tar_drone_flight.mov', 1.3],
  ['shooting_targeting_algorithm.MOV', 1],
  ['grace_lidar.mp4', 1.5],
  ['flight_controls_demo.mov', 1],
  ['ARIA_goofing_off.MOV', 1, -1],
  ['uav_cad.mp4', 1],
];

// Pin explicitly positioned videos, then shuffle the remaining slots.
const orderCoverVideos = (videos, random = Math.random) => {
  const ordered = new Array(videos.length).fill(null);
  const unpinned = [];
  for (const video of videos) {
    const position = video[2];
    if (position == null) {
      unpinned.push(video);
      continue;
    }
    if (!Number.isInteger(position))
      throw new Error(`Video position must be an integer: ${video[0]}`);
    const slot = position < 0 ? videos.length + position : position;
    if (slot < 0 || slot >= videos.length)
      throw new Error(`Video position is out of range: ${video[0]} (${position})`);
    if (ordered[slot] !== null)
      throw new Error(`Videos share fixed position ${slot}: ${ordered[slot][0]}, ${video[0]}`);
    ordered[slot] = video;
  }
  for (let i = unpinned.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [unpinned[i], unpinned[j]] = [unpinned[j], unpinned[i]];
  }
  let next = 0;
  return ordered.map((video) => video ?? unpinned[next++]);
};

const COVER_VIDEO_DIR = '/assets/cover_video/';

const layers =
    Array.from(document.querySelectorAll('#opening-bg .opening-bg-layer'));

if (layers.length === 2 && COVER_VIDEOS.length > 0) {
  let index = 0;
  const orders = new Map();
  const clip = (i) => {
    const cycle = Math.floor(i / COVER_VIDEOS.length);
    if (!orders.has(cycle)) orders.set(cycle, orderCoverVideos(COVER_VIDEOS));
    // Keep preloaded clips stable, and discard completed cycles.
    const currentCycle = Math.floor(index / COVER_VIDEOS.length);
    for (const cachedCycle of orders.keys()) {
      if (cachedCycle < currentCycle) orders.delete(cachedCycle);
    }
    return orders.get(cycle)[i % COVER_VIDEOS.length];
  };
  let failures = 0;
  let heroVisible = false;
  let current = layers[0];
  let next = layers[1];

  const prime = (video, i) => {
    const [file, rate] = clip(i);
    video.dataset.rate = rate;
    video.dataset.playlistIndex = i;
    video.src = COVER_VIDEO_DIR + file;
    video.playbackRate = rate;
    video.load();
  };

  const advance = () => {
    index = Number(next.dataset.playlistIndex);

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
        prime(video, Number(video.dataset.playlistIndex) + 1);
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
  }).observe(document.getElementById('home'));
  document.addEventListener('visibilitychange', syncPlayback);
  prime(current, 0);
  prime(next, 1);
}

const EXPERIENCE_DATA = '/data/experience.json';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const experienceMount = document.getElementById('experience-list');

const buildOrgIcon = (entry) => {
  const logo = document.createElement('img');
  logo.src = entry.logo;
  logo.alt = (entry.org || entry.title) + ' logo';
  if (entry.logoContentWidth != null) {
    const tile = document.createElement('span');
    tile.className = 'org-icon org-icon-scaled';
    logo.className = 'org-icon-artwork';
    logo.style.transform = `scale(${entry.logoScale / entry.logoContentWidth})`;
    tile.appendChild(logo);
    return tile;
  }
  logo.className = entry.logoLight ? 'org-icon org-icon-light' : 'org-icon';
  return logo;
};

const buildEntry = (entry) => {
  const li = document.createElement('li');
  li.className = 'entry';
  if (entry.fullOnly) {
    li.dataset.fullOnly = '';
    li.hidden = !experienceExpanded;
  }
  if (entry.education) li.classList.add('education');

  const link = document.createElement('a');
  link.className = 'org-link';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.href = entry.href;
  link.setAttribute('aria-label', entry.org || entry.title);
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

  for (const span of details.querySelectorAll('.typewriter')) {
    if (!await typeText(details, span, token)) return;
  }
};

const closeEntryDetails = async (details, delay) => {
  const token = Symbol('close');
  runTokens.set(details, token);
  cancelTextJobs(details);

  if (delay) await wait(delay);
  if (!isCurrent(details, token)) return;

  if (reducedMotion.matches) {
    details.classList.remove('is-open');
    details.style.maxHeight = '';
    details.querySelectorAll('.typewriter')
        .forEach((span) => (span.textContent = ''));
    return;
  }

  const spans = Array.from(details.querySelectorAll('.typewriter')).reverse();
  for (const span of spans) {
    if (!await untypeText(details, span, token)) return;
  }

  details.classList.remove('is-open');
  details.style.maxHeight = '';
};

const experienceToggle = document.querySelector('.experience-toggle');
let experienceExpanded = false;

if (experienceMount && experienceToggle) {
  const toggleExperience = () => {
    experienceExpanded = !experienceExpanded;
    experienceToggle.setAttribute('aria-expanded', String(experienceExpanded));
    experienceToggle.textContent = experienceExpanded ? 'Hide details' : 'See details';

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
  experienceToggle.addEventListener('click', toggleExperience);
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
      })
      .catch((error) => {
        console.error('could not load experience data:', error);
      });
}

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

document.querySelectorAll('.project-images img, img.pfp').forEach((image) => {
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
