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

const soundButton = document.querySelector('.sound-btn')
let soundOn = safe(() => localStorage.getItem('css-snake-sound')) !== 'off'
let audio = null
soundButton.setAttribute('aria-pressed', soundOn)

function chirp() {
  if (!soundOn || !audio) return
  const now = audio.currentTime
  const tone = audio.createOscillator()
  const volume = audio.createGain()
  tone.type = 'triangle'
  tone.frequency.setValueAtTime(520, now)
  tone.frequency.setValueAtTime(780, now + 0.06)
  volume.gain.setValueAtTime(0.0001, now)
  volume.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
  volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
  tone.connect(volume).connect(audio.destination)
  tone.start(now)
  tone.stop(now + 0.17)
}

const MILESTONES = [10, 20, 40, 60, 80]

const laugh = new Audio('laugh.mp3')
let laughReady = false
laugh.preload = 'auto'
laugh.addEventListener('canplaythrough', () => (laughReady = true), { once: true })
laugh.addEventListener('error', () => (laughReady = false))

function playLaugh() {
  if (!soundOn || !laughReady) return false
  laugh.currentTime = 0
  laugh.play().catch(() => {})
  return true
}
let noise = null

function getNoise() {
  noise ??= (() => {
    const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  })()
  return noise
}

function villainSting(delay = 0) {
  if (!soundOn || !audio) return
  const start = audio.currentTime + delay
  const hits = [
    [52, 0, 0.22],
    [52, 0.3, 0.22],
    [46, 0.62, 1.3],
  ]
  for (const [root, at, length] of hits) {
    const t = start + at
    const soften = audio.createBiquadFilter()
    const volume = audio.createGain()
    soften.type = 'lowpass'
    soften.frequency.setValueAtTime(2200, t)
    soften.frequency.exponentialRampToValueAtTime(700, t + length)
    volume.gain.setValueAtTime(0.0001, t)
    volume.gain.exponentialRampToValueAtTime(0.16, t + 0.03)
    volume.gain.setValueAtTime(0.16, t + length * 0.6)
    volume.gain.exponentialRampToValueAtTime(0.0001, t + length)
    soften.connect(volume).connect(audio.destination)
    for (const interval of [0, 3, 6, 12]) {
      const tone = audio.createOscillator()
      tone.type = 'sawtooth'
      tone.frequency.value = 440 * 2 ** ((root + interval - 69) / 12)
      if (length > 1) {
        const vibrato = audio.createOscillator()
        const depth = audio.createGain()
        vibrato.frequency.value = 5.5
        depth.gain.value = tone.frequency.value * 0.012
        vibrato.connect(depth).connect(tone.frequency)
        vibrato.start(t)
        vibrato.stop(t + length + 0.05)
      }
      tone.connect(soften)
      tone.start(t)
      tone.stop(t + length + 0.05)
    }
  }
}

function rattleSound() {
  if (!soundOn || !audio) return
  const now = audio.currentTime
  const source = audio.createBufferSource()
  const band = audio.createBiquadFilter()
  const volume = audio.createGain()
  source.buffer = getNoise()
  band.type = 'bandpass'
  band.frequency.value = 4200
  band.Q.value = 1.4
  volume.gain.setValueAtTime(0.0001, now)
  for (let i = 0; i < 22; i++) {
    const t = now + i * 0.036
    volume.gain.setValueAtTime(0.0001, t)
    volume.gain.exponentialRampToValueAtTime(0.35 * (1 - i / 28), t + 0.005)
    volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
  }
  source.connect(band).connect(volume).connect(audio.destination)
  source.start(now)
  source.stop(now + 0.85)
}

