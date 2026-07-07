import * as THREE from 'three';
import { PHYSICS } from '../constants.js';

/**
 * يتحكم بمضرب اللاعب فقط عبر لوحة المفاتيح (WASD + F للضرب).
 * منطق مضرب البوت انتقل بالكامل لملف PaddleBot.js المستقل.
 */
export class PaddleController {
  constructor(camera, renderer, tableHalfX) {
    this.camera = camera;
    this.renderer = renderer;
    this.tableHalfX = tableHalfX;

    // الارتفاع هو السطح العلوي الفعلي للطاولة بالملي (الارتفاع + السماكة)
    this.baseY = PHYSICS.tableH + PHYSICS.tableThickness;

    // سرعة حركة المضرب بالمتر/الثانية عند الضغط المستمر على الزر
    this.moveSpeed = 4.0;

    this.playerPos = new THREE.Vector3(this.tableHalfX - 0.3, this.baseY, 0);
    this.playerPrevPos = this.playerPos.clone();
    this.playerVel = new THREE.Vector3();

    this.playerWantsHit = false;

    // حالة الأزرار المضغوطة حالياً
    this._keys = {
      forward:  false, // W  -> +X (تجاه المضرب البوت)
      backward: false, // S  -> -X
      left:     false, // A  -> -Z
      right:    false, // D  -> +Z
      hit:      false, // F  -> نية الضرب
    };

    this._bindEvents();
  }

  _bindEvents() {
    const keyDownMap = {
      'KeyW': 'forward',
      'KeyS': 'backward',
      'KeyA': 'left',
      'KeyD': 'right',
      'KeyF': 'hit',
    };

    window.addEventListener('keydown', (e) => {
      const action = keyDownMap[e.code];
      if (!action) return;
      this._keys[action] = true;
      if (action === 'hit') this.playerWantsHit = true;
    });

    window.addEventListener('keyup', (e) => {
      const action = keyDownMap[e.code];
      if (!action) return;
      this._keys[action] = false;
    });
  }

  update(dt) {
    // بناء متجه الحركة حسب الأزرار المضغوطة حالياً
    let dx = 0;
    let dz = 0;
    if (this._keys.forward)  dx += 1;
    if (this._keys.backward) dx -= 1;
    if (this._keys.right)    dz += 1;
    if (this._keys.left)     dz -= 1;

    this.playerPrevPos.copy(this.playerPos);

    if (dx !== 0 || dz !== 0) {
      // تطبيع المتجه لمنع تسارع الحركة القطرية
      const len = Math.hypot(dx, dz);
      dx = (dx / len) * this.moveSpeed * dt;
      dz = (dz / len) * this.moveSpeed * dt;

      const rawX = this.playerPos.x + dx;
      const rawZ = this.playerPos.z + dz;

      // نفس حدود الحركة القديمة الطولية والجانبية على الطاولة
      const clampedX = THREE.MathUtils.clamp(rawX, 0.15, this.tableHalfX + 0.6);
      const clampedZ = THREE.MathUtils.clamp(rawZ, -PHYSICS.tableW / 2 - 0.4, PHYSICS.tableW / 2 + 0.4);

      this.playerPos.set(clampedX, this.baseY, clampedZ);
    } else {
      // قفل الارتفاع دائماً حتى لو ما في حركة
      this.playerPos.y = this.baseY;
    }

    if (dt > 0) {
      this.playerVel.copy(this.playerPos).sub(this.playerPrevPos).divideScalar(dt);
    }
  }

  consumePlayerHitIntent() {
    const wanted = this.playerWantsHit;
    this.playerWantsHit = false;
    return wanted;
  }
}