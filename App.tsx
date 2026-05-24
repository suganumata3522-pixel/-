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
const PLAYER_SIZE = 50;
const BULLET_W = 4;
const BULLET_H = 14;
const ENEMY_SIZE = 40;
const BULLET_SPEED = 12;
const ENEMY_MIN_SPEED = 2;
const ENEMY_SPEED_RANGE = 3;
const SHOOT_INTERVAL_MS = 220;
const ENEMY_SPAWN_INTERVAL_MS = 700;
const FRAME_MS = 16;

type Bullet = { id: number; x: number; y: number };
type Enemy = { id: number; x: number; y: number; speed: number; hp: number };
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
  const [playerX, setPlayerX] = useState(SCREEN_W / 2 - PLAYER_SIZE / 2);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [stars, setStars] = useState<Star[]>(initialStars);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const playerXRef = useRef(playerX);
  playerXRef.current = playerX;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const next = Math.max(
          0,
          Math.min(SCREEN_W - PLAYER_SIZE, gesture.moveX - PLAYER_SIZE / 2),
        );
        setPlayerX(next);
      },
    }),
  ).current;

  const reset = useCallback(() => {
    setPlayerX(SCREEN_W / 2 - PLAYER_SIZE / 2);
    setBullets([]);
    setEnemies([]);
    setStars(initialStars());
    setScore(0);
    setLives(3);
    setGameOver(false);
    setStarted(true);
  }, []);

  // Main game loop
  useEffect(() => {
    if (!started || gameOver) return;
    const tick = setInterval(() => {
      // Move stars (parallax background)
      setStars((prev) =>
        prev.map((s) => {
          const y = s.y + s.speed;
          return y > SCREEN_H
            ? { ...s, y: 0, x: Math.random() * SCREEN_W }
            : { ...s, y };
        }),
      );

      // Move bullets up, drop off-screen
      setBullets((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y - BULLET_SPEED }))
          .filter((b) => b.y + BULLET_H > 0),
      );

      // Move enemies down
      setEnemies((prev) =>
        prev
          .map((e) => ({ ...e, y: e.y + e.speed }))
          .filter((e) => e.y < SCREEN_H + ENEMY_SIZE),
      );
    }, FRAME_MS);
    return () => clearInterval(tick);
  }, [started, gameOver]);

  // Auto-shoot
  useEffect(() => {
    if (!started || gameOver) return;
    const shoot = setInterval(() => {
      setBullets((prev) => [
        ...prev,
        {
          id: uid(),
          x: playerXRef.current + PLAYER_SIZE / 2 - BULLET_W / 2,
          y: SCREEN_H - 120,
        },
      ]);
    }, SHOOT_INTERVAL_MS);
    return () => clearInterval(shoot);
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
          hp: 1,
        },
      ]);
    }, ENEMY_SPAWN_INTERVAL_MS);
    return () => clearInterval(spawn);
  }, [started, gameOver]);

  // Collision detection
  useEffect(() => {
    if (!started || gameOver) return;

    // bullets vs enemies
    const hitBulletIds = new Set<number>();
    const hitEnemyIds = new Set<number>();
    let gained = 0;
    for (const b of bullets) {
      for (const e of enemies) {
        if (hitEnemyIds.has(e.id)) continue;
        const overlap =
          b.x < e.x + ENEMY_SIZE &&
          b.x + BULLET_W > e.x &&
          b.y < e.y + ENEMY_SIZE &&
          b.y + BULLET_H > e.y;
        if (overlap) {
          hitBulletIds.add(b.id);
          hitEnemyIds.add(e.id);
          gained += 10;
          break;
        }
      }
    }

    // enemies vs player
    const playerRect = {
      x: playerXRef.current,
      y: SCREEN_H - 110,
      w: PLAYER_SIZE,
      h: PLAYER_SIZE,
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

    if (hitBulletIds.size > 0) {
      setBullets((prev) => prev.filter((b) => !hitBulletIds.has(b.id)));
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
  }, [bullets, enemies, started, gameOver]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar hidden />

      {/* Starfield background */}
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

      {/* Bullets */}
      {bullets.map((b) => (
        <View
          key={b.id}
          style={[styles.bullet, { left: b.x, top: b.y }]}
        />
      ))}

      {/* Enemies */}
      {enemies.map((e) => (
        <View key={e.id} style={[styles.enemy, { left: e.x, top: e.y }]}>
          <View style={styles.enemyEyeL} />
          <View style={styles.enemyEyeR} />
        </View>
      ))}

      {/* Player */}
      {started && !gameOver && (
        <View
          style={[
            styles.player,
            { left: playerX, top: SCREEN_H - 110 },
          ]}
        >
          <View style={styles.playerNose} />
          <View style={styles.playerThruster} />
        </View>
      )}

      {/* Start / Game over overlay */}
      {(!started || gameOver) && (
        <View style={styles.overlay}>
          <Text style={styles.title}>
            {gameOver ? 'GAME OVER' : 'SPACE SHOOTER'}
          </Text>
          {gameOver && (
            <Text style={styles.finalScore}>SCORE: {score}</Text>
          )}
          <Text style={styles.instructions}>
            指で左右にドラッグして移動{'\n'}弾は自動発射されます
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
    backgroundColor: '#000018',
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
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    backgroundColor: '#4af',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#4af',
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  playerNose: {
    position: 'absolute',
    top: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#9cf',
  },
  playerThruster: {
    position: 'absolute',
    bottom: -8,
    width: 18,
    height: 10,
    backgroundColor: '#ff6',
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    alignSelf: 'center',
  },
  bullet: {
    position: 'absolute',
    width: BULLET_W,
    height: BULLET_H,
    backgroundColor: '#ff4',
    borderRadius: 2,
  },
  enemy: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    backgroundColor: '#e44',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
  },
  enemyEyeL: {
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  enemyEyeR: {
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,30,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  title: {
    color: '#9ff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 20,
  },
  finalScore: {
    color: '#ff4',
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
    backgroundColor: '#4af',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
  },
  buttonText: {
    color: '#001',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
