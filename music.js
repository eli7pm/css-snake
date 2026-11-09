const music = (() => {
  const STEPS = 32
  const _ = null
  const SONGS = {
    normal: {
      bass: [40, _, 52, _, 40, _, _, 43, _, 45, _, 40, 50, _, 47, _, 40, _, 52, _, 40, _, _, 43, _, 45, _, 47, _, 50, 52, _],
      stabs: { 6: [64, 68, 74], 14: [64, 68, 74], 18: [62, 67, 71], 22: [64, 68, 74], 26: [67, 71, 76], 30: [69, 73, 79] },
      lead: {},
      kick: new Set([0, 7, 10, 16, 23, 26, 28]),
      snare: new Set([4, 12, 20, 28]),
      snareTone: 1800,
    },
    sinister: {
      bass: [40, _, 40, 41, _, 40, _, 46, 45, _, 44, _, 43, _, 42, _, 40, _, 40, 41, _, 40, _, 46, 47, _, 46, _, 45, 44, 43, _],
      stabs: { 6: [64, 67, 70], 14: [63, 66, 69], 22: [64, 67, 70], 30: [65, 68, 71] },
      lead: { 0: [76, 6], 8: [75, 6], 16: [79, 5], 22: [70, 8] },
      kick: new Set([0, 3, 10, 16, 19, 26]),
      snare: new Set([4, 12, 20, 28, 30]),
      snareTone: 900,
    },
  }
  const OPEN_HAT = new Set([14, 30])

  let on = true
  let volume = 50
  try {
    on = localStorage.getItem('css-snake-music') !== 'off'
    volume = Number(localStorage.getItem('css-snake-music-volume') ?? 50)
  } catch {}
  const level = () => (volume / 100) * 0.32
  let running = false
  let step = 0
  let bar = 0
  let nextTime = 0
  let scheduler = null
  let mood = 'normal'
  let nextMood = 'normal'
  let out = null
  let hiss = null

  const hz = (note) => 440 * 2 ** ((note - 69) / 12)
  const stepLength = () => 60 / 128 / 4

  function output() {
    if (!out) {
      out = audio.createGain()
      out.gain.value = level()
      out.connect(audio.destination)
    }
    return out
  }

  function noiseBuffer() {
    if (!hiss) {
      hiss = audio.createBuffer(1, audio.sampleRate / 2, audio.sampleRate)
      const data = hiss.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    }
    return hiss
  }

  function fm(note, time, length, { ratio, index, decay, level, attack = 0.005 }) {
    const carrier = audio.createOscillator()
    const modulator = audio.createOscillator()
    const depth = audio.createGain()
    const volume = audio.createGain()
    const f = hz(note)
    carrier.frequency.value = f
    modulator.frequency.value = f * ratio
    depth.gain.setValueAtTime(f * index, time)
    depth.gain.exponentialRampToValueAtTime(f * 0.2 + 1, time + decay)
    volume.gain.setValueAtTime(0.0001, time)
    volume.gain.exponentialRampToValueAtTime(level, time + attack)
    volume.gain.exponentialRampToValueAtTime(0.0001, time + length)
    modulator.connect(depth).connect(carrier.frequency)
    carrier.connect(volume).connect(output())
    modulator.start(time)
    carrier.start(time)
    modulator.stop(time + length + 0.05)
    carrier.stop(time + length + 0.05)
  }

  function drum(time, { from, to, length, level, filter, freq }) {
    if (filter) {
      const source = audio.createBufferSource()
      const shape = audio.createBiquadFilter()
      const volume = audio.createGain()
      source.buffer = noiseBuffer()
      shape.type = filter
      shape.frequency.value = freq
      volume.gain.setValueAtTime(level, time)
      volume.gain.exponentialRampToValueAtTime(0.0001, time + length)
      source.connect(shape).connect(volume).connect(output())
      source.start(time)
      source.stop(time + length + 0.02)
      return
    }
    const tone = audio.createOscillator()
    const volume = audio.createGain()
    tone.frequency.setValueAtTime(from, time)
    tone.frequency.exponentialRampToValueAtTime(to, time + length)
    volume.gain.setValueAtTime(level, time)
    volume.gain.exponentialRampToValueAtTime(0.0001, time + length)
    tone.connect(volume).connect(output())
    tone.start(time)
    tone.stop(time + length + 0.02)
  }

  function boing(time) {
    const tone = audio.createOscillator()
    const wobble = audio.createOscillator()
    const wobbleDepth = audio.createGain()
    const volume = audio.createGain()
    tone.type = 'triangle'
    tone.frequency.setValueAtTime(180, time)
    tone.frequency.exponentialRampToValueAtTime(620, time + 0.35)
    wobble.frequency.value = 14
    wobbleDepth.gain.value = 40
    volume.gain.setValueAtTime(0.0001, time)
    volume.gain.exponentialRampToValueAtTime(0.5, time + 0.02)
    volume.gain.exponentialRampToValueAtTime(0.0001, time + 0.45)
    wobble.connect(wobbleDepth).connect(tone.frequency)
    tone.connect(volume).connect(output())
    wobble.start(time)
    tone.start(time)
    wobble.stop(time + 0.5)
    tone.stop(time + 0.5)
  }

  function theremin(note, time, length) {
    const tone = audio.createOscillator()
    const vibrato = audio.createOscillator()
    const vibratoDepth = audio.createGain()
    const volume = audio.createGain()
    tone.frequency.setValueAtTime(hz(note) * 0.97, time)
    tone.frequency.linearRampToValueAtTime(hz(note), time + 0.12)
    vibrato.frequency.value = 6
    vibratoDepth.gain.value = hz(note) * 0.02
    volume.gain.setValueAtTime(0.0001, time)
    volume.gain.exponentialRampToValueAtTime(0.28, time + 0.1)
    volume.gain.setValueAtTime(0.28, time + length * 0.7)
    volume.gain.exponentialRampToValueAtTime(0.0001, time + length)
    vibrato.connect(vibratoDepth).connect(tone.frequency)
    tone.connect(volume).connect(output())
    vibrato.start(time)
    tone.start(time)
    vibrato.stop(time + length + 0.05)
    tone.stop(time + length + 0.05)
  }

  function wah(time) {
    const tone = audio.createOscillator()
    const volume = audio.createGain()
    tone.type = 'triangle'
    tone.frequency.setValueAtTime(520, time)
    tone.frequency.exponentialRampToValueAtTime(110, time + 0.5)
    volume.gain.setValueAtTime(0.0001, time)
    volume.gain.exponentialRampToValueAtTime(0.45, time + 0.03)
    volume.gain.exponentialRampToValueAtTime(0.0001, time + 0.55)
    tone.connect(volume).connect(output())
    tone.start(time)
    tone.stop(time + 0.6)
  }

  function playStep(i, time) {
    const len = stepLength()
    const song = SONGS[mood]
    if (song.bass[i] !== null) fm(song.bass[i], time, len * 1.8, { ratio: 1, index: 3.5, decay: 0.09, level: 0.9 })
    song.stabs[i]?.forEach((note) => fm(note, time, len * 1.6, { ratio: 1, index: 2.2, decay: 0.25, level: 0.22, attack: 0.02 }))
    if (song.lead[i]) theremin(song.lead[i][0], time, len * song.lead[i][1])
    if (song.kick.has(i)) drum(time, { from: 150, to: 45, length: 0.18, level: 1 })
    if (song.snare.has(i)) drum(time, { filter: 'bandpass', freq: song.snareTone, length: 0.14, level: 0.7 })
    if (i % 2 === 0) drum(time, { filter: 'highpass', freq: 7000, length: OPEN_HAT.has(i) ? 0.16 : 0.035, level: 0.35 })
    if (i === STEPS - 4 && bar % 2 === 1) (mood === 'sinister' ? wah : boing)(time)
  }

  function schedule() {
    while (nextTime < audio.currentTime + 0.12) {
      const swing = step % 2 === 1 ? stepLength() * 0.18 : 0
      playStep(step, nextTime + swing)
      nextTime += stepLength()
      step = (step + 1) % STEPS
      if (step === 0) {
        bar++
        mood = nextMood
      }
    }
  }

  function start() {
    if (!on || !audio || running) return
    running = true
    nextTime = audio.currentTime + 0.05
    schedule()
    scheduler = setInterval(schedule, 25)
  }

  function stop() {
    running = false
    clearInterval(scheduler)
  }

  function toggle() {
    on = !on
    try {
      localStorage.setItem('css-snake-music', on ? 'on' : 'off')
    } catch {}
    if (on && game.dataset.state === 'playing') start()
    else stop()
    return on
  }

  function setVolume(value) {
    volume = Math.min(100, Math.max(0, Number(value) || 0))
    out?.gain.setTargetAtTime(level(), audio.currentTime, 0.05)
    try {
      localStorage.setItem('css-snake-music-volume', volume)
    } catch {}
  }

  function setMood(name, now = false) {
    nextMood = name
    if (now) mood = name
  }

  return { start, stop, toggle, setVolume, setMood, volume: () => volume, isOn: () => on, reset: () => ((step = 0), (bar = 0)) }
})()
