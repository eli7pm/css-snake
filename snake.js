const SIZE = 20
const DIRS = { up: [0, -1, 270], down: [0, 1, 90], left: [-1, 0, 180], right: [1, 0, 0] }
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }

const game = document.querySelector('.game')
const board = document.querySelector('.board')
const food = document.querySelector('.food')
const score = document.querySelector('.score')
const status = document.querySelector('.status')

let snake, dir, queue, apple, timer, speed, lastStep, previous, atWall
let best = Number(safe(() => localStorage.getItem('css-snake-best'))) || 0
score.dataset.best = best

function safe(fn) {
  try {
    return fn()
  } catch {
    return null
  }
}

function place(el, [x, y]) {
  el.style.setProperty('--x', x)
  el.style.setProperty('--y', y)
}

function render() {
  const parts = board.querySelectorAll('.segment')
  for (let i = parts.length; i < snake.length; i++) {
    const el = document.createElement('div')
    el.className = 'segment'
    place(el, snake[i])
    board.insertBefore(el, food)
  }
  for (let i = snake.length; i < parts.length; i++) parts[i].remove()
  board.querySelectorAll('.segment').forEach((el, i) => {
    place(el, snake[i])
    el.classList.toggle('head', i === 0)
  })
  game.style.setProperty('--angle', `${DIRS[dir][2]}deg`)
  place(food, apple)
}

function newApple() {
  let spot
  do spot = [Math.floor(Math.random() * SIZE), Math.floor(Math.random() * SIZE)]
  while (snake.some(([x, y]) => x === spot[0] && y === spot[1]))
  return spot
}

function setState(state, message = '') {
  game.dataset.state = state
  status.textContent = message
}

const same = (a, b) => a[0] === b[0] && a[1] === b[1]

function reset() {
  snake = [[9, 10], [8, 10], [7, 10]]
  dir = 'right'
  queue = []
  speed = 160
  lastStep = 0
  previous = null
  atWall = false
  apple = newApple()
  score.dataset.score = 0
  game.style.setProperty('--speed', `${speed}ms`)
  game.classList.remove('edge')
  board.querySelectorAll('.segment').forEach((el) => el.remove())
  render()
}

function restartTimer() {
  clearInterval(timer)
  if (game.dataset.state === 'playing') timer = setInterval(tick, speed)
}

function attempt(from, direction) {
  const [dx, dy] = DIRS[direction]
  const head = [from[0][0] + dx, from[0][1] + dy]
  const eats = same(head, apple)
  const body = eats ? from : from.slice(0, -1)
  if (head.some((v) => v < 0 || v >= SIZE)) return { blocked: 'wall' }
  if (body.some((cell) => same(cell, head))) return { blocked: 'self' }
  return { cells: [head, ...body], eats }
}

function eat() {
  const points = Number(score.dataset.score) + 1
  score.dataset.score = points
  apple = newApple()
  game.classList.remove('ate')
  void game.offsetWidth
  game.classList.add('ate')
  if (points % 5 === 0 && speed > 80) {
    speed -= 10
    game.style.setProperty('--speed', `${speed}ms`)
    restartTimer()
  }
}

function tick() {
  lastStep = performance.now()
  const next = queue.shift()
  if (next) dir = next
  const move = attempt(snake, dir)

  if (move.blocked === 'wall' && !atWall) {
    atWall = true
    previous = null
    game.classList.add('edge')
    return render()
  }
  if (move.blocked) return over()

  atWall = false
  game.classList.remove('edge')
  previous = move.eats ? null : snake
  snake = move.cells
  if (move.eats) eat()
  render()
}

function over() {
  clearInterval(timer)
  game.classList.remove('edge')
  const points = Number(score.dataset.score)
  if (points > best) {
    best = points
    score.dataset.best = best
    safe(() => localStorage.setItem('css-snake-best', best))
  }
  setState('over', `Game over. Score ${points}.`)
}

function play() {
  if (game.dataset.state === 'playing') return
  if (game.dataset.state !== 'paused') reset()
  setState('playing')
  restartTimer()
}

function pause() {
  if (game.dataset.state !== 'playing') return
  clearInterval(timer)
  setState('paused', 'Paused')
}

function redoLastStep(to) {
  if (queue.length || !previous || performance.now() - lastStep > speed * 0.4) return false
  const redo = attempt(previous, to)
  if (redo.blocked) return false
  snake = redo.cells
  dir = to
  previous = null
  if (redo.eats) eat()
  render()
  return true
}

function turn(to) {
  if (game.dataset.state !== 'playing') return play()
  const last = queue.at(-1) ?? dir
  const [lx, ly] = DIRS[last]
  const [tx, ty] = DIRS[to]
  if (to === last || (lx + tx === 0 && ly + ty === 0)) return
  if (redoLastStep(to)) return
  if (queue.length < 2) queue.push(to)
}

document.addEventListener('keydown', (e) => {
  const to = KEYS[e.key] ?? KEYS[e.key.toLowerCase()]
  if (to) {
    e.preventDefault()
    turn(to)
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    game.dataset.state === 'playing' ? pause() : play()
  }
})

document.querySelector('.overlay').addEventListener('click', play)
document.querySelectorAll('[data-dir]').forEach((b) => b.addEventListener('click', () => turn(b.dataset.dir)))

let touch = null
board.addEventListener('pointerdown', (e) => (touch = [e.clientX, e.clientY]))
board.addEventListener('pointerup', (e) => {
  if (!touch) return
  const dx = e.clientX - touch[0]
  const dy = e.clientY - touch[1]
  touch = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return
  turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
})

document.addEventListener('visibilitychange', () => document.hidden && pause())

reset()
