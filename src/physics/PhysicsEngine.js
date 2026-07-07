import * as THREE from 'three';
import { PHYSICS } from '../constants.js';

export class PhysicsEngine {
  constructor(state) {
    this.state = state;

    this._Fg = new THREE.Vector3();
    this._Fd = new THREE.Vector3();
    this._Fm = new THREE.Vector3();
    this._Ftot = new THREE.Vector3();
    this._acc = new THREE.Vector3();

    this.justLaunched = false;
    this.currentType = 'topspin';
    this.lastEvents = [];
  }

  applyBallSpin(type) {
    const { omega } = this.state;
    this.currentType = type;

    omega.set(0, 0, 0);

    switch (type) {
      case 'topspin':
        omega.set(0, 0, -4);
        break;
      case 'backspin':
        omega.set(0, 0, 4);
        break;
      case 'sidespin':
        omega.set(0, 8, 0);
        break;
      default:
        omega.set(0, 0, 0);
    }

    this.state.stopped = false;
    this.state.bounces = 0;
    this.justLaunched = true;
  }

  step(dt) {
    if (this.state.stopped) return;
    const { pos, vel, omega } = this.state;

    // الجاذبية
    this._Fg.set(0, -PHYSICS.m * PHYSICS.g, 0);

    // مقاومة الهواء
    const speed = vel.length();
    if (speed > 1e-6) {
      const dragMag = 0.5 * PHYSICS.Cd * PHYSICS.rho * PHYSICS.A * speed * speed;
      this._Fd.copy(vel).normalize().multiplyScalar(-dragMag);
    } else {
      this._Fd.set(0, 0, 0);
    }

    // قوة ماغنوس (مخففة)
    this._Fm.crossVectors(omega, vel).multiplyScalar(PHYSICS.Sm * 0.3);

    this._Ftot.copy(this._Fg).add(this._Fd).add(this._Fm);
    this._acc.copy(this._Ftot).divideScalar(PHYSICS.m);

    vel.addScaledVector(this._acc, dt);
    pos.addScaledVector(vel, dt);
    omega.multiplyScalar(Math.exp(-PHYSICS.beta * dt));

    this._handleCollisions();
  }

  _handleCollisions() {
    const { pos, vel, omega } = this.state;
    const { tableH, tableL, tableW, tableThickness, e, r } = PHYSICS;
    const tableSurfaceY = tableH + tableThickness;

    const halfL = tableL / 2;
    const halfW = tableW / 2;

    // تصادم الطاولة
    if (
      pos.y <= tableSurfaceY + r &&
      Math.abs(pos.x) <= halfL &&
      Math.abs(pos.z) <= halfW &&
      vel.y < 0
    ) {
      pos.y = tableSurfaceY + r;
      vel.y = -e * vel.y;
      vel.x *= 0.9;
      vel.z *= 0.9;

      omega.multiplyScalar(0.8);

      this.state.bounces++;
      this.lastEvents.push({ type: 'table_bounce', x: pos.x, z: pos.z });

      if (Math.abs(vel.y) < 0.05 && vel.length() < 0.15) {
        vel.set(0, 0, 0);
        omega.set(0, 0, 0);
        this.state.stopped = true;
      }
    }

    // الشبكة
    const netH = 0.35;
    const netTopY = tableSurfaceY + netH;
    const nearNetX = Math.abs(pos.x) <= r + 0.02;
    const withinNetWidth = Math.abs(pos.z) <= halfW + r;
    const belowNetTop = pos.y - r <= netTopY;

    if (nearNetX && withinNetWidth && belowNetTop && pos.y + r >= tableSurfaceY) {
      pos.x = Math.sign(vel.x || 1) * (r + 0.025);
      vel.x = -vel.x * 0.3;
      vel.y *= 0.6;
      vel.z *= 0.6;
      this.lastEvents.push({ type: 'net_hit', x: pos.x, z: pos.z });
    }

    // الأرض
    if (pos.y <= r) {
      pos.y = r;
      const speed = vel.length();
      if (Math.abs(vel.y) < 0.05 && speed < 0.15) {
        vel.set(0, 0, 0);
        omega.set(0, 0, 0);
        this.state.stopped = true;
      } else {
        vel.y = -e * 0.3 * vel.y;
        vel.x *= 0.7;
        vel.z *= 0.7;
      }
    }
  }

  // 🆕 ضربة بسيطة من منتصف المضرب
  checkPaddleHit(paddlePos, paddleVel, isHitting) {
    const { pos, vel, omega } = this.state;
    const { r } = PHYSICS;

    if (this.justLaunched) {
      this.justLaunched = false;
      return false;
    }

    const paddleRadius = 0.5;
    const hitDistance = r + paddleRadius;

    const dist = pos.distanceTo(paddlePos);
    if (dist > hitDistance) return false;
    if (!isHitting) return false;

    // 🆕 منتصف المضرب
    const normal = new THREE.Vector3().subVectors(pos, paddlePos).normalize();
    pos.copy(paddlePos).addScaledVector(normal, hitDistance + 0.005);

    // 🆕 ضربة بسيطة
    const restitution = 0.5;
    const speedAlongNormal = vel.dot(normal);

    if (speedAlongNormal < 0) {
      // عكس السرعة
      vel.addScaledVector(normal, -speedAlongNormal * (1 + restitution));
      
      // زخم بسيط من المضرب
      const paddleSpeed = paddleVel.length();
      if (paddleSpeed > 0.1) {
        vel.add(paddleVel.clone().multiplyScalar(0.3));
      }

      // 🆕 تحديد السرعة القصوى
      const maxSpeed = 12;
      if (vel.length() > maxSpeed) {
        vel.normalize().multiplyScalar(maxSpeed);
      }

      // 🆕 تحديد الارتفاع الأقصى
      if (vel.y > 5) {
        vel.y = 5;
      }
      if (vel.y < -5) {
        vel.y = -5;
      }
    }

    this.state.stopped = false;
    this.justLaunched = true;
    return true;
  }
}