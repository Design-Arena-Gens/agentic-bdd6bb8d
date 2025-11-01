'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './page.module.css'

type BubbleColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'cyan' | 'pink' | 'rainbow' | 'bomb' | 'freeze' | 'gray'

interface Bubble {
  row: number
  col: number
  color: BubbleColor
  x: number
  y: number
  id: string
}

interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  color: BubbleColor
}

interface LevelConfig {
  colors: number
  speed: number
  rows: number
  hasObstacles: boolean
  hasPowerUps: boolean
  timeLimit?: number
  movingRows: boolean
}

const BUBBLE_RADIUS = 20
const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2
const GRID_WIDTH = 11
const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 800
const SHOOTER_Y = CANVAS_HEIGHT - 50

const COLOR_MAP: Record<BubbleColor, string> = {
  red: '#FF3B3B',
  blue: '#3B82FF',
  green: '#3BFF82',
  yellow: '#FFD93B',
  purple: '#B63BFF',
  orange: '#FF823B',
  cyan: '#3BFFFF',
  pink: '#FF3BFF',
  rainbow: 'linear-gradient(45deg, #FF3B3B, #FFD93B, #3BFF82, #3B82FF, #B63BFF)',
  bomb: '#1a1a1a',
  freeze: '#A8E6FF',
  gray: '#808080'
}

const LEVEL_CONFIGS: LevelConfig[] = [
  { colors: 3, speed: 0, rows: 4, hasObstacles: false, hasPowerUps: false, movingRows: false },
  { colors: 4, speed: 0, rows: 5, hasObstacles: false, hasPowerUps: false, movingRows: false },
  { colors: 4, speed: 0, rows: 5, hasObstacles: false, hasPowerUps: false, movingRows: false },
  { colors: 5, speed: 0.1, rows: 6, hasObstacles: false, hasPowerUps: false, movingRows: false },
  { colors: 5, speed: 0.2, rows: 6, hasObstacles: false, hasPowerUps: false, movingRows: true },
  { colors: 5, speed: 0.2, rows: 7, hasObstacles: false, hasPowerUps: false, movingRows: false },
  { colors: 6, speed: 0.3, rows: 7, hasObstacles: false, hasPowerUps: true, movingRows: false },
  { colors: 6, speed: 0.4, rows: 7, hasObstacles: false, hasPowerUps: true, movingRows: false },
  { colors: 6, speed: 0.4, rows: 8, hasObstacles: true, hasPowerUps: true, movingRows: false },
  { colors: 6, speed: 0.5, rows: 8, hasObstacles: true, hasPowerUps: true, movingRows: false },
  { colors: 7, speed: 0.5, rows: 8, hasObstacles: true, hasPowerUps: true, movingRows: false },
  { colors: 7, speed: 0.6, rows: 9, hasObstacles: true, hasPowerUps: true, movingRows: false },
  { colors: 7, speed: 0.6, rows: 9, hasObstacles: true, hasPowerUps: true, movingRows: true },
  { colors: 7, speed: 0.7, rows: 9, hasObstacles: true, hasPowerUps: true, movingRows: false, timeLimit: 120 },
  { colors: 8, speed: 0.7, rows: 10, hasObstacles: true, hasPowerUps: true, movingRows: false },
  { colors: 8, speed: 0.8, rows: 10, hasObstacles: true, hasPowerUps: true, movingRows: false },
  { colors: 8, speed: 0.8, rows: 10, hasObstacles: true, hasPowerUps: true, movingRows: true },
  { colors: 8, speed: 0.9, rows: 11, hasObstacles: true, hasPowerUps: true, movingRows: true },
  { colors: 8, speed: 0.9, rows: 11, hasObstacles: true, hasPowerUps: true, movingRows: true },
  { colors: 8, speed: 1.0, rows: 12, hasObstacles: true, hasPowerUps: true, movingRows: true }
]

