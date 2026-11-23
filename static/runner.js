/* =========================================================================
   GAME 01: LAMBDA RUNNER — Modo Infinito Procedural + LambdaVM + PostgreSQL
   ========================================================================= */

(function () {
  const ALL_JOKERS = [
    { slug: 'PUREZA_LAMBDA',     icon: 'λ',   name: 'Pureza',     tag: '+20',  kind: 'chips', desc: '+20 Fichas por acao valida' },
    { slug: 'GUARDA_REAL',       icon: '|',   name: 'Guarda',     tag: '+10x', kind: 'mult',  desc: '+10 Mult ao usar Guards | ou Padroes' },
    { slug: 'RECURSAO_INFINITA', icon: '∞',   name: 'Fluxo',      tag: 'x1.5', kind: 'xmult', desc: 'x1.5 Mult com sequencia 3+' },
    { slug: 'ORDEM_SUPERIOR',    icon: 'ƒ',   name: 'Ordem Sup.', tag: 'x2.0', kind: 'xmult', desc: 'x2.0 Mult com map/filter/foldl' },
    { slug: 'CODIGO_ENXUTO',     icon: 'λ-',  name: 'Conciso',    tag: '+35',  kind: 'chips', desc: '+35 Fichas com ate 5 linhas' },
    { slug: 'MESTRE_HIDRATADO',  icon: 'H2O', name: 'Fonte',      tag: '+8x',  kind: 'mult',  desc: '+8 Mult com agua >= 70%' }
  ];

  const DEFAULT_JOKERS = ['PUREZA_LAMBDA', 'GUARDA_REAL', 'RECURSAO_INFINITA', 'ORDEM_SUPERIOR'];

  const rState = {
    seed: 1,
    ante: 1,
    level: null,
    loadSeq: 0,
    targetScore: 180,
    roundScore: 0,
    chips: 0,
    mult: 1,
    serverHofMult: 1.0,
    hydration: 100,
    streak: 0,
    started: false,
    blindCleared: false,
    compiledProgram: null,
    activeJokers: [...DEFAULT_JOKERS],
    obstacles: [],
    spawnTimer: 0.45
  };

  let seedBar = null;
  function ensureSeedBar() {
    if (!seedBar && window.ArcadeUI?.createSeedBar) {
      seedBar = window.ArcadeUI.createSeedBar('stageNav', {
        game: 'runner',
        onSelect: (newSeed, newTier) => loadRunnerStage(newSeed, newTier, false)
      });
    }
    return seedBar;
  }

  function parseRunnerProgram(rawCode) {
    const codeNoComments = rawCode.replace(/--[^\n]*/g, '');
    if (/\b(for|while|var|let\s+mut|return)\b/.test(codeNoComments)) {
      throw new Error('Haskell e funcional puro: evite "for", "while" ou "return".');
    }
    const funcs = window.LambdaVM.compileModule(rawCode);
    const mainName = funcs.acao ? 'acao' : Object.keys(funcs)[0];
    if (!mainName) throw new Error('Defina a funcao "acao".');

    const nonEmptyLines = rawCode.split('\n').filter(l => l.trim() && !l.trim().startsWith('--'));
    const clauses = funcs[mainName] || [];
    const usesPatternMatch = clauses.length > 1 || clauses.some(c =>
      c.params.some(p => p.k === 'LIT' || p.k === 'WILD' || p.k === 'CTOR')
    );

    const metrics = {
      usesIf: /\bif\b/.test(codeNoComments),
      usesGuards: /^\s*\|/m.test(codeNoComments),
      usesHOF: /\b(map|filter|foldl|foldr)\b/.test(codeNoComments),
      usesPatternMatch,
      lineCount: nonEmptyLines.length
    };
    return { funcs, mainName, metrics };
  }

  function evalRunnerProgram(program, args) {
    const base = window.LambdaVM.createRuntime(program.funcs);
    const rt = window.LambdaVM.createRuntime(program.funcs, {
      Pular:     { tag: 'Pular' },
      Abaixar:   { tag: 'Abaixar' },
      BeberAgua: { tag: 'BeberAgua' },
      Correr:    base.mkB(1, spd => ({ tag: 'Correr', speed: Number(spd) || 10 })),
      Combo:     base.mkB(1, acts => ({ tag: 'Combo', actions: Array.isArray(acts) ? acts : [] }))
    });
    let action = rt.call(program.mainName, args);
    if (action?.__partial && action.arity === 1) {
      action = rt.call(program.mainName, [args[0]]);
    }
    if (!action?.tag) throw new Error('Retorne uma Acao (Correr, Pular, Abaixar, BeberAgua).');
    return { action, firedLine: null };
  }

  window.updateRunnerSim = function (dt) {
    if (!rState.level) return;
    const r = worldState.runner;
    worldState.scrollX += r.speed * dt;
    r.walkTick += dt * (r.speed / 24);
    rState.hydration = Math.max(0, rState.hydration - (rState.ante >= 3 ? 4.0 : 0.6) * dt);
    if (Math.random() < 0.12) updateRunnerHud();

    if (r.y < 0 || r.vy < 0) {
      r.vy += 1280 * dt; r.y += r.vy * dt;
      if (r.y >= 0) { r.y = 0; r.vy = 0; if (r.pose === 'jump') r.pose = 'run'; }
    }
    if (r.poseTimer > 0) { r.poseTimer -= dt; if (r.poseTimer <= 0 && r.y === 0) r.pose = 'run'; }

    rState.spawnTimer -= dt;
    if (rState.spawnTimer <= 0) {
      const pool = rState.level.pool && rState.level.pool.length ? rState.level.pool : ['livre'];
      rState.obstacles.push({ type: pool[Math.floor(Math.random() * pool.length)], x: viewW + 70, evaluated: false });
      rState.spawnTimer = 1.45 + Math.random() * 0.65;
    }

    const rx = viewW * r.x;
    for (let i = rState.obstacles.length - 1; i >= 0; i--) {
      const obs = rState.obstacles[i];
      obs.x -= r.speed * dt;
      if (!obs.evaluated && obs.x <= rx + 52) { obs.evaluated = true; handleRunnerDecision(obs); }
      if (obs.x < -90) rState.obstacles.splice(i, 1);
    }
    for (let i = worldState.particles.length - 1; i >= 0; i--) {
      const p = worldState.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 360 * dt; p.life -= dt;
      if (p.life <= 0) worldState.particles.splice(i, 1);
    }
    for (let i = worldState.floatingTexts.length - 1; i >= 0; i--) {
      const ft = worldState.floatingTexts[i];
      ft.y -= 42 * dt; ft.life -= dt;
      if (ft.life <= 0) worldState.floatingTexts.splice(i, 1);
    }
  };

  window.drawRunnerObstacles = function (c, baseY, tSec) {
    for (const obs of rState.obstacles) {
      const x = obs.x;
      c.save();
      if (obs.type === 'pedra') {
        c.fillStyle = 'rgba(30, 24, 32, 0.25)'; c.beginPath(); c.ellipse(x, baseY + 2, 22, 5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#8b5e57'; c.beginPath(); c.moveTo(x - 18, baseY); c.quadraticCurveTo(x - 14, baseY - 30, x + 2, baseY - 28); c.quadraticCurveTo(x + 18, baseY - 24, x + 18, baseY); c.fill();
        c.fillStyle = '#a8766c'; c.beginPath(); c.arc(x - 4, baseY - 16, 6, 0, Math.PI * 2); c.fill();
        drawLabelPill('"pedra"', x, baseY + 20);
      } else if (obs.type === 'galho') {
        c.strokeStyle = '#5c4033'; c.lineCap = 'round';
        c.lineWidth = 7; c.beginPath(); c.moveTo(x + 26, baseY); c.quadraticCurveTo(x + 28, baseY - 56, x + 20, baseY - 88); c.stroke();
        c.lineWidth = 5.5; c.beginPath(); c.moveTo(x + 22, baseY - 72); c.quadraticCurveTo(x + 4, baseY - 62, x - 22, baseY - 66); c.stroke();
        c.fillStyle = '#475e4d'; c.beginPath(); c.ellipse(x - 14, baseY - 60, 14, 10, -0.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#5c7c65'; c.beginPath(); c.ellipse(x + 2, baseY - 63, 16, 12, 0.1, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#6f9278'; c.beginPath(); c.ellipse(x - 4, baseY - 54, 11, 8, 0, 0, Math.PI * 2); c.fill();
        drawLabelPill('"galho"', x - 2, baseY - 86);
      } else if (obs.type === 'calor') {
        const bob = Math.sin(tSec * 4) * 3;
        c.fillStyle = 'rgba(212, 155, 56, 0.28)'; c.beginPath(); c.arc(x, baseY - 26 + bob, 20, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#d49b38'; c.beginPath(); c.arc(x, baseY - 26 + bob, 11, 0, Math.PI * 2); c.fill();
        drawLabelPill('"calor"', x, baseY + 20);
      } else if (obs.type === 'combo') {
        c.strokeStyle = '#d49b38'; c.lineWidth = 4; c.beginPath(); c.roundRect(x - 16, baseY - 58, 32, 58, 14); c.stroke();
        drawLabelPill('"combo"', x, baseY - 68);
      } else {
        const oy = baseY - 36 + Math.sin(tSec * 4) * 4;
        c.fillStyle = 'rgba(30, 24, 32, 0.20)'; c.beginPath(); c.ellipse(x, baseY + 2, 10, 3.5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(250, 243, 221, 0.35)'; c.beginPath(); c.arc(x, oy, 13, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#faf0ca'; c.strokeStyle = '#9a6d22'; c.lineWidth = 1.8; c.beginPath(); c.arc(x, oy, 7.5, 0, Math.PI * 2); c.fill(); c.stroke();
        drawLabelPill('"livre"', x, baseY + 20);
      }
      c.restore();
    }
  };

  function updateRunnerHud() {
    document.getElementById('chipsVal').textContent = fmt(rState.chips);
    document.getElementById('multVal').textContent = Number.isInteger(rState.mult) ? rState.mult : rState.mult.toFixed(1);
    document.getElementById('scoreVal').textContent = fmt(rState.roundScore);
    document.getElementById('targetVal').textContent = fmt(rState.targetScore);
    document.getElementById('hydrationVal').textContent = `${Math.max(0, Math.round(rState.hydration))}%`;
    document.getElementById('streakVal').textContent = rState.streak;
  }

  function renderActiveJokers() {
    document.getElementById('jokerStrip').innerHTML = rState.activeJokers.map(slug => {
      const j = ALL_JOKERS.find(x => x.slug === slug);
      return j ? `<div class="joker-chip" data-joker="${j.slug}" title="${j.desc}"><span class="j-icon">${j.icon}</span><span>${j.name}</span><span class="j-val ${j.kind}">${j.tag}</span></div>` : '';
    }).join('');
  }

  let tDeb = null;
  const wb = window.LambdaVM.createCodeWorkbench({
    editorId: 'codeEditor', highlightId: 'codeHighlight', lineNumsId: 'lineNumbers',
    tokSelector: '.tok-btn.rtok', typeBarId: 'runnerTypeBar',
    onRun: () => compileRunnerSpell(false),
    onInput: (val) => { clearTimeout(tDeb); tDeb = setTimeout(() => refreshTruthCases(val), 120); }
  });

  async function loadRunnerStage(seed = null, tier = 1, keepJokers = false) {
    const reqId = ++rState.loadSeq;
    ensureSeedBar();

    if (!keepJokers) rState.activeJokers = [...DEFAULT_JOKERS];
    rState.obstacles = [];
    rState.spawnTimer = 0.4;
    rState.blindCleared = false;
    rState.started = false;
    rState.roundScore = 0;
    rState.chips = 0;
    rState.mult = 1;
    rState.streak = 0;
    rState.hydration = 100;
    worldState.paused = true;
    worldState.runner.pose = 'idle';
    worldState.runner.y = 0;
    worldState.runner.vy = 0;

    document.getElementById('readyOverlay').classList.remove('hidden');
    document.getElementById('victoryOverlay').classList.add('hidden');
    document.getElementById('pauseBtn').textContent = 'Pausar';
    document.getElementById('statusText').className = 'feedback-line';
    document.getElementById('statusText').textContent = 'Gerando Ante no servidor Servant...';

    try {
      const data = await ArcadeAPI.fetchLevel('runner', seed, tier);
      if (reqId !== rState.loadSeq) return;

      const lvl = data.glPayload;
      rState.seed = data.glSeed;
      rState.ante = data.glTier;
      rState.level = lvl;
      rState.targetScore = lvl.target || 180;

      seedBar?.update(rState.seed, rState.ante);

      document.getElementById('stageBadgeNum').textContent = lvl.num || String(rState.ante);
      document.getElementById('stageBadgeName').textContent = lvl.name || `Ante ${rState.ante}`;
      document.getElementById('missionEyebrow').textContent = lvl.eyebrow || `MODO INFINITO · ANTE ${rState.ante}`;
      document.getElementById('missionTitle').textContent = lvl.title || 'Corrida Procedural';
      document.getElementById('missionSub').innerHTML = lvl.sub || '';
      document.getElementById('missionCounter').textContent = `MODO INFINITO · ANTE ${rState.ante} · SEED #${rState.seed}`;
      wb.setTypeSig(lvl.sig || 'String -> Int -> Acao');

      const boss = document.getElementById('bossRulePill');
      if (lvl.bossRule) {
        boss.textContent = lvl.bossRule.label;
        boss.classList.remove('hidden');
      } else {
        boss.classList.add('hidden');
      }

      const activeDashIdx = (rState.ante - 1) % 4;
      document.querySelectorAll('#progressDots .dash').forEach((d, i) => d.classList.toggle('active', i === activeDashIdx));

      const starter = lvl.starterCode || '-- Defina sua funcao acao\nacao :: String -> Int -> Acao\nacao obs _ = Correr 10';
      wb.setValue(starter);
      renderActiveJokers();
      await compileRunnerSpell(true);
      refreshTruthCases(starter);
      updateRunnerHud();
    } catch (err) {
      if (reqId !== rState.loadSeq) return;
      document.getElementById('statusText').className = 'feedback-line err';
      document.getElementById('statusText').textContent = err.message || 'Erro ao carregar Ante do servidor.';
      synth.hit();
    }
  }

  async function compileRunnerSpell(silent = false) {
    if (!rState.level) return;
    const st = document.getElementById('statusText');
    const code = wb.getValue();
    try {
      const prog = parseRunnerProgram(code);
      const boss = rState.level.bossRule;
      if (boss?.type === 'NO_IF' && prog.metrics.usesIf) {
        throw new Error('Regra do Boss: "if" esta proibido! Use Guards (|).');
      }
      evalRunnerProgram(prog, ['pedra', Math.round(rState.hydration)]);

      if (!silent) {
        const resp = await ArcadeAPI.validateCode('runner', code, rState.ante);
        if (!resp.vrValid) {
          throw new Error(resp.vrMessage || 'Regra do Ante nao atendida.');
        }
        rState.serverHofMult = resp.vrHofMult || 1.0;
        rState.compiledProgram = prog;
        st.className = 'feedback-line ok';
        st.textContent = resp.vrMessage || 'Funcao validada pelo servidor Servant.';
        rState.started = true;
        worldState.paused = false;
        worldState.runner.pose = 'run';
        document.getElementById('readyOverlay').classList.add('hidden');
        synth.chip(2);
      } else {
        rState.compiledProgram = prog;
        st.className = 'feedback-line ok';
        st.textContent = 'Pronto para aplicar e correr.';
      }
    } catch (err) {
      const friendly = window.LambdaVM.translateError(err.message, code);
      st.className = 'feedback-line err';
      st.textContent = friendly;
      if (!silent) {
        synth.hit();
        window.ArcadeUI?.showToast('Corrija o codigo antes de correr', friendly);
      }
    }
  }

  function refreshTruthCases(codeStr) {
    const cases = rState.level?.cases || [];
    const list = document.getElementById('truthCases');
    list.innerHTML = '';
    let okCount = 0;
    try {
      const prog = parseRunnerProgram(codeStr);
      for (const c of cases) {
        let out = '?', ok = false;
        try { out = evalRunnerProgram(prog, [c.obs, c.sede]).action.tag; ok = out === c.expected; } catch { out = 'Erro'; }
        if (ok) okCount++;
        const pill = document.createElement('div');
        pill.className = `case-pill ${ok ? 'pass' : 'fail'}`;
        pill.innerHTML = `<span class="case-in">${c.sede < 40 ? `sede=${c.sede}` : `"${c.obs}"`}</span><span class="case-out">${out}</span><span class="${ok ? 'case-ok' : 'case-bad'}">${ok ? 'OK' : 'X'}</span>`;
        list.appendChild(pill);
      }
      document.getElementById('coverageBadge').textContent = `${okCount}/${cases.length}`;
    } catch {
      document.getElementById('coverageBadge').textContent = `0/${cases.length}`;
    }
  }

  function handleRunnerDecision(obs) {
    if (!rState.compiledProgram) return;
    const rx = viewW * worldState.runner.x, gy = worldState.groundY + 12;
    try {
      const { action } = evalRunnerProgram(rState.compiledProgram, [obs.type, Math.round(rState.hydration)]);
      if (action.tag === 'Correr' && action.speed) worldState.runner.speed = Math.max(170, Math.min(390, action.speed * 18));

      const valid = (obs.type === 'livre' && (action.tag === 'Correr' || action.tag === 'BeberAgua')) ||
        (obs.type === 'pedra' && action.tag === 'Pular') || (obs.type === 'galho' && action.tag === 'Abaixar') ||
        (obs.type === 'calor' && action.tag === 'BeberAgua') || (obs.type === 'combo' && action.tag === 'Combo' && action.actions?.length >= 2);

      if (valid) {
        rState.streak++;
        if (action.tag === 'Pular') { worldState.runner.pose = 'jump'; worldState.runner.vy = -450; synth.jump(); }
        else if (action.tag === 'Abaixar') { worldState.runner.pose = 'duck'; worldState.runner.poseTimer = 0.52; synth.duck(); }
        else if (action.tag === 'BeberAgua') { worldState.runner.pose = 'drink'; worldState.runner.poseTimer = 0.45; rState.hydration = Math.min(100, rState.hydration + 38); synth.drink(); }
        else if (action.tag === 'Combo') { worldState.runner.pose = 'jump'; worldState.runner.vy = -480; synth.win(); }
        else synth.chip(rState.streak);

        const m = rState.compiledProgram.metrics;
        let chips = obs.type === 'combo' ? 50 : obs.type === 'livre' ? 15 : 25, mult = 1;
        const triggered = [];
        for (const slug of rState.activeJokers) {
          if (slug === 'PUREZA_LAMBDA') { chips += 20; triggered.push(slug); }
          if (slug === 'GUARDA_REAL' && (m.usesGuards || m.usesPatternMatch)) { mult += 10; triggered.push(slug); }
          if (slug === 'RECURSAO_INFINITA' && rState.streak >= 3) { mult *= 1.5; triggered.push(slug); }
          if (slug === 'ORDEM_SUPERIOR' && m.usesHOF) { mult *= 2.0; triggered.push(slug); unlockAchievement('hof_master'); }
          if (slug === 'CODIGO_ENXUTO' && m.lineCount <= 5) { chips += 35; triggered.push(slug); }
          if (slug === 'MESTRE_HIDRATADO' && rState.hydration >= 70) { mult += 8; triggered.push(slug); }
        }
        rState.chips += chips; rState.mult = mult;
        const gained = chips * mult; rState.roundScore += gained;

        const cb = document.getElementById('chipsBox'), mb = document.getElementById('multBox');
        cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop');
        mb.classList.remove('pop'); void mb.offsetWidth; mb.classList.add('pop');
        triggered.forEach((s, idx) => setTimeout(() => {
          const el = document.querySelector(`.joker-chip[data-joker="${s}"]`);
          if (el) { el.classList.remove('triggered'); void el.offsetWidth; el.classList.add('triggered'); }
        }, idx * 75));

        worldState.floatingTexts.push({ x: rx + 18, y: gy - 78, text: `+${fmt(gained)}`, color: '#f5efe6', life: 0.9 });
        if (rState.roundScore >= rState.targetScore && !rState.blindCleared) onBlindCleared();
      } else {
        rState.streak = 0; rState.mult = 1; rState.hydration = Math.max(8, rState.hydration - 15);
        worldState.runner.pose = 'hit'; worldState.runner.poseTimer = 0.35; synth.hit();
        worldState.floatingTexts.push({ x: rx, y: gy - 72, text: `${action.tag}?`, color: '#b84a4a', life: 0.9 });
        const st = document.getElementById('statusText');
        st.className = 'feedback-line err'; st.textContent = `Em "${obs.type}", sua funcao retornou ${action.tag}.`;
      }
    } catch (err) {
      const st = document.getElementById('statusText');
      st.className = 'feedback-line err'; st.textContent = err.message;
    }
    updateRunnerHud();
  }

  async function onBlindCleared() {
    rState.blindCleared = true;
    worldState.paused = true;
    synth.win();

    const starsEarned = rState.level?.starsReward || (45 + (rState.ante - 1) * 30);
    await ArcadeAPI.submitRun({
      game: 'runner',
      seed: rState.seed,
      tier: rState.ante,
      score: Math.floor(rState.roundScore),
      starsWon: starsEarned,
      hofMult: rState.serverHofMult || 1.0,
      code: wb.getValue()
    });

    if (rState.ante === 1) unlockAchievement('first_clear');
    if (!rState.compiledProgram?.metrics?.usesIf && rState.ante >= 2) unlockAchievement('no_if');
    if (rState.roundScore >= 2000) unlockAchievement('big_score');

    document.getElementById('starsEarnedText').textContent = starsEarned;
    const draftGrid = document.getElementById('jokerDraftGrid');
    const candidates = ALL_JOKERS.filter(j => !rState.activeJokers.includes(j.slug));
    const picks = (candidates.length >= 2 ? candidates : ALL_JOKERS).slice(0, 3);
    draftGrid.innerHTML = picks.map(j => `<div class="draft-card" data-pick="${j.slug}"><span class="j-icon">${j.icon}</span><b>${j.name}</b><span class="j-val ${j.kind}">${j.tag}</span><small style="font-size:11px;color:#635049">${j.desc}</small></div>`).join('');
    draftGrid.querySelectorAll('.draft-card').forEach(c => c.addEventListener('click', () => {
      if (!rState.activeJokers.includes(c.dataset.pick)) rState.activeJokers.push(c.dataset.pick);
      advanceRunnerStage();
    }));
    document.getElementById('victoryOverlay').classList.remove('hidden');
  }

  function advanceRunnerStage() {
    loadRunnerStage(rState.seed, rState.ante + 1, true);
  }

  document.getElementById('readyPlayBtn').addEventListener('click', () => compileRunnerSpell(false));
  document.getElementById('runBtn').addEventListener('click', () => compileRunnerSpell(false));
  document.getElementById('nextMissionBtn').addEventListener('click', advanceRunnerStage);
  document.getElementById('pauseBtn').addEventListener('click', (e) => {
    if (!rState.started) return compileRunnerSpell(false);
    worldState.paused = !worldState.paused;
    e.target.textContent = worldState.paused ? 'Retomar' : 'Pausar';
  });
  document.getElementById('toggleDrawerBtn').addEventListener('click', (e) => {
    worldState.drawerMinimized = !worldState.drawerMinimized;
    document.getElementById('logicDock').classList.toggle('minimized', worldState.drawerMinimized);
    e.target.textContent = worldState.drawerMinimized ? 'Mostrar codigo' : 'Recolher codigo';
  });
  document.getElementById('hintBtn').addEventListener('click', () => {
    const lvl = rState.level;
    document.getElementById('infoModalTitle').textContent = lvl ? `Lambda Runner — Ante ${rState.ante}` : 'Dica';
    document.getElementById('infoModalBody').innerHTML = `<p>${lvl?.hint || 'Use Guards (|) e funcoes puras.'}</p><pre>${(lvl?.starterCode || '').replace(/</g, '&lt;')}</pre>`;
    document.getElementById('infoModal').classList.remove('hidden');
  });

  window.initRunnerStage = (seed = null, tier = 1) => loadRunnerStage(seed, tier, false);
})();