function failSound() {
  if (!soundOn || !audio) return
  const now = audio.currentTime
  const tone = audio.createOscillator()
  const soften = audio.createBiquadFilter()
  const volume = audio.createGain()
  tone.type = 'sawtooth'
  tone.frequency.setValueAtTime(330, now)
  tone.frequency.exponentialRampToValueAtTime(70, now + 0.6)
  soften.type = 'lowpass'
  soften.frequency.value = 1100
  volume.gain.setValueAtTime(0.0001, now)
  volume.gain.exponentialRampToValueAtTime(0.2, now + 0.02)
  volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)
  tone.connect(soften).connect(volume).connect(audio.destination)
  tone.start(now)
  tone.stop(now + 0.7)

  const thud = audio.createOscillator()
  const thudVolume = audio.createGain()
  thud.type = 'sine'
  thud.frequency.setValueAtTime(110, now)
  thud.frequency.exponentialRampToValueAtTime(40, now + 0.25)
  thudVolume.gain.setValueAtTime(0.3, now)
  thudVolume.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
  thud.connect(thudVolume).connect(audio.destination)
  thud.start(now)
  thud.stop(now + 0.32)
}

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

function turnTo(el, target) {
  const prev = Number(el.dataset.a ?? target)
  const angle = prev + ((((target - prev) % 360) + 540) % 360) - 180
  el.dataset.a = angle
  el.style.setProperty('--a', `${angle}deg`)
}

function render() {
  const parts = board.querySelectorAll('.segment')
  for (let i = parts.length; i < snake.length; i++) {
    const el = document.createElement('div')
    el.className = 'segment'
    el.innerHTML = '<i class="tongue"></i>'
    place(el, snake[i])
    board.insertBefore(el, food)
  }
  for (let i = snake.length; i < parts.length; i++) parts[i].remove()
  board.style.setProperty('--len', snake.length)
  board.querySelectorAll('.segment').forEach((el, i) => {
    place(el, snake[i])
    el.style.setProperty('--i', i)
    el.classList.toggle('head', i === 0)
    el.classList.toggle('tail', i === snake.length - 1)
    const [x, y] = snake[i]
    const ahead = snake[i - 1]
    turnTo(el, i === 0 ? DIRS[dir][2] : (Math.atan2(ahead[1] - y, ahead[0] - x) * 180) / Math.PI)
  })
  place(food, apple)
}

const HARD_FROM = 20
const MAX_HOLES = 6
const START_SPEED = 160
const SPEED_STEP = 5
const SPEED_EVERY = 10
const TOP_SPEED = 120
const speedFor = (points) => Math.max(TOP_SPEED, START_SPEED - Math.floor(points / SPEED_EVERY) * SPEED_STEP)
const RESTLESS_FROM = 30
const RUNNERS_FROM = 40
const WAVES_FROM = 50
const BIG_WAVES_FROM = 70
let runners = []
const START_POINTS = Math.min(400, Math.max(0, Math.floor(Number(new URLSearchParams(location.search).get('points')) || 0)))
let holes = []
const holeAt = ([x, y]) => holes.find((h) => h.x === x && h.y === y)
const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const taken = ([x, y]) => x < 0 || y < 0 || x >= SIZE || y >= SIZE || snake.some((c) => c[0] === x && c[1] === y) || !!holeAt([x, y])
const blockedSides = ([x, y]) => NEIGHBORS.filter(([dx, dy]) => taken([x + dx, y + dy])).length
const pick = (cells) => cells[Math.floor(Math.random() * cells.length)]

function holeSpot() {
  const [hx, hy] = snake[0]
  const spots = []
  for (let x = 0; x < SIZE; x++)
    for (let y = 0; y < SIZE; y++)
      if (!taken([x, y]) && !(apple && same([x, y], apple)) && Math.abs(x - hx) + Math.abs(y - hy) > 4) spots.push([x, y])
  return spots.length ? pick(spots) : null
}

function relocateHoles() {
  const waiting = new Set(runners.filter((r) => r.wait > 0).map((r) => r.hole))
  for (const hole of holes) {
    if (waiting.has(hole)) continue
    const spot = holeSpot()
    if (!spot) continue
    ;[hole.x, hole.y] = spot
    place(hole.el, spot)
    delete hole.el.dataset.out
    setSize(hole, 'small', randInt(6, 14))
    hole.el.classList.remove('dug')
    void hole.el.offsetWidth
    hole.el.classList.add('dug')
  }
}

