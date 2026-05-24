import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  StatusBar,
  Vibration,
  Platform,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PLAYER_W = 44;
const PLAYER_H = 56;
const PIKMIN_SIZE = 22;
const ATTACHED_SIZE = 16;
const ENEMY_SIZE = 48;
const BOSS_SIZE = 96;
const PIKMIN_SPEED = 11;
const ENEMY_MIN_SPEED = 1.6;
const ENEMY_SPEED_RANGE = 2.4;
const THROW_INTERVAL_MS = 260;
const ENEMY_SPAWN_INTERVAL_MS = 800;
const DAMAGE_INTERVAL_MS = 500;
const ENEMY_MAX_HP = 5;
const BOSS_MAX_HP = 25;
const FRAME_MS = 16;
const SELECTOR_H = 90;
const OLIMAR_Y = SCREEN_H - 200;

const PIKMIN_RED = '#ff4d4d';
const PIKMIN_YELLOW = '#ffd93d';
const PIKMIN_BLUE = '#4d8cff';
const PIKMIN_COLORS = [PIKMIN_RED, PIKMIN_YELLOW, PIKMIN_BLUE] as const;
type PikminColor = (typeof PIKMIN_COLORS)[number];

type Element = 'normal' | 'fire' | 'electric' | 'water' | 'boss';

const ELEMENT_BODY: Record<Element, string> = {
  normal: '#d23030',
  fire: '#ff7020',
  electric: '#f5cf00',
  water: '#3080ff',
  boss: '#8a2020',
};

const canDamage = (color: PikminColor, element: Element): boolean => {
  if (element === 'normal' || element === 'boss') return true;
  if (element === 'fire') return color === PIKMIN_RED;
  if (element === 'electric') return color === PIKMIN_YELLOW;
  if (element === 'water') return color === PIKMIN_BLUE;
  return true;
};

const vibrate = (ms: number) => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Vibration.vibrate(ms);
  }
};

type Pikmin = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: PikminColor;
  rot: number;
};
type AttachedPikmin = {
  id: number;
  color: PikminColor;
  ox: number;
  oy: number;
  rot: number;
};
type Enemy = {
  id: number;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  attached: AttachedPikmin[];
  element: Element;
  size: number;
};
type Star = { id: number; x: number; y: number; speed: number; size: number };

let nextId = 1;
const uid = () => nextId++;

const initialStars = (): Star[] =>
  Array.from({ length: 40 }, () => ({
    id: uid(),
    x: Math.random() * SCREEN_W,
    y: Math.random() * SCREEN_H,
    speed: 0.5 + Math.random() * 2,
    size: Math.random() < 0.7 ? 1 : 2,
  }));

const spawnEnemy = (): Enemy => {
  const r = Math.random();
  let element: Element;
  if (r < 0.05) element = 'boss';
  else if (r < 0.55) element = 'normal';
  else if (r < 0.70) element = 'fire';
  else if (r < 0.85) element = 'electric';
  else element = 'water';

  const isBoss = element === 'boss';
  const size = isBoss ? BOSS_SIZE : ENEMY_SIZE;
  const hp = isBoss ? BOSS_MAX_HP : ENEMY_MAX_HP;
  const baseSpeed = ENEMY_MIN_SPEED + Math.random() * ENEMY_SPEED_RANGE;
  return {
    id: uid(),
    x: Math.random() * (SCREEN_W - size),
    y: -size,
    speed: isBoss ? baseSpeed * 0.5 : baseSpeed,
    hp,
    maxHp: hp,
    attached: [],
    element,
    size,
  };
};

