import { type GameStats, maxArr, sumArr } from './GameStats.js';

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#2a3555',
  text: '#e6edf3',
  muted: '#8b949e',
  p1: '#4a90d9',
  p1area: 'rgba(74,144,217,0.25)',
  p2: '#d94a4a',
  p2area: 'rgba(217,74,74,0.25)',
  green: '#22c55e',
  greenDark: '#16a34a',
  red: '#ef4444',
  gray: '#6b7280',
  gold: '#f59e0b',
  grid: 'rgba(255,255,255,0.06)',
} as const;

// ── Low-level canvas helpers ───────────────────────────────────────────────

function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = C.surface;
  ctx.fillRect(0, 0, w, h);
}

function hline(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number,
               color: string, dash: number[] = []): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function vline(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number,
               color: string, dash: number[] = []): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.stroke();
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
               color: string = C.muted, align: CanvasTextAlign = 'left', size = 10): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function polyLine(ctx: CanvasRenderingContext2D, pts: [number, number][], color: string,
                  lw = 1.5): void {
  if (pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();
}

function filledArea(ctx: CanvasRenderingContext2D, pts: [number, number][], baseY: number,
                    color: string): void {
  if (pts.length < 2) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], baseY);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(pts[pts.length - 1][0], baseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Chart: Cell Count Timeline ─────────────────────────────────────────────

function drawTimeline(ctx: CanvasRenderingContext2D, W: number, H: number,
                      stats: GameStats): void {
  clearCanvas(ctx, W, H);
  const ML = 44, MR = 14, MT = 14, MB = 30;
  const pw = W - ML - MR;
  const ph = H - MT - MB;
  const pL = ML, pT = MT, pR = ML + pw, pB = MT + ph;

  const n = stats.p1Counts.length;
  if (n === 0) return;

  const maxY = Math.max(maxArr(stats.p1Counts), maxArr(stats.p2Counts), 1);
  const mapX = (t: number) => pL + (t / Math.max(n - 1, 1)) * pw;
  const mapY = (v: number) => pB - (v / maxY) * ph;

  // Grid
  for (let i = 0; i <= 4; i++) {
    const y = pT + (i / 4) * ph;
    hline(ctx, pL, pR, y, C.grid);
    const val = Math.round(maxY * (1 - i / 4));
    if (val > 0 || i === 4) label(ctx, String(val), pL - 4, y, C.muted, 'right', 9);
  }

  // Areas
  const p1Pts: [number, number][] = stats.p1Counts.map((v, t) => [mapX(t), mapY(v)]);
  const p2Pts: [number, number][] = stats.p2Counts.map((v, t) => [mapX(t), mapY(v)]);
  filledArea(ctx, p1Pts, pB, C.p1area);
  filledArea(ctx, p2Pts, pB, C.p2area);

  // Lines
  polyLine(ctx, p2Pts, C.p2, 2);
  polyLine(ctx, p1Pts, C.p1, 2);

  // X-axis ticks
  const tickCount = stats.tickCount;
  [0, Math.round(tickCount / 2), tickCount].forEach(t => {
    const x = mapX(Math.min(t, n - 1));
    vline(ctx, x, pB, pB + 4, C.muted);
    label(ctx, String(t), x, pB + 14, C.muted, 'center', 9);
  });
  label(ctx, 'Ticks', pL + pw / 2, H - 4, C.muted, 'center', 9);

  // Y-axis label
  ctx.save();
  ctx.translate(10, MT + ph / 2);
  ctx.rotate(-Math.PI / 2);
  label(ctx, 'Cells', 0, 0, C.muted, 'center', 9);
  ctx.restore();

  // Axes
  ctx.save();
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pL, pT); ctx.lineTo(pL, pB); ctx.lineTo(pR, pB);
  ctx.stroke();
  ctx.restore();

  // Legend
  ctx.save();
  ctx.fillStyle = C.p1; ctx.fillRect(pR - 80, pT + 2, 10, 4);
  label(ctx, 'P1', pR - 68, pT + 4, C.p1, 'left', 9);
  ctx.fillStyle = C.p2; ctx.fillRect(pR - 50, pT + 2, 10, 4);
  label(ctx, 'P2', pR - 38, pT + 4, C.p2, 'left', 9);
  ctx.restore();
}

// ── Chart: Dominance Timeline ──────────────────────────────────────────────

