/* スーパーアンパンマン — game engine (pure logic + render dispatch)
 * Runs at a fixed 60 steps per second. No Math.random: everything is seeded,
 * so a run driven by the bot is fully reproducible (needed for video capture). */
(function (G) {
  'use strict';
  const AP = G.AP = G.AP || {};

  const T = 72, ROWS = 15, GT = 13;
  const VIEW = { x: 0, y: 250, w: 1080, h: 1080 };
  Object.assign(AP, { T, ROWS, GT, VIEW, W: 1080, H: 1920 });

  const PH = AP.PH = {
    WALK: 5.6, RUN: 8.4, ACC: 0.32, ACC_AIR: 0.26, FRIC: 0.3, SKID: 0.65,
    RUN_DELAY: 36, JUMP: 19.5, JUMP_SPEED_BONUS: 0.25, G_HOLD: 0.6, G: 1.7,
    MAXFALL: 17, STOMP: 12, STOMP_HOLD: 17,
  };

  AP.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const SOLID = { G: 1, B: 1, '?': 1, M: 1, N: 1, U: 1, S: 1, '[': 1, ']': 1, '{': 1, '}': 1, W: 1, X: 1 };
  AP.isSolidCh = (ch) => SOLID[ch] === 1;

  const overlap = AP.overlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  AP.blankInput = () => ({ left: false, right: false, up: false, down: false, a: false, b: false, start: false, select: false });

  /* ------------------------------------------------------------------ Player */
  class Player {
    constructor(g, x, y) {
      this.g = g; this.w = 54; this.h = 112; this.x = x; this.y = y;
      this.vx = 0; this.vy = 0; this.dir = 1; this.onGround = false;
      this.genki = true; this.inv = 0; this.runT = 0; this.holdDir = 0;
      this.coyote = 0; this.jumpBuf = 0; this.jumping = false;
      this.punchT = 0; this.punchCD = 0; this.walkPhase = 0;
      this.visible = true; this.alpha = 1; this.isPlayer = true;
      this.stompChain = 0; this.landT = 0; this.dead = false; this.pose = null; this.hurtT = 0;
    }
    get cx() { return this.x + this.w / 2; }
    get bottom() { return this.y + this.h; }
    punchBox() {
      if (this.punchT <= 0) return null;
      const t = 20 - this.punchT;
      if (t < 2 || t > 13) return null;
      const reach = 78;
      return { x: this.dir > 0 ? this.x + this.w - 8 : this.x - reach + 8, y: this.y + 20, w: reach, h: this.h - 30 };
    }
    update() {
      const g = this.g, inp = g.inp;
      const move = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (move !== 0) {
        if (move !== this.holdDir) { this.runT = 0; this.holdDir = move; }
        else if (this.onGround && Math.abs(this.vx) >= PH.WALK - 0.6) this.runT++;
        if (this.onGround) this.dir = move;
        const max = (this.runT > PH.RUN_DELAY || g.star > 0) ? PH.RUN : PH.WALK;
        if (this.vx * move < 0) this.vx += move * (this.onGround ? PH.SKID : PH.ACC_AIR);
        else if (Math.abs(this.vx) < max) {
          this.vx += move * (this.onGround ? PH.ACC : PH.ACC_AIR);
          if (Math.abs(this.vx) > max) this.vx = move * max;
        } else if (this.onGround) this.vx -= Math.sign(this.vx) * 0.2;
      } else {
        this.holdDir = 0; this.runT = 0;
        if (this.onGround) {
          const s = Math.sign(this.vx);
          this.vx -= s * PH.FRIC;
          if (Math.sign(this.vx) !== s) this.vx = 0;
        }
      }

      if (g.pressed('a')) this.jumpBuf = 6; else if (this.jumpBuf > 0) this.jumpBuf--;
      if (this.onGround) this.coyote = 6; else if (this.coyote > 0) this.coyote--;
      if (this.jumpBuf > 0 && this.coyote > 0) {
        this.vy = -(PH.JUMP + Math.abs(this.vx) * PH.JUMP_SPEED_BONUS);
        this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.jumping = true;
        g.sfx('jump');
      }
      if (!inp.a) this.jumping = false;
      this.vy += (this.vy < 0 && this.jumping) ? PH.G_HOLD : PH.G;
      if (this.vy > PH.MAXFALL) this.vy = PH.MAXFALL;

      if (g.pressed('b') && this.punchCD === 0) {
        this.punchT = 20; this.punchCD = 24;
        g.sfx('punch'); g.onPunch(this);
      }
      if (this.punchT > 0) this.punchT--;
      if (this.punchCD > 0) this.punchCD--;

      const wasGround = this.onGround;
      const res = g.move(this);
      if (res.hitWall) this.vx = 0;
      if (res.head) g.hitBlock(res.head.c, res.head.r, this);
      if (this.onGround) {
        this.stompChain = 0;
        if (!wasGround) { this.landT = 8; g.dust(this.cx, this.bottom, 2); }
      }
      if (this.x < g.camX) { this.x = g.camX; if (this.vx < 0) this.vx = 0; }
      if (this.onGround) this.walkPhase += Math.abs(this.vx) * 0.09;
      if (this.inv > 0) this.inv--;
      if (this.landT > 0) this.landT--;
      if (this.hurtT > 0) this.hurtT--;
      if (this.onGround && Math.abs(this.vx) > 4 && move !== 0 && this.vx * move < 0 && g.frame % 4 === 0) g.dust(this.cx, this.bottom, 1);

      g.collectCoins(this);
      if (this.y > ROWS * T + 60) g.killPlayer();
      else if (g.lavaHit(this)) g.killPlayer();
    }
  }

  /* --------------------------------------------------------- かびるんるん */
  class Kabi {
    constructor(g, c, r, kind) {
      this.g = g; this.kind = kind; // green | purple | winged
      this.w = 60; this.h = 58;
      this.x = c * T + (T - this.w) / 2; this.y = (r + 1) * T - this.h;
      this.vx = -1.5; this.vy = 0; this.state = 'walk'; this.t = 0; this.dead = false;
      this.onGround = false; this.phase = c * 1.7; this.noHurt = 0; this.rot = 0; this.isEnemy = true;
    }
    get cx() { return this.x + this.w / 2; }
    alive() { return !this.dead && (this.state === 'walk' || this.state === 'shell' || this.state === 'kicked'); }
    update() {
      const g = this.g; this.t++;
      if (this.noHurt > 0) this.noHurt--;
      switch (this.state) {
        case 'walk': {
          this.vy = Math.min(this.vy + 0.9, 15);
          const res = g.move(this);
          if (res.hitWall) this.vx = -res.hitWall * 1.5;
          if (this.kind === 'winged' && this.onGround) this.vy = -13;
          this.phase += 0.22;
          break;
        }
        case 'flat':
          if (this.t > 34) this.dead = true;
          break;
        case 'shell':
          this.vx = 0; this.vy = Math.min(this.vy + 0.9, 15); g.move(this);
          if (this.t > 400) { this.state = 'walk'; this.t = 0; this.vx = g.player.cx < this.cx ? -1.5 : 1.5; this.h = 58; this.y -= 8; }
          break;
        case 'kicked': {
          this.vy = Math.min(this.vy + 0.9, 15);
          const res = g.move(this);
          if (res.hitWall) { this.vx = -res.hitWall * 11; g.sfx('bump'); }
          this.rot += this.vx * 0.05;
          for (const e of g.enemies) {
            if (e !== this && e.alive() && overlap(this, e)) { e.kill(Math.sign(this.vx)); g.addScore(500, e.cx, e.y); g.sfx('kick'); }
          }
          if (this.x + this.w < g.camX - T * 2 || this.x > g.camX + VIEW.w + T * 3) this.dead = true;
          break;
        }
        case 'flip':
          this.vy += 0.9; this.x += this.vx; this.y += this.vy; this.rot += 0.12 * Math.sign(this.vx || 1);
          break;
      }
      if (this.y > ROWS * T + 120) this.dead = true;
    }
    stomp() {
      const g = this.g; this.t = 0;
      if (this.kind === 'winged') { this.kind = 'green'; this.vy = 0; return; }
      if (this.kind === 'purple') {
        if (this.state === 'kicked') { this.state = 'shell'; this.vx = 0; return; }
        this.state = 'shell'; this.vx = 0; this.h = 50; this.y += 8; g.stats.kabi++; return;
      }
      this.state = 'flat'; this.vx = 0; g.stats.kabi++;
    }
    kill(dir) {
      if (this.state !== 'shell' && this.state !== 'kicked') this.g.stats.kabi++;
      this.state = 'flip'; this.vy = -11; this.vx = (dir || 1) * 2.5; this.t = 0;
    }
  }

  /* ------------------------------------------------ あたらしい顔 (power-up) */
  class NewFace {
    constructor(g, c, r, star) {
      this.g = g; this.x = c * T + T / 2; this.y = r * T + T / 2; this.baseY = this.y; this.star = star;
      this.t = 0; this.state = 'emerge'; this.dead = false; this.r = 28; this.spin = 0;
    }
    update() {
      const g = this.g, p = g.player; this.t++;
      this.spin += 0.12;
      if (this.state === 'emerge') {
        this.y = this.baseY - Math.min(1, this.t / 24) * T;
        if (this.t >= 30) {
          this.state = 'fly'; this.t = 0; this.sx = this.x; this.sy = this.y;
          g.textPop('あたらしい顔よ〜!', this.x, this.y - 70, 'speech', 70);
        }
      } else {
        const u = Math.min(1, this.t / 42);
        const px = p.cx, py = p.y + 34;
        const cx = (this.sx + px) / 2, cy = Math.min(this.sy, py) - 230;
        const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
        this.x = a * this.sx + b * cx + c * px;
        this.y = a * this.sy + b * cy + c * py;
        if (g.frame % 3 === 0) g.spark(this.x, this.y, '#FFE680');
        if (u >= 1) { this.dead = true; g.powerUp(this.star); }
      }
    }
  }

  /* ------------------------------------------------ バイキンマン (boss) */
  class Boss {
    constructor(g, arenaC) {
      this.g = g; this.ax0 = arenaC * T; this.ax1 = (arenaC + 14) * T;
      this.x = this.ax0 + 10 * T; this.y = -300; this.hp = 3; this.maxHp = 3;
      this.state = 'enter'; this.t = 0; this.flashT = 0; this.dead = false;
      this.glove = null; this.bombs = []; this.rot = 0; this.scale = 1;
      this.smashes = 0; this.cycle = 0; this.hitMode = 0; this.isBoss = true;
    }
    get groundY() { return GT * T; }
    bodyBoxes() {
      const x = this.x, y = this.y;
      return [
        { x: x - 150, y: y - 16, w: 300, h: 40 },
        { x: x - 70, y: y - 110, w: 140, h: 96 },
        { x: x - 62, y: y + 22, w: 124, h: 58 },
      ];
    }
    domeTop() { return this.y - 108; }
    vulnerable() { return this.state === 'tired'; }
    harmful() { return this.state === 'hover' || this.state === 'approach' || this.state === 'smash'; }
    set(s) { this.state = s; this.t = 0; }
    dropBomb() {
      const g = this.g;
      this.bombs.push({ x: this.x, y: this.y + 60, vy: 2, state: 'fall', t: 0, spawn: this.hp <= 2 && this.bombs.length % 2 === 0 });
      g.sfx('drop');
    }
    update() {
      const g = this.g, p = g.player; this.t++;
      if (this.flashT > 0) this.flashT--;
      const hoverY = 330, landY = this.groundY - 80;
      switch (this.state) {
        case 'enter':
          this.y += (hoverY - this.y) * 0.04;
          if (this.t === 40) { g.textPop('ハーヒフーヘーホー!', this.x, hoverY - 175, 'baikin', 110); g.sfx('laugh'); }
          if (this.t >= 150) { g.music('boss'); this.set('hover'); }
          break;
        case 'hover': {
          const side = this.cycle % 2 ? 300 : -300;
          const tx = clamp(p.cx + side, this.ax0 + 190, this.ax1 - 190);
          this.x += clamp((tx - this.x) * 0.03, -5, 5);
          this.y = hoverY + Math.sin(this.t * 0.06) * 18;
          const drops = this.hp <= 2 ? [30, 65, 100] : [45, 100];
          if (drops.indexOf(this.t) >= 0) this.dropBomb();
          if (this.t === 20 && this.cycle > 0) g.sfx('laugh');
          if (this.t >= 130) this.set('approach');
          break;
        }
        case 'approach':
          this.x += clamp((p.cx - this.x) * 0.06, -7, 7);
          this.x = clamp(this.x, this.ax0 + 150, this.ax1 - 150);
          this.y += (420 - this.y) * 0.08;
          if (this.t >= 45) {
            this.set('smash');
            this.glove = { x: this.x, y: this.y + 95, tx: clamp(p.cx, this.ax0 + 60, this.ax1 - 60), state: 'aim', t: 0 };
            g.sfx('charge');
          }
          break;
        case 'smash': {
          const gl = this.glove; gl.t++;
          if (gl.state === 'aim') {
            gl.x += (gl.tx - gl.x) * 0.15; gl.y = this.y + 95 + Math.sin(gl.t * 0.9) * 4;
            if (gl.t >= 34) { gl.state = 'drop'; gl.t = 0; }
          } else if (gl.state === 'drop') {
            gl.y += 32;
            if (gl.y + 46 >= this.groundY) {
              gl.y = this.groundY - 46; gl.state = 'stay'; gl.t = 0;
              g.shake = 10; g.sfx('thud'); g.dust(gl.x - 30, this.groundY, 3); g.dust(gl.x + 30, this.groundY, 3);
            }
          } else if (gl.state === 'stay') {
            if (gl.t >= 22) { gl.state = 'back'; gl.t = 0; }
          } else if (gl.state === 'back') {
            gl.y += (this.y + 95 - gl.y) * 0.2; gl.x += (this.x - gl.x) * 0.2;
            if (gl.t >= 20) {
              this.glove = null; this.smashes++;
              const need = this.cycle === 0 ? 1 : 2;
              if (this.smashes >= need) this.set('land'); else this.set('approach');
              return;
            }
          }
          break;
        }
        case 'land':
          this.y += (landY - this.y) * 0.12;
          if (this.t >= 40) {
            this.y = landY; this.set('tired'); g.sfx('thud'); g.shake = 12;
            g.textPop('あれれ〜? エンジンが〜!', this.x, landY - 200, 'baikin', 90);
          }
          break;
        case 'tired':
          if (this.t % 9 === 0) g.smoke(this.x + (this.t % 18 ? 40 : -40), this.y + 10);
          if (this.t >= 170 - (this.maxHp - this.hp) * 12) { this.set('rise'); g.sfx('engine'); }
          break;
        case 'hurt':
          if (this.t > 30) this.y += (hoverY - this.y) * 0.06;
          if (this.t >= 100) { this.cycle++; this.smashes = 0; this.set('hover'); }
          break;
        case 'rise':
          this.y += (hoverY - this.y) * 0.06;
          if (this.t >= 60) { this.cycle++; this.smashes = 0; this.set('hover'); }
          break;
        case 'defeat':
          if (this.t < 90) {
            this.x += Math.sin(this.t * 1.7) * 3;
            if (this.t % 10 === 0) { g.boom(this.x - 120 + ((this.t * 37) % 240), this.y - 60 + ((this.t * 53) % 120)); g.sfx('boom'); }
          }
          if (this.t === 90) { g.textPop('ばいばいきーん!', this.x, this.y - 190, 'baikin', 140); g.sfx('bossfly'); }
          if (this.t > 90) {
            this.x += 7; this.y -= 10 + (this.t - 90) * 0.15; this.rot += 0.22; this.scale = Math.max(0.15, this.scale * 0.985);
          }
          if (this.y < -260) { this.dead = true; g.twinkle(); }
          break;
      }
      this.updateBombs();
    }
    updateBombs() {
      const g = this.g;
      for (const b of this.bombs) {
        b.t++;
        if (b.state === 'fall') {
          b.vy = Math.min(b.vy + 0.6, 16); b.y += b.vy;
          if (b.y + 20 >= this.groundY) { b.y = this.groundY - 20; b.state = 'fuse'; b.t = 0; g.sfx('bump'); }
        } else if (b.state === 'fuse') {
          if (b.t >= 44) {
            if (b.spawn) {
              const k = new Kabi(g, 0, 0, 'green');
              k.x = b.x - k.w / 2; k.y = this.groundY - k.h; k.vx = g.player.cx < b.x ? -1.5 : 1.5;
              g.enemies.push(k); g.puff(b.x, b.y); g.sfx('pop'); b.done = true;
            } else { b.state = 'boom'; b.t = 0; g.boom(b.x, b.y - 10); g.sfx('boom'); }
          }
        } else if (b.state === 'boom') {
          if (b.t >= 16) b.done = true;
        }
      }
      this.bombs = this.bombs.filter((b) => !b.done);
    }
    hit(how) {
      const g = this.g;
      if (!this.vulnerable()) return false;
      this.hp--; this.flashT = 50; g.shake = 16; g.sfx('bosshit');
      g.addScore(1000, this.x, this.y - 120);
      if (this.hp <= 0) {
        this.set('defeat'); g.music(null); g.sfx('bossdie'); g.flash = 10;
      } else {
        const lines = ['いててて〜!', 'ぐぬぬ〜!', 'おのれ アンパンマン!'];
        g.textPop(lines[(this.maxHp - this.hp - 1) % lines.length], this.x, this.y - 200, 'baikin', 80);
        this.set('hurt');
      }
      return true;
    }
  }

  /* ------------------------------------------------------------------ Game */
  class Game {
    constructor() {
      this.listeners = []; this.frame = 0; this.rand = AP.rng(20261025);
      this.inp = AP.blankInput(); this.prev = AP.blankInput();
      this.score = 0; this.coins = 0; this.lives = 3;
      this.stats = { kabi: 0, punch: 0, coins: 0, frames: 0 };
      this.mode = 'title'; this.modeT = 0; this.levelIndex = 0; this.level = null;
      this.effects = []; this.enemies = []; this.items = []; this.player = null;
      this.camX = 0; this.star = 0; this.shake = 0; this.flash = 0; this.finished = false;
      this.curMusic = undefined; this.boss = null; this.titleOut = 0;
      this.curMusic = 'title';
    }
    resync() { const m = this.curMusic; this.curMusic = undefined; this.music(m); }
    on(fn) { this.listeners.push(fn); }
    emit(type, name) { for (const l of this.listeners) l(type, name, this.frame); }
    sfx(n) { this.emit('sfx', n); }
    music(n) { if (this.curMusic === n) return; this.curMusic = n; this.emit('music', n); }
    pressed(k) { return this.inp[k] && !this.prev[k]; }
    setMode(m) { this.mode = m; this.modeT = 0; this.emit('mode', m); }

    startGame() {
      this.score = 0; this.coins = 0; this.lives = 3;
      this.stats = { kabi: 0, punch: 0, coins: 0, frames: 0 };
      this.loadLevel(0); this.setMode('intro');
    }
    loadLevel(i) {
      this.levelIndex = i;
      const L = this.level = AP.buildLevel(i);
      this.tiles = L.tiles; this.cols = L.cols;
      this.enemies = []; this.items = []; this.effects = []; this.bumps = [];
      this.spawnIdx = 0; this.camX = 0; this.time = L.time; this.timeTick = 0;
      this.star = 0; this.boss = null; this.flagged = false; this.flagY = 3 * T + 12;
      this.bossDone = false;
      this.player = new Player(this, L.start * T + 11, (GT - 1) * T - 100 + T);
      this.player.y = GT * T - this.player.h;
      this.music(null);
    }

    step(inp) {
      this.prev = this.inp; this.inp = inp || AP.blankInput();
      this.frame++; this.modeT++;
      switch (this.mode) {
        case 'title':
          if (!this.titleOut && this.modeT > 40 && (this.pressed('start') || this.pressed('a'))) { this.titleOut = 1; this.sfx('start'); this.music(null); }
          if (this.titleOut && ++this.titleOut > 50) { this.titleOut = 0; this.startGame(); }
          break;
        case 'intro':
          if (this.modeT === 8) this.music('ready');
          if (this.modeT >= 140) { this.setMode('play'); this.music(this.level.music); }
          break;
        case 'play': this.playUpdate(); break;
        case 'flag': this.flagUpdate(); break;
        case 'goal': this.goalUpdate(); break;
        case 'tally': this.tallyUpdate(); break;
        case 'dying': this.dyingUpdate(); break;
        case 'victory': this.victoryUpdate(); break;
        case 'ending':
          if (this.modeT >= 400) this.finished = true;
          if (this.modeT % 40 === 0) this.firework(120 + (this.modeT * 97) % 840, 160 + (this.modeT * 61) % 300, true);
          break;
        case 'gameover':
          if (this.modeT >= 240) { this.setMode('title'); this.music('title'); }
          break;
      }
      if (this.mode !== 'title' && this.mode !== 'intro' && this.mode !== 'ending') this.stats.frames++;
      this.updateEffects();
      if (this.shake > 0) this.shake--;
      if (this.flash > 0) this.flash--;
    }

    /* ------------------------------------------------------------ play */
    playUpdate() {
      const p = this.player, L = this.level;
      this.spawnEnemies();
      p.update();
      if (this.mode !== 'play') return;
      if (this.star > 0) {
        this.star--;
        if (this.star === 0) this.music(this.boss && !this.boss.dead ? 'boss' : L.music);
        if (this.frame % 3 === 0) this.spark(p.cx + (this.rand() - 0.5) * 70, p.y + this.rand() * p.h, null);
      }
      for (const e of this.enemies) e.update();
      this.enemyTurns();
      this.playerEnemies();
      this.punchHits();
      for (const it of this.items) it.update();
      if (this.boss) this.bossUpdate();
      if (this.mode !== 'play') return;
      this.enemies = this.enemies.filter((e) => !e.dead && e.x + e.w > this.camX - T * 4);
      this.items = this.items.filter((it) => !it.dead);
      this.updateCamera();
      for (const b of this.bumps) b.t++;
      this.bumps = this.bumps.filter((b) => b.t < 12);

      if (L.flagC != null && !this.flagged && p.x + p.w >= L.flagC * T + T / 2 - 4) this.grabFlag();
      if (L.arenaC != null && !this.boss && p.x > (L.arenaC + 3) * T && this.camX >= L.arenaC * T - 1) {
        this.boss = new Boss(this, L.arenaC); this.music(null); this.sfx('alarm');
      }
      if (!this.boss || this.boss.state !== 'defeat') {
        if (++this.timeTick >= 24) { this.timeTick = 0; if (this.time > 0) this.time--; if (this.time === 0) this.killPlayer(); }
      }
    }
    spawnEnemies() {
      const S = this.level.spawns;
      while (this.spawnIdx < S.length && S[this.spawnIdx].c * T < this.camX + VIEW.w + T * 1.5) {
        const s = S[this.spawnIdx++];
        const kind = s.type === 'K' ? 'purple' : s.type === 'f' ? 'winged' : 'green';
        this.enemies.push(new Kabi(this, s.c, s.r, kind));
      }
    }
    enemyTurns() {
      const E = this.enemies;
      for (let i = 0; i < E.length; i++) {
        const a = E[i]; if (a.state !== 'walk' || a.dead) continue;
        for (let j = i + 1; j < E.length; j++) {
          const b = E[j]; if (b.state !== 'walk' || b.dead) continue;
          if (overlap(a, b)) {
            if (a.cx < b.cx) { if (a.vx > 0) a.vx = -a.vx; if (b.vx < 0) b.vx = -b.vx; }
            else { if (a.vx < 0) a.vx = -a.vx; if (b.vx > 0) b.vx = -b.vx; }
          }
        }
      }
    }
    playerEnemies() {
      const p = this.player;
      for (const e of this.enemies) {
        if (p.dead || this.mode !== 'play') return;
        if (!e.alive() || !overlap(p, e)) continue;
        if (this.star > 0) {
          e.kill(p.cx < e.cx ? 1 : -1); this.addScore(200 * (1 + Math.min(4, p.stompChain++)), e.cx, e.y); this.sfx('kick');
          continue;
        }
        if (e.state === 'shell') {
          const dir = p.cx < e.cx ? 1 : -1;
          e.state = 'kicked'; e.vx = dir * 11; e.noHurt = 12; e.t = 0;
          this.sfx('kick'); this.addScore(400, e.cx, e.y);
          if (p.vy > 0 && p.bottom - e.y < 30) { p.vy = -10; p.y = e.y - p.h; }
          continue;
        }
        const prevBottom = p.bottom - p.vy;
        if (p.vy > 0 && prevBottom <= e.y + 16) {
          e.stomp();
          p.y = e.y - p.h; p.vy = this.inp.a ? -PH.STOMP_HOLD : -PH.STOMP; p.jumping = this.inp.a;
          const chain = [100, 200, 400, 500, 800, 1000, 2000];
          this.addScore(chain[Math.min(chain.length - 1, p.stompChain++)], e.cx, e.y - 10);
          this.sfx('stomp'); this.dust(e.cx, e.y + e.h, 2);
          continue;
        }
        if (e.state === 'kicked' && e.noHurt > 0) continue;
        this.hurtPlayer();
      }
    }
    punchHits() {
      const p = this.player, box = p.punchBox();
      if (!box) return;
      for (const e of this.enemies) {
        if (e.alive() && overlap(box, e)) {
          e.kill(p.dir); this.addScore(200, e.cx, e.y); this.sfx('hit');
          this.boom(e.cx, e.y + e.h / 2, true);
        }
      }
      const b = this.boss;
      if (b && b.vulnerable() && b.bodyBoxes().some((bb) => overlap(box, bb))) {
        if (b.hit('punch')) this.boom(p.dir > 0 ? box.x + box.w : box.x, box.y + box.h / 2, true);
      }
    }
    bossUpdate() {
      const b = this.boss, p = this.player;
      if (!b.dead) b.update();
      if (b.dead && !this.bossDone) { this.bossDone = true; }
      if (b.dead || p.dead || this.mode !== 'play') return;
      if (b.vulnerable() && p.vy > 0 && Math.abs(p.cx - b.x) < 92 &&
        p.bottom >= b.domeTop() - 4 && p.bottom - p.vy <= b.domeTop() + 18) {
        b.hit('stomp'); p.y = b.domeTop() - p.h; p.vy = -PH.STOMP_HOLD; p.jumping = false;
        this.boom(p.cx, b.domeTop(), true);
        return;
      }
      if (this.star === 0) {
        if (b.harmful() && b.bodyBoxes().some((bb) => overlap(p, bb))) { this.hurtPlayer(); return; }
        const gl = b.glove;
        if (gl && (gl.state === 'drop' || gl.state === 'stay') && overlap(p, { x: gl.x - 38, y: gl.y - 42, w: 76, h: 88 })) { this.hurtPlayer(); return; }
        for (const bm of b.bombs) {
          if (bm.state === 'fall' && overlap(p, { x: bm.x - 18, y: bm.y - 18, w: 36, h: 36 })) { this.hurtPlayer(); return; }
          if (bm.state === 'boom' && bm.t < 12 && overlap(p, { x: bm.x - 70, y: bm.y - 90, w: 140, h: 110 })) { this.hurtPlayer(); return; }
        }
      }
    }
    twinkle() {
      this.effects.push({ type: 'twinkle', x: VIEW.w - 140, y: 120, t: 0, life: 100, screen: true });
      this.sfx('twinkle');
      this.setMode('victory'); this.music('victory');
      this.player.pose = 'victory';
    }
    victoryUpdate() {
      const p = this.player;
      p.vx = 0; p.vy += PH.G; this.move(p);
      if (this.modeT % 30 === 0 && this.modeT < 330) this.firework(this.camX + 150 + (this.modeT * 131) % 780, 150 + (this.modeT * 71) % 280);
      if (this.modeT >= 390) { this.setMode('ending'); this.music('ending'); this.effects = []; }
    }

    updateCamera() {
      const p = this.player, L = this.level;
      const target = p.cx - VIEW.w * 0.4;
      const maxCam = L.arenaC != null ? L.arenaC * T : this.cols * T - VIEW.w;
      if (target > this.camX) this.camX = Math.min(target, maxCam);
    }

    /* ----------------------------------------------------- collisions */
    tileAt(c, r) {
      if (r < 0 || r >= ROWS) return '.';
      if (c < 0 || c >= this.cols) return 'X';
      return this.tiles[r][c];
    }
    solidAt(c, r) { return SOLID[this.tileAt(c, r)] === 1; }
    move(e) {
      let hitWall = 0;
      e.x += e.vx;
      if (e.vx !== 0) {
        const top = Math.floor(e.y / T), bot = Math.floor((e.y + e.h - 1) / T);
        if (e.vx > 0) {
          const c = Math.floor((e.x + e.w) / T);
          for (let r = top; r <= bot; r++) if (this.solidAt(c, r)) { e.x = c * T - e.w; hitWall = 1; break; }
        } else {
          const c = Math.floor(e.x / T);
          for (let r = top; r <= bot; r++) if (this.solidAt(c, r)) { e.x = (c + 1) * T; hitWall = -1; break; }
        }
      }
      e.y += e.vy;
      let landed = false, head = null;
      const left = Math.floor(e.x / T), right = Math.floor((e.x + e.w - 1) / T);
      if (e.vy > 0) {
        const r = Math.floor((e.y + e.h) / T);
        for (let c = left; c <= right; c++) {
          if (this.solidAt(c, r) && e.y + e.h - e.vy <= r * T + 1) { e.y = r * T - e.h; e.vy = 0; landed = true; break; }
        }
      } else if (e.vy < 0) {
        const r = Math.floor(e.y / T);
        const hits = [];
        for (let c = left; c <= right; c++) if (this.solidAt(c, r)) hits.push(c);
        if (hits.length) {
          let corrected = false;
          if (e.isPlayer && hits.length === 1) {
            const c = hits[0];
            const ovL = e.x + e.w - c * T, ovR = (c + 1) * T - e.x;
            if (ovL < 16 && !this.solidAt(c - 1, r)) { e.x = c * T - e.w; corrected = true; }
            else if (ovR < 16 && !this.solidAt(c + 1, r)) { e.x = (c + 1) * T; corrected = true; }
          }
          if (!corrected) {
            e.y = (r + 1) * T; e.vy = 1;
            let best = hits[0], bd = 1e9;
            const cx = e.x + e.w / 2;
            for (const c of hits) { const d = Math.abs((c + 0.5) * T - cx); if (d < bd) { bd = d; best = c; } }
            head = { c: best, r };
          }
        }
      }
      e.onGround = landed;
      return { hitWall, landed, head };
    }
    hitBlock(c, r, who) {
      const ch = this.tileAt(c, r);
      this.bumpEnemiesOn(c, r);
      if (ch === '?') {
        this.tiles[r][c] = 'U'; this.bumps.push({ c, r, t: 0 });
        this.effects.push({ type: 'coin', x: c * T + T / 2, y: r * T - 10, vy: -17, t: 0, life: 24 });
        this.addCoin(); this.score += 200; this.sfx('coin');
      } else if (ch === 'M' || ch === 'N') {
        this.tiles[r][c] = 'U'; this.bumps.push({ c, r, t: 0 });
        this.items.push(new NewFace(this, c, r, ch === 'M')); this.sfx('appear');
      } else if (ch === 'B') {
        if (who.genki) {
          this.tiles[r][c] = '.'; this.score += 50; this.sfx('break');
          const x = c * T + T / 2, y = r * T + T / 2;
          [[-1, -1], [1, -1], [-1, 0.2], [1, 0.2]].forEach(([dx, dy], i) => this.effects.push({
            type: 'debris', x: x + dx * 16, y: y + dy * 16, vx: dx * (3.5 + i * 0.3), vy: -14 + dy * 6, rot: 0, vr: dx * 0.25, t: 0, life: 70, g: 1.1,
          }));
        } else { this.bumps.push({ c, r, t: 0 }); this.sfx('bump'); }
      } else this.sfx('bump');
    }
    bumpEnemiesOn(c, r) {
      for (const e of this.enemies) {
        if (!e.alive()) continue;
        const b = e.y + e.h;
        if (b >= r * T - 8 && b <= r * T + 8 && e.x + e.w > c * T && e.x < (c + 1) * T) {
          e.kill(e.cx < (c + 0.5) * T ? -1 : 1); this.addScore(100, e.cx, e.y); this.sfx('kick');
        }
      }
    }
    collectCoins(p) {
      const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 1) / T);
      const r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - 1) / T);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        if (this.tileAt(c, r) === 'o') {
          this.tiles[r][c] = '.'; this.addCoin(); this.score += 200; this.sfx('coin');
          for (let i = 0; i < 5; i++) this.spark(c * T + T / 2, r * T + T / 2, '#FFE066');
        }
      }
    }
    lavaHit(p) {
      if (p.bottom < GT * T + 22) return false;
      const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 1) / T);
      for (let c = c0; c <= c1; c++) if (this.tileAt(c, GT) === '~') return true;
      return false;
    }
    addCoin() {
      this.coins++; this.stats.coins++;
      if (this.coins >= 100) { this.coins -= 100; this.lives++; this.sfx('oneup'); }
    }
    addScore(n, x, y) {
      this.score += n;
      this.effects.push({ type: 'score', text: String(n), x, y, t: 0, life: 46 });
    }

    /* ------------------------------------------------- player events */
    onPunch(p) {
      this.stats.punch++;
      this.textPop('アンパーンチ!', p.cx + p.dir * 70, p.y - 26, 'punch', 34);
    }
    powerUp(star) {
      const p = this.player;
      p.genki = true; this.flash = 8; this.sfx('powerup');
      if (star) { this.star = 480; this.music('star'); }
      this.textPop('げんき100ばい!', VIEW.w / 2, 300, 'big', 110);
      for (let i = 0; i < 16; i++) this.spark(p.cx + Math.cos(i / 16 * 6.28) * 60, p.y + 50 + Math.sin(i / 16 * 6.28) * 60, null);
      this.addScore(1000, p.cx, p.y - 20);
    }
    hurtPlayer() {
      const p = this.player;
      if (p.inv > 0 || p.dead || this.star > 0) return;
      if (p.genki) {
        p.genki = false; p.inv = 130; p.hurtT = 40; this.sfx('hurt');
        this.textPop('顔がぬれて ちからが出ない〜', p.cx, p.y - 50, 'speech', 90);
        for (let i = 0; i < 6; i++) this.effects.push({ type: 'drop', x: p.cx + (i - 2.5) * 12, y: p.y + 10, vx: (i - 2.5) * 1.2, vy: -8 - (i % 3) * 2, t: 0, life: 40, g: 0.9 });
      } else this.killPlayer();
    }
    killPlayer() {
      if (this.mode !== 'play') return;
      const p = this.player;
      p.dead = true; p.vx = 0; p.vy = 0; p.pose = 'die';
      this.setMode('dying'); this.music(null); this.sfx('die');
    }
    dyingUpdate() {
      const p = this.player;
      if (this.modeT === 30) p.vy = -20;
      if (this.modeT > 30) { p.vy += 1.1; p.y += p.vy; }
      if (this.modeT >= 210) {
        this.lives--;
        if (this.lives > 0) { this.loadLevel(this.levelIndex); this.setMode('intro'); }
        else { this.setMode('gameover'); this.music(null); this.sfx('die'); }
      }
    }

    /* ---------------------------------------------------- level clear */
    grabFlag() {
      const p = this.player, L = this.level;
      this.flagged = true; this.setMode('flag'); this.music(null); this.sfx('flag');
      this.poleX = L.flagC * T + T / 2;
      p.x = this.poleX - p.w + 10; p.vx = 0; p.vy = 0; p.pose = 'slide'; p.dir = 1;
      const baseTop = (GT - 1) * T;
      const h = baseTop - p.bottom;
      const pts = h > 520 ? 5000 : h > 400 ? 2000 : h > 280 ? 800 : h > 140 ? 400 : 100;
      this.addScore(pts, this.poleX + 40, p.y);
      this.star = 0;
    }
    flagUpdate() {
      const p = this.player, baseTop = (GT - 1) * T;
      p.y = Math.min(p.y + 7, baseTop - p.h);
      this.flagY = Math.min(this.flagY + 7, baseTop - 80);
      if (p.y >= baseTop - p.h && this.flagY >= baseTop - 80 && this.modeT > 50) {
        if (!this.flipT) { this.flipT = 1; p.x = this.poleX - 10; p.dir = -1; }
        else if (++this.flipT > 18) {
          this.flipT = 0; p.dir = 1; p.pose = null; p.vy = -8;
          this.setMode('goal'); this.music('clear');
        }
      }
    }
    goalUpdate() {
      const p = this.player, L = this.level;
      const doorX = (L.houseC + 2) * T;
      if (p.cx < doorX) { p.vx = 4; p.walkPhase += 4 * 0.09; } else { p.vx = 0; p.alpha = Math.max(0, p.alpha - 0.08); }
      p.vy = Math.min(p.vy + PH.G, PH.MAXFALL); this.move(p);
      this.updateCamera();
      if (p.alpha <= 0 && this.modeT >= 230) { p.visible = false; this.setMode('tally'); this.tallyDone = 0; }
    }
    tallyUpdate() {
      if (this.time > 0) {
        const d = Math.min(this.time, 3);
        this.time -= d; this.score += d * 50;
        if (this.modeT % 3 === 0) this.sfx('tick');
        return;
      }
      this.tallyDone++;
      const hx = (this.level.houseC + 2) * T;
      if (this.tallyDone === 10 || this.tallyDone === 34 || this.tallyDone === 58) {
        this.firework(hx - 160 + this.tallyDone * 5, 2 * T + (this.tallyDone % 3) * 40);
        this.score += 500;
      }
      if (this.tallyDone >= 100) {
        this.loadLevel(this.levelIndex + 1); this.setMode('intro');
      }
    }

    /* -------------------------------------------------------- effects */
    textPop(text, x, y, style, life) {
      const screen = style === 'big';
      this.effects.push({ type: 'text', text, x, y, style, t: 0, life: life || 60, screen });
    }
    spark(x, y, color) {
      const a = this.rand() * Math.PI * 2, s = 1 + this.rand() * 3;
      this.effects.push({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, t: 0, life: 22 + (this.rand() * 14 | 0), color, g: 0.05, hue: (this.frame * 12) % 360 });
    }
    dust(x, y, n) {
      for (let i = 0; i < n; i++) this.effects.push({ type: 'dust', x: x + (i - (n - 1) / 2) * 22, y: y - 8, vx: (i - (n - 1) / 2) * 1.2, vy: -0.6, t: 0, life: 20, r: 10 + this.rand() * 6 });
    }
    smoke(x, y) {
      this.effects.push({ type: 'smoke', x, y, vx: (this.rand() - 0.5) * 1.2, vy: -2.2, t: 0, life: 50, r: 16 });
    }
    puff(x, y) {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        this.effects.push({ type: 'smoke', x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 1, t: 0, life: 30, r: 14, purple: true });
      }
    }
    boom(x, y, small) {
      this.effects.push({ type: 'boom', x, y, t: 0, life: small ? 16 : 26, r: small ? 46 : 80 });
    }
    firework(x, y, screen) {
      const hue = (x * 7 + y * 3) % 360;
      this.effects.push({ type: 'firework', x, y, t: 0, life: 70, hue, screen: !!screen });
      this.sfx('firework');
    }
    updateEffects() {
      for (const e of this.effects) {
        e.t++;
        if (e.vx !== undefined) { e.x += e.vx; e.y += e.vy; if (e.g) e.vy += e.g; }
        if (e.type === 'coin') { e.y += e.vy; e.vy += 1.5; if (e.t === e.life) this.addScore(200, e.x, e.y); }
        if (e.type === 'debris') e.rot += e.vr;
      }
      this.effects = this.effects.filter((e) => e.t < e.life);
    }

    /* --------------------------------------------------------- render */
    render(ctx) { AP.Art.renderGame(ctx, this); }
  }

  AP.Game = Game; AP.Player = Player; AP.Kabi = Kabi; AP.Boss = Boss; AP.NewFace = NewFace;
})(typeof window !== 'undefined' ? window : globalThis);