function addHole() {
  const spot = holeSpot()
  if (!spot) return
  const [x, y] = spot
  const el = document.createElement('div')
  el.className = 'hole'
  el.innerHTML = '<i class="pop"><i class="ear"></i><i class="ear"></i><i class="face"></i></i>'
  el.style.setProperty('--glint-delay', `${(Math.random() * 4).toFixed(2)}s`)
  place(el, [x, y])
  board.insertBefore(el, board.firstChild)
  const hole = { x, y, el }
  setSize(hole, 'small', randInt(4, 14))
  holes.push(hole)
}

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1))

function setSize(hole, size, ticks) {
  hole.size = size
  hole.timer = ticks
  hole.el.dataset.size = size
}

function updateBurrows() {
  for (const hole of holes) {
    if (--hole.timer > 0) continue
    if (hole.size === 'small') setSize(hole, 'growing', 3)
    else if (hole.size === 'growing') setSize(hole, 'big', randInt(6, 10))
    else setSize(hole, 'small', randInt(10, 20))
  }
}

const bigHoleNear = ([x, y]) => holes.find((h) => h.size === 'big' && Math.abs(h.x - x) + Math.abs(h.y - y) === 1)

function squeak() {
  if (!soundOn || !audio) return
  const now = audio.currentTime
  for (let i = 0; i < 4; i++) {
    const t = now + i * 0.07
    const tone = audio.createOscillator()
    const volume = audio.createGain()
    tone.type = 'square'
    tone.frequency.setValueAtTime(1500 + (i % 2) * 400, t)
    tone.frequency.exponentialRampToValueAtTime(900, t + 0.05)
    volume.gain.setValueAtTime(0.0001, t)
    volume.gain.exponentialRampToValueAtTime(0.08, t + 0.005)
    volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.055)
    tone.connect(volume).connect(audio.destination)
    tone.start(t)
    tone.stop(t + 0.06)
  }
}

let caughtTimer = null

function mongooseWins() {
  clearInterval(timer)
  music.stop()
  squeak()
  setState('caught', 'The mongoose caught the snake')
  caughtTimer = setTimeout(() => over('mongoose'), 1600)
}

function caught() {
  const hole = holeAt(snake[0]) ?? bigHoleNear(snake[0])
  if (hole) {
    hole.el.dataset.out = ''
    mongooseWins()
    return true
  }
  const runner = runners.find((r) => r.el && snake.some((c) => same(c, [r.x, r.y])))
  if (runner) {
    runner.el.dataset.attack = ''
    mongooseWins()
    return true
  }
  return false
}

const RUNNER_TURN = { right: [0, 1], left: [0, -1], up: [0, 1], down: [180, 1] }
const SIDE_VIEW = '<i class="turn"><i class="m-fur"></i></i>'
const TOP_VIEW = '<i class="turn top"><i class="t-tail"></i><i class="t-leg"></i><i class="t-leg"></i><i class="t-leg"></i><i class="t-leg"></i><i class="t-body"></i><i class="t-head"></i></i>'

function spawnRunner(wave = false) {
  const ready = holes.filter((h) => !runners.some((r) => r.hole === h))
  if (!ready.length) return
  const hole = pick(ready)
  const ways = Object.keys(DIRS).filter((d) => {
    const [dx, dy] = DIRS[d]
    const [x, y] = [hole.x + dx * 4, hole.y + dy * 4]
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE
  })
  hole.el.dataset.warn = ''
  runners.push({ hole, x: hole.x, y: hole.y, d: pick(ways), wait: wave ? 3 : 5, el: null })
}