function drawDominance(ctx: CanvasRenderingContext2D, W: number, H: number,
                       stats: GameStats): void {
  clearCanvas(ctx, W, H);
  const ML = 36, MR = 14, MT = 14, MB = 28;
  const pw = W - ML - MR;
  const ph = H - MT - MB;
  const pL = ML, pT = MT, pB = MT + ph, pR = ML + pw;

  const n = stats.p1Counts.length;
  if (n < 2) return;

  const mapX = (t: number) => pL + (t / (n - 1)) * pw;
  // ratio = p1/(p1+p2), maps to Y: ratio=1 → pT, ratio=0 → pB
  const ratios = stats.p1Counts.map((p1, t) => {
    const total = p1 + stats.p2Counts[t];
    return total > 0 ? p1 / total : 0.5;
  });

  const p1Pts: [number, number][] = ratios.map((r, t) => [mapX(t), pB - r * ph]);

  // P2 fills the area from pT down to the split line
  ctx.save();
  ctx.fillStyle = C.p2area;
  ctx.beginPath();
  ctx.moveTo(pL, pT);
  for (const [x, y] of p1Pts) ctx.lineTo(x, y);
  ctx.lineTo(pR, pT);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // P1 fills from bottom to split
  filledArea(ctx, p1Pts, pB, C.p1area);

  // Divider line
  polyLine(ctx, p1Pts, 'rgba(255,255,255,0.5)', 1.5);

  // 50% reference
  const midY = pT + ph / 2;
  hline(ctx, pL, pR, midY, 'rgba(255,255,255,0.2)', [4, 4]);
  label(ctx, '50%', pL - 4, midY, C.muted, 'right', 9);

  // Y-axis labels
  label(ctx, '100%', pL - 4, pT, C.p2, 'right', 8);
  label(ctx, '0%', pL - 4, pB, C.p1, 'right', 8);

  // P1/P2 labels inside areas
  label(ctx, 'P1', pL + 8, pB - ph * 0.15, C.p1, 'left', 10);
  label(ctx, 'P2', pL + 8, pT + ph * 0.1, C.p2, 'left', 10);

  // X-axis
  const tc = stats.tickCount;
  [0, Math.round(tc / 2), tc].forEach(t => {
    const x = mapX(Math.min(t, n - 1));
    vline(ctx, x, pB, pB + 4, C.muted);
    label(ctx, String(t), x, pB + 14, C.muted, 'center', 9);
  });

  ctx.save();
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pL, pT); ctx.lineTo(pL, pB); ctx.lineTo(pR, pB);
  ctx.stroke();
  ctx.restore();
}

// ── Chart: Combat Breakdown ────────────────────────────────────────────────

interface CombatRow { label: string; p1: number; p2: number; color: string }

