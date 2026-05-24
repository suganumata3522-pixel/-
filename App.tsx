import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  StatusBar,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PLAYER_W = 44;
const PLAYER_H = 56;
const PIKMIN_SIZE = 22;
const ATTACHED_SIZE = 16;
const ENEMY_SIZE = 48;
const PIKMIN_SPEED = 11;
const ENEMY_MIN_SPEED = 1.6;
const ENEMY_SPEED_RANGE = 2.4;
const THROW_INTERVAL_MS = 260;
const ENEMY_SPAWN_INTERVAL_MS = 800;
const DAMAGE_INTERVAL_MS = 500;
const ENEMY_MAX_HP = 5;
const FRAME_MS = 16;

const PIKMIN_COLORS = ['#ff4d4d', '#ffd93d', '#4d8cff'] as const;
type PikminColor = (typeof PIKMIN_COLORS)[number];

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
  attached: AttachedPikmin[];
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

  const playerXRef = useRef(playerX);
  playerXRef.current = playerX;
  const targetXRef = useRef(SCREEN_W / 2);
  const targetYRef = useRef(SCREEN_H / 2);
  const touchingRef = useRef(false);
  const throwIdxRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        touchingRef.current = true;
        const { locationX, locationY } = e.nativeEvent;
        targetXRef.current = locationX;
        targetYRef.current = locationY;
        setAimPos({ x: locationX, y: locationY });
        setAimVisible(true);
      },
      onPanResponderMove: (e, gesture) => {
        const tx = e.nativeEvent.locationX;
        const ty = e.nativeEvent.locationY;
        targetXRef.current = tx;
        targetYRef.current = ty;
        setAimPos({ x: tx, y: ty });
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
    throwIdxRef.current = 0;
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
          .filter((e) => e.y < SCREEN_H + ENEMY_SIZE),
      );
    }, FRAME_MS);
    return () => clearInterval(tick);
  }, [started, gameOver]);

  // Throw pikmin toward target
  useEffect(() => {
    if (!started || gameOver) return;
    const t = setInterval(() => {
      const color = PIKMIN_COLORS[throwIdxRef.current % PIKMIN_COLORS.length];
      throwIdxRef.current += 1;
      const px = playerXRef.current + PLAYER_W / 2;
      const py = SCREEN_H - 140;
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
          color,
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
      setEnemies((prev) => [
        ...prev,
        {
          id: uid(),
          x: Math.random() * (SCREEN_W - ENEMY_SIZE),
          y: -ENEMY_SIZE,
          speed: ENEMY_MIN_SPEED + Math.random() * ENEMY_SPEED_RANGE,
          hp: ENEMY_MAX_HP,
          attached: [],
        },
      ]);
    }, ENEMY_SPAWN_INTERVAL_MS);
    return () => clearInterval(spawn);
  }, [started, gameOver]);

  // Damage tick: attached pikmin deal damage over time
  useEffect(() => {
    if (!started || gameOver) return;
    const dmg = setInterval(() => {
      setEnemies((prev) => {
        let gained = 0;
        const survived: Enemy[] = [];
        for (const e of prev) {
          if (e.attached.length === 0) {
            survived.push(e);
            continue;
          }
          const newHp = e.hp - e.attached.length;
          if (newHp <= 0) {
            gained += 30 + e.attached.length * 10;
          } else {
            survived.push({ ...e, hp: newHp });
          }
        }
        if (gained > 0) setScore((s) => s + gained);
        return survived;
      });
    }, DAMAGE_INTERVAL_MS);
    return () => clearInterval(dmg);
  }, [started, gameOver]);

  // Collisions
  useEffect(() => {
    if (!started || gameOver) return;

    // pikmin attach to enemies
    const attachedPikminIds = new Set<number>();
    const attachMap = new Map<number, AttachedPikmin[]>();
    for (const p of pikmins) {
      for (const e of enemies) {
        const overlap =
          p.x < e.x + ENEMY_SIZE &&
          p.x + PIKMIN_SIZE > e.x &&
          p.y < e.y + ENEMY_SIZE &&
          p.y + PIKMIN_SIZE > e.y;
        if (overlap) {
          attachedPikminIds.add(p.id);
          const list = attachMap.get(e.id) ?? [];
          list.push({
            id: p.id,
            color: p.color,
            ox: Math.max(
              2,
              Math.min(
                ENEMY_SIZE - ATTACHED_SIZE - 2,
                p.x + PIKMIN_SIZE / 2 - e.x - ATTACHED_SIZE / 2,
              ),
            ),
            oy: Math.max(
              -ATTACHED_SIZE / 2,
              Math.min(
                ENEMY_SIZE - ATTACHED_SIZE,
                p.y + PIKMIN_SIZE / 2 - e.y - ATTACHED_SIZE / 2,
              ),
            ),
            rot: Math.random() * 30 - 15,
          });
          attachMap.set(e.id, list);
          break;
        }
      }
    }

    // enemy vs player collision
    const playerRect = {
      x: playerXRef.current,
      y: SCREEN_H - 130,
      w: PLAYER_W,
      h: PLAYER_H,
    };
    let livesLost = 0;
    const crashedEnemyIds = new Set<number>();
    for (const e of enemies) {
      const overlap =
        e.x < playerRect.x + playerRect.w &&
        e.x + ENEMY_SIZE > playerRect.x &&
        e.y < playerRect.y + playerRect.h &&
        e.y + ENEMY_SIZE > playerRect.y;
      if (overlap) {
        crashedEnemyIds.add(e.id);
        livesLost += 1;
      }
    }

    if (attachedPikminIds.size > 0) {
      setPikmins((prev) => prev.filter((p) => !attachedPikminIds.has(p.id)));
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
    if (livesLost > 0) {
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
          <View style={styles.reticleRing} />
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

      {/* Enemies with attached pikmin */}
      {enemies.map((e) => {
        const hpRatio = e.hp / ENEMY_MAX_HP;
        return (
          <View
            key={e.id}
            style={[styles.enemyWrap, { left: e.x, top: e.y }]}
          >
            <View
              style={[
                styles.enemy,
                e.attached.length > 0 && styles.enemyHurt,
              ]}
            >
              <View style={styles.enemySpotL} />
              <View style={styles.enemySpotR} />
              <View style={styles.enemyMouth}>
                <View style={styles.enemyEye} />
                <View style={styles.enemyEye} />
              </View>
            </View>
            {/* HP bar */}
            {e.hp < ENEMY_MAX_HP && (
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
        <View style={[styles.olimar, { left: playerX, top: SCREEN_H - 130 }]}>
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

      {/* Overlay */}
      {(!started || gameOver) && (
        <View style={styles.overlay}>
          <Text style={styles.title}>
            {gameOver ? 'GAME OVER' : 'PIKMIN THROW'}
          </Text>
          {gameOver && <Text style={styles.finalScore}>SCORE: {score}</Text>}
          <Text style={styles.instructions}>
            画面を指でなぞった方向にピクミンを投げる{'\n'}
            ピクミンは敵に張り付いてダメージを与える{'\n'}
            たくさん群がるほど早く倒せる！{'\n'}
            触れていない時はまっすぐ上に投げる
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

  // Aim reticle
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
    borderColor: 'rgba(92, 212, 92, 0.7)',
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

  // Attached pikmin (smaller, clinging)
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
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
  },
  enemy: {
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    backgroundColor: '#d23030',
    borderRadius: ENEMY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    overflow: 'hidden',
  },
  enemyHurt: {
    backgroundColor: '#a82020',
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
    width: ENEMY_SIZE - 10,
    height: 16,
    backgroundColor: '#2a0a0a',
    borderRadius: 8,
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

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,30,0.85)',
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
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
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