function moveRunners() {
  for (const r of runners) {
    if (r.wait > 0) {
      if (--r.wait > 0) continue
      delete r.hole.el.dataset.warn
      r.el = document.createElement('div')
      r.el.className = 'runner'
      r.el.innerHTML = r.d === 'up' || r.d === 'down' ? TOP_VIEW : SIDE_VIEW
      const [angle, flip] = RUNNER_TURN[r.d]
      r.el.style.setProperty('--r', `${angle}deg`)
      r.el.style.setProperty('--flip', flip)
      place(r.el, [r.x, r.y])
      board.insertBefore(r.el, food)
      continue
    }
    const [dx, dy] = DIRS[r.d]
    const [x, y] = [r.x + dx, r.y + dy]
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) {
      r.done = true
      r.el.classList.add('gone')
      const el = r.el
      setTimeout(() => el.remove(), 300)
      continue
    }
    r.x = x
    r.y = y
    place(r.el, [x, y])
  }
  runners = runners.filter((r) => !r.done)
}

function stage(points) {
  game.classList.toggle('restless', points >= RESTLESS_FROM)
}

function newApple() {
  const free = []
  for (let x = 0; x < SIZE; x++) for (let y = 0; y < SIZE; y++) if (!taken([x, y])) free.push([x, y])
  if (Number(score.dataset.score) < HARD_FROM) return pick(free)

  const [hx, hy] = snake[0]
  const away = free.filter(([x, y]) => Math.abs(x - hx) + Math.abs(y - hy) > 3)
  const tight = away.filter((c) => blockedSides(c) === 2)
  const edges = away.filter((c) => blockedSides(c) === 1)
  return pick(tight.length ? tight : edges.length ? edges : free)
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
  lastStep = 0
  previous = null
  atWall = 0
  score.dataset.score = START_POINTS
  speed = speedFor(START_POINTS)
  delete game.dataset.mood
  delete game.dataset.cause
  clearTimeout(caughtTimer)
  laugh.pause()
  holes.forEach((h) => h.el.remove())
  holes = []
  runners.forEach((r) => r.el?.remove())
  runners = []
  stage(START_POINTS)
  music.setMood('normal', true)
  if (START_POINTS >= HARD_FROM) {
    game.dataset.mood = 'sinister'
    music.setMood('sinister', true)
    const count = Math.min(MAX_HOLES, 3 + Math.floor((START_POINTS - HARD_FROM) / 10))
    for (let i = 0; i < count; i++) addHole()
  }
  apple = newApple()
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
  stage(points)
  if (points === HARD_FROM) {
    villainSting(0.8)
    game.dataset.mood = 'sinister'
    music.setMood('sinister')
    for (let i = 0; i < 3; i++) addHole()
  } else if (points > HARD_FROM) {
    relocateHoles()
    if (points % 10 === 0 && holes.length < MAX_HOLES) addHole()
  }
  if (MILESTONES.includes(points)) {
    rattleSound()
    game.classList.add('rattling')
    setTimeout(() => game.classList.remove('rattling'), 900)
  } else {
    chirp()
  }
  apple = newApple()
  game.classList.remove('ate')
  void game.offsetWidth
  game.classList.add('ate')
  if (speedFor(points) !== speed) {
    speed = speedFor(points)
    game.style.setProperty('--speed', `${speed}ms`)
    restartTimer()
  }
}

const WALL_GRACE = 2

function advance(move) {
  atWall = 0
  game.classList.remove('edge')
  snake = move.cells
  if (move.eats) eat()
  render()
  return caught()
}

function tick() {
  lastStep = performance.now()
  const next = queue.shift()
  if (next) dir = next
  const move = attempt(snake, dir)

  if (move.blocked === 'wall' && atWall < WALL_GRACE) {
    atWall++
    previous = null
    game.classList.add('edge')
    return render()
  }
  if (move.blocked) return over(move.blocked === 'wall' ? 'wire' : undefined)

  previous = move.eats ? null : snake
  if (advance(move)) return
  if (Number(score.dataset.score) >= RESTLESS_FROM) {
    updateBurrows()
    if (caught()) return
  }
  const points = Number(score.dataset.score)
  if (points >= RUNNERS_FROM) {
    const wave = points >= WAVES_FROM
    if (!runners.length && Math.random() < (wave ? 1 / 12 : 1 / 22)) {
      const count = !wave ? 1 : points >= BIG_WAVES_FROM ? 3 : 2
      for (let i = 0; i < count; i++) spawnRunner(wave)
    }
    moveRunners()
    caught()
  }
}

