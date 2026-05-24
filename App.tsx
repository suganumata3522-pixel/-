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
const ENEMY_SIZE = 44;
const PIKMIN_SPEED = 11;
const ENEMY_MIN_SPEED = 2;
const ENEMY_SPEED_RANGE = 3;
const THROW_INTERVAL_MS = 260;
const ENEMY_SPAWN_INTERVAL_MS = 750;
const FRAME_MS = 16;

const PIKMIN_COLORS = ['#ff4d4d', '#ffd93d', '#4d8cff'] as const;
type PikminColor = (typeof PIKMIN_COLORS)[number];

type Pikmin = {
  id: number;
  x: number;
  y: number;
  color: PikminColor;
  rot: number;
};
type Enemy = { id: number; x: number; y: number; speed: number };
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

  const playerXRef = useRef(playerX);
  playerXRef.current = playerX;
  const throwIdxRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const next = Math.max(
          0,
          Math.min(SCREEN_W - PLAYER_W, gesture.moveX - PLAYER_W / 2),
        );
        setPlayerX(next);
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
  }, []);

  // Main loop: starfield, pikmin, enemies
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
          .map((p) => ({ ...p, y: p.y - PIKMIN_SPEED, rot: p.rot + 25 }))
          .filter((p) => p.y + PIKMIN_SIZE > 0),
      );

      setEnemies((prev) =>
        prev
          .map((e) => ({ ...e, y: e.y + e.speed }))
          .filter((e) => e.y < SCREEN_H + ENEMY_SIZE),
      );
    }, FRAME_MS);
    return () => clearInterval(tick);
  }, [started, gameOver]);

  // Throw pikmin automatically
  useEffect(() => {
    if (!started || gameOver) return;
    const t = setInterval(() => {
      const color = PIKMIN_COLORS[throwIdxRef.current % PIKMIN_COLORS.length];
      throwIdxRef.current += 1;
      setPikmins((prev) => [
        ...prev,
        {
          id: uid(),
          x: playerXRef.current + PLAYER_W / 2 - PIKMIN_SIZE / 2,
          y: SCREEN_H - 140,
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
        },
      ]);
    }, ENEMY_SPAWN_INTERVAL_MS);
    return () => clearInterval(spawn);
  }, [started, gameOver]);

  // Collision detection
  useEffect(() => {
    if (!started || gameOver) return;

    const hitPikminIds = new Set<number>();
    const hitEnemyIds = new Set<number>();
    let gained = 0;
    for (const p of pikmins) {
      for (const e of enemies) {
        if (hitEnemyIds.has(e.id)) continue;
        const overlap =
          p.x < e.x + ENEMY_SIZE &&
          p.x + PIKMIN_SIZE > e.x &&
          p.y < e.y + ENEMY_SIZE &&
          p.y + PIKMIN_SIZE > e.y;
        if (overlap) {
          hitPikminIds.add(p.id);
          hitEnemyIds.add(e.id);
          gained += 10;
          break;
        }
      }
    }

    const playerRect = {
      x: playerXRef.current,
      y: SCREEN_H - 130,
      w: PLAYER_W,
      h: PLAYER_H,
    };
    let livesLost = 0;
    const crashedEnemyIds = new Set<number>();
    for (const e of enemies) {
      if (hitEnemyIds.has(e.id)) continue;
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

    if (hitPikminIds.size > 0) {
      setPikmins((prev) => prev.filter((p) => !hitPikminIds.has(p.id)));
    }
    if (hitEnemyIds.size > 0 || crashedEnemyIds.size > 0) {
      setEnemies((prev) =>
        prev.filter(
          (e) => !hitEnemyIds.has(e.id) && !crashedEnemyIds.has(e.id),
        ),
      );
    }
    if (gained > 0) setScore((s) => s + gained);
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

      {/* Pikmin in flight */}
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
          {/* leaf stem */}
          <View style={styles.pikminStem} />
          <View style={styles.pikminLeaf} />
          {/* body */}
          <View style={[styles.pikminBody, { backgroundColor: p.color }]}>
            <View style={styles.pikminEyeL} />
            <View style={styles.pikminEyeR} />
          </View>
        </View>
      ))}

      {/* Enemies (bulborb-ish) */}
      {enemies.map((e) => (
        <View key={e.id} style={[styles.enemy, { left: e.x, top: e.y }]}>
          <View style={styles.enemySpotL} />
          <View style={styles.enemySpotR} />
          <View style={styles.enemyMouth}>
            <View style={styles.enemyEyeL} />
            <View style={styles.enemyEyeR} />
          </View>
        </View>
      ))}

      {/* Olimar */}
      {started && !gameOver && (
        <View style={[styles.olimar, { left: playerX, top: SCREEN_H - 130 }]}>
          {/* antenna */}
          <View style={styles.olimarAntenna} />
          <View style={styles.olimarAntennaTip} />
          {/* helmet */}
          <View style={styles.olimarHelmet}>
            <View style={styles.olimarFace}>
              <View style={styles.olimarNose} />
              <View style={styles.olimarMustache} />
            </View>
            <View style={styles.olimarHelmetShine} />
          </View>
          {/* body */}
          <View style={styles.olimarBody}>
            <View style={styles.olimarBackpack} />
          </View>
          {/* legs */}
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
            指でドラッグしてオリマーを移動{'\n'}
            ピクミンは自動で投げられます{'\n'}
            敵（チャッピー）を倒してスコアを稼ごう
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

  // --- Pikmin projectile ---
  pikminWrap: {
    position: 'absolute',
    width: PIKMIN_SIZE,
    height: PIKMIN_SIZE + 10,
    alignItems: 'center',
  },
  pikminStem: {
    width: 2,
    height: 6,
    backgroundColor: '#4a2a10',
  },
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
  pikminEyeL: {
    width: 4,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginHorizontal: 1,
  },
  pikminEyeR: {
    width: 4,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginHorizontal: 1,
  },

  // --- Enemy (bulborb-style) ---
  enemy: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    backgroundColor: '#d23030',
    borderRadius: ENEMY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    overflow: 'hidden',
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
    width: ENEMY_SIZE - 8,
    height: 16,
    backgroundColor: '#2a0a0a',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  enemyEyeL: {
    width: 5,
    height: 5,
    backgroundColor: '#ffd93d',
    borderRadius: 2.5,
  },
  enemyEyeR: {
    width: 5,
    height: 5,
    backgroundColor: '#ffd93d',
    borderRadius: 2.5,
  },

  // --- Olimar ---
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

  // --- Overlay ---
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,30,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
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
