import * as THREE from 'three';
import { PHYSICS } from '../constants.js';

export class PaddleBot {
  constructor(side, tableHalfX) {
    this.side = side;
    this.tableHalfX = tableHalfX; // = 4.5

    this.baseY = PHYSICS.tableH + PHYSICS.tableThickness + 0.08;

    // 🆕 Rest position now sits BEHIND the physical table edge (4.5),
    // exactly as requested: 4.8 for the right bot, -4.8 for the left.
    this.restX = side === 'left' ? -(this.tableHalfX + 0.3) : (this.tableHalfX + 0.3);

    this.pos = new THREE.Vector3(this.restX, this.baseY, 0);
    this.prevPos = this.pos.clone();
    this.vel = new THREE.Vector3();

    this.currentVel = new THREE.Vector3();
    this.maxSpeed = 7.5;
    this.maxAccel = 30;

    this.lungeMaxSpeed = 11;
    this.lungeMaxAccel = 45;

    this.hitCooldown = 0;

    this.bouncedOnMySide = false;
    this.willHit = true;

    this.baseAngle = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    this.scratchQuat = new THREE.Quaternion();

    this.pitch = 0;
    this.roll = 0;

    this.swinging = false;
    this.swingTimer = 0;
    this.swingDuration = 0.22;
    this.swingPitchAmp = 0;
    this.swingRollAmp = 0;
    this.maxTilt = 0.35;

    this.lunging = false;

    // 🆕 How far past the endline (into the table) a bot is willing to
    // lunge to save a short ball. 1.8 units lets it reach down to
    // x = 4.5 - 1.8 = 2.7 — a real "diving return" range, but never
    // anywhere near the net (x = 0).
    this.maxLungeReach = 1.8;

    this.aimTarget = new THREE.Vector3(this.restX * -1, 0, 0);
    this.missThisShot = false;
    this.missRate = 0.12;

    this.targetPos = this.pos.clone();
    this.restPos = this.pos.clone();
  }

  _onMyHalf(x) {
    return this.side === 'left' ? x < 0 : x >= 0;
  }

  _ballApproaching(ballState) {
    return this.side === 'left' ? ballState.vel.x < -0.05 : ballState.vel.x > 0.05;
  }

  notifyPhysicsEvents(events) {
    if (!events || !events.length) return;
    for (const ev of events) {
      if (ev.type === 'table_bounce') {
        if (this._onMyHalf(ev.x)) {
          this.bouncedOnMySide = true;
          this.willHit = Math.random() > 0.02;
        } else {
          this.bouncedOnMySide = false;
        }
      }
      if (ev.type === 'net_hit') {
        this.bouncedOnMySide = false;
      }
    }
  }

  onServe() {
    this.bouncedOnMySide = false;
    this.willHit = true;
    this.hitCooldown = 0;
    this.swinging = false;
    this.swingTimer = 0;
    this.lunging = false;
  }

  planShot() {
    const opponentSign = this.side === 'left' ? 1 : -1;

    const depthFactor = THREE.MathUtils.randFloat(0.35, 0.85);
    const targetX = opponentSign * this.tableHalfX * depthFactor;

    const maxSpread = PHYSICS.tableW * 0.42;
    const targetZ = THREE.MathUtils.randFloatSpread(2 * maxSpread);

    this.aimTarget.set(targetX, 0, targetZ);
    this.missThisShot = Math.random() < this.missRate;
  }

  onHit(pitchAmp, rollAmp) {
    this.bouncedOnMySide = false;
    this.hitCooldown = 0.15;

    this.swinging = true;
    this.swingTimer = 0;

    const sideSign = this.side === 'left' ? 1 : -1;
    const defaultPitch = sideSign * 0.22;

    this.swingPitchAmp = THREE.MathUtils.clamp(
      pitchAmp !== undefined ? pitchAmp : defaultPitch, -0.3, 0.3
    );
    this.swingRollAmp = THREE.MathUtils.clamp(
      rollAmp !== undefined ? rollAmp : 0, -0.25, 0.25
    );
  }