function drawCombat(ctx: CanvasRenderingContext2D, W: number, H: number,
                    stats: GameStats): void {
  clearCanvas(ctx, W, H);

  const rows: CombatRow[] = [
    { label: 'Skill Kills',     p1: sumArr(stats.skillKillsP1),    p2: sumArr(stats.skillKillsP2),    color: C.red },
    { label: 'Conway Deaths',   p1: sumArr(stats.naturalDeathsP1), p2: sumArr(stats.naturalDeathsP2), color: C.gray },
    { label: 'Skill Births',    p1: sumArr(stats.skillBirthsP1),   p2: sumArr(stats.skillBirthsP2),   color: C.green },
    { label: 'Conway Births',   p1: sumArr(stats.naturalBirthsP1), p2: sumArr(stats.naturalBirthsP2), color: C.greenDark },
  ];

  const maxVal = Math.max(...rows.flatMap(r => [r.p1, r.p2]), 1);
  const halfW = W / 2;
  const MT = 20, rowH = (H - MT - 8) / rows.length;
  const barMaxW = halfW * 0.55;
  const labelX = halfW * 0.38;

  // Column headers
  label(ctx, 'PLAYER 1', halfW * 0.5, 10, C.p1, 'center', 10);
  label(ctx, 'PLAYER 2', halfW * 1.5, 10, C.p2, 'center', 10);

  rows.forEach((row, i) => {
    const y = MT + i * rowH;
    const cy = y + rowH / 2;

    // P1 bar (grows left-to-right from center toward left)
    const w1 = (row.p1 / maxVal) * barMaxW;
    ctx.fillStyle = row.color + 'cc';
    ctx.fillRect(halfW - 6 - w1, cy - 7, w1, 14);

    // P2 bar (grows left-to-right from center toward right)
    const w2 = (row.p2 / maxVal) * barMaxW;
    ctx.fillStyle = row.color + 'cc';
    ctx.fillRect(halfW + 6, cy - 7, w2, 14);

    // Row label (center)
    label(ctx, row.label, halfW, cy, C.muted, 'center', 9);

    // Values
    label(ctx, String(row.p1), halfW - 10 - w1, cy, C.text, 'right', 10);
    label(ctx, String(row.p2), halfW + 10 + w2, cy, C.text, 'left', 10);

    // Color dot / legend swatch
    ctx.fillStyle = row.color;
    ctx.beginPath();
    ctx.arc(halfW - labelX - 10, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Subtle row separator
    if (i > 0) hline(ctx, 8, W - 8, y, C.grid);
  });

  // Center divider
  vline(ctx, halfW, MT - 10, H - 4, C.border);
}

// ── Chart: Territory Heat Map ──────────────────────────────────────────────

function drawHeatMap(ctx: CanvasRenderingContext2D, W: number, H: number,
                     stats: GameStats): void {
  clearCanvas(ctx, W, H);

  const { boardWidth: bW, boardHeight: bH, p1HeatMap, p2HeatMap } = stats;

  let maxHeat = 1;
  for (let y = 0; y < bH; y++)
    for (let x = 0; x < bW; x++)
      maxHeat = Math.max(maxHeat, p1HeatMap[y][x], p2HeatMap[y][x]);

  const MT = 6, MB = 24;
  const cs = Math.min(Math.floor((W) / bW), Math.floor((H - MT - MB) / bH));
  const offX = Math.floor((W - cs * bW) / 2);
  const offY = MT;

  // Draw cells
  for (let y = 0; y < bH; y++) {
    for (let x = 0; x < bW; x++) {
      const p1 = p1HeatMap[y][x] / maxHeat;
      const p2 = p2HeatMap[y][x] / maxHeat;
      if (p1 === 0 && p2 === 0) continue;

      // Additive RGB blend: P1→blue, P2→red, overlap→purple
      const r = Math.min(255, Math.round(p2 * 220));
      const g = 0;
      const b = Math.min(255, Math.round(p1 * 220));
      const a = Math.min(0.95, Math.max(p1, p2) * 0.85 + 0.15);

      ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(2)})`;
      ctx.fillRect(offX + x * cs, offY + y * cs, cs, cs);
    }
  }

  // Grid overlay (very subtle)
  if (cs >= 4) {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= bW; x++) {
      ctx.beginPath();
      ctx.moveTo(offX + x * cs, offY);
      ctx.lineTo(offX + x * cs, offY + bH * cs);
      ctx.stroke();
    }
    for (let y = 0; y <= bH; y++) {
      ctx.beginPath();
      ctx.moveTo(offX, offY + y * cs);
      ctx.lineTo(offX + bW * cs, offY + y * cs);
      ctx.stroke();
    }
  }

  // Board border
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(offX, offY, bW * cs, bH * cs);

  // Legend
  const legY = offY + bH * cs + 12;
  const legX = offX;
  const swatchW = 30, swatchH = 8;

  // P1 blue gradient
  const g1 = ctx.createLinearGradient(legX, 0, legX + swatchW, 0);
  g1.addColorStop(0, 'rgba(0,0,0,0)');
  g1.addColorStop(1, `rgba(0,0,220,0.9)`);
  ctx.fillStyle = g1;
  ctx.fillRect(legX, legY, swatchW, swatchH);
  label(ctx, 'P1', legX + swatchW + 4, legY + 4, C.p1, 'left', 9);

  // P2 red gradient
  const g2 = ctx.createLinearGradient(legX + 60, 0, legX + 90, 0);
  g2.addColorStop(0, 'rgba(0,0,0,0)');
  g2.addColorStop(1, `rgba(220,0,0,0.9)`);
  ctx.fillStyle = g2;
  ctx.fillRect(legX + 60, legY, swatchW, swatchH);
  label(ctx, 'P2', legX + 94, legY + 4, C.p2, 'left', 9);

  // Purple swatch for overlap
  ctx.fillStyle = 'rgba(150, 0, 150, 0.7)';
  ctx.fillRect(legX + 120, legY, swatchW, swatchH);
  label(ctx, 'Contested', legX + 154, legY + 4, C.muted, 'left', 9);
}

// ── Main StatsScreen class ─────────────────────────────────────────────────

export class StatsScreen {
  private overlay: HTMLElement;
  private onPlayAgainCb: () => void;
  private onViewReplayCb: () => void;

  constructor(overlayId: string, onPlayAgain: () => void, onViewReplay: () => void) {
    const el = document.getElementById(overlayId);
    if (!el) throw new Error(`#${overlayId} not found`);
    this.overlay = el;
    this.onPlayAgainCb = onPlayAgain;
    this.onViewReplayCb = onViewReplay;
  }

  show(stats: GameStats): void {
    this.overlay.innerHTML = this.buildHTML(stats);
    this.overlay.style.display = 'flex';

    // Wire buttons
    this.overlay.querySelector('#stats-btn-play-again')!
      .addEventListener('click', () => this.onPlayAgainCb());
    this.overlay.querySelector('#stats-btn-replay')!
      .addEventListener('click', () => { this.hide(); this.onViewReplayCb(); });

    // Draw charts
    requestAnimationFrame(() => this.renderCharts(stats));
  }

  hide(): void {
    this.overlay.style.display = 'none';
    this.overlay.innerHTML = '';
  }

  private buildHTML(stats: GameStats): string {
    const { winner, endReason, tickCount } = stats;

    const winnerText = winner === 'draw' ? 'Draw!' :
      `Player ${winner} Wins!`;
    const winnerClass = winner === 'draw' ? 'draw' : `p${winner}`;

    const reasonLabel: Record<string, string> = {
      elimination: 'by elimination',
      stale: 'board froze (3 cycles unchanged)',
      timeout: `time limit reached (${tickCount} ticks)`,
    };

    const p1Peak = maxArr(stats.p1Counts);
    const p2Peak = maxArr(stats.p2Counts);
    const p1Final = stats.p1Counts.at(-1) ?? 0;
    const p2Final = stats.p2Counts.at(-1) ?? 0;

    const card = (player: 1 | 2, peak: number, final: number) => {
      const cls = `p${player}`;
      const kills = sumArr(player === 1 ? stats.skillKillsP2 : stats.skillKillsP1);
      const births = sumArr(player === 1
        ? stats.skillBirthsP1 : stats.skillBirthsP2)
        + sumArr(player === 1 ? stats.naturalBirthsP1 : stats.naturalBirthsP2);
      const isWinner = winner === player;
      return `
        <div class="hero-card ${cls}-card ${isWinner ? 'winner-card' : ''}">
          ${isWinner ? '<div class="crown">&#9812;</div>' : ''}
          <div class="hero-title ${cls}-color">Player ${player}</div>
          <div class="hero-stat"><span class="hero-num">${final}</span> final cells</div>
          <div class="hero-stat"><span class="hero-num">${peak}</span> peak cells</div>
          <div class="hero-stat"><span class="hero-num">${kills}</span> enemies killed</div>
          <div class="hero-stat"><span class="hero-num">${births}</span> total births</div>
        </div>`;
    };

    return `
      <div class="stats-inner">
        <div class="stats-hero-row">
          ${card(1, p1Peak, p1Final)}
          <div class="stats-verdict">
            <div class="verdict-text ${winnerClass}-verdict">${winnerText}</div>
            <div class="verdict-reason">${reasonLabel[endReason]}</div>
            <div class="verdict-ticks">${tickCount} ticks</div>
          </div>
          ${card(2, p2Peak, p2Final)}
        </div>

        <div class="stats-charts-grid">
          <div class="chart-card">
            <div class="chart-label">Cell Count Timeline</div>
            <canvas id="ch-timeline" width="520" height="160"></canvas>
          </div>
          <div class="chart-card">
            <div class="chart-label">Dominance</div>
            <canvas id="ch-dominance" width="520" height="140"></canvas>
          </div>
          <div class="chart-card">
            <div class="chart-label">Combat Breakdown</div>
            <canvas id="ch-combat" width="400" height="180"></canvas>
          </div>
          <div class="chart-card">
            <div class="chart-label">Territory Heat Map</div>
            <canvas id="ch-heatmap" width="400" height="220"></canvas>
          </div>
        </div>

        <div class="stats-actions">
          <button class="btn btn-replay-ctrl" id="stats-btn-replay">&#9664; View Replay</button>
          <button class="btn btn-start" id="stats-btn-play-again">&#8635; Play Again</button>
        </div>
      </div>`;
  }

  private renderCharts(stats: GameStats): void {
    this.drawChart('ch-timeline', (ctx, w, h) => drawTimeline(ctx, w, h, stats));
    this.drawChart('ch-dominance', (ctx, w, h) => drawDominance(ctx, w, h, stats));
    this.drawChart('ch-combat', (ctx, w, h) => drawCombat(ctx, w, h, stats));
    this.drawChart('ch-heatmap', (ctx, w, h) => drawHeatMap(ctx, w, h, stats));
  }

  private drawChart(id: string,
                    fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): void {
    const canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    fn(ctx, canvas.width, canvas.height);
  }
}