export default function App() {
  const [playerX, setPlayerX] = useState(SCREEN_W / 2 - PLAYER_W / 2);
  const [pikmins, setPikmins] = useState<Pikmin[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [stars, setStars] = useState<Star[]>(initialStars);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [aimVisible, setAimVisible] = useState(false);
  const [aimPos, setAimPos] = useState({ x: 0, y: 0 });
  const [selectedColor, setSelectedColor] = useState<PikminColor>(PIKMIN_RED);

  const playerXRef = useRef(playerX);
  playerXRef.current = playerX;
  const targetXRef = useRef(SCREEN_W / 2);
  const targetYRef = useRef(SCREEN_H / 2);
  const touchingRef = useRef(false);
  const selectedColorRef = useRef(selectedColor);
  selectedColorRef.current = selectedColor;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e) =>
        e.nativeEvent.pageY < SCREEN_H - SELECTOR_H,
      onMoveShouldSetPanResponder: (e) =>
        e.nativeEvent.pageY < SCREEN_H - SELECTOR_H,
      onPanResponderGrant: (e) => {
        touchingRef.current = true;
        const x = e.nativeEvent.pageX;
        const y = e.nativeEvent.pageY;
        targetXRef.current = x;
        targetYRef.current = y;
        setAimPos({ x, y });
        setAimVisible(true);
      },
      onPanResponderMove: (e, gesture) => {
        const x = e.nativeEvent.pageX;
        const y = e.nativeEvent.pageY;
        targetXRef.current = x;
        targetYRef.current = y;
        setAimPos({ x, y });
        const next = Math.max(
          0,
          Math.min(SCREEN_W - PLAYER_W, gesture.moveX - PLAYER_W / 2),
        );
        setPlayerX(next);
      },
      onPanResponderRelease: () => {
        touchingRef.current = false;
        setAimVisible(false);
      },
      onPanResponderTerminate: () => {
        touchingRef.current = false;
        setAimVisible(false);
      },
    }),
  ).current;

  const reset = useCallback(() => {
    setPlayerX(SCREEN_W / 2 - PLAYER_W / 2);
    setPikmins([]);
    setEnemies([]);
    setStars(initialStars());
    setScore(0);
    setLives(3);
    setGameOver(false);
    setStarted(true);
    setSelectedColor(PIKMIN_RED);
    touchingRef.current = false;
    setAimVisible(false);
  }, []);

  // Main loop
  useEffect(() => {
    if (!started || gameOver) return;
    const tick = setInterval(() => {
      setStars((prev) =>
        prev.map((s) => {
          const y = s.y + s.speed;
          return y > SCREEN_H
            ? { ...s, y: 0, x: Math.random() * SCREEN_W }
            : { ...s, y };
        }),
      );

      setPikmins((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            rot: p.rot + 28,
          }))
          .filter(
            (p) =>
              p.y + PIKMIN_SIZE > 0 &&
              p.y < SCREEN_H &&
              p.x + PIKMIN_SIZE > 0 &&
              p.x < SCREEN_W,
          ),
      );

      setEnemies((prev) =>
        prev
          .map((e) => ({ ...e, y: e.y + e.speed }))
          .filter((e) => e.y < SCREEN_H + e.size),
      );
    }, FRAME_MS);
    return () => clearInterval(tick);
  }, [started, gameOver]);

  // Throw pikmin
  useEffect(() => {
    if (!started || gameOver) return;
    const t = setInterval(() => {
      const px = playerXRef.current + PLAYER_W / 2;
      const py = OLIMAR_Y;
      let dx: number;
      let dy: number;
      if (touchingRef.current) {
        dx = targetXRef.current - px;
        dy = targetYRef.current - py;
        const mag = Math.hypot(dx, dy);
        if (mag < 8) {
          dx = 0;
          dy = -1;
        } else {
          dx /= mag;
          dy /= mag;
        }
      } else {
        dx = 0;
        dy = -1;
      }
      setPikmins((prev) => [
        ...prev,
        {
          id: uid(),
          x: px - PIKMIN_SIZE / 2,
          y: py - PIKMIN_SIZE / 2,
          vx: dx * PIKMIN_SPEED,
          vy: dy * PIKMIN_SPEED,
          color: selectedColorRef.current,
          rot: 0,
        },
      ]);
    }, THROW_INTERVAL_MS);
    return () => clearInterval(t);
  }, [started, gameOver]);

  // Spawn enemies
  useEffect(() => {
    if (!started || gameOver) return;
    const spawn = setInterval(() => {
      setEnemies((prev) => [...prev, spawnEnemy()]);
    }, ENEMY_SPAWN_INTERVAL_MS);
    return () => clearInterval(spawn);
  }, [started, gameOver]);

  // Damage tick
  useEffect(() => {
    if (!started || gameOver) return;
    const dmg = setInterval(() => {
      setEnemies((prev) => {
        let gained = 0;
        let defeated = 0;
        const survived: Enemy[] = [];
        for (const e of prev) {
          if (e.attached.length === 0) {
            survived.push(e);
            continue;
          }
          const newHp = e.hp - e.attached.length;
          if (newHp <= 0) {
            const bonus = e.element === 'boss' ? 100 : 30;
            gained += bonus + e.attached.length * 10;
            defeated += 1;
          } else {
            survived.push({ ...e, hp: newHp });
          }
        }
        if (gained > 0) setScore((s) => s + gained);
        if (defeated > 0) vibrate(80);
        return survived;
      });
    }, DAMAGE_INTERVAL_MS);
    return () => clearInterval(dmg);
  }, [started, gameOver]);

  // Collisions
  useEffect(() => {
    if (!started || gameOver) return;

    const consumedPikminIds = new Set<number>();
    const attachMap = new Map<number, AttachedPikmin[]>();
    let attachedAny = false;
    let bouncedAny = false;

    for (const p of pikmins) {
      for (const e of enemies) {
        const overlap =
          p.x < e.x + e.size &&
          p.x + PIKMIN_SIZE > e.x &&
          p.y < e.y + e.size &&
          p.y + PIKMIN_SIZE > e.y;
        if (!overlap) continue;
        if (canDamage(p.color, e.element)) {
          consumedPikminIds.add(p.id);
          attachedAny = true;
          const list = attachMap.get(e.id) ?? [];
          list.push({
            id: p.id,
            color: p.color,
            ox: Math.max(
              2,
              Math.min(
                e.size - ATTACHED_SIZE - 2,
                p.x + PIKMIN_SIZE / 2 - e.x - ATTACHED_SIZE / 2,
              ),
            ),
            oy: Math.max(
              -ATTACHED_SIZE / 2,
              Math.min(
                e.size - ATTACHED_SIZE,
                p.y + PIKMIN_SIZE / 2 - e.y - ATTACHED_SIZE / 2,
              ),
            ),
            rot: Math.random() * 30 - 15,
          });
          attachMap.set(e.id, list);
        } else {
          consumedPikminIds.add(p.id);
          bouncedAny = true;
        }
        break;
      }
    }

    // enemy vs player
    const playerRect = {
      x: playerXRef.current,
      y: OLIMAR_Y,
      w: PLAYER_W,
      h: PLAYER_H,
    };
    let livesLost = 0;
    const crashedEnemyIds = new Set<number>();
    for (const e of enemies) {
      const overlap =
        e.x < playerRect.x + playerRect.w &&
        e.x + e.size > playerRect.x &&
        e.y < playerRect.y + playerRect.h &&
        e.y + e.size > playerRect.y;
      if (overlap) {
        crashedEnemyIds.add(e.id);
        livesLost += e.element === 'boss' ? 2 : 1;
      }
    }

    if (consumedPikminIds.size > 0) {
      setPikmins((prev) => prev.filter((p) => !consumedPikminIds.has(p.id)));
    }
    if (attachMap.size > 0 || crashedEnemyIds.size > 0) {
      setEnemies((prev) =>
        prev
          .filter((e) => !crashedEnemyIds.has(e.id))
          .map((e) => {
            const adds = attachMap.get(e.id);
            return adds ? { ...e, attached: [...e.attached, ...adds] } : e;
          }),
      );
    }
    if (attachedAny) vibrate(30);
    else if (bouncedAny) vibrate(15);
    if (livesLost > 0) {
      vibrate(120);
      setLives((l) => {
        const next = l - livesLost;
        if (next <= 0) setGameOver(true);
        return Math.max(0, next);
      });
    }
  }, [pikmins, enemies, started, gameOver]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar hidden />

      {/* Starfield */}
      {stars.map((s) => (
        <View
          key={s.id}
          style={[
            styles.star,
            {
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              opacity: 0.4 + s.speed / 5,
            },
          ]}
        />
      ))}

      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudText}>SCORE {score}</Text>
        <Text style={styles.hudText}>{'♥'.repeat(lives)}</Text>
      </View>

      {/* Aim reticle */}
      {aimVisible && started && !gameOver && (
        <View
          style={[
            styles.reticle,
            { left: aimPos.x - 18, top: aimPos.y - 18 },
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.reticleRing,
              { borderColor: hexAlpha(selectedColor, 0.85) },
            ]}
          />
        </View>
      )}

      {/* Flying pikmin */}
      {pikmins.map((p) => (
        <View
          key={p.id}
          style={[
            styles.pikminWrap,
            {
              left: p.x,
              top: p.y,
              transform: [{ rotate: `${p.rot}deg` }],
            },
          ]}
        >
          <View style={styles.pikminStem} />
          <View style={styles.pikminLeaf} />
          <View style={[styles.pikminBody, { backgroundColor: p.color }]}>
            <View style={styles.pikminEye} />
            <View style={styles.pikminEye} />
          </View>
        </View>
      ))}

      {/* Enemies */}
      {enemies.map((e) => {
        const hpRatio = e.hp / e.maxHp;
        const bodyColor = ELEMENT_BODY[e.element];
        return (
          <View
            key={e.id}
            style={[
              styles.enemyWrap,
              { left: e.x, top: e.y, width: e.size, height: e.size },
            ]}
          >
            {/* Element decoration on top */}
            {e.element === 'fire' && (
              <View style={styles.fireDeco} pointerEvents="none">
                <View style={[styles.flame, { borderBottomColor: '#ff3000' }]} />
                <View
                  style={[
                    styles.flame,
                    { borderBottomColor: '#ffaa20', marginHorizontal: 4 },
                  ]}
                />
                <View style={[styles.flame, { borderBottomColor: '#ff3000' }]} />
              </View>
            )}
            {e.element === 'electric' && (
              <View style={styles.electricDeco} pointerEvents="none">
                <View style={[styles.bolt, { left: 0, top: 0 }]} />
                <View
                  style={[styles.bolt, { left: 4, top: 4, width: 10 }]}
                />
                <View style={[styles.bolt, { left: 0, top: 8 }]} />
              </View>
            )}
            {e.element === 'water' && (
              <View style={styles.waterDeco} pointerEvents="none">
                <View style={styles.waterDome} />
                <View style={styles.waterDrop} />
              </View>
            )}

            <View
              style={[
                styles.enemy,
                {
                  width: e.size,
                  height: e.size,
                  borderRadius: e.size / 2,
                  backgroundColor: bodyColor,
                  paddingBottom: e.element === 'boss' ? 12 : 6,
                },
                e.attached.length > 0 && styles.enemyHurt,
                e.element === 'boss' && styles.enemyBoss,
              ]}
            >
              <View
                style={[
                  styles.enemySpotL,
                  e.element === 'boss' && { width: 14, height: 14, top: 14, left: 14 },
                ]}
              />
              <View
                style={[
                  styles.enemySpotR,
                  e.element === 'boss' && { width: 12, height: 12, top: 10, right: 16 },
                ]}
              />
              <View
                style={[
                  styles.enemyMouth,
                  {
                    width: e.size - (e.element === 'boss' ? 20 : 10),
                    height: e.element === 'boss' ? 28 : 16,
                    borderRadius: e.element === 'boss' ? 14 : 8,
                  },
                ]}
              >
                <View
                  style={[
                    styles.enemyEye,
                    e.element === 'boss' && { width: 9, height: 9, borderRadius: 4.5 },
                  ]}
                />
                <View
                  style={[
                    styles.enemyEye,
                    e.element === 'boss' && { width: 9, height: 9, borderRadius: 4.5 },
                  ]}
                />
              </View>
            </View>

            {/* HP bar */}
            {e.hp < e.maxHp && (
              <View style={styles.hpBarBg}>
                <View
                  style={[
                    styles.hpBarFg,
                    {
                      width: `${hpRatio * 100}%`,
                      backgroundColor:
                        hpRatio > 0.5
                          ? '#5cd45c'
                          : hpRatio > 0.25
                          ? '#ffd93d'
                          : '#ff4d4d',
                    },
                  ]}
                />
              </View>
            )}

            {/* Attached pikmin */}
            {e.attached.map((ap) => (
              <View
                key={ap.id}
                style={[
                  styles.attachedWrap,
                  {
                    left: ap.ox,
                    top: ap.oy,
                    transform: [{ rotate: `${ap.rot}deg` }],
                  },
                ]}
              >
                <View style={styles.attachedLeaf} />
                <View
                  style={[
                    styles.attachedBody,
                    { backgroundColor: ap.color },
                  ]}
                />
              </View>
            ))}
          </View>
        );
      })}

      {/* Olimar */}
      {started && !gameOver && (
        <View style={[styles.olimar, { left: playerX, top: OLIMAR_Y }]}>
          <View style={styles.olimarAntenna} />
          <View style={styles.olimarAntennaTip} />
          <View style={styles.olimarHelmet}>
            <View style={styles.olimarFace}>
              <View style={styles.olimarNose} />
              <View style={styles.olimarMustache} />
            </View>
            <View style={styles.olimarHelmetShine} />
          </View>
          <View style={styles.olimarBody}>
            <View style={styles.olimarBackpack} />
          </View>
          <View style={styles.olimarLegs}>
            <View style={styles.olimarLeg} />
            <View style={styles.olimarLeg} />
          </View>
        </View>
      )}

      {/* Color selector */}
      {started && !gameOver && (
        <View style={styles.selectorStrip}>
          {PIKMIN_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              activeOpacity={0.7}
              onPress={() => setSelectedColor(c)}
              style={[
                styles.colorBtn,
                selectedColor === c && styles.colorBtnSelected,
              ]}
            >
              <View style={styles.colorBtnStem} />
              <View style={styles.colorBtnLeaf} />
              <View style={[styles.colorBtnBody, { backgroundColor: c }]}>
                <View style={styles.pikminEye} />
                <View style={styles.pikminEye} />
              </View>
              <Text style={styles.colorBtnLabel}>
                {c === PIKMIN_RED ? '火' : c === PIKMIN_YELLOW ? '電' : '水'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Overlay */}
      {(!started || gameOver) && (
        <View style={styles.overlay}>
          <Text style={styles.title}>
            {gameOver ? 'GAME OVER' : 'PIKMIN THROW'}
          </Text>
          {gameOver && <Text style={styles.finalScore}>SCORE: {score}</Text>}
          <Text style={styles.instructions}>
            画面下のボタンで投げるピクミンの色を選ぶ{'\n'}
            画面を指でなぞった方向にピクミンを投げる{'\n\n'}
            <Text style={{ color: PIKMIN_RED }}>赤</Text>=火（オレンジ敵） /{' '}
            <Text style={{ color: PIKMIN_YELLOW }}>黄</Text>=電気（黄敵） /{' '}
            <Text style={{ color: PIKMIN_BLUE }}>青</Text>=水（青敵）{'\n'}
            通常（赤い敵）・ボス（大型）は全色OK{'\n'}
            違う色を当てるとピクミンが弾かれる
          </Text>
          <TouchableOpacity style={styles.button} onPress={reset}>
            <Text style={styles.buttonText}>
              {gameOver ? 'もう一度' : 'スタート'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1a2a',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  hud: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  hudText: {
    color: '#9ff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Reticle
  reticle: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  reticleRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderStyle: 'dashed',
  },

  // Pikmin projectile
  pikminWrap: {
    position: 'absolute',
    width: PIKMIN_SIZE,
    height: PIKMIN_SIZE + 10,
    alignItems: 'center',
  },
  pikminStem: { width: 2, height: 6, backgroundColor: '#4a2a10' },
  pikminLeaf: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 8,
    backgroundColor: '#5cd45c',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  pikminBody: {
    width: PIKMIN_SIZE,
    height: PIKMIN_SIZE,
    borderRadius: PIKMIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pikminEye: {
    width: 4,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginHorizontal: 1,
  },

  // Attached pikmin
  attachedWrap: {
    position: 'absolute',
    width: ATTACHED_SIZE,
    height: ATTACHED_SIZE + 4,
    alignItems: 'center',
    zIndex: 5,
  },
  attachedLeaf: {
    width: 8,
    height: 5,
    backgroundColor: '#5cd45c',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  attachedBody: {
    width: ATTACHED_SIZE,
    height: ATTACHED_SIZE,
    borderRadius: ATTACHED_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },

  // Enemy
  enemyWrap: {
    position: 'absolute',
  },
  enemy: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  enemyHurt: {
    opacity: 0.85,
  },
  enemyBoss: {
    borderWidth: 3,
    borderColor: '#440000',
  },
  enemySpotL: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  enemySpotR: {
    position: 'absolute',
    top: 4,
    right: 8,
    width: 6,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  enemyMouth: {
    backgroundColor: '#2a0a0a',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  enemyEye: {
    width: 5,
    height: 5,
    backgroundColor: '#ffd93d',
    borderRadius: 2.5,
  },
  hpBarBg: {
    position: 'absolute',
    top: -8,
    left: 2,
    right: 2,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  hpBarFg: {
    height: '100%',
    borderRadius: 2,
  },

  // Element decorations
  fireDeco: {
    position: 'absolute',
    top: -14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 6,
  },
  flame: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  electricDeco: {
    position: 'absolute',
    top: -16,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    zIndex: 6,
  },
  bolt: {
    position: 'absolute',
    width: 8,
    height: 3,
    backgroundColor: '#fff800',
    transform: [{ rotate: '-20deg' }],
  },
  waterDeco: {
    position: 'absolute',
    top: -14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 6,
  },
  waterDome: {
    width: 20,
    height: 10,
    backgroundColor: '#60c0ff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  waterDrop: {
    position: 'absolute',
    top: -6,
    width: 6,
    height: 6,
    backgroundColor: '#a0e0ff',
    borderRadius: 3,
  },

  // Olimar
  olimar: {
    position: 'absolute',
    width: PLAYER_W,
    height: PLAYER_H,
    alignItems: 'center',
  },
  olimarAntenna: {
    position: 'absolute',
    top: -8,
    width: 2,
    height: 10,
    backgroundColor: '#888',
  },
  olimarAntennaTip: {
    position: 'absolute',
    top: -12,
    width: 6,
    height: 6,
    backgroundColor: '#ff3030',
    borderRadius: 3,
    shadowColor: '#ff3030',
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  olimarHelmet: {
    width: 28,
    height: 26,
    backgroundColor: 'rgba(200, 230, 255, 0.55)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  olimarFace: {
    width: 18,
    height: 16,
    backgroundColor: '#f4c896',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  olimarNose: {
    width: 6,
    height: 6,
    backgroundColor: '#d8a070',
    borderRadius: 3,
    marginTop: 2,
  },
  olimarMustache: {
    position: 'absolute',
    bottom: 2,
    width: 10,
    height: 2,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  olimarHelmetShine: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 6,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 3,
  },
  olimarBody: {
    width: 24,
    height: 18,
    backgroundColor: '#e84030',
    borderRadius: 4,
    marginTop: -2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  olimarBackpack: {
    position: 'absolute',
    top: 2,
    width: 14,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#aaa',
  },
  olimarLegs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 16,
    marginTop: 1,
  },
  olimarLeg: {
    width: 5,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 2,
  },

  // Color selector strip
  selectorStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SELECTOR_H,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,30,0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(92,212,92,0.4)',
    zIndex: 8,
  },
  colorBtn: {
    width: 64,
    height: 70,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorBtnSelected: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  colorBtnStem: { width: 2, height: 4, backgroundColor: '#4a2a10' },
  colorBtnLeaf: {
    position: 'absolute',
    top: 6,
    width: 12,
    height: 6,
    backgroundColor: '#5cd45c',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  colorBtnBody: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  colorBtnLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,30,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    paddingHorizontal: 20,
  },
  title: {
    color: '#5cd45c',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 20,
  },
  finalScore: {
    color: '#ffd93d',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  instructions: {
    color: '#cdf',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#5cd45c',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
  },
  buttonText: {
    color: '#003300',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
