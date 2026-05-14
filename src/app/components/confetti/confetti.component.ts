import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  shape: 'rect' | 'circle' | 'tri';
  drift: number;
  driftSpeed: number;
}

const PALETTE = [
  '#38bdf8',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
  '#34d399',
  '#fb7185',
  '#7dd3fc',
];

const GRAVITY = 0.18;
const WIND_AMPLITUDE = 0.6;
const FADE_TAIL_MS = 800;

@Component({
  selector: 'app-confetti',
  standalone: true,
  template: `<canvas #c class="confetti-canvas" aria-hidden="true"></canvas>`,
  styleUrl: './confetti.component.css',
})
export class ConfettiComponent implements AfterViewInit, OnDestroy {
  @Input() durationMs = 6500;
  @Input() particleCount = 180;

  @ViewChild('c', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly destroyRef = inject(DestroyRef);
  private rafId: number | null = null;
  private particles: Particle[] = [];
  private startedAt = 0;
  private resizeListener: (() => void) | null = null;
  private dpr = 1;

  ngAfterViewInit(): void {
    if (this.prefersReducedMotion()) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resizeCanvas(canvas);
    this.resizeListener = () => this.resizeCanvas(canvas);
    window.addEventListener('resize', this.resizeListener, { passive: true });

    this.spawnBurst(canvas.clientWidth);
    this.startedAt = performance.now();
    this.tick(ctx, canvas);

    this.destroyRef.onDestroy(() => this.cleanup());
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  private resizeCanvas(canvas: HTMLCanvasElement): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * this.dpr);
    canvas.height = Math.floor(h * this.dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  private spawnBurst(viewWidth: number): void {
    const shapes: Particle['shape'][] = ['rect', 'circle', 'tri'];
    this.particles = Array.from({ length: this.particleCount }, () => {
      const size = 6 + Math.random() * 8;
      return {
        x: Math.random() * viewWidth,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 1 + Math.random() * 2.5,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.25,
        size,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.01 + Math.random() * 0.02,
      };
    });
  }

  private tick(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const step = (now: number) => {
      const elapsed = now - this.startedAt;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const fadeFactor =
        elapsed < this.durationMs
          ? 1
          : Math.max(0, 1 - (elapsed - this.durationMs) / FADE_TAIL_MS);

      for (const p of this.particles) {
        p.drift += p.driftSpeed;
        p.x += p.vx + Math.sin(p.drift) * WIND_AMPLITUDE;
        p.vy += GRAVITY;
        p.y += p.vy;
        p.rot += p.vrot;

        if (p.y - p.size > h) {
          p.y = -p.size;
          p.x = Math.random() * w;
          p.vy = 1 + Math.random() * 2.5;
        }
        if (p.x < -20) p.x = w + 10;
        if (p.x > w + 20) p.x = -10;

        ctx.save();
        ctx.globalAlpha = fadeFactor;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        this.drawShape(ctx, p);
        ctx.restore();
      }

      if (fadeFactor <= 0) {
        this.cleanup();
        ctx.clearRect(0, 0, w, h);
        return;
      }
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  private drawShape(ctx: CanvasRenderingContext2D, p: Particle): void {
    const s = p.size;
    if (p.shape === 'rect') {
      ctx.fillRect(-s / 2, -s / 3, s, s * 0.66);
    } else if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -s / 2);
      ctx.lineTo(s / 2, s / 2);
      ctx.lineTo(-s / 2, s / 2);
      ctx.closePath();
      ctx.fill();
    }
  }
}