  _predictIntercept(ballState) {
    // Predict against the endline plane (tableHalfX), not restX — this is
    // where contact actually needs to happen, whether the bot ends up
    // there via normal positioning or a lunge.
    const planeX = this.side === 'left' ? -this.tableHalfX : this.tableHalfX;
    let t = 0;
    if (Math.abs(ballState.vel.x) > 0.05) {
      t = (planeX - ballState.pos.x) / ballState.vel.x;
      t = THREE.MathUtils.clamp(t, 0, 1.4);
    }
    const predictedZ = ballState.pos.z + ballState.vel.z * t;
    const predictedX = ballState.pos.x + ballState.vel.x * Math.min(t, 0.15);
    return { x: predictedX, z: predictedZ };
  }

  // 🆕 Rewritten around the real table edge (tableHalfX = 4.5) instead of
  // an arbitrary interior line. Normal defense clamps strictly to the
  // zone BEHIND the table (endline to endline+0.7 ≈ 4.5–5.2). Only when
  // the predicted intercept falls in front of the endline (a short ball)
  // does the bot lunge forward onto the table surface, capped at
  // maxLungeReach so it can never approach the net.
  _resolveDefensiveX(rawInterceptX) {
    const sideSign = this.side === 'left' ? -1 : 1;

    const endline = sideSign * this.tableHalfX;              // ±4.5
    const backLimit = sideSign * (this.tableHalfX + 0.7);    // ±5.2
    const lungeLimit = sideSign * (this.tableHalfX - this.maxLungeReach); // ±2.7

    // Is the ball's intercept point in front of our endline (i.e. a short
    // ball landing on the table, not deep behind it)?
    const inFrontOfEndline = this.side === 'left'
      ? rawInterceptX > endline
      : rawInterceptX < endline;

    if (inFrontOfEndline) {
      // Short ball — lunge forward onto the table, bounded so we never
      // get anywhere near the net.
      this.lunging = true;
      const clampedLungeTarget = this.side === 'left'
        ? THREE.MathUtils.clamp(rawInterceptX, lungeLimit, endline)
        : THREE.MathUtils.clamp(rawInterceptX, endline, lungeLimit);
      return clampedLungeTarget;
    }

    // Normal case — stay behind the endline, within the defensive band.
    this.lunging = false;
    const safeMin = this.side === 'left' ? backLimit : endline;
    const safeMax = this.side === 'left' ? endline : backLimit;
    return THREE.MathUtils.clamp(rawInterceptX, safeMin, safeMax);
  }

  update(dt, ballState) {
    if (!ballState || !ballState.pos) return;
    const ballPos = ballState.pos;

    if (this.hitCooldown > 0) {
      this.hitCooldown -= dt;
    }

    this.prevPos.copy(this.pos);

    const approaching = this._ballApproaching(ballState);
    const ballOnMySide = this._onMyHalf(ballPos.x);
    const engaged = ballOnMySide || approaching;

    let targetX, targetZ;

    if (engaged) {
      const intercept = this._predictIntercept(ballState);
      targetZ = THREE.MathUtils.clamp(intercept.z, -PHYSICS.tableW / 2 + 0.15, PHYSICS.tableW / 2 - 0.15);

      const rawX = this.side === 'left' ? intercept.x - 0.12 : intercept.x + 0.12;
      targetX = this._resolveDefensiveX(rawX);
    } else {
      this.lunging = false;
      const anticipationWeight = 0.3;
      const readyZ = ballPos.z * anticipationWeight;
      targetZ = THREE.MathUtils.clamp(readyZ, -PHYSICS.tableW / 2 + 0.15, PHYSICS.tableW / 2 - 0.15);
      targetX = this.restX;
    }

    const toTarget = new THREE.Vector3(targetX - this.pos.x, 0, targetZ - this.pos.z);
    const dist = toTarget.length();

    const maxSpeed = this.lunging ? this.lungeMaxSpeed : this.maxSpeed;
    const maxAccel = this.lunging ? this.lungeMaxAccel : this.maxAccel;

    let desiredVel = new THREE.Vector3();
    if (dist > 0.001) {
      const approachGain = 4.5;
      const speed = Math.min(maxSpeed, dist * approachGain);
      desiredVel.copy(toTarget).normalize().multiplyScalar(speed);
    }

    const velDelta = desiredVel.clone().sub(this.currentVel);
    const maxDeltaThisFrame = maxAccel * dt;
    if (velDelta.length() > maxDeltaThisFrame) {
      velDelta.setLength(maxDeltaThisFrame);
    }
    this.currentVel.add(velDelta);

    this.pos.x += this.currentVel.x * dt;
    this.pos.z += this.currentVel.z * dt;
    this.pos.y = this.baseY;

    if (dt > 0) {
      this.vel.copy(this.pos).sub(this.prevPos).divideScalar(dt);
    }

    this._updatePaddleTilt(ballState, dt);
    if (this.swinging) {
      this.swingTimer += dt;
      if (this.swingTimer >= this.swingDuration) {
        this.swinging = false;
        this.swingTimer = 0;
      }
    }
  }

