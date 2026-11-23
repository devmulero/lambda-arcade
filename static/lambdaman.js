/* =========================================================================
   GAME 04: LAMBDA-MAN — Modo Infinito Procedural + Maybe + Servant + PostgreSQL
   ========================================================================= */

(function () {
  function mountLambdaManView() {
    if (document.getElementById('lambdamanView')) return;
    const sec = document.createElement('section');
    sec.id = 'lambdamanView';
    sec.className = 'lambdaman-view hidden';
    sec.innerHTML = `
      <canvas id="lambdamanCanvas"></canvas>
      <div class="lm-damage-vignette" id="lmDamageVignette"></div>

      <div class="runner-subhud">
        <div class="subhud-left">
          <div class="stage-tag">
            <span class="stage-num" id="lmStageNum">01</span>
            <span id="lmStageName">Templo 1</span>
          </div>
          <div class="stage-dots-nav" id="lmLevelNav"></div>
        </div>
        <div class="subhud-right">
          <div class="score-strip">
            <span class="chip-tag"><b id="lmChipsVal">0</b></span>
            <span class="times-sep">x</span>
            <span class="mult-tag"><b id="lmMultVal">1</b></span>
            <span class="strip-sep"></span>
            <span class="total-readout">Orbes <b id="lmOrbsVal">0/0</b></span>
            <span class="strip-sep"></span>
            <span class="total-readout">Vidas <b id="lmLivesVal">3</b></span>
          </div>
        </div>
      </div>

      <div class="lm-hud-bar">
        <div class="stepper-bar">
          <button class="step-btn" id="lmStepBackBtn">-1 Passo</button>
          <button class="step-btn" id="lmPauseBtn">Pausa</button>
          <button class="step-btn" id="lmStepFwdBtn">+1 Passo</button>
        </div>
        <div class="lm-decision-pill" id="lmDecisionPill">Decisao: Aguardando</div>
      </div>

      <div class="lm-defeat-banner hidden" id="lmDefeatBanner">
        <h3>Captura no Labirinto!</h3>
        <p id="lmDefeatReason">As sentinelas cercaram o corredor.</p>
        <div class="lm-defeat-diag" id="lmDefeatDiag">Diagnostico...</div>
        <div class="lm-defeat-actions">
          <button class="btn-ghost" id="lmDefeatRewindBtn" style="background:#ebe2d4;color:#272022;border-color:#d4c7b8">Voltar 3 Passos</button>
          <button class="btn-primary" id="lmDefeatRetryBtn" style="flex:none">Reiniciar</button>
        </div>
      </div>

      <section class="logic-dock">
        <div class="workbench-card lm-workbench">
          <div class="editor-col">
            <div class="editor-toolbar">
              <span class="panel-label">NAVEGACAO SEGURA</span>
              <div class="type-xray-bar" id="lmTypeBar"></div>
              <div class="quick-tokens">
                <button class="tok-btn lmtok" data-snip="Just ">Just</button>
                <button class="tok-btn lmtok" data-snip="Nothing">Nothing</button>
                <button class="tok-btn lmtok" data-snip="naoVolta ">naoVolta</button>
                <button class="tok-btn lmtok" data-snip="not (perigo ">perigo</button>
              </div>
            </div>
            <div class="code-box">
              <div class="line-nums" id="lmLineNumbers">1</div>
              <div class="code-layers">
                <pre class="code-hl" id="lmCodeHighlight" aria-hidden="true"></pre>
                <textarea id="lmCodeEditor" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
              </div>
            </div>
          </div>
          <div class="logic-col">
            <div class="cases-header">
              <span class="panel-label">SENSORES AO VIVO</span>
              <span class="cases-count" id="lmPosBadge">(1, 1)</span>
            </div>
            <div class="lm-sensors-box" id="lmSensorsBox">
              livre d · temOrbe d · perigo d · naoVolta d · alvoSeguro
            </div>
            <div class="feedback-line" id="lmFeedback">Retorne Just Direcao ou Nothing para evitar paredes.</div>
            <div class="action-row">
              <button class="btn-primary" id="lmRunBtn">Executar IA</button>
              <button class="btn-ghost" id="lmResetBtn">Reiniciar</button>
              <button class="btn-ghost" id="lmHintBtn">?</button>
            </div>
          </div>
        </div>
      </section>
    `;
    document.body.appendChild(sec);
  }

  mountLambdaManView();

  const wb = window.LambdaVM.createCodeWorkbench({
    editorId: 'lmCodeEditor', highlightId: 'lmCodeHighlight', lineNumsId: 'lmLineNumbers',
    tokSelector: '.tok-btn.lmtok', typeBarId: 'lmTypeBar',
    onRun: () => startLMRun()
  });

  const lmCanvas = document.getElementById('lambdamanCanvas');
  const lmCtx = lmCanvas.getContext('2d');
  let lmW = window.innerWidth, lmH = window.innerHeight;
  function resizeLM() {
    const dpr = window.devicePixelRatio || 1;
    lmW = window.innerWidth; lmH = window.innerHeight;
    lmCanvas.width = lmW * dpr; lmCanvas.height = lmH * dpr;
    lmCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeLM);
  resizeLM();

  const DIR_DELTA = { Norte: { dx: 0, dy: -1 }, Sul: { dx: 0, dy: 1 }, Leste: { dx: 1, dy: 0 }, Oeste: { dx: -1, dy: 0 } };
  const OPPOSITE = { Norte: 'Sul', Sul: 'Norte', Leste: 'Oeste', Oeste: 'Leste' };

  const lmState = {
    seed: 1, tier: 1, level: null, loadSeq: 0,
    grid: [], rows: 0, cols: 0, orbsTotal: 0, orbsLeft: 0,
    player: { gx: 1, gy: 1, vx: 1, vy: 1, lastDir: 'Leste', trail: [] },
    ghosts: [], lives: 3, chips: 0, mult: 1, serverHofMult: 1.0, scaredTurns: 0,
    running: false, won: false, defeated: false, stepTimer: 0, stepInterval: 0.25,
    funcs: null, history: [], particles: [], popups: [], blinkTimer: 2.5
  };

  let seedBar = null;
  function ensureSeedBar() {
    if (!seedBar && window.ArcadeUI?.createSeedBar) {
      seedBar = window.ArcadeUI.createSeedBar('lmLevelNav', {
        game: 'lambdaman',
        onSelect: (newSeed, newTier) => loadLMLevel(newSeed, newTier)
      });
    }
    return seedBar;
  }

  function spawnLMParticles(x, y, col, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 35 + Math.random() * 75;
      lmState.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.4 + Math.random() * 2, col, life: 0.5 });
    }
  }

  function pushLMSnapshot() {
    lmState.history.push(JSON.stringify({
      grid: lmState.grid, orbsLeft: lmState.orbsLeft,
      player: lmState.player, ghosts: lmState.ghosts,
      lives: lmState.lives, chips: lmState.chips, scaredTurns: lmState.scaredTurns
    }));
    if (lmState.history.length > 60) lmState.history.shift();
  }

  function popLMSnapshot(steps = 1) {
    if (!lmState.history.length) return;
    let s = null;
    for (let i = 0; i < steps && lmState.history.length > 0; i++) s = JSON.parse(lmState.history.pop());
    if (!s) return;
    Object.assign(lmState, s, { defeated: false });
    document.getElementById('lmDefeatBanner').classList.add('hidden');
    document.getElementById('lmDecisionPill').classList.remove('danger');
    updateLMHud();
  }

  function resetLMArena(preserveCode = false) {
    const lvl = lmState.level;
    if (!lvl || !Array.isArray(lvl.map)) return;

    lmState.grid = lvl.map.map(r => r.split(''));
    lmState.rows = lmState.grid.length;
    lmState.cols = lmState.grid[0].length;
    lmState.orbsTotal = 0;
    lmState.ghosts = [];
    lmState.history = [];
    lmState.particles = [];
    lmState.popups = [];
    lmState.lives = 3;
    lmState.chips = 0;
    lmState.mult = 1;
    lmState.scaredTurns = 0;
    lmState.running = false;
    lmState.won = false;
    lmState.defeated = false;
    lmState.stepTimer = 0;

    for (let y = 0; y < lmState.rows; y++) {
      for (let x = 0; x < lmState.cols; x++) {
        const ch = lmState.grid[y][x];
        if (ch === 'P') {
          lmState.player = { gx: x, gy: y, vx: x, vy: y, lastDir: 'Leste', trail: [] };
          lmState.grid[y][x] = ' ';
        } else if (ch === 'G') {
          lmState.ghosts.push({ gx: x, gy: y, vx: x, vy: y, spawnX: x, spawnY: y, dir: 'Oeste' });
          lmState.grid[y][x] = '.';
          lmState.orbsTotal++;
        } else if (ch === '.' || ch === '*') {
          lmState.orbsTotal++;
        }
      }
    }
    lmState.orbsLeft = lmState.orbsTotal;

    document.getElementById('lmDefeatBanner').classList.add('hidden');
    document.getElementById('lmPauseBtn').textContent = 'Pausa';
    document.getElementById('lmDecisionPill').classList.remove('danger');
    document.getElementById('lmDecisionPill').textContent = 'Decisao: Aguardando';
    document.getElementById('lmFeedback').className = 'feedback-line';
    document.getElementById('lmFeedback').textContent = 'Complete o codigo Haskell e clique em Executar IA.';

    if (!preserveCode) wb.setValue(lvl.starterCode || '');
    updateLMHud();
    resizeLM();
  }

  async function loadLMLevel(seed = null, tier = 1) {
    const reqId = ++lmState.loadSeq;
    ensureSeedBar();

    const fb = document.getElementById('lmFeedback');
    fb.className = 'feedback-line';
    fb.textContent = 'Gerando labirinto procedural (DFS + BFS) no servidor...';

    try {
      const data = await ArcadeAPI.fetchLevel('lambdaman', seed, tier);
      if (reqId !== lmState.loadSeq) return;

      const lvl = data.glPayload;
      lmState.seed = data.glSeed;
      lmState.tier = data.glTier;
      lmState.level = lvl;

      seedBar?.update(lmState.seed, lmState.tier);

      document.getElementById('lmStageNum').textContent = lvl.num || String(lmState.tier);
      document.getElementById('lmStageName').textContent = lvl.name || `Templo ${lmState.tier}`;
      document.getElementById('missionEyebrow').textContent = lvl.eyebrow || `LAMBDA-MAN · ANTE ${lmState.tier}`;
      document.getElementById('missionTitle').textContent = lvl.title || 'Labirinto Procedural';
      document.getElementById('missionSub').innerHTML = lvl.sub || '';
      wb.setTypeSig(lvl.sig || 'Maybe Direcao');

      resetLMArena(false);
    } catch (err) {
      if (reqId !== lmState.loadSeq) return;
      fb.className = 'feedback-line err';
      fb.textContent = err.message || 'Erro ao gerar labirinto do servidor.';
      synth.hit();
    }
  }

  function getLayout() {
    const topBound = 165, botBound = lmH - 252;
    const availH = Math.max(160, botBound - topBound), availW = Math.max(260, lmW - 90);
    const cols = Math.max(1, lmState.cols), rows = Math.max(1, lmState.rows);
    const tile = Math.floor(Math.min(availW / cols, availH / rows));
    const ox = (lmW - cols * tile) / 2;
    const oy = topBound + (availH - rows * tile) / 2;
    return { tile, ox, oy, topBound, botBound };
  }

  const isWall = (x, y) => y < 0 || y >= lmState.rows || x < 0 || x >= lmState.cols || lmState.grid[y][x] === '#';

  function getSensorState() {
    const px = lmState.player.gx, py = lmState.player.gy;
    const isDangerAt = (tx, ty) => lmState.scaredTurns <= 0 && lmState.ghosts.some(g => Math.abs(g.gx - tx) + Math.abs(g.gy - ty) <= 2);
    const info = {};
    for (const d of ['Norte', 'Leste', 'Sul', 'Oeste']) {
      const nx = px + DIR_DELTA[d].dx, ny = py + DIR_DELTA[d].dy;
      info[d] = {
        livre: !isWall(nx, ny),
        temOrbe: !isWall(nx, ny) && (lmState.grid[ny][nx] === '.' || lmState.grid[ny][nx] === '*'),
        perigo: isDangerAt(nx, ny),
        naoVolta: lmState.player.lastDir ? d !== OPPOSITE[lmState.player.lastDir] : true
      };
    }
    return { info, isDangerAt };
  }

  function updateLMHud() {
    document.getElementById('lmChipsVal').textContent = fmt(lmState.chips);
    document.getElementById('lmMultVal').textContent = lmState.mult;
    document.getElementById('lmOrbsVal').textContent = `${lmState.orbsTotal - lmState.orbsLeft}/${lmState.orbsTotal}`;
    document.getElementById('lmLivesVal').textContent = lmState.lives;
    document.getElementById('lmPosBadge').textContent = `(${lmState.player.gx}, ${lmState.player.gy})`;

    if (!lmState.grid.length) return;
    const { info } = getSensorState();
    const box = document.getElementById('lmSensorsBox');
    if (box) {
      box.innerHTML = ['Norte', 'Leste', 'Sul', 'Oeste'].map(d => {
        const s = info[d];
        const tag = !s.livre ? 'parede' : s.perigo ? 'PERIGO!' : s.temOrbe ? 'orbe' : 'livre';
        const col = !s.livre ? '#8c8380' : s.perigo ? '#e07a5f' : s.temOrbe ? '#e2b86b' : '#8ab89f';
        return `<span style="color:${col}">${d.padEnd(5, ' ')}: ${tag}</span>`;
      }).join('  ·  ') + (lmState.scaredTurns > 0 ? `<br><span style="color:#8cb6d9">Runa ativa: sentinelas vulneraveis (${lmState.scaredTurns} turnos)</span>` : '');
    }
  }

  function evalPMStep() {
    const px = lmState.player.gx, py = lmState.player.gy;
    const { info, isDangerAt } = getSensorState();
    function safeBFS() {
      const q = [{ x: px, y: py, firstDir: null }], seen = new Set([`${px},${py}`]);
      while (q.length) {
        const cur = q.shift();
        if (cur.firstDir && (lmState.grid[cur.y][cur.x] === '.' || lmState.grid[cur.y][cur.x] === '*')) {
          return { __adt: 'Just', args: [cur.firstDir] };
        }
        for (const d of ['Norte', 'Leste', 'Sul', 'Oeste']) {
          const nx = cur.x + DIR_DELTA[d].dx, ny = cur.y + DIR_DELTA[d].dy, key = `${nx},${ny}`;
          if (!isWall(nx, ny) && !seen.has(key) && !isDangerAt(nx, ny)) {
            seen.add(key); q.push({ x: nx, y: ny, firstDir: cur.firstDir || d });
          }
        }
      }
      return { __adt: 'Nothing', args: [] };
    }
    const baseRt = window.LambdaVM.createRuntime(lmState.funcs);
    const rt = window.LambdaVM.createRuntime(lmState.funcs, {
      Norte: 'Norte', Sul: 'Sul', Leste: 'Leste', Oeste: 'Oeste',
      livre: baseRt.mkB(1, d => info[d]?.livre ?? false),
      temOrbe: baseRt.mkB(1, d => info[d]?.temOrbe ?? false),
      perigo: baseRt.mkB(1, d => info[d]?.perigo ?? false),
      naoVolta: baseRt.mkB(1, d => info[d]?.naoVolta ?? true),
      alvoSeguro: safeBFS()
    });
    return rt.call('proximoPasso', []);
  }

  function compileLM() {
    const code = wb.getValue();
    const funcs = window.LambdaVM.compileModule(code);
    if (!funcs.proximoPasso) throw new Error('Defina a funcao `proximoPasso`.');
    lmState.funcs = funcs;
    let mult = 1;
    if (/\b(Just|Nothing|fromMaybe)\b/.test(code)) mult += 1;
    if (/\bcase\b|\([a-zA-Z_]+:[a-zA-Z_]+\)/.test(code)) mult += 1;
    if (/\b(filter|map|foldl)\b/.test(code)) mult += 1;
    lmState.mult = mult;
    evalPMStep();
  }

  async function startLMRun() {
    if (!lmState.level) return;
    const fb = document.getElementById('lmFeedback'), code = wb.getValue();
    if (lmState.defeated) resetLMArena(true);
    try {
      compileLM();
      const valResp = await ArcadeAPI.validateCode('lambdaman', code, lmState.tier);
      if (!valResp.vrValid) {
        throw new Error(valResp.vrMessage || 'Navegacao Maybe invalida.');
      }
      lmState.serverHofMult = valResp.vrHofMult || 1.0;
      lmState.running = true;
      document.getElementById('lmPauseBtn').textContent = 'Pausa';
      fb.className = 'feedback-line ok';
      fb.textContent = valResp.vrMessage || 'IA Haskell ativa no templo!';
      synth.chip(3);
      updateLMHud();
    } catch (err) {
      lmState.running = false;
      fb.className = 'feedback-line err';
      fb.textContent = window.LambdaVM.translateError(err.message, code);
      synth.hit();
    }
  }

  function triggerLMHit(reason) {
    lmState.lives--;
    const vig = document.getElementById('lmDamageVignette');
    if (vig) { vig.classList.remove('flash'); void vig.offsetWidth; vig.classList.add('flash'); setTimeout(() => vig.classList.remove('flash'), 60); }
    const { tile, ox, oy } = getLayout();
    const px = ox + (lmState.player.gx + 0.5) * tile, py = oy + (lmState.player.gy + 0.5) * tile;
    spawnLMParticles(px, py, '#e07a5f', 14);
    lmState.popups.push({ x: px, y: py - 18, text: '-1 Vida!', col: '#ff6b6b', life: 0.9 });
    synth.hit();

    if (lmState.lives <= 0) {
      lmState.running = false; lmState.defeated = true;
      const code = wb.getValue();
      let diag = 'Ajuste suas regras Haskell para priorizar rotas seguras!';
      if (!/\bperigo\b/.test(code) && lmState.tier >= 3) diag = 'Diagnostico: voce nao filtrou not (perigo d), por isso o corredor avancou para cima da sentinela.';
      else if (/Nothing\s*->\s*Nothing/.test(code)) diag = 'Diagnostico: o ramo Nothing do case retornou Nothing e deixou o personagem parado!';
      document.getElementById('lmDefeatReason').textContent = reason;
      document.getElementById('lmDefeatDiag').textContent = diag;
      document.getElementById('lmDefeatBanner').classList.remove('hidden');
      document.getElementById('lmDecisionPill').classList.add('danger');
      document.getElementById('lmDecisionPill').textContent = 'Capturado!';
    } else {
      lmState.player.gx = 1; lmState.player.gy = 1; lmState.player.vx = 1; lmState.player.vy = 1;
      lmState.player.trail = [];
    }
  }

  function stepLMSimulation() {
    if (!lmState.funcs || lmState.won || lmState.defeated || !lmState.grid.length) return;
    pushLMSnapshot();
    if (lmState.scaredTurns > 0) lmState.scaredTurns--;

    const { tile, ox, oy } = getLayout();

    try {
      const res = evalPMStep();
      const pill = document.getElementById('lmDecisionPill');
      pill.classList.remove('danger');

      if (res?.__adt === 'Nothing') {
        pill.textContent = 'Decisao: Nothing (parado)';
      } else if (res?.__adt === 'Just' && DIR_DELTA[res.args[0]]) {
        const dir = res.args[0];
        pill.textContent = `Decisao: Just ${dir}`;
        const nx = lmState.player.gx + DIR_DELTA[dir].dx, ny = lmState.player.gy + DIR_DELTA[dir].dy;
        if (!isWall(nx, ny)) {
          lmState.player.trail.push({ x: lmState.player.gx, y: lmState.player.gy, life: 1 });
          if (lmState.player.trail.length > 6) lmState.player.trail.shift();
          lmState.player.gx = nx; lmState.player.gy = ny; lmState.player.lastDir = dir;

          const cell = lmState.grid[ny][nx];
          if (cell === '.' || cell === '*') {
            lmState.grid[ny][nx] = ' '; lmState.orbsLeft--;
            const pts = cell === '*' ? 45 : 15;
            lmState.chips += pts;
            const cx = ox + (nx + 0.5) * tile, cy = oy + (ny + 0.5) * tile;
            spawnLMParticles(cx, cy, cell === '*' ? '#8cb6d9' : '#e2b86b', cell === '*' ? 14 : 6);
            if (cell === '*') {
              lmState.scaredTurns = 14;
              lmState.popups.push({ x: cx, y: cy - 12, text: 'Runa!', col: '#8cb6d9', life: 0.85 });
              synth.drink();
            } else synth.chip(2);
            if (lmState.orbsLeft <= 0) {
              updateLMHud();
              onLMLevelWon();
              return;
            }
          }
        } else {
          pill.classList.add('danger');
          pill.textContent = `Parede em ${dir}!`;
          synth.hit();
        }
      } else throw new Error('proximoPasso deve retornar Maybe Direcao.');
    } catch (err) {
      lmState.running = false;
      document.getElementById('lmFeedback').className = 'feedback-line err';
      document.getElementById('lmFeedback').textContent = window.LambdaVM.translateError(err.message, wb.getValue());
    }

    for (const g of lmState.ghosts) {
      const opts = ['Norte', 'Leste', 'Sul', 'Oeste'].filter(d => !isWall(g.gx + DIR_DELTA[d].dx, g.gy + DIR_DELTA[d].dy));
      const pool = opts.filter(d => d !== OPPOSITE[g.dir]);
      const chosen = (pool.length ? pool : opts)[Math.floor(Math.random() * (pool.length ? pool.length : opts.length))];
      if (chosen) { g.dir = chosen; g.gx += DIR_DELTA[chosen].dx; g.gy += DIR_DELTA[chosen].dy; }

      if (g.gx === lmState.player.gx && g.gy === lmState.player.gy) {
        if (lmState.scaredTurns > 0) {
          const gx = ox + (g.gx + 0.5) * tile, gy = oy + (g.gy + 0.5) * tile;
          spawnLMParticles(gx, gy, '#8cb6d9', 14);
          lmState.chips += 60;
          lmState.popups.push({ x: gx, y: gy - 16, text: '+60!', col: '#8cb6d9', life: 0.85 });
          g.gx = g.spawnX; g.gy = g.spawnY; g.vx = g.spawnX; g.vy = g.spawnY;
          synth.win();
        } else {
          triggerLMHit('Uma sentinela interceptou o corredor!');
        }
      }
    }
    updateLMHud();
  }

  async function onLMLevelWon() {
    if (lmState.won) return;
    lmState.won = true;
    lmState.running = false;
    synth.win();

    const lvl = lmState.level;
    const baseChips = lvl?.baseChips || 70;
    const total = Math.round(baseChips * lmState.mult);

    await ArcadeAPI.submitRun({
      game: 'lambdaman',
      seed: lmState.seed,
      tier: lmState.tier,
      score: total + lmState.chips,
      starsWon: total,
      hofMult: Math.max(lmState.mult, lmState.serverHofMult || 1.0),
      code: wb.getValue()
    });

    unlockAchievement('lambdaman_master');

    const nextTier = lmState.tier + 1;
    setTimeout(() => {
      document.getElementById('infoModalTitle').textContent = `Templo ${lvl?.num || lmState.tier} Concluido!`;
      document.getElementById('infoModalBody').innerHTML = `
        <p>Todos os orbes coletados com Maybe na Seed #${lmState.seed}! Ganhou <b class="star-inline">+${total} ${ArcadeUI.SVGS.star}</b> (${baseChips} x ${lmState.mult} Mult).</p>
        <button class="btn-primary" id="lmNextModalBtn">Avancar para o Ante ${nextTier}</button>`;
      document.getElementById('infoModal').classList.remove('hidden');
      document.getElementById('lmNextModalBtn').addEventListener('click', () => {
        document.getElementById('infoModal').classList.add('hidden');
        loadLMLevel(lmState.seed, nextTier);
      });
    }, 350);
  }

  let lmLast = performance.now();
  function lmLoop(now) {
    const dt = Math.min(0.05, (now - lmLast) / 1000); lmLast = now;
    if (worldState.mode === 'lambdaman') {
      lmState.blinkTimer -= dt;
      if (lmState.blinkTimer < -0.12) lmState.blinkTimer = 2.4 + Math.random() * 2.2;
      if (lmState.running && !lmState.defeated) {
        lmState.stepTimer += dt;
        if (lmState.stepTimer >= lmState.stepInterval) { lmState.stepTimer = 0; stepLMSimulation(); }
      }
      lmState.player.vx += (lmState.player.gx - lmState.player.vx) * Math.min(1, dt * 16);
      lmState.player.vy += (lmState.player.gy - lmState.player.vy) * Math.min(1, dt * 16);
      for (const g of lmState.ghosts) { g.vx += (g.gx - g.vx) * Math.min(1, dt * 16); g.vy += (g.gy - g.vy) * Math.min(1, dt * 16); }
      for (let i = lmState.particles.length - 1; i >= 0; i--) {
        const p = lmState.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) lmState.particles.splice(i, 1);
      }
      for (let i = lmState.popups.length - 1; i >= 0; i--) {
        lmState.popups[i].y -= 26 * dt; lmState.popups[i].life -= dt;
        if (lmState.popups[i].life <= 0) lmState.popups.splice(i, 1);
      }
      renderMaze(now * 0.001);
    }
    requestAnimationFrame(lmLoop);
  }

  function renderMaze(tSec) {
    lmCtx.clearRect(0, 0, lmW, lmH);
    const pal = COSMETICS.themes.find(t => t.id === playerSave.equippedTheme) || COSMETICS.themes[0];
    const meadow = pal.meadow || ['#6b8868', '#526e55'];
    const { tile, ox, oy, topBound } = getLayout();
    const horizonY = topBound - 16;

    const mGrad = lmCtx.createLinearGradient(0, horizonY, 0, lmH);
    mGrad.addColorStop(0, meadow[0]); mGrad.addColorStop(1, meadow[1]);
    lmCtx.fillStyle = mGrad;
    lmCtx.beginPath(); lmCtx.moveTo(0, horizonY + 12);
    for (let x = 0; x <= lmW + 40; x += 40) lmCtx.lineTo(x, horizonY + Math.sin(x * 0.008) * 8);
    lmCtx.lineTo(lmW, lmH); lmCtx.lineTo(0, lmH); lmCtx.closePath(); lmCtx.fill();

    if (!lmState.grid.length) return;

    lmCtx.fillStyle = 'rgba(20, 14, 18, 0.30)';
    lmCtx.beginPath(); lmCtx.roundRect(ox - 10, oy - 6, lmState.cols * tile + 20, lmState.rows * tile + 22, 16); lmCtx.fill();
    lmCtx.fillStyle = '#2d2833';
    lmCtx.beginPath(); lmCtx.roundRect(ox - 6, oy - 6, lmState.cols * tile + 12, lmState.rows * tile + 12, 14); lmCtx.fill();

    const { info } = getSensorState();
    for (let y = 0; y < lmState.rows; y++) {
      for (let x = 0; x < lmState.cols; x++) {
        const tx = ox + x * tile, ty = oy + y * tile, ch = lmState.grid[y][x];
        if (ch === '#') {
          lmCtx.fillStyle = '#3d3442';
          lmCtx.beginPath(); lmCtx.roundRect(tx + 2, ty + 6, tile - 4, tile - 4, 7); lmCtx.fill();
          lmCtx.fillStyle = '#63576b';
          lmCtx.beginPath(); lmCtx.roundRect(tx + 2, ty + 2, tile - 4, tile - 6, 7); lmCtx.fill();
        } else {
          lmCtx.fillStyle = 'rgba(245, 239, 230, 0.05)';
          lmCtx.beginPath(); lmCtx.roundRect(tx + 2, ty + 2, tile - 4, tile - 4, 5); lmCtx.fill();

          if (ch === '.' || ch === '*') {
            const cx = tx + tile / 2, cy = ty + tile / 2;
            const pulse = Math.sin(tSec * 4 + x + y) * 0.8;
            if (ch === '*') {
              lmCtx.fillStyle = 'rgba(140, 182, 217, 0.30)';
              lmCtx.beginPath(); lmCtx.arc(cx, cy, tile * 0.32 + pulse, 0, Math.PI * 2); lmCtx.fill();
              lmCtx.fillStyle = '#8cb6d9';
              lmCtx.beginPath(); lmCtx.moveTo(cx, cy - 8); lmCtx.lineTo(cx + 8, cy); lmCtx.lineTo(cx, cy + 8); lmCtx.lineTo(cx - 8, cy); lmCtx.closePath(); lmCtx.fill();
            } else {
              lmCtx.fillStyle = 'rgba(226, 184, 107, 0.24)';
              lmCtx.beginPath(); lmCtx.arc(cx, cy, 8 + pulse, 0, Math.PI * 2); lmCtx.fill();
              lmCtx.fillStyle = '#f3d188';
              lmCtx.beginPath(); lmCtx.arc(cx, cy, 4 + pulse * 0.4, 0, Math.PI * 2); lmCtx.fill();
            }
          }
        }
      }
    }

    const pCx = ox + (lmState.player.vx + 0.5) * tile, pCy = oy + (lmState.player.vy + 0.5) * tile;
    for (const d of ['Norte', 'Leste', 'Sul', 'Oeste']) {
      const s = info[d];
      if (!s.livre) continue;
      const sx = pCx + DIR_DELTA[d].dx * (tile * 0.54), sy = pCy + DIR_DELTA[d].dy * (tile * 0.54);
      lmCtx.fillStyle = s.perigo ? 'rgba(224,122,95,0.85)' : s.temOrbe ? 'rgba(226,184,107,0.78)' : 'rgba(138,184,159,0.52)';
      lmCtx.beginPath(); lmCtx.arc(sx, sy, 3.2, 0, Math.PI * 2); lmCtx.fill();
    }

    for (let i = 0; i < lmState.player.trail.length; i++) {
      const tr = lmState.player.trail[i];
      lmCtx.fillStyle = `rgba(245, 239, 230, ${0.06 + i * 0.03})`;
      lmCtx.beginPath(); lmCtx.arc(ox + (tr.x + 0.5) * tile, oy + (tr.y + 0.5) * tile, tile * 0.16, 0, Math.PI * 2); lmCtx.fill();
    }

    for (const g of lmState.ghosts) {
      const gx = ox + (g.vx + 0.5) * tile, gy = oy + (g.vy + 0.5) * tile, rad = tile * 0.34;
      const scared = lmState.scaredTurns > 0;
      if (!scared) {
        lmCtx.strokeStyle = 'rgba(224, 122, 95, 0.28)'; lmCtx.lineWidth = 2;
        lmCtx.beginPath(); lmCtx.arc(gx, gy, tile * 0.6, 0, Math.PI * 2); lmCtx.stroke();
      }
      const bob = Math.sin(tSec * 6 + g.spawnX) * 2;
      lmCtx.fillStyle = scared ? '#4f759b' : '#c86d58';
      lmCtx.beginPath(); lmCtx.arc(gx, gy - 2 + bob, rad, Math.PI, 0);
      lmCtx.lineTo(gx + rad, gy + rad + bob);
      lmCtx.lineTo(gx + rad * 0.3, gy + rad * 0.65 + bob);
      lmCtx.lineTo(gx - rad * 0.3, gy + rad + bob);
      lmCtx.lineTo(gx - rad, gy + rad * 0.65 + bob);
      lmCtx.closePath(); lmCtx.fill();

      lmCtx.fillStyle = '#faf6f0';
      lmCtx.beginPath(); lmCtx.arc(gx - 4, gy - 3 + bob, 3, 0, Math.PI * 2); lmCtx.arc(gx + 4, gy - 3 + bob, 3, 0, Math.PI * 2); lmCtx.fill();
      if (!scared) {
        lmCtx.fillStyle = '#272022';
        lmCtx.beginPath(); lmCtx.arc(gx - 4, gy - 3 + bob, 1.4, 0, Math.PI * 2); lmCtx.arc(gx + 4, gy - 3 + bob, 1.4, 0, Math.PI * 2); lmCtx.fill();
      }
    }

    const skinColor = (COSMETICS.skins.find(s => s.id === playerSave.equippedSkin) || COSMETICS.skins[0]).color;
    const acc = playerSave.equippedAcc, pr = tile * 0.36;
    const lookDx = lmState.player.lastDir === 'Leste' ? 3 : lmState.player.lastDir === 'Oeste' ? -3 : 0;
    const lookDy = lmState.player.lastDir === 'Sul' ? 2 : lmState.player.lastDir === 'Norte' ? -2 : 0;

    lmCtx.save();
    lmCtx.fillStyle = 'rgba(0,0,0,0.32)'; lmCtx.beginPath(); lmCtx.ellipse(pCx, pCy + pr * 0.85, pr * 0.8, pr * 0.3, 0, 0, Math.PI * 2); lmCtx.fill();
    if (acc === 'lambda_cape') {
      lmCtx.fillStyle = '#735c88'; lmCtx.beginPath(); lmCtx.arc(pCx - lookDx * 1.6, pCy + 2, pr * 0.9, 0, Math.PI * 2); lmCtx.fill();
    }
    lmCtx.fillStyle = skinColor; lmCtx.beginPath(); lmCtx.arc(pCx, pCy, pr, 0, Math.PI * 2); lmCtx.fill();
    if (acc === 'wizard_hat') {
      lmCtx.fillStyle = '#3c2a4d';
      lmCtx.beginPath(); lmCtx.ellipse(pCx, pCy - pr * 0.65, pr * 1.05, pr * 0.28, 0, 0, Math.PI * 2); lmCtx.fill();
      lmCtx.beginPath(); lmCtx.moveTo(pCx - pr * 0.6, pCy - pr * 0.65); lmCtx.lineTo(pCx, pCy - pr * 1.65); lmCtx.lineTo(pCx + pr * 0.6, pCy - pr * 0.65); lmCtx.fill();
    }
    lmCtx.fillStyle = '#faf6f0';
    lmCtx.beginPath(); lmCtx.arc(pCx - 3.5 + lookDx, pCy - 2 + lookDy, 2.2, 0, Math.PI * 2);
    lmCtx.arc(pCx + 3.5 + lookDx, pCy - 2 + lookDy, 2.2, 0, Math.PI * 2); lmCtx.fill();
    lmCtx.restore();

    for (const pt of lmState.particles) {
      lmCtx.globalAlpha = Math.max(0, pt.life * 2);
      lmCtx.fillStyle = pt.col; lmCtx.beginPath(); lmCtx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); lmCtx.fill();
    }
    lmCtx.globalAlpha = 1;
    for (const pop of lmState.popups) {
      lmCtx.globalAlpha = Math.min(1, pop.life * 2);
      lmCtx.fillStyle = pop.col; lmCtx.font = '800 13px "JetBrains Mono", monospace'; lmCtx.textAlign = 'center';
      lmCtx.fillText(pop.text, pop.x, pop.y);
    }
    lmCtx.globalAlpha = 1;
  }

  document.getElementById('lmStepBackBtn').addEventListener('click', () => { lmState.running = false; document.getElementById('lmPauseBtn').textContent = 'Retomar'; popLMSnapshot(1); synth.chip(1); });
  document.getElementById('lmDefeatRewindBtn').addEventListener('click', () => { lmState.running = false; document.getElementById('lmPauseBtn').textContent = 'Retomar'; popLMSnapshot(3); synth.chip(2); });
  document.getElementById('lmDefeatRetryBtn').addEventListener('click', () => { resetLMArena(true); startLMRun(); });
  document.getElementById('lmPauseBtn').addEventListener('click', (e) => { lmState.running = !lmState.running; e.target.textContent = lmState.running ? 'Pausa' : 'Retomar'; });
  document.getElementById('lmStepFwdBtn').addEventListener('click', () => {
    try { if (!lmState.funcs) compileLM(); lmState.running = false; document.getElementById('lmPauseBtn').textContent = 'Retomar'; stepLMSimulation(); }
    catch (err) { document.getElementById('lmFeedback').textContent = err.message; }
  });
  document.getElementById('lmRunBtn').addEventListener('click', startLMRun);
  document.getElementById('lmResetBtn').addEventListener('click', () => resetLMArena(false));
  document.getElementById('lmHintBtn').addEventListener('click', () => {
    const lvl = lmState.level;
    document.getElementById('infoModalTitle').textContent = lvl ? `Lambda-Man — Ante ${lmState.tier}` : 'Dica';
    document.getElementById('infoModalBody').innerHTML = `<p>${lvl?.hint || 'Use Maybe (Just / Nothing) para navegar com seguranca.'}</p><pre>${(lvl?.starterCode || '').replace(/</g, '&lt;')}</pre>`;
    document.getElementById('infoModal').classList.remove('hidden');
  });

  window.initLambdaManLevel = (seed = null, tier = 1) => loadLMLevel(seed, tier);
  requestAnimationFrame(lmLoop);
})();