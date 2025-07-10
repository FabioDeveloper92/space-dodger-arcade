
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Gamepad2 } from 'lucide-react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 40;
const METEOR_SIZE = 30;
const INITIAL_METEOR_SPEED = 2;
const METEOR_SPAWN_RATE = 0.02;

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Game state
  const playerRef = useRef<GameObject>({
    x: GAME_WIDTH / 2 - PLAYER_SIZE / 2,
    y: GAME_HEIGHT - PLAYER_SIZE - 20,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    speed: 5
  });

  const meteorsRef = useRef<GameObject[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize star particles
  const initializeParticles = useCallback(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2
      });
    }
    particlesRef.current = particles;
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle touch events for mobile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = GAME_WIDTH / rect.width;
      const scaleY = GAME_HEIGHT / rect.height;

      touchRef.current = {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (touchRef.current && isPlaying) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = GAME_WIDTH / rect.width;
        const scaleY = GAME_HEIGHT / rect.height;

        touchRef.current = {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY
        };
      }
    };

    const handleTouchEnd = () => {
      touchRef.current = null;
    };

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPlaying]);

  // Collision detection
  const checkCollision = (obj1: GameObject, obj2: GameObject): boolean => {
    return obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y;
  };

  // Update game logic
  const updateGame = useCallback(() => {
    if (!isPlaying || gameOver) return;

    const player = playerRef.current;
    const meteors = meteorsRef.current;
    const particles = particlesRef.current;

    // Update player position based on input
    if (touchRef.current) {
      // Touch controls - move towards touch position
      const targetX = touchRef.current.x - player.width / 2;
      const diffX = targetX - player.x;
      player.x += Math.sign(diffX) * Math.min(Math.abs(diffX) * 0.1, player.speed);
    } else {
      // Keyboard controls
      if (keysRef.current.has('arrowleft') || keysRef.current.has('a')) {
        player.x = Math.max(0, player.x - player.speed);
      }
      if (keysRef.current.has('arrowright') || keysRef.current.has('d')) {
        player.x = Math.min(GAME_WIDTH - player.width, player.x + player.speed);
      }
      if (keysRef.current.has('arrowup') || keysRef.current.has('w')) {
        player.y = Math.max(0, player.y - player.speed);
      }
      if (keysRef.current.has('arrowdown') || keysRef.current.has('s')) {
        player.y = Math.min(GAME_HEIGHT - player.height, player.y + player.speed);
      }
    }

    // Update particles (stars)
    particles.forEach(particle => {
      particle.y += particle.speed;
      if (particle.y > GAME_HEIGHT) {
        particle.y = 0;
        particle.x = Math.random() * GAME_WIDTH;
      }
    });

    // Spawn meteors based on difficulty
    const difficulty = Math.floor(score / 500) + 1;
    const spawnRate = METEOR_SPAWN_RATE + (difficulty - 1) * 0.005;

    if (Math.random() < spawnRate) {
      meteors.push({
        x: Math.random() * (GAME_WIDTH - METEOR_SIZE),
        y: -METEOR_SIZE,
        width: METEOR_SIZE + Math.random() * 20,
        height: METEOR_SIZE + Math.random() * 20,
        speed: INITIAL_METEOR_SPEED + (difficulty - 1) * 0.5 + Math.random()
      });
    }

    // Update meteors
    for (let i = meteors.length - 1; i >= 0; i--) {
      meteors[i].y += meteors[i].speed;

      // Remove meteors that are off screen
      if (meteors[i].y > GAME_HEIGHT) {
        meteors.splice(i, 1);
        setScore(prev => prev + 10);
        continue;
      }

      // Check collision with player
      if (checkCollision(player, meteors[i])) {
        setGameOver(true);
        setIsPlaying(false);
        setHighScore(prev => Math.max(prev, score));
        return;
      }
    }
  }, [isPlaying, gameOver, score]);

  // Render game
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with space background
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#000011');
    gradient.addColorStop(1, '#000033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw stars
    particlesRef.current.forEach(particle => {
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;

    if (isPlaying) {
      // Draw player (spaceship)
      const player = playerRef.current;
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(player.x, player.y, player.width, player.height);

      // Draw spaceship details
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(player.x + 5, player.y + 10, 5, 20);
      ctx.fillRect(player.x + 30, player.y + 10, 5, 20);
      ctx.fillRect(player.x + 15, player.y + 5, 10, 30);

      // Draw meteors
      meteorsRef.current.forEach(meteor => {
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(meteor.x, meteor.y, meteor.width, meteor.height);

        // Add meteor glow effect
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 10;
        ctx.fillRect(meteor.x, meteor.y, meteor.width, meteor.height);
        ctx.shadowBlur = 0;
      });
    }
  }, [isPlaying]);

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      updateGame();
      render();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    if (isPlaying) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying, updateGame, render]);

  // Start game
  const startGame = () => {
    playerRef.current = {
      x: GAME_WIDTH / 2 - PLAYER_SIZE / 2,
      y: GAME_HEIGHT - PLAYER_SIZE - 20,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      speed: 5
    };
    meteorsRef.current = [];
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    initializeParticles();
  };

  // Reset game
  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setScore(0);
    meteorsRef.current = [];
    initializeParticles();
  };

  // Initialize particles on mount
  useEffect(() => {
    initializeParticles();
  }, [initializeParticles]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          SPACE DODGER
        </h1>
        <p className="text-gray-300 text-lg">Evita i meteoriti e sopravvivi il più a lungo possibile!</p>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="border-2 border-cyan-500 rounded-lg shadow-2xl shadow-cyan-500/20 max-w-full h-auto"
          style={{
            maxWidth: '100%',
            height: 'auto',
            touchAction: 'none'
          }}
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center rounded-lg">
            <div className="text-center text-white">
              {gameOver ? (
                <>
                  <h2 className="text-3xl font-bold mb-4 text-red-400">GAME OVER</h2>
                  <p className="text-xl mb-2">Punteggio Finale: <span className="font-bold text-cyan-400">{score}</span></p>
                  <p className="text-lg mb-6">Record: <span className="font-bold text-yellow-400">{highScore}</span></p>
                </>
              ) : (
                <>
                  <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                  <h2 className="text-2xl font-bold mb-4">Pronto per giocare?</h2>
                  <p className="text-sm mb-6 text-gray-300 max-w-md">
                    Desktop: Usa le frecce o WASD per muoverti<br />
                    Mobile: Tocca lo schermo dove vuoi andare
                  </p>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={startGame}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
                >
                  <Play className="w-5 h-5" />
                  {gameOver ? 'Gioca Ancora' : 'Inizia'}
                </button>

                {gameOver && (
                  <button
                    onClick={resetGame}
                    className="flex items-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-lg font-bold transition-all duration-200"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {isPlaying && (
        <div className="mt-4 flex flex-col sm:flex-row gap-4 text-center">
          <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
            <p className="text-white">
              <span className="text-cyan-400 font-bold">Punteggio:</span> {score}
            </p>
          </div>
          <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
            <p className="text-white">
              <span className="text-yellow-400 font-bold">Record:</span> {highScore}
            </p>
          </div>
          <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
            <p className="text-white">
              <span className="text-purple-400 font-bold">Livello:</span> {Math.floor(score / 500) + 1}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-gray-400 text-sm">
        <p>💡 La difficoltà aumenta ogni 500 punti!</p>
      </div>

      {/* Powered by DeveloperFabio */}
      <div className="mt-6 text-center text-gray-400">

        <small>
          <a
            href="https://github.com/FabioDeveloper92/PokemonDeck_SnCeGroup"
            rel="noreferrer"
            target="_blank"
            className="text-mountain-500 hover:text-mountain-300 text-xs transition-colors"
          >
            Source code
          </a>
          <br />
          <a
            href="https://fabioramoni.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mountain-500 hover:text-mountain-300 text-xs transition-colors"
          >
            powered by DeveloperFabio
          </a>
        </small>
      </div>
    </div>
  );
};

export default Index;