  _updatePaddleTilt(ballState, dt) {
    const approaching = this._ballApproaching(ballState);

    let targetPitch = 0;
    let targetRoll = 0;

    if (approaching) {
      const aimDX = Math.abs(this.aimTarget.x - this.pos.x);
      const aimDZ = this.aimTarget.z - this.pos.z;

      const shotPower = THREE.MathUtils.clamp(aimDX / (this.tableHalfX * 0.85), 0, 1);
      const forwardTilt = THREE.MathUtils.lerp(0.1, 0.28, shotPower);
      targetPitch = this.side === 'left' ? forwardTilt : -forwardTilt;

      if (ballState.vel.y < -2) {
        targetPitch *= 0.4;
      }

      if (this.lunging) {
        targetPitch += (this.side === 'left' ? 1 : -1) * 0.08;
      }

      targetRoll = THREE.MathUtils.clamp(aimDZ * 0.1, -0.25, 0.25);
    }

    const tiltSpeed = 9 * dt;
    this.pitch += THREE.MathUtils.clamp(targetPitch - this.pitch, -tiltSpeed, tiltSpeed);
    this.roll += THREE.MathUtils.clamp(targetRoll - this.roll, -tiltSpeed, tiltSpeed);
  }

  shouldHit(ballPos) {
    if (this.hitCooldown > 0) return false;

    const dx = this.pos.x - ballPos.x;
    const dz = this.pos.z - ballPos.z;
    const dist2D = Math.sqrt(dx * dx + dz * dz);

    const onMySide = this._onMyHalf(ballPos.x);
    const yDiff = Math.abs(ballPos.y - this.baseY);

    return dist2D < 0.3 && onMySide && yDiff < 0.18 && this.willHit;
  }

  getPaddleQuaternion() {
    let swingOffsetPitch = 0;
    let swingOffsetRoll = 0;

    if (this.swinging) {
      const t = THREE.MathUtils.clamp(this.swingTimer / this.swingDuration, 0, 1);
      const envelope = Math.sin(t * Math.PI);
      swingOffsetPitch = this.swingPitchAmp * envelope;
      swingOffsetRoll = this.swingRollAmp * envelope;
    }

    const totalPitch = THREE.MathUtils.clamp(this.pitch + swingOffsetPitch, -this.maxTilt, this.maxTilt);
    const totalRoll = THREE.MathUtils.clamp(this.roll + swingOffsetRoll, -this.maxTilt, this.maxTilt);

    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.baseAngle);
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), totalPitch);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), totalRoll);

    this.scratchQuat.copy(yawQuat).multiply(pitchQuat).multiply(rollQuat);
    return this.scratchQuat;
  }
}

export class AutoServeController {
  constructor() {
    this.waitTimer = 0;
    this.delayBetweenPoints = 1.4;
  }

  update(dt, inPlay, serveFn, nextServerFn) {
    if (inPlay) {
      this.waitTimer = 0;
      return;
    }
    this.waitTimer += dt;
    if (this.waitTimer >= this.delayBetweenPoints) {
      this.waitTimer = 0;
      serveFn(nextServerFn());
    }
  }
}