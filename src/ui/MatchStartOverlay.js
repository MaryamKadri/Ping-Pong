/**
 * MatchStartOverlay — شاشة بدء قبل المباراة: زر "Start Match" وبعده عد تنازلي
 * (3, 2, 1, GO!) قبل ما تنادي onStart(). ما بتحتاج أي تعديل بـ HTML — بتبني
 * عناصرها بنفسها وبتضيفها لـ document.body مباشرة.
 */
export class MatchStartOverlay {
  /**
   * @param {{ onStart?: () => void, countdownStepMs?: number }} options
   */
  constructor({ onStart, countdownStepMs = 800 } = {}) {
    this.onStart = onStart || (() => {});
    this.countdownStepMs = countdownStepMs;
    this._timer = null;

    this._buildDOM();
  }

  _buildDOM() {
    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(8, 10, 14, 0.82);
      backdrop-filter: blur(3px);
      font-family: 'IBM Plex Mono', monospace;
      color: #f2f2f0;
      user-select: none;
      transition: opacity 0.35s ease;
    `;

    this.startBtn = document.createElement('button');
    this.startBtn.textContent = '▶  Start Match';
    this.startBtn.style.cssText = `
      padding: 18px 44px;
      font-family: inherit;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.3px;
      color: #14110c;
      background: #ff8a3d;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      box-shadow: 0 8px 26px rgba(255, 138, 61, 0.35);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    `;
    this.startBtn.addEventListener('mouseenter', () => {
      this.startBtn.style.transform = 'scale(1.04)';
      this.startBtn.style.boxShadow = '0 10px 32px rgba(255, 138, 61, 0.45)';
    });
    this.startBtn.addEventListener('mouseleave', () => {
      this.startBtn.style.transform = 'scale(1)';
      this.startBtn.style.boxShadow = '0 8px 26px rgba(255, 138, 61, 0.35)';
    });
    this.startBtn.addEventListener('click', () => this._beginCountdown());

    this.countdownEl = document.createElement('div');
    this.countdownEl.style.cssText = `
      display: none;
      font-size: 128px;
      font-weight: 700;
      color: #ff8a3d;
      text-shadow: 0 0 40px rgba(255, 138, 61, 0.55);
    `;

    this.root.appendChild(this.startBtn);
    this.root.appendChild(this.countdownEl);
    document.body.appendChild(this.root);
  }

  _beginCountdown() {
    this.startBtn.style.display = 'none';
    this.countdownEl.style.display = 'block';

    const sequence = ['3', '2', '1', 'GO!'];
    let i = 0;

    const step = () => {
      this.countdownEl.textContent = sequence[i];
      i += 1;
      if (i < sequence.length) {
        this._timer = setTimeout(step, this.countdownStepMs);
      } else {
        this._timer = setTimeout(() => this._finish(), this.countdownStepMs * 0.6);
      }
    };
    step();
  }

  _finish() {
    this.root.style.opacity = '0';
    this._timer = setTimeout(() => {
      if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
    }, 350);
    this.onStart();
  }

  /** يرجّع شاشة "Start Match" من جديد (مثلاً بعد الضغط على زر إيقاف المباراة) */
  reset() {
    if (this._timer) clearTimeout(this._timer);
    if (!this.root.parentNode) document.body.appendChild(this.root);
    this.root.style.opacity = '1';
    this.countdownEl.style.display = 'none';
    this.startBtn.style.display = 'block';
  }

  /** إزالة فورية (مثلاً عند تفريغ الصفحة) */
  destroy() {
    if (this._timer) clearTimeout(this._timer);
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}