function over(cause) {
  if (cause) game.dataset.cause = cause
  clearInterval(timer)
  music.stop()
  if (cause !== 'mongoose' || !playLaugh()) failSound()
  game.classList.remove('edge', 'rattling')
  const points = Number(score.dataset.score)
  if (points > best && !START_POINTS) {
    best = points
    score.dataset.best = best
    safe(() => localStorage.setItem('css-snake-best', best))
  }
  setState('over', `Game over. Score ${points}.`)
}

function play() {
  audio ??= safe(() => new AudioContext())
  audio?.resume()
  if (game.dataset.state === 'playing' || game.dataset.state === 'caught') return
  if (game.dataset.state !== 'paused') {
    reset()
    music.reset()
  }
  setState('playing')
  music.start()
  restartTimer()
}

function pause() {
  if (game.dataset.state !== 'playing') return
  clearInterval(timer)
  music.stop()
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
  caught()
  return true
}

function turn(to) {
  if (game.dataset.state !== 'playing') return play()
  const last = queue.at(-1) ?? dir
  const [lx, ly] = DIRS[last]
  const [tx, ty] = DIRS[to]
  if (to === last || (lx + tx === 0 && ly + ty === 0)) return
  if (atWall && !queue.length) {
    const move = attempt(snake, to)
    if (!move.blocked) {
      dir = to
      previous = null
      lastStep = performance.now()
      if (!advance(move)) restartTimer()
      return
    }
  }
  if (redoLastStep(to)) return
  if (queue.length < 2) queue.push(to)
}

function restart() {
  clearInterval(timer)
  music.stop()
  setState('ready')
  play()
}

document.addEventListener('keydown', (e) => {
  if ((e.key === ' ' || e.key === 'Enter') && e.target.closest('.controls button, .pad button')) return
  const to = KEYS[e.key] ?? KEYS[e.key.toLowerCase()]
  if (to) {
    e.preventDefault()
    turn(to)
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    game.dataset.state === 'playing' ? pause() : play()
  }
})

document.querySelector('.overlay').addEventListener('click', () => performance.now() - tapPausedAt > 400 && play())
document.querySelectorAll('.controls button, .pad button, .overlay').forEach((b) => b.addEventListener('pointerdown', (e) => e.preventDefault()))
document.querySelector('.pause-btn').addEventListener('click', () => (game.dataset.state === 'playing' ? pause() : play()))
document.querySelector('.restart-btn').addEventListener('click', restart)
const musicButton = document.querySelector('.music-btn')
musicButton.setAttribute('aria-pressed', music.isOn())
const volume = document.querySelector('.volume')
volume.value = music.volume()
volume.addEventListener('input', () => music.setVolume(volume.value))
musicButton.addEventListener('click', () => {
  audio ??= safe(() => new AudioContext())
  audio?.resume()
  musicButton.setAttribute('aria-pressed', music.toggle())
})
soundButton.addEventListener('click', () => {
  soundOn = !soundOn
  soundButton.setAttribute('aria-pressed', soundOn)
  safe(() => localStorage.setItem('css-snake-sound', soundOn ? 'on' : 'off'))
})
document.querySelectorAll('[data-dir]').forEach((b) => b.addEventListener('click', () => turn(b.dataset.dir)))

let touch = null
let tapPausedAt = -Infinity
board.addEventListener('pointerdown', (e) => (touch = [e.clientX, e.clientY]))
board.addEventListener('pointerup', (e) => {
  if (!touch) return
  const dx = e.clientX - touch[0]
  const dy = e.clientY - touch[1]
  touch = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) {
    if (game.dataset.state === 'playing') {
      pause()
      tapPausedAt = performance.now()
    }
    return
  }
  turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
})

document.addEventListener('visibilitychange', () => document.hidden && pause())

reset()
