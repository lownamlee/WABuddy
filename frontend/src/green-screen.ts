/** Shared artwork: the phone wallpaper and the fullscreen destination match. */
export function greenWallpaper(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 1320;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 600, 1320);
  gradient.addColorStop(0, '#172c28');
  gradient.addColorStop(.45, '#325b49');
  gradient.addColorStop(1, '#b3de8c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 1320);
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = `rgba(225,255,193,${.06 + i * .006})`;
    ctx.beginPath();
    ctx.ellipse(580, 930, 260 + i * 40, 470 + i * 34, -.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  return canvas;
}

export function screenDetails(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 1320;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#eefadd';
  ctx.textAlign = 'center';
  ctx.font = '400 102px Arial';
  ctx.fillText('09:41', 300, 272);
  ctx.fillStyle = '#10201d';
  ctx.beginPath(); ctx.roundRect(232, 28, 136, 35, 18); ctx.fill();
  ctx.fillStyle = 'rgba(245,255,232,.8)';
  ctx.beginPath(); ctx.roundRect(214, 1270, 172, 7, 4); ctx.fill();
  return canvas;
}