const ALL_COLORS: BubbleColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink']

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [projectile, setProjectile] = useState<Projectile | null>(null)
  const [nextColor, setNextColor] = useState<BubbleColor>('red')
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'won' | 'lost'>('menu')
  const [mousePos, setMousePos] = useState({ x: CANVAS_WIDTH / 2, y: SHOOTER_Y })
  const [stars, setStars] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [combo, setCombo] = useState(0)
  const [frozenTime, setFrozenTime] = useState(0)
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  const getAvailableColors = (levelNum: number): BubbleColor[] => {
    const config = LEVEL_CONFIGS[levelNum - 1]
    return ALL_COLORS.slice(0, config.colors)
  }

  const initializeLevel = useCallback((levelNum: number) => {
    const config = LEVEL_CONFIGS[levelNum - 1]
    const colors = getAvailableColors(levelNum)
    const newBubbles: Bubble[] = []
    let id = 0

    for (let row = 0; row < config.rows; row++) {
      const cols = row % 2 === 0 ? GRID_WIDTH : GRID_WIDTH - 1
      const offsetX = row % 2 === 0 ? 0 : BUBBLE_RADIUS

      for (let col = 0; col < cols; col++) {
        let color: BubbleColor

        if (config.hasObstacles && Math.random() < 0.05) {
          color = 'gray'
        } else if (config.hasPowerUps && Math.random() < 0.03) {
          const powerUpTypes: BubbleColor[] = ['rainbow', 'bomb', 'freeze']
          color = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
        } else {
          color = colors[Math.floor(Math.random() * colors.length)]
        }

        newBubbles.push({
          row,
          col,
          color,
          x: col * BUBBLE_DIAMETER + BUBBLE_RADIUS + offsetX,
          y: row * BUBBLE_DIAMETER + BUBBLE_RADIUS,
          id: `${id++}`
        })
      }
    }

    setBubbles(newBubbles)
    setNextColor(colors[Math.floor(Math.random() * colors.length)])
    setProjectile(null)
    setLives(3)
    setCombo(0)
    setFrozenTime(0)

    if (config.timeLimit) {
      setTimeLeft(config.timeLimit)
    } else {
      setTimeLeft(null)
    }
  }, [])

  const startGame = () => {
    setGameState('playing')
    setScore(0)
    setLevel(1)
    initializeLevel(1)
  }

  const nextLevel = () => {
    if (level < 20) {
      const newLevel = level + 1
      setLevel(newLevel)
      initializeLevel(newLevel)
      setGameState('playing')
    } else {
      setGameState('won')
    }
  }

  const calculateStars = (bubblesLeft: number, totalBubbles: number): number => {
    const percentage = (totalBubbles - bubblesLeft) / totalBubbles
    if (percentage === 1) return 3
    if (percentage >= 0.8) return 2
    if (percentage >= 0.5) return 1
    return 0
  }

  const checkWinCondition = (currentBubbles: Bubble[]) => {
    const nonGrayBubbles = currentBubbles.filter(b => b.color !== 'gray')
    if (nonGrayBubbles.length === 0) {
      const totalBubbles = LEVEL_CONFIGS[level - 1].rows * GRID_WIDTH
      const earnedStars = calculateStars(0, totalBubbles)
      setStars(earnedStars)
      setScore(prev => prev + 1000 * earnedStars)
      setGameState('won')
    }
  }

  const findNearestGridPosition = (x: number, y: number): { row: number; col: number; x: number; y: number } => {
    const row = Math.round((y - BUBBLE_RADIUS) / BUBBLE_DIAMETER)
    const offsetX = row % 2 === 0 ? 0 : BUBBLE_RADIUS
    const col = Math.round((x - BUBBLE_RADIUS - offsetX) / BUBBLE_DIAMETER)

    const gridX = col * BUBBLE_DIAMETER + BUBBLE_RADIUS + offsetX
    const gridY = row * BUBBLE_DIAMETER + BUBBLE_RADIUS

    return { row, col, x: gridX, y: gridY }
  }

  const findConnectedBubbles = (bubbles: Bubble[], startBubble: Bubble): Bubble[] => {
    const connected: Bubble[] = []
    const visited = new Set<string>()
    const queue = [startBubble]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current.id)) continue

      visited.add(current.id)
      connected.push(current)

      const neighbors = getNeighbors(bubbles, current)
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id) && neighbor.color === startBubble.color && neighbor.color !== 'gray') {
          queue.push(neighbor)
        }
      }
    }

    return connected
  }

  const getNeighbors = (bubbles: Bubble[], bubble: Bubble): Bubble[] => {
    const neighbors: Bubble[] = []
    const { row, col } = bubble

    const offsets = row % 2 === 0
      ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
      : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]

    for (const [dr, dc] of offsets) {
      const neighbor = bubbles.find(b => b.row === row + dr && b.col === col + dc)
      if (neighbor) neighbors.push(neighbor)
    }

    return neighbors
  }

  const findFloatingBubbles = (bubbles: Bubble[]): Bubble[] => {
    const anchored = new Set<string>()
    const queue: Bubble[] = bubbles.filter(b => b.row === 0)

    queue.forEach(b => anchored.add(b.id))

    while (queue.length > 0) {
      const current = queue.shift()!
      const neighbors = getNeighbors(bubbles, current)

      for (const neighbor of neighbors) {
        if (!anchored.has(neighbor.id)) {
          anchored.add(neighbor.id)
          queue.push(neighbor)
        }
      }
    }

    return bubbles.filter(b => !anchored.has(b.id))
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || projectile) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const dx = clickX - CANVAS_WIDTH / 2
    const dy = clickY - SHOOTER_Y
    const magnitude = Math.sqrt(dx * dx + dy * dy)
    const speed = 8

    setProjectile({
      x: CANVAS_WIDTH / 2,
      y: SHOOTER_Y,
      vx: (dx / magnitude) * speed,
      vy: (dy / magnitude) * speed,
      color: nextColor
    })

    const colors = getAvailableColors(level)
    setNextColor(colors[Math.floor(Math.random() * colors.length)])
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Draw bubbles
      bubbles.forEach(bubble => {
        ctx.beginPath()
        ctx.arc(bubble.x, bubble.y, BUBBLE_RADIUS, 0, Math.PI * 2)

        const color = COLOR_MAP[bubble.color]
        if (color.startsWith('linear-gradient')) {
          const gradient = ctx.createLinearGradient(
            bubble.x - BUBBLE_RADIUS,
            bubble.y - BUBBLE_RADIUS,
            bubble.x + BUBBLE_RADIUS,
            bubble.y + BUBBLE_RADIUS
          )
          gradient.addColorStop(0, '#FF3B3B')
          gradient.addColorStop(0.2, '#FFD93B')
          gradient.addColorStop(0.4, '#3BFF82')
          gradient.addColorStop(0.6, '#3B82FF')
          gradient.addColorStop(1, '#B63BFF')
          ctx.fillStyle = gradient
        } else {
          ctx.fillStyle = color
        }

        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.lineWidth = 2
        ctx.stroke()

        // Special bubble indicators
        if (bubble.color === 'bomb') {
          ctx.fillStyle = '#FF3B3B'
          ctx.font = 'bold 20px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('💣', bubble.x, bubble.y)
        } else if (bubble.color === 'freeze') {
          ctx.fillStyle = '#FFFFFF'
          ctx.font = 'bold 20px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('❄', bubble.x, bubble.y)
        }
      })

      // Draw projectile
      if (projectile && gameState === 'playing') {
        let newX = projectile.x + projectile.vx
        let newY = projectile.y + projectile.vy
        let newVx = projectile.vx
        let newVy = projectile.vy

        // Wall collision
        if (newX - BUBBLE_RADIUS < 0 || newX + BUBBLE_RADIUS > CANVAS_WIDTH) {
          newVx = -newVx
          newX = newX < CANVAS_WIDTH / 2 ? BUBBLE_RADIUS : CANVAS_WIDTH - BUBBLE_RADIUS
        }

        // Ceiling collision
        if (newY - BUBBLE_RADIUS < 0) {
          const gridPos = findNearestGridPosition(newX, BUBBLE_RADIUS)

          const newBubbles = [...bubbles]
          let id = Math.max(...newBubbles.map(b => parseInt(b.id)), 0) + 1
          const newBubble: Bubble = {
            row: gridPos.row,
            col: gridPos.col,
            color: projectile.color,
            x: gridPos.x,
            y: gridPos.y,
            id: id.toString()
          }

          newBubbles.push(newBubble)

          // Handle special bubbles
          if (projectile.color === 'bomb') {
            const neighbors = getNeighbors(newBubbles, newBubble)
            const toRemove = new Set([newBubble.id, ...neighbors.map(n => n.id)])
            const afterBomb = newBubbles.filter(b => !toRemove.has(b.id))
            const floating = findFloatingBubbles(afterBomb)
            const finalBubbles = afterBomb.filter(b => !floating.find(f => f.id === b.id))
            setBubbles(finalBubbles)
            setScore(prev => prev + (toRemove.size + floating.length) * 10 * (combo + 1))
            setCombo(prev => prev + 1)
          } else if (projectile.color === 'freeze') {
            setFrozenTime(5000)
            setBubbles(newBubbles.filter(b => b.id !== newBubble.id))
          } else if (projectile.color === 'rainbow') {
            const colors = getAvailableColors(level)
            newBubble.color = colors[Math.floor(Math.random() * colors.length)]
            const connected = findConnectedBubbles(newBubbles, newBubble)
            if (connected.length >= 3) {
              const afterPop = newBubbles.filter(b => !connected.find(c => c.id === b.id))
              const floating = findFloatingBubbles(afterPop)
              const finalBubbles = afterPop.filter(b => !floating.find(f => f.id === b.id))
              setBubbles(finalBubbles)
              setScore(prev => prev + (connected.length + floating.length) * 10 * (combo + 1))
              setCombo(prev => prev + 1)
              checkWinCondition(finalBubbles)
            } else {
              setBubbles(newBubbles)
              setCombo(0)
            }
          } else {
            const connected = findConnectedBubbles(newBubbles, newBubble)
            if (connected.length >= 3) {
              const afterPop = newBubbles.filter(b => !connected.find(c => c.id === b.id))
              const floating = findFloatingBubbles(afterPop)
              const finalBubbles = afterPop.filter(b => !floating.find(f => f.id === b.id))
              setBubbles(finalBubbles)
              setScore(prev => prev + (connected.length + floating.length) * 10 * (combo + 1))
              setCombo(prev => prev + 1)
              checkWinCondition(finalBubbles)
            } else {
              setBubbles(newBubbles)
              setCombo(0)
            }
          }

          setProjectile(null)
          return
        }

        // Bubble collision
        const hitBubble = bubbles.find(b => {
          const dist = Math.sqrt((b.x - newX) ** 2 + (b.y - newY) ** 2)
          return dist < BUBBLE_DIAMETER
        })

        if (hitBubble) {
          const gridPos = findNearestGridPosition(newX, newY)

          const newBubbles = [...bubbles]
          let id = Math.max(...newBubbles.map(b => parseInt(b.id)), 0) + 1
          const newBubble: Bubble = {
            row: gridPos.row,
            col: gridPos.col,
            color: projectile.color,
            x: gridPos.x,
            y: gridPos.y,
            id: id.toString()
          }

          newBubbles.push(newBubble)

          // Handle special bubbles
          if (projectile.color === 'bomb') {
            const neighbors = getNeighbors(newBubbles, newBubble)
            const toRemove = new Set([newBubble.id, ...neighbors.map(n => n.id)])
            const afterBomb = newBubbles.filter(b => !toRemove.has(b.id))
            const floating = findFloatingBubbles(afterBomb)
            const finalBubbles = afterBomb.filter(b => !floating.find(f => f.id === b.id))
            setBubbles(finalBubbles)
            setScore(prev => prev + (toRemove.size + floating.length) * 10 * (combo + 1))
            setCombo(prev => prev + 1)
            checkWinCondition(finalBubbles)
          } else if (projectile.color === 'freeze') {
            setFrozenTime(5000)
            setBubbles(newBubbles.filter(b => b.id !== newBubble.id))
          } else if (projectile.color === 'rainbow') {
            newBubble.color = hitBubble.color
            const connected = findConnectedBubbles(newBubbles, newBubble)
            if (connected.length >= 3) {
              const afterPop = newBubbles.filter(b => !connected.find(c => c.id === b.id))
              const floating = findFloatingBubbles(afterPop)
              const finalBubbles = afterPop.filter(b => !floating.find(f => f.id === b.id))
              setBubbles(finalBubbles)
              setScore(prev => prev + (connected.length + floating.length) * 10 * (combo + 1))
              setCombo(prev => prev + 1)
              checkWinCondition(finalBubbles)
            } else {
              setBubbles(newBubbles)
              setCombo(0)
            }
          } else {
            const connected = findConnectedBubbles(newBubbles, newBubble)
            if (connected.length >= 3) {
              const afterPop = newBubbles.filter(b => !connected.find(c => c.id === b.id))
              const floating = findFloatingBubbles(afterPop)
              const finalBubbles = afterPop.filter(b => !floating.find(f => f.id === b.id))
              setBubbles(finalBubbles)
              setScore(prev => prev + (connected.length + floating.length) * 10 * (combo + 1))
              setCombo(prev => prev + 1)
              checkWinCondition(finalBubbles)
            } else {
              setBubbles(newBubbles)
              setCombo(0)
            }
          }

          setProjectile(null)
          return
        }

        ctx.beginPath()
        ctx.arc(newX, newY, BUBBLE_RADIUS, 0, Math.PI * 2)
        const color = COLOR_MAP[projectile.color]
        if (color.startsWith('linear-gradient')) {
          const gradient = ctx.createLinearGradient(
            newX - BUBBLE_RADIUS,
            newY - BUBBLE_RADIUS,
            newX + BUBBLE_RADIUS,
            newY + BUBBLE_RADIUS
          )
          gradient.addColorStop(0, '#FF3B3B')
          gradient.addColorStop(0.2, '#FFD93B')
          gradient.addColorStop(0.4, '#3BFF82')
          gradient.addColorStop(0.6, '#3B82FF')
          gradient.addColorStop(1, '#B63BFF')
          ctx.fillStyle = gradient
        } else {
          ctx.fillStyle = color
        }
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = 2
        ctx.stroke()

        setProjectile({
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          color: projectile.color
        })
      }

      // Draw shooter
      ctx.beginPath()
      ctx.arc(CANVAS_WIDTH / 2, SHOOTER_Y, BUBBLE_RADIUS, 0, Math.PI * 2)
      const shooterColor = COLOR_MAP[nextColor]
      if (shooterColor.startsWith('linear-gradient')) {
        const gradient = ctx.createLinearGradient(
          CANVAS_WIDTH / 2 - BUBBLE_RADIUS,
          SHOOTER_Y - BUBBLE_RADIUS,
          CANVAS_WIDTH / 2 + BUBBLE_RADIUS,
          SHOOTER_Y + BUBBLE_RADIUS
        )
        gradient.addColorStop(0, '#FF3B3B')
        gradient.addColorStop(0.2, '#FFD93B')
        gradient.addColorStop(0.4, '#3BFF82')
        gradient.addColorStop(0.6, '#3B82FF')
        gradient.addColorStop(1, '#B63BFF')
        ctx.fillStyle = gradient
      } else {
        ctx.fillStyle = shooterColor
      }
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 3
      ctx.stroke()

      // Draw aim line
      if (!projectile && gameState === 'playing') {
        ctx.beginPath()
        ctx.moveTo(CANVAS_WIDTH / 2, SHOOTER_Y)
        ctx.lineTo(mousePos.x, mousePos.y)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.stroke()
        ctx.setLineDash([])
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [bubbles, projectile, nextColor, gameState, mousePos, level, combo])

  // Bubble descent
  useEffect(() => {
    if (gameState !== 'playing' || frozenTime > 0) return

    const config = LEVEL_CONFIGS[level - 1]
    if (config.speed === 0) return

    const interval = setInterval(() => {
      setBubbles(prev => {
        const newBubbles = prev.map(b => ({
          ...b,
          y: b.y + config.speed,
          row: Math.round((b.y + config.speed - BUBBLE_RADIUS) / BUBBLE_DIAMETER)
        }))

        // Check if any bubble reached the bottom
        const reachedBottom = newBubbles.some(b => b.y + BUBBLE_RADIUS >= SHOOTER_Y - 50)
        if (reachedBottom) {
          setLives(prev => {
            const newLives = prev - 1
            if (newLives <= 0) {
              setGameState('lost')
            }
            return newLives
          })
          return prev
        }

        return newBubbles
      })
    }, 50)

    return () => clearInterval(interval)
  }, [gameState, level, frozenTime])

  // Freeze timer
  useEffect(() => {
    if (frozenTime <= 0) return

    const interval = setInterval(() => {
      setFrozenTime(prev => Math.max(0, prev - 50))
    }, 50)

    return () => clearInterval(interval)
  }, [frozenTime])

  // Time limit
  useEffect(() => {
    if (gameState !== 'playing' || timeLeft === null) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          setGameState('lost')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState, timeLeft])

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Color Burst</h1>

        {gameState === 'menu' && (
          <div className={styles.menu}>
            <h2>20-Level Bubble Shooter</h2>
            <p>Match 3 or more bubbles to clear them!</p>
            <button className={styles.button} onClick={startGame}>
              Start Game
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            <div className={styles.hud}>
              <div>Level: {level}/20</div>
              <div>Score: {score}</div>
              <div>Lives: {'❤️'.repeat(lives)}</div>
              {combo > 0 && <div className={styles.combo}>Combo x{combo + 1}</div>}
              {timeLeft !== null && <div>Time: {timeLeft}s</div>}
              {frozenTime > 0 && <div className={styles.freeze}>❄️ Frozen: {Math.ceil(frozenTime / 1000)}s</div>}
            </div>
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className={styles.canvas}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
            />
          </>
        )}

        {gameState === 'won' && (
          <div className={styles.menu}>
            <h2>Level Complete!</h2>
            <div className={styles.stars}>
              {'⭐'.repeat(stars)}
            </div>
            <p>Score: {score}</p>
            {level < 20 ? (
              <button className={styles.button} onClick={nextLevel}>
                Next Level
              </button>
            ) : (
              <div>
                <h2>🎉 You Won! 🎉</h2>
                <button className={styles.button} onClick={startGame}>
                  Play Again
                </button>
              </div>
            )}
          </div>
        )}

        {gameState === 'lost' && (
          <div className={styles.menu}>
            <h2>Game Over</h2>
            <p>Score: {score}</p>
            <p>Level: {level}/20</p>
            <button className={styles.button} onClick={startGame}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
