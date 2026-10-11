import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import assetUrl from './assets/phone.glb?url';
import type { Status } from './state';
import { greenWallpaper, screenDetails } from './green-screen';
import { ENTRY_DURATION, entryFrame, screenCoverDistance, SCREEN_Z } from './login-transition';

const DURATION = 1.6;
const ARRIVAL = 1.1;
const ZOOM_START = .75;
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** The original phone-animation.html composition and motion, with a live screen. */
export class PhoneScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  private phone = new THREE.Group();
  private screen?: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial | THREE.ShaderMaterial>;
  private screenMaterial: THREE.MeshBasicMaterial;
  private greenMaterial: THREE.ShaderMaterial;
  private wallpaper = greenWallpaper();
  private details = screenDetails();
  private arrivalTexture: THREE.CanvasTexture;
  private liveCanvas = document.createElement('canvas');
  private liveContext: CanvasRenderingContext2D;
  private liveTexture: THREE.CanvasTexture;
  private shadow = document.querySelector<HTMLElement>('#shadow')!;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private elapsed = 0;
  private previous = 0;
  private startY = 0;
  private cameraDistance = 13;
  private ready = false;
  private status: Status = 'connecting';
  private detail = 'Connecting to WhatsApp…';
  private entryElapsed: number | null = null;
  private entryComplete: (() => void) | null = null;
  private homeVisible = false;
  private animationFrame = 0;

  constructor(private canvas: HTMLCanvasElement, private loginRequired = true) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.camera.position.set(0, 0, 13);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x59635c, 3));
    for (const [color, intensity, x, y, z] of [
      [0xffffff, 5, -4, 6, 6], [0xcaffb0, 4, 4, 1, -3], [0xdce7ff, 3, 2, -3, 5],
    ]) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(x, y, z);
      this.scene.add(light);
    }
    this.scene.add(this.phone);
    this.liveCanvas.width = 600;
    this.liveCanvas.height = 1320;
    this.liveContext = this.liveCanvas.getContext('2d')!;
    this.liveTexture = new THREE.CanvasTexture(this.liveCanvas);
    this.liveTexture.colorSpace = THREE.SRGBColorSpace;
    this.liveTexture.generateMipmaps = false;
    this.liveTexture.minFilter = THREE.LinearFilter;
    this.liveTexture.magFilter = THREE.NearestFilter;
    this.arrivalTexture = this.makeArrival();
    this.screenMaterial = new THREE.MeshBasicMaterial({ map: this.arrivalTexture, toneMapped: false });
    const wallpaperTexture = new THREE.CanvasTexture(this.wallpaper);
    const detailsTexture = new THREE.CanvasTexture(this.details);
    wallpaperTexture.colorSpace = detailsTexture.colorSpace = THREE.SRGBColorSpace;
    this.greenMaterial = new THREE.ShaderMaterial({
      toneMapped: false,
      uniforms: {
        wallpaper: { value: wallpaperTexture },
        details: { value: detailsTexture },
        resolution: { value: new THREE.Vector2() },
        wallpaperMix: { value: 0 },
        detailsOpacity: { value: 1 },
      },
      vertexShader: `
        varying vec2 screenUv;
        void main() {
          screenUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D wallpaper;
        uniform sampler2D details;
        uniform vec2 resolution;
        uniform float wallpaperMix;
        uniform float detailsOpacity;
        varying vec2 screenUv;
        void main() {
          // As the screen fills the view, its wallpaper aligns exactly with
          // the fullscreen layer underneath. Only the clock/bar use local UVs.
          vec2 wallpaperUv = mix(screenUv, gl_FragCoord.xy / resolution, wallpaperMix);
          vec4 green = texture2D(wallpaper, wallpaperUv);
          vec4 hud = texture2D(details, screenUv);
          gl_FragColor = vec4(mix(green.rgb, hud.rgb, hud.a * detailsOpacity), 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    document.querySelector<HTMLElement>('#green-background')!.style.backgroundImage = `url(${this.wallpaper.toDataURL()})`;
    this.setStatus('connecting', this.detail);
    new ResizeObserver(() => this.resize()).observe(this.canvas);
    document.addEventListener('visibilitychange', () => { this.previous = 0; });
    this.resize();
  }

  async load(): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(assetUrl);
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    const casing = new THREE.Group();
    casing.add(model);
    casing.rotation.x = Math.PI / 2;
    // Keep the casing's earpiece at the top; the screen remains upright.
    casing.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), Math.PI);
    casing.scale.setScalar(3 / (box.max.z - box.min.z));
    this.phone.add(casing);
    model.traverse(object => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.roughness = .32;
            material.metalness = .3;
          }
        }
      }
    });
    const w = 1.235, h = 2.79, r = .07;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const geometry = new THREE.ShapeGeometry(shape);
    const pos = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
    this.screen = new THREE.Mesh(geometry, this.screenMaterial);
    this.screen.position.z = SCREEN_Z;
    this.phone.add(this.screen);
    this.ready = true;
    this.elapsed = this.reduced ? DURATION : 0;
    document.querySelector<HTMLElement>('#loading')!.hidden = true;
    this.update();
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(now => this.frame(now));
  }

  restart(): void {
    if (this.entryElapsed !== null || this.homeVisible) return;
    this.elapsed = this.reduced ? DURATION : 0;
    this.previous = 0;
    this.update();
  }

  setLoginRequired(required: boolean): void {
    this.loginRequired = required;
    this.update();
  }

  setQr(image: ImageBitmap): void {
    if (this.entryElapsed !== null || this.homeVisible) return;
    this.status = 'qr';
    this.detail = 'WhatsApp → Settings → Linked devices → Link a device.';
    const ctx = this.liveContext;
    this.screenBase(ctx);
    // The server PNG includes its required four-module quiet zone.
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 10, 370, 580, 580);
    this.liveTexture.needsUpdate = true;
    this.update();
  }

  setStatus(status: Status, detail: string): void {
    if (this.entryElapsed !== null || this.homeVisible) return;
    if (this.status === status && this.detail === detail && this.ready) return;
    this.status = status;
    this.detail = detail;
    const ctx = this.liveContext;
    this.screenBase(ctx);
    ctx.strokeStyle = '#d9f3bb';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (status === 'connected') {
      ctx.arc(300, 590, 67, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(265, 590); ctx.lineTo(289, 614); ctx.lineTo(338, 564);
    } else if (status === 'connecting' || status === 'refreshing' || status === 'paired' || status === 'idle') {
      ctx.arc(300, 590, 56, -.4, Math.PI * 1.4);
    } else {
      ctx.arc(300, 590, 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(300, 557); ctx.lineTo(300, 598);
      ctx.moveTo(300, 624); ctx.lineTo(300, 625);
    }
    ctx.stroke();
    ctx.fillStyle = '#eefadd';
    ctx.textAlign = 'center';
    ctx.font = '27px Arial';
    const lines = this.wrapText(ctx, detail, 470);
    lines.forEach((line, index) => ctx.fillText(line, 300, 725 + index * 40));
    this.liveTexture.needsUpdate = true;
    this.update();
  }

  stopRendering(): void {
    this.homeVisible = true;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  enterHome(complete: () => void): void {
    if (this.entryElapsed !== null || this.homeVisible) return;
    this.entryElapsed = this.reduced ? ENTRY_DURATION : 0;
    this.entryComplete = complete;
    this.detail = 'Opening WABuddy. Zooming into the green screen.';
    // Replaces the QR immediately, even if the original arrival is finishing.
    this.update();
  }

  cancelEntry(): void {
    this.entryElapsed = null;
    this.entryComplete = null;
    this.homeVisible = false;
    this.elapsed = DURATION;
    this.previous = 0;
    this.update();
    if (!this.animationFrame) this.animationFrame = requestAnimationFrame(now => this.frame(now));
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  private screenBase(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#172c28'; ctx.fillRect(0, 0, 600, 1320);
    ctx.fillStyle = '#10201d'; ctx.beginPath(); ctx.roundRect(232, 28, 136, 35, 18); ctx.fill();
    ctx.fillStyle = 'rgba(245,255,232,.8)'; ctx.beginPath(); ctx.roundRect(214, 1270, 172, 7, 4); ctx.fill();
  }

  private makeArrival(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 1320;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.wallpaper, 0, 0);
    ctx.drawImage(this.details, 0, 0);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private resize(): void {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.getDrawingBufferSize(this.greenMaterial.uniforms.resolution.value);
    this.camera.aspect = w / h;
    this.cameraDistance = w < 600 ? 16 : 13;
    this.camera.position.z = this.cameraDistance;
    this.camera.updateProjectionMatrix();
    this.startY = this.cameraDistance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * .48;
    this.update();
  }

  private update(): void {
    if (!this.ready) return;
    const p = Math.min(1, this.elapsed / DURATION);
    const arrival = ease(Math.min(1, this.elapsed / ARRIVAL));
    const turn = ease(p);
    this.phone.position.set(0, this.startY * (1 - arrival), 0);
    this.phone.rotation.set((1 - turn) * Math.PI / 4, turn * Math.PI * 2, -(1 - turn) * Math.PI / 4, 'YXZ');
    const zoom = ease(THREE.MathUtils.clamp((this.elapsed - ZOOM_START) / (DURATION - ZOOM_START), 0, 1));
    this.camera.position.z = this.cameraDistance * (1 - .12 * zoom);
    const logo = document.querySelector<HTMLElement>('#pairing-brand');
    const title = document.querySelector<HTMLElement>('#pairing-title');
    const showLogin = this.loginRequired && p >= 1 && this.entryElapsed === null;
    logo?.classList.toggle('visible', showLogin);
    if (title) {
      const top = new THREE.Vector3(0, 1.7, SCREEN_Z).project(this.camera);
      const bounds = this.canvas.getBoundingClientRect();
      title.style.top = `${bounds.top + (1 - top.y) * bounds.height / 2}px`;
      title.classList.toggle('visible', showLogin);
    }
    if (this.screen) {
      this.screen.material = this.entryElapsed !== null ? this.greenMaterial : this.screenMaterial;
      this.screenMaterial.map = p >= 1 ? this.liveTexture : this.arrivalTexture;
    }
    this.canvas.setAttribute('aria-label', p >= 1 ? this.detail : 'Phone rotating upright and gently zooming in.');
    this.shadow.style.opacity = String(.22 * arrival);
    this.shadow.style.transform = `translateX(-50%) scale(${.55 + .45 * arrival + .1 * zoom})`;
    if (this.entryElapsed !== null) {
      const entry = entryFrame(this.entryElapsed, this.reduced);
      this.greenMaterial.uniforms.detailsOpacity.value = entry.detailsOpacity;
      this.greenMaterial.uniforms.wallpaperMix.value = entry.wallpaperMix;
      if (p >= 1) {
        const startDepth = this.cameraDistance * .88 - SCREEN_Z;
        const endDepth = screenCoverDistance(this.camera.aspect, this.camera.fov) - SCREEN_Z;
        // Interpolate scale exponentially for an even, slow push into the glass.
        this.camera.position.z = SCREEN_Z + startDepth * Math.pow(endDepth / startDepth, entry.zoom);
        this.shadow.style.opacity = String(.22 * (1 - entry.zoom));
      }
      this.canvas.setAttribute('aria-label', this.detail);
    }
  }

  private frame(now: number): void {
    this.animationFrame = 0;
    // Use elapsed time, so a slow GPU cannot stretch the 1.6-second animation.
    const dt = this.previous ? (now - this.previous) / 1000 : 0;
    this.previous = now;
    if (this.elapsed < DURATION && !document.hidden) {
      this.elapsed = Math.min(DURATION, this.elapsed + dt);
      this.update();
    }
    if (this.entryElapsed !== null && this.elapsed >= DURATION && !document.hidden) {
      this.entryElapsed = Math.min(ENTRY_DURATION, this.entryElapsed + dt);
      this.update();
    }
    this.renderer.render(this.scene, this.camera);
    if (this.entryElapsed !== null && entryFrame(this.entryElapsed, this.reduced).complete && this.elapsed >= DURATION) {
      this.homeVisible = true;
      const complete = this.entryComplete;
      this.entryComplete = null;
      complete?.();
    }
    // The second page is static: stop rendering the covered 3D scene.
    if (!this.homeVisible) this.animationFrame = requestAnimationFrame(next => this.frame(next));
  }
}
