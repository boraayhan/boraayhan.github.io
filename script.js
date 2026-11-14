if (window.location.href.includes('portfolio')) {
  window.location.replace('https://boraayhan.github.io/assets/portfolio.pdf');
}

const COVER_VIDEOS = [
  // Video title, Speed (1 = default, 0.5 = half speed)
  ['uav_cad.mp4', 0.75],
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
