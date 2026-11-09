const SIZE = 20
const DIRS = { up: [0, -1, 270], down: [0, 1, 90], left: [-1, 0, 180], right: [1, 0, 0] }
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }

const game = document.querySelector('.game')
const board = document.querySelector('.board')
const food = document.querySelector('.food')
const score = document.querySelector('.score')
const status = document.querySelector('.status')

let snake, dir, queue, apple, timer, speed
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

function reset() {
  snake = [[9, 10], [8, 10], [7, 10]]
  dir = 'right'
  queue = []
  speed = 140
  apple = newApple()
  score.dataset.score = 0
  game.style.setProperty('--speed', `${speed}ms`)
  board.querySelectorAll('.segment').forEach((el) => el.remove())
  render()
}

function tick() {
  const next = queue.shift()
  if (next) dir = next
  const [dx, dy] = DIRS[dir]
  const head = [snake[0][0] + dx, snake[0][1] + dy]
  const eats = head[0] === apple[0] && head[1] === apple[1]
  const body = eats ? snake : snake.slice(0, -1)
  const hitsWall = head.some((v) => v < 0 || v >= SIZE)
  if (hitsWall || body.some(([x, y]) => x === head[0] && y === head[1])) return over()

  snake = [head, ...body]
  if (eats) {
    const points = Number(score.dataset.score) + 1
    score.dataset.score = points
    apple = newApple()
    game.classList.remove('ate')
    void game.offsetWidth
    game.classList.add('ate')
    if (points % 5 === 0 && speed > 70) {
      speed -= 10
      game.style.setProperty('--speed', `${speed}ms`)
      clearInterval(timer)
      timer = setInterval(tick, speed)
    }
  }
  render()
}

function over() {
  clearInterval(timer)
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
  timer = setInterval(tick, speed)
}

function pause() {
  if (game.dataset.state !== 'playing') return
  clearInterval(timer)
  setState('paused', 'Paused')
}

function turn(to) {
  if (game.dataset.state !== 'playing') return play()
  const last = queue.at(-1) ?? dir
  const [lx, ly] = DIRS[last]
  const [tx, ty] = DIRS[to]
  if (to === last || (lx + tx === 0 && ly + ty === 0)) return
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
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
  turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
})

document.addEventListener('visibilitychange', () => document.hidden && pause())

reset()
