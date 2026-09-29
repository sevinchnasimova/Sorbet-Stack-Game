/* Sorbet Stack - vanilla JS, no dependencies. */
(function () {
  'use strict';

  var COLS = 10;
  var ROWS = 20;

  var COLORS = {
    I: '#aedff7',
    O: '#fff3b0',
    T: '#e4c1f9',
    S: '#b5ead7',
    Z: '#ffb3ba',
    J: '#bae1ff',
    L: '#ffdfba'
  };

  var SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
  };
  var KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  function createBoard() {
    var b = [];
    for (var r = 0; r < ROWS; r++) {
      b.push(new Array(COLS).fill(null));
    }
    return b;
  }

  function randomKey() {
    return KEYS[Math.floor(Math.random() * KEYS.length)];
  }

  function makePiece(key) {
    return {
      key: key,
      matrix: SHAPES[key].map(function (row) { return row.slice(); }),
      x: 3,
      y: key === 'I' ? -1 : 0
    };
  }

  function rotateMatrix(m) {
    var n = m.length;
    var out = [];
    for (var y = 0; y < n; y++) {
      out.push(new Array(n).fill(0));
      for (var x = 0; x < n; x++) {
        out[y][x] = m[n - 1 - x][y];
      }
    }
    return out;
  }

  function collide(board, matrix, px, py) {
    for (var y = 0; y < matrix.length; y++) {
      for (var x = 0; x < matrix[y].length; x++) {
        if (!matrix[y][x]) continue;
        var bx = px + x;
        var by = py + y;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >= 0 && board[by][bx]) return true;
      }
    }
    return false;
  }

  function merge(board, piece) {
    var m = piece.matrix;
    for (var y = 0; y < m.length; y++) {
      for (var x = 0; x < m[y].length; x++) {
        if (!m[y][x]) continue;
        var by = piece.y + y;
        var bx = piece.x + x;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          board[by][bx] = piece.key;
        }
      }
    }
  }

  function clearLines(board) {
    var cleared = 0;
    for (var y = ROWS - 1; y >= 0; y--) {
      var full = board[y].every(function (c) { return c !== null; });
      if (full) {
        board.splice(y, 1);
        board.unshift(new Array(COLS).fill(null));
        cleared++;
        y++;
      }
    }
    return cleared;
  }

  function loadBest() {
    try {
      if (typeof localStorage !== 'undefined') {
        var v = parseInt(localStorage.getItem('sorbet-stack-best'), 10);
        return isNaN(v) ? 0 : v;
      }
    } catch (e) { /* private mode etc: best score just won't persist */ }
    return 0;
  }

  function saveBest(v) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sorbet-stack-best', String(v));
      }
    } catch (e) { /* ignore */ }
  }

  function formatTime(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  var state = {
    board: createBoard(),
    current: makePiece(randomKey()),
    next: makePiece(randomKey()),
    holdKey: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    best: loadBest(),
    newBest: false,
    running: false,
    paused: false,
    over: false,
    dropCounter: 0,
    lastTime: 0,
    startTime: 0,
    endTime: 0,
    flashText: '',
    flashUntil: 0
  };

  function dropInterval() {
    return Math.max(120, 800 - (state.level - 1) * 70);
  }

  function reset() {
    state.board = createBoard();
    state.current = makePiece(randomKey());
    state.next = makePiece(randomKey());
    state.holdKey = null;
    state.canHold = true;
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.newBest = false;
    state.over = false;
    state.paused = false;
    state.dropCounter = 0;
    state.lastTime = 0;
    state.startTime = 0;
    state.endTime = 0;
    state.flashText = '';
    state.flashUntil = 0;
  }

  function gameOver() {
    state.over = true;
    state.running = false;
    state.endTime = Date.now();
    if (state.score > state.best) {
      state.best = state.score;
      state.newBest = true;
      saveBest(state.best);
    }
    Sfx.play('over');
  }

  function spawn() {
    state.current = state.next;
    state.next = makePiece(randomKey());
    state.current.x = 3;
    state.current.y = state.current.key === 'I' ? -1 : 0;
    if (collide(state.board, state.current.matrix, state.current.x, state.current.y)) {
      gameOver();
    }
  }

  function scoreFor(cleared) {
    return [0, 40, 100, 300, 1200][cleared] * state.level;
  }

  function lockPiece() {
    merge(state.board, state.current);
    state.canHold = true;
    var cleared = clearLines(state.board);
    if (cleared > 0) {
      state.score += scoreFor(cleared);
      state.lines += cleared;
      var nl = Math.floor(state.lines / 10) + 1;
      if (nl !== state.level) {
        state.level = nl;
        state.flashText = 'Level ' + nl + '!';
        state.flashUntil = Date.now() + 1600;
        Music.setLevel(nl);
        Sfx.play('level');
      }
      Sfx.play('clear');
    } else {
      Sfx.play('lock');
    }
    spawn();
  }

  function holdPiece() {
    if (!state.running || state.paused || state.over || !state.canHold) return;
    Sfx.play('hold');
    state.canHold = false;
    if (!state.holdKey) {
      state.holdKey = state.current.key;
      spawn();
    } else {
      var k = state.current.key;
      state.current = makePiece(state.holdKey);
      state.holdKey = k;
      if (collide(state.board, state.current.matrix, state.current.x, state.current.y)) {
        gameOver();
      }
    }
  }

  function ghostY() {
    var p = state.current;
    var y = p.y;
    while (!collide(state.board, p.matrix, p.x, y + 1)) y++;
    return y;
  }

  function move(dx) {
    var p = state.current;
    if (!collide(state.board, p.matrix, p.x + dx, p.y)) p.x += dx;
  }

  function softDrop() {
    var p = state.current;
    if (!collide(state.board, p.matrix, p.x, p.y + 1)) {
      p.y++;
      state.score += 1;
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    var p = state.current;
    while (!collide(state.board, p.matrix, p.x, p.y + 1)) {
      p.y++;
      state.score += 2;
    }
    lockPiece();
  }

  function rotateCurrent() {
    var p = state.current;
    var next = rotateMatrix(p.matrix);
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) {
      if (!collide(state.board, next, p.x + kicks[i], p.y)) {
        p.matrix = next;
        p.x += kicks[i];
        Sfx.play('rotate');
        return;
      }
    }
  }

  /* ---- Background music: tiny WebAudio chiptune loops, no audio files.
     Two tracks that alternate as the level rises, and the tempo quickens
     with the level. ---- */
  var Music = {
    ctx: null,
    timer: null,
    step: 0,
    on: false,
    volume: 0.7,
    trackIndex: 0,
    tracks: [
      {
        tempo: 220,
        melody: [523, 659, 784, 659, 880, 784, 659, 523, 587, 784, 659, 587, 523, 0, 523, 0],
        bass: [131, 0, 196, 0, 174, 0, 196, 0, 131, 0, 196, 0, 196, 0, 131, 0]
      },
      {
        tempo: 200,
        melody: [392, 523, 659, 523, 698, 659, 523, 392, 440, 659, 587, 523, 494, 523, 0, 0],
        bass: [98, 0, 147, 0, 165, 0, 147, 0, 110, 0, 147, 0, 131, 0, 98, 0]
      }
    ],
    toggle: function () {
      if (this.on) { this.stop(); return false; }
      this.start(); return true;
    },
    ensureCtx: function () {
      if (!this.ctx) {
        var AC = (typeof window !== 'undefined') &&
          (window.AudioContext || window.webkitAudioContext);
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    current: function () {
      return this.tracks[this.trackIndex % this.tracks.length];
    },
    intervalMs: function (level) {
      return Math.max(140, this.current().tempo - (level - 1) * 12);
    },
    setLevel: function (level) {
      this.trackIndex = (level - 1) % this.tracks.length;
      if (this.on) this.restart(level);
    },
    restart: function (level) {
      var self = this;
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(function () { self.playStep(); }, this.intervalMs(level));
    },
    start: function () {
      var ctx = this.ensureCtx();
      if (!ctx) return;
      this.on = true;
      this.step = 0;
      this.restart(typeof state !== 'undefined' ? state.level : 1);
    },
    stop: function () {
      this.on = false;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    },
    playStep: function () {
      if (!this.on || !this.ctx) return;
      var track = this.current();
      var i = this.step % 16;
      this.tone(track.melody[i], 0.18, 'triangle', 0.08);
      this.tone(track.bass[i], 0.2, 'sine', 0.1);
      this.step++;
    },
    tone: function (freq, dur, type, vol) {
      if (!freq || this.volume <= 0) return;
      var ctx = this.ctx;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol * this.volume, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    }
  };

  /* ---- Sound effects: short synthesized blips sharing the music context. ---- */
  var Sfx = {
    play: function (name) {
      if (typeof window === 'undefined') return;
      var ctx = Music.ensureCtx();
      if (!ctx || Music.volume <= 0) return;
      var seq = {
        rotate: [[600, 0.05]],
        lock: [[220, 0.08]],
        hold: [[440, 0.07]],
        clear: [[523, 0.09], [659, 0.09], [784, 0.14]],
        level: [[880, 0.1], [1174, 0.16]],
        over: [[392, 0.15], [330, 0.15], [262, 0.3]]
      }[name] || [];
      var t = ctx.currentTime;
      for (var i = 0; i < seq.length; i++) {
        this.blip(ctx, seq[i][0], seq[i][1], t + i * 0.09);
      }
    },
    blip: function (ctx, freq, dur, at) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.05 * Music.volume, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(at);
      o.stop(at + dur);
    }
  };

  function drawCell(ctx, x, y, size, key) {
    ctx.fillStyle = COLORS[key] || '#ddd';
    ctx.fillRect(x * size, y * size, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
  }

  function update(dt) {
    if (!state.running || state.paused || state.over) return;
    state.dropCounter += dt;
    if (state.dropCounter >= dropInterval()) {
      state.dropCounter = 0;
      softDrop();
      if (typeof document !== 'undefined') render();
    }
  }

  function drawMini(id, key, matrix) {
    var c = document.getElementById(id);
    if (!c || !key || !matrix) return;
    var g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    var ns = id === 'hold' ? 22 : 26;
    var ox = (c.width - matrix[0].length * ns) / 2;
    var oy = (c.height - matrix.length * ns) / 2;
    g.save();
    g.translate(ox, oy);
    for (var y = 0; y < matrix.length; y++) {
      for (var x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          g.fillStyle = COLORS[key];
          g.fillRect(x * ns, y * ns, ns, ns);
          g.strokeStyle = 'rgba(255,255,255,0.9)';
          g.strokeRect(x * ns + 1, y * ns + 1, ns - 2, ns - 2);
        }
      }
    }
    g.restore();
  }

  function render() {
    var board = document.getElementById('board');
    var nextC = document.getElementById('next');
    if (!board || !nextC) return;
    var ctx = board.getContext('2d');
    var size = board.width / COLS;
    ctx.clearRect(0, 0, board.width, board.height);
    ctx.fillStyle = '#fffdfb';
    ctx.fillRect(0, 0, board.width, board.height);
    var y, x;
    for (y = 0; y < ROWS; y++) {
      for (x = 0; x < COLS; x++) {
        if (state.board[y][x]) drawCell(ctx, x, y, size, state.board[y][x]);
      }
    }
    var p = state.current;
    var gy = ghostY();
    if (gy !== p.y && !state.over) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      for (y = 0; y < p.matrix.length; y++) {
        for (x = 0; x < p.matrix[y].length; x++) {
          if (p.matrix[y][x] && gy + y >= 0) drawCell(ctx, p.x + x, gy + y, size, p.key);
        }
      }
      ctx.restore();
    }
    for (y = 0; y < p.matrix.length; y++) {
      for (x = 0; x < p.matrix[y].length; x++) {
        if (p.matrix[y][x] && p.y + y >= 0) drawCell(ctx, p.x + x, p.y + y, size, p.key);
      }
    }
    if (state.flashText && Date.now() < state.flashUntil) {
      ctx.save();
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      var bw = board.width - 60;
      ctx.fillStyle = 'rgba(217,123,158,0.92)';
      ctx.fillRect(30, board.height / 2 - 30, bw, 56);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(state.flashText, board.width / 2, board.height / 2 + 8);
      ctx.restore();
    }
    drawMini('next', state.next.key, state.next.matrix);
    if (state.holdKey) {
      drawMini('hold', state.holdKey, SHAPES[state.holdKey]);
    } else {
      var holdC = document.getElementById('hold');
      if (holdC) holdC.getContext('2d').clearRect(0, 0, holdC.width, holdC.height);
    }
    document.getElementById('score').textContent = String(state.score);
    document.getElementById('lines').textContent = String(state.lines);
    document.getElementById('level').textContent = String(state.level);
    var bestEl = document.getElementById('best');
    if (bestEl) bestEl.textContent = String(state.best);
    var overlay = document.getElementById('overlay');
    var otext = document.getElementById('overlay-text');
    var obtn = document.getElementById('overlay-btn');
    var ostats = document.getElementById('overlay-stats');
    if (state.over) {
      var ms = (state.endTime || Date.now()) - (state.startTime || Date.now());
      otext.textContent = 'Game over';
      if (ostats) {
        ostats.textContent = 'Score ' + state.score + ' · Lines ' + state.lines +
          ' · Level ' + state.level + ' · Time ' + formatTime(ms) +
          (state.newBest ? ' · New best!' : ' · Best ' + state.best);
      }
      if (obtn) obtn.textContent = 'Play again';
      overlay.classList.remove('hidden');
    } else if (state.paused) {
      otext.textContent = 'Paused — score ' + state.score;
      if (ostats) ostats.textContent = '';
      if (obtn) obtn.textContent = 'Resume';
      overlay.classList.remove('hidden');
    } else if (!state.running) {
      otext.textContent = 'Press Start';
      if (ostats) ostats.textContent = state.best > 0 ? 'Best ' + state.best : '';
      if (obtn) obtn.textContent = 'Start';
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  function loop(t) {
    if (state.paused) return;
    if (!state.lastTime) state.lastTime = t;
    var dt = t - state.lastTime;
    state.lastTime = t;
    update(dt);
    if (typeof document !== 'undefined') render();
    if (state.running && !state.paused) requestAnimationFrame(loop);
  }

  function resume() {
    if (!state.running || !state.paused) return;
    state.paused = false;
    state.dropCounter = 0;
    state.lastTime = 0;
    if (typeof document !== 'undefined') {
      var pb = document.getElementById('pause-btn');
      if (pb) pb.textContent = 'Pause';
      render();
      requestAnimationFrame(loop);
    }
  }

  function start() {
    reset();
    state.running = true;
    state.startTime = Date.now();
    Music.setLevel(1);
    if (typeof document !== 'undefined') {
      var pb = document.getElementById('pause-btn');
      if (pb) pb.textContent = 'Pause';
      render();
      requestAnimationFrame(loop);
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      render();
      document.getElementById('start-btn').addEventListener('click', start);
      document.getElementById('overlay-btn').addEventListener('click', function () {
        if (state.running && state.paused) { resume(); return; }
        start();
      });
      document.getElementById('pause-btn').addEventListener('click', function () {
        if (!state.running || state.over) return;
        if (state.paused) { resume(); return; }
        state.paused = true;
        this.textContent = 'Resume';
        render();
      });
      var musicBtn = document.getElementById('music-btn');
      musicBtn.addEventListener('click', function () {
        var isOn = Music.toggle();
        musicBtn.textContent = isOn ? 'Music: On' : 'Music: Off';
        musicBtn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'p' || e.key === 'P') {
          if (state.running && !state.over) {
            if (state.paused) { resume(); }
            else {
              state.paused = true;
              document.getElementById('pause-btn').textContent = 'Resume';
              render();
            }
          }
          return;
        }
        if (e.key === 'r' || e.key === 'R') { start(); return; }
        if (!state.running || state.paused || state.over) return;
        if (e.key === 'ArrowLeft') { move(-1); }
        else if (e.key === 'ArrowRight') { move(1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); softDrop(); }
        else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') { rotateCurrent(); }
        else if (e.key === ' ') { e.preventDefault(); hardDrop(); }
        else if (e.key === 'c' || e.key === 'C') { holdPiece(); }
        render();
      });
      document.querySelectorAll('.touch-controls button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!state.running || state.paused || state.over) return;
          var k = btn.getAttribute('data-k');
          if (k === 'left') move(-1);
          else if (k === 'right') move(1);
          else if (k === 'down') softDrop();
          else if (k === 'rotate') rotateCurrent();
          else if (k === 'drop') hardDrop();
          render();
        });
      });
      var vol = document.getElementById('volume');
      if (vol) {
        vol.addEventListener('input', function () {
          Music.volume = vol.value / 100;
        });
      }
      document.addEventListener('visibilitychange', function () {
        if (document.hidden && state.running && !state.paused && !state.over) {
          state.paused = true;
          var apb = document.getElementById('pause-btn');
          if (apb) apb.textContent = 'Resume';
          render();
        }
      });
      var bc = document.getElementById('board');
      var swX = 0, swY = 0, swT = 0;
      bc.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0];
        swX = t.clientX; swY = t.clientY; swT = Date.now();
      }, { passive: true });
      bc.addEventListener('touchend', function (e) {
        if (!state.running || state.paused || state.over) return;
        if (typeof e.preventDefault === 'function') e.preventDefault();
        var t = e.changedTouches[0];
        var dx = t.clientX - swX;
        var dy = t.clientY - swY;
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
          if (Date.now() - swT < 400) rotateCurrent();
        } else if (Math.abs(dx) > Math.abs(dy)) {
          var n = Math.max(1, Math.round(Math.abs(dx) / 36));
          var s = dx > 0 ? 1 : -1;
          for (var i = 0; i < n; i++) move(s);
        } else if (dy > 24) {
          if (dy > 90) { hardDrop(); }
          else {
            var m2 = Math.max(1, Math.round(dy / 36));
            for (var j = 0; j < m2 && !state.paused && !state.over; j++) softDrop();
          }
        }
        render();
      });
    });
  }

  var api = {
    COLS: COLS, ROWS: ROWS, COLORS: COLORS, SHAPES: SHAPES,
    createBoard: createBoard, makePiece: makePiece, rotateMatrix: rotateMatrix,
    collide: collide, merge: merge, clearLines: clearLines,
    state: state, reset: reset, spawn: spawn, move: move,
    softDrop: softDrop, hardDrop: hardDrop, rotateCurrent: rotateCurrent,
    holdPiece: holdPiece, ghostY: ghostY, gameOver: gameOver,
    update: update, scoreFor: scoreFor, Music: Music, Sfx: Sfx,
    start: start, resume: resume, loop: loop,
    loadBest: loadBest, saveBest: saveBest, formatTime: formatTime
  };
  if (typeof window !== 'undefined') {
    window.SorbetStack = api;
    window.PastelTetris = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
