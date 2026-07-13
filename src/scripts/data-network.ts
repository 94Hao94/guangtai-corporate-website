export function initDataNetwork(canvas: HTMLCanvasElement): () => void {
  const context = canvas.getContext('2d');
  if (!context) return () => undefined;
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  const points = [
    [0.51, 0.25],
    [0.58, 0.36],
    [0.53, 0.52],
    [0.62, 0.64],
    [0.69, 0.76],
    [0.79, 0.46],
  ];
  const links = [
    [0, 5],
    [1, 5],
    [2, 5],
    [3, 5],
    [4, 5],
    [0, 2],
    [2, 4],
  ];
  let animationId = 0;
  const resize = () => {
    const rectangle = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rectangle.width * ratio));
    canvas.height = Math.max(1, Math.round(rectangle.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const draw = (time: number) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);
    links.forEach(([a, b], index) => {
      const start = points[a];
      const end = points[b];
      const x1 = start[0] * width;
      const y1 = start[1] * height;
      const x2 = end[0] * width;
      const y2 = end[1] * height;
      context.strokeStyle = 'rgba(35, 193, 235, .48)';
      context.lineWidth = 1.2;
      context.beginPath();
      context.moveTo(x1, y1);
      context.bezierCurveTo(
        x1 + (x2 - x1) * 0.32,
        y1 - 34,
        x1 + (x2 - x1) * 0.68,
        y2 + 28,
        x2,
        y2,
      );
      context.stroke();
      const progress = reducedMotion
        ? 0.58
        : (time * 0.00016 + index * 0.137) % 1;
      const px = x1 + (x2 - x1) * progress;
      const py = y1 + (y2 - y1) * progress;
      context.fillStyle = '#fff';
      context.beginPath();
      context.arc(px, py, 3.2, 0, Math.PI * 2);
      context.fill();
    });
    if (!reducedMotion) animationId = requestAnimationFrame(draw);
  };
  resize();
  window.addEventListener('resize', resize);
  draw(0);
  return () => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(animationId);
  };
}
