/* =========================================================================
   GAME 03: BASTION GUARD — Mapa, Estrada e Ondas Procedurais + PostgreSQL
   ========================================================================= */

(function () {
  function mountBastionView() {
    if (document.getElementById('bastionView')) return;
    const sec = document.createElement('section');
    sec.id = 'bastionView';
    sec.className = 'bastion-view hidden';
    sec.innerHTML = `
      <canvas id="bastionCanvas"></canvas>
      <div class="bastion-damage-vignette" id="bDamageVignette"></div>

      <div class="runner-subhud">
        <div class="subhud-left">
          <div class="stage-tag">
            <span class="stage-num" id="bStageNum">01</span>
            <span id="bStageName">Onda 1</span>
          </div>
          <div class="stage-dots-nav" id="bLevelNav"></div>
        </div>
        <div class="subhud-right">
          <div class="score-strip">
            <span class="chip-tag" id="bChipsBox"><b id="bChipsVal">0</b></span>
            <span class="times-sep">x</span>
            <span class="mult-tag" id="bMultBox"><b id="bMultVal">1</b></span>
            <span class="strip-sep"></span>
            <span class="total-readout">Ouro <b id="bManaVal">95</b></span>
            <span class="strip-sep"></span>
            <span class="total-readout">Bastiao <b id="bHpVal">100</b></span>
          </div>
        </div>
      </div>

      <div class="bastion-hud-bar">
        <div class="tower-palette" id="bTowerPalette">
          <button class="tower-pick active" data-ttype="arcane"><span class="tower-dot" style="background:#c86d58"></span>Arcana 45g</button>
          <button class="tower-pick" data-ttype="frost"><span class="tower-dot" style="background:#5c8d76"></span>Prisma 60g</button>
          <button class="tower-pick" data-ttype="mortar"><span class="tower-dot" style="background:#d49b38"></span>Morteiro 75g</button>
          <span style="font-size:11px;color:#635049;padding:0 4px">Clique no + para construir ou na torre para evoluir</span>
        </div>

        <div style="display:flex;align-items:center;gap:8px">
          <div class="stepper-bar">
            <button class="step-btn" id="bStepBackBtn" title="Voltar 1 tick">-1</button>
            <button class="step-btn" id="bPauseStepBtn" title="Pausar/Retomar">Pausa</button>
            <button class="step-btn" id="bStepFwdBtn" title="Avancar 1 tick">+1</button>
          </div>
          <span class="bastion-pill" id="bWaveStatus">Onda em espera</span>
        </div>
      </div>

      <div class="bastion-defeat-banner hidden" id="bDefeatBanner">
        <h3>Bastiao Destruido!</h3>
        <p id="bDefeatReason">Os inimigos romperam as defesas da fortaleza.</p>
        <div class="bastion-defeat-diag" id="bDefeatDiag">Diagnostico...</div>
        <div class="bastion-defeat-actions">
          <button class="btn-ghost" id="bDefeatRewindBtn" style="background:#ebe2d4;color:#272022;border-color:#d4c7b8">Voltar 2s</button>
          <button class="btn-primary" id="bDefeatRetryBtn" style="flex:none">Tentar Onda Novamente</button>
        </div>
      </div>

      <section class="logic-dock" id="bastionDock">
        <div class="workbench-card bastion-workbench">
          <div class="editor-col">
            <div class="editor-toolbar">
              <span class="panel-label">MIRA &amp; ATAQUE</span>
              <div class="type-xray-bar" id="bastionTypeBar"></div>
              <div class="quick-tokens">
                <button class="tok-btn btok" data-snip="filter (\\e -> escudo e == 0) ">filter</button>
                <button class="tok-btn btok" data-snip="map (receberDano 55) ">map</button>
                <button class="tok-btn btok" data-snip="foldl (+) 0 ">foldl</button>
                <button class="tok-btn btok" data-snip=" . ">.</button>
              </div>
            </div>
            <div class="code-box">
              <div class="line-nums" id="bastionLineNumbers">1</div>
              <div class="code-layers">
                <pre class="code-hl" id="bastionCodeHighlight" aria-hidden="true"></pre>
                <textarea id="bastionCodeEditor" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
              </div>
            </div>
          </div>
          <div class="logic-col">
            <div class="cases-header">
              <span class="panel-label">PIPELINE DE DADOS</span>
              <span class="cases-count" id="bSynergyBadge">HOF x1</span>
            </div>
            <div class="bastion-preview-box" id="bPreviewBox">
              Edite a funcao e clique em Iniciar Onda!
            </div>
            <div class="feedback-line" id="bFeedback">Posicione torres e aplique sua logica Haskell.</div>
            <div class="action-row">
              <button class="btn-primary" id="bStartWaveBtn">Iniciar Onda</button>
              <button class="btn-ghost" id="bResetBtn">Reiniciar</button>
              <button class="btn-ghost" id="bHintBtn">?</button>
            </div>
          </div>
        </div>
      </section>
    `;
    document.body.appendChild(sec);
  }

  mountBastionView();

  const TOWER_TYPES = {
    arcane: { name: 'Arcana',   cost: 45, power: 34, rate: 0.90, color: '#c86d58', splash: 0,  slow: 0 },
    frost:  { name: 'Prisma',   cost: 60, power: 24, rate: 0.95, color: '#5c8d76', splash: 0,  slow: 0.45 },
    mortar: { name: 'Morteiro', cost: 75, power: 58, rate: 1.65, color: '#d49b38', splash: 56, slow: 0 }
  };

  function runBastionFn(funcs, mainName, inputArg) {
    const base = window.LambdaVM.createRuntime(funcs);
    const rt = window.LambdaVM.createRuntime(funcs, {
      vida: base.mkB(1, e => e.hp),
      escudo: base.mkB(1, e => e.shield),
      tipo: base.mkB(1, e => e.type),
      progresso: base.mkB(1, e => Math.round((e.t || 0) * 100)),
      receberDano: base.mkB(2, (d, e) => ({ ...e, dmgTaken: (e.dmgTaken || 0) + d }))
    });
    return rt.call(mainName, [inputArg]);
  }

  const bCanvas = document.getElementById('bastionCanvas');
  const bCtx = bCanvas.getContext('2d');
  let bW = window.innerWidth, bH = window.innerHeight;

  function resizeBastionCanvas() {
    const dpr = window.devicePixelRatio || 1;
    bW = window.innerWidth; bH = window.innerHeight;
    bCanvas.width = bW * dpr; bCanvas.height = bH * dpr;
    bCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeBastionCanvas);
  resizeBastionCanvas();

  const bState = {
    seed: 1, tier: 1, level: null, loadSeq: 0,
    gold: 95, bastionHp: 100, chips: 0, mult: 1, serverHofMult: 1.0,
    selectedTool: 'arcane',
    waveActive: false, paused: false, waveDone: false, defeated: false,
    spawnQueue: [], spawnTimer: 0, enemies: [], projectiles: [], particles: [], popups: [],
    nextEnemyId: 1, compiled: null, history: [], snapTimer: 0, keepShake: 0,
    shieldBlockedCount: 0, leakedTypes: [], targetedIds: new Set(), primaryTargetId: null,
    hoveredPad: null,
    pads: [],
    trees: []
  };

  let seedBar = null;
  function ensureSeedBar() {
    if (!seedBar && window.ArcadeUI?.createSeedBar) {
      seedBar = window.ArcadeUI.createSeedBar('bLevelNav', {
        game: 'bastion',
        onSelect: (newSeed, newTier) => loadBastionLevel(newSeed, newTier)
      });
    }
    return seedBar;
  }

  const wb = window.LambdaVM.createCodeWorkbench({
    editorId: 'bastionCodeEditor', highlightId: 'bastionCodeHighlight', lineNumsId: 'bastionLineNumbers',
    tokSelector: '.tok-btn.btok', typeBarId: 'bastionTypeBar',
    onRun: () => startBastionWave(),
    onInput: () => compileAndPreviewBastion(true)
  });

  function getPlayBounds() {
    const topY = Math.max(182, bH * 0.27);
    const botY = Math.min(bH - 255, bH * 0.72);
    return { topY, botY, midY: (topY + botY) * 0.5, spanY: Math.max(140, botY - topY) };
  }

  function catmullRom(p0, p1, p2, p3, u) {
    const u2 = u * u, u3 = u2 * u;
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  }

  function getPathPos(t) {
    const { topY, botY, midY, spanY } = getPlayBounds();
    const pts = bState.level?.path;
    if (!Array.isArray(pts) || pts.length < 2) {
      return {
        x: 44 + t * (bW - 140),
        y: midY + Math.sin(t * Math.PI * 2.15) * (spanY * 0.32)
      };
    }
    const clampedT = Math.max(0, Math.min(1, t));
    const segTotal = pts.length - 1;
    const f = clampedT * segTotal;
    const i = Math.min(segTotal - 1, Math.floor(f));
    const u = f - i;
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[Math.min(segTotal, i + 1)];
    const p3 = pts[Math.min(segTotal, i + 2)];
    const nx = catmullRom(p0.nx, p1.nx, p2.nx, p3.nx, u);
    const ny = Math.max(0.12, Math.min(0.88, catmullRom(p0.ny, p1.ny, p2.ny, p3.ny, u)));
    return {
      x: 34 + nx * (bW - 96),
      y: topY + ny * (botY - topY)
    };
  }

  function getPadPos(pad) {
    const { topY, botY } = getPlayBounds();
    return {
      x: 34 + pad.nx * (bW - 96),
      y: topY + pad.ny * (botY - topY)
    };
  }

  function triggerDamageFlash(msg) {
    bState.keepShake = 1;
    const vig = document.getElementById('bDamageVignette');
    if (vig) {
      vig.classList.remove('flash'); void vig.offsetWidth; vig.classList.add('flash');
      setTimeout(() => vig.classList.remove('flash'), 60);
    }
    const status = document.getElementById('bWaveStatus');
    status.textContent = msg;
    status.classList.add('danger');
    setTimeout(() => status.classList.remove('danger'), 1200);
  }

  function snapshotBastion() {
    bState.history.push(JSON.stringify({
      gold: bState.gold, bastionHp: bState.bastionHp, chips: bState.chips,
      spawnQueue: bState.spawnQueue, spawnTimer: bState.spawnTimer,
      enemies: bState.enemies, pads: bState.pads,
      shieldBlockedCount: bState.shieldBlockedCount, leakedTypes: bState.leakedTypes
    }));
    if (bState.history.length > 40) bState.history.shift();
  }

  function restoreBastionSnap(steps = 1) {
    if (!bState.history.length) return;
    let snap = null;
    for (let i = 0; i < steps && bState.history.length > 0; i++) snap = JSON.parse(bState.history.pop());
    if (!snap) return;
    Object.assign(bState, {
      gold: snap.gold, bastionHp: snap.bastionHp, chips: snap.chips,
      spawnQueue: snap.spawnQueue, spawnTimer: snap.spawnTimer,
      enemies: snap.enemies, pads: snap.pads,
      shieldBlockedCount: snap.shieldBlockedCount || 0, leakedTypes: snap.leakedTypes || [],
      projectiles: [], popups: [], defeated: false, waveActive: true
    });
    document.getElementById('bDefeatBanner').classList.add('hidden');
    document.getElementById('bWaveStatus').classList.remove('danger');
    document.getElementById('bWaveStatus').textContent = 'Voltou no tempo (pausado)';
    updateBastionHud();
  }

  function updateBastionHud() {
    document.getElementById('bChipsVal').textContent = fmt(bState.chips);
    document.getElementById('bMultVal').textContent = Number.isInteger(bState.mult) ? bState.mult : bState.mult.toFixed(1);
    document.getElementById('bManaVal').textContent = bState.gold;
    document.getElementById('bHpVal').textContent = bState.bastionHp;
  }

  function resetBastionArena(preserveCode = false) {
    const lvl = bState.level;
    if (!lvl) return;
    bState.gold = lvl.startGold || 95;
    bState.bastionHp = 100;
    bState.chips = 0;
    bState.mult = 1;
    bState.waveActive = false;
    bState.paused = false;
    bState.waveDone = false;
    bState.defeated = false;
    bState.enemies = [];
    bState.projectiles = [];
    bState.particles = [];
    bState.popups = [];
    bState.history = [];
    bState.shieldBlockedCount = 0;
    bState.leakedTypes = [];
    bState.targetedIds = new Set();
    bState.primaryTargetId = null;

    bState.pads = (lvl.pads || []).map((p, i) => ({
      nx: p.nx,
      ny: p.ny,
      tower: (p.hasStarter || i === 0)
        ? { type: 'arcane', level: 1, power: TOWER_TYPES.arcane.power, cooldown: 0, angle: 0 }
        : null
    }));
    bState.trees = lvl.trees || [];

    document.getElementById('bDefeatBanner').classList.add('hidden');
    document.getElementById('bWaveStatus').classList.remove('danger');
    document.getElementById('bWaveStatus').textContent = 'Onda em espera';
    document.getElementById('bStartWaveBtn').textContent = 'Iniciar Onda';
    document.getElementById('bPauseStepBtn').textContent = 'Pausa';

    if (!preserveCode) wb.setValue(lvl.starterCode || '');
    compileAndPreviewBastion(true);
    updateBastionHud();
    resizeBastionCanvas();
  }

  async function loadBastionLevel(seed = null, tier = 1) {
    const reqId = ++bState.loadSeq;
    ensureSeedBar();

    const fb = document.getElementById('bFeedback');
    fb.className = 'feedback-line';
    fb.textContent = 'Gerando vale e onda procedural no servidor Servant...';

    try {
      const data = await ArcadeAPI.fetchLevel('bastion', seed, tier);
      if (reqId !== bState.loadSeq) return;

      const lvl = data.glPayload;
      bState.seed = data.glSeed;
      bState.tier = data.glTier;
      bState.level = lvl;

      seedBar?.update(bState.seed, bState.tier);

      document.getElementById('bStageNum').textContent = lvl.num || String(bState.tier);
      document.getElementById('bStageName').textContent = lvl.name || `Ante ${bState.tier}`;
      document.getElementById('missionEyebrow').textContent = lvl.eyebrow || `BASTION · ANTE ${bState.tier}`;
      document.getElementById('missionTitle').textContent = lvl.title || 'Defenda o Vale';
      document.getElementById('missionSub').innerHTML = lvl.sub || '';
      wb.setTypeSig(lvl.sig || '[Inimigo] -> [Inimigo]');

      resetBastionArena(false);
    } catch (err) {
      if (reqId !== bState.loadSeq) return;
      fb.className = 'feedback-line err';
      fb.textContent = err.message || 'Erro ao carregar onda do servidor.';
      synth.hit();
    }
  }

  function renderPipelinePreview(sample, res, code, lvl) {
    const prev = document.getElementById('bPreviewBox');
    if (lvl.mode === 'FOLD') {
      const powers = bState.pads.filter(p => p.tower).map(p => p.tower.power);
      prev.innerHTML = `<div class="pipeline-bar"><span class="pipe-step">[${powers.join(', ')}]</span><span class="pipe-arrow">-foldl-&gt;</span><span class="pipe-step">Raio: ${res} dano</span></div>`;
      return;
    }
    const stages = [`<span class="pipe-step">${sample.length} Inimigos</span>`];
    if (/\bfilter\b/.test(code)) stages.push(`<span class="pipe-arrow">-filter-&gt;</span><span class="pipe-step">${res.length} alvos</span>`);
    if (/\bmap\b/.test(code)) stages.push(`<span class="pipe-arrow">-map-&gt;</span><span class="pipe-step">${res.map(e => e.dmgTaken ? `${e.type} -${e.dmgTaken}` : e.type).join(', ') || '[]'}</span>`);
    if (stages.length === 1) stages.push(`<span class="pipe-arrow">-&gt;</span><span class="pipe-step">${res.length} alvos (sem filtro!)</span>`);
    prev.innerHTML = `<div class="pipeline-bar">${stages.join('')}</div>`;
  }

  function refreshLiveTargets() {
    const lvl = bState.level;
    bState.targetedIds = new Set();
    bState.primaryTargetId = null;
    if (!lvl || !bState.compiled || bState.enemies.length === 0) return;
    if (lvl.mode === 'FOLD') {
      bState.primaryTargetId = bState.enemies[0].id;
      bState.targetedIds.add(bState.enemies[0].id);
      return;
    }
    try {
      const selected = runBastionFn(bState.compiled.funcs, bState.compiled.mainName, bState.enemies.map(e => ({ ...e, dmgTaken: 0 })));
      if (Array.isArray(selected) && selected.length > 0) {
        bState.primaryTargetId = selected[0].id;
        selected.forEach(s => bState.targetedIds.add(s.id));
      }
    } catch {}
  }

  function compileAndPreviewBastion(silent = false) {
    const lvl = bState.level;
    if (!lvl) return false;
    const fb = document.getElementById('bFeedback');
    const syn = document.getElementById('bSynergyBadge');
    const code = wb.getValue();

    try {
      const funcs = window.LambdaVM.compileModule(code);
      const mainName = funcs.atacar ? 'atacar' : funcs.alvos ? 'alvos' : funcs.poderTotal ? 'poderTotal' : Object.keys(funcs)[0];
      if (!mainName) throw new Error('Defina a funcao principal.');
      bState.compiled = { funcs, mainName };

      let mult = 1;
      if (/\bfilter\b/.test(code)) mult += 1;
      if (/\bmap\b/.test(code)) mult += 1;
      if (/\bfold[lr]\b/.test(code)) mult += 1.5;
      if (/\s\.\s|\s\$\s/.test(code)) mult += 1.5;
      bState.mult = mult;
      syn.textContent = `HOF x${mult}`;

      if (lvl.mode === 'FOLD') {
        const powers = bState.pads.filter(p => p.tower).map(p => p.tower.power);
        const total = runBastionFn(funcs, mainName, powers);
        renderPipelinePreview(powers, total, code, lvl);
      } else {
        const sample = (lvl.wave || []).slice(0, 3).map((w, idx) => ({ id: idx + 1, ...w, t: 0.2, dmgTaken: 0 }));
        const res = runBastionFn(funcs, mainName, sample);
        if (!Array.isArray(res)) throw new Error('Sua funcao deve retornar uma lista [Inimigo].');
        renderPipelinePreview(sample, res, code, lvl);
      }

      refreshLiveTargets();
      fb.className = 'feedback-line ok';
      fb.textContent = 'Logica validada nas torres!';
      updateBastionHud();
      if (!silent) synth.chip(3);
      return true;
    } catch (err) {
      fb.className = 'feedback-line err';
      fb.textContent = window.LambdaVM.translateError(err.message, code);
      if (!silent) synth.hit();
      return false;
    }
  }

  async function startBastionWave() {
    const lvl = bState.level;
    if (!lvl) return;
    if (!compileAndPreviewBastion(false)) return;

    const code = wb.getValue();
    try {
      const valResp = await ArcadeAPI.validateCode('bastion', code, bState.tier);
      if (!valResp.vrValid) {
        document.getElementById('bFeedback').className = 'feedback-line err';
        document.getElementById('bFeedback').textContent = valResp.vrMessage || 'Regra do modo nao atendida.';
        window.ArcadeUI?.showToast('Regra do Ante', valResp.vrMessage);
        synth.hit();
        return;
      }
      bState.serverHofMult = valResp.vrHofMult || 1.0;
    } catch (err) {
      document.getElementById('bFeedback').className = 'feedback-line err';
      document.getElementById('bFeedback').textContent = err.message || 'Falha ao validar no servidor.';
      synth.hit();
      return;
    }

    if (bState.defeated) resetBastionArena(true);
    if (bState.waveActive) return;

    bState.spawnQueue = (lvl.wave || []).map(w => ({ ...w }));
    bState.spawnTimer = 0.25;
    bState.waveActive = true;
    bState.paused = false;
    bState.waveDone = false;
    bState.defeated = false;
    bState.history = [];
    snapshotBastion();

    document.getElementById('bDefeatBanner').classList.add('hidden');
    document.getElementById('bWaveStatus').classList.remove('danger');
    document.getElementById('bWaveStatus').textContent = 'Onda em andamento!';
    document.getElementById('bStartWaveBtn').textContent = 'Atualizar Codigo';
  }

  function spawnBurst(x, y, col, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
      bState.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.5 + Math.random() * 2.5, col, life: 0.45 });
    }
  }

  bCanvas.addEventListener('mousemove', (e) => {
    const rect = bCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    bState.hoveredPad = bState.pads.find(p => {
      const pos = getPadPos(p);
      return Math.hypot(mx - pos.x, my - pos.y) <= 26;
    }) || null;
  });

  bCanvas.addEventListener('click', (e) => {
    const rect = bCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const pad of bState.pads) {
      const pos = getPadPos(pad);
      if (Math.hypot(mx - pos.x, my - pos.y) <= 26) {
        if (!pad.tower) {
          const spec = TOWER_TYPES[bState.selectedTool];
          if (bState.gold >= spec.cost) {
            bState.gold -= spec.cost;
            pad.tower = { type: bState.selectedTool, level: 1, power: spec.power, cooldown: 0, angle: 0 };
            spawnBurst(pos.x, pos.y, spec.color, 10);
            synth.chip(4);
            compileAndPreviewBastion(true);
            updateBastionHud();
          } else {
            document.getElementById('bFeedback').textContent = `Ouro insuficiente (precisa de ${spec.cost}g).`;
            synth.hit();
          }
        } else if (pad.tower.level < 3) {
          const upCost = 50;
          if (bState.gold >= upCost) {
            bState.gold -= upCost;
            pad.tower.level++;
            pad.tower.power = Math.round(pad.tower.power * 1.45);
            spawnBurst(pos.x, pos.y, '#d49b38', 12);
            synth.win();
            compileAndPreviewBastion(true);
            updateBastionHud();
          } else {
            document.getElementById('bFeedback').textContent = `Evoluir para Lv.${pad.tower.level + 1} custa ${upCost}g.`;
            synth.hit();
          }
        }
        break;
      }
    }
  });

  let bLast = performance.now();
  function bastionLoop(now) {
    const dt = Math.min(0.05, (now - bLast) / 1000);
    bLast = now;
    if (worldState.mode === 'bastion') {
      if (bState.keepShake > 0) bState.keepShake = Math.max(0, bState.keepShake - dt * 3);
      if (bState.waveActive && !bState.paused && !bState.defeated) {
        bState.snapTimer += dt;
        if (bState.snapTimer >= 0.45) { bState.snapTimer = 0; snapshotBastion(); }
        updateBastionSim(dt);
      } else {
        for (let i = bState.particles.length - 1; i >= 0; i--) {
          const p = bState.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          if (p.life <= 0) bState.particles.splice(i, 1);
        }
        for (let i = bState.popups.length - 1; i >= 0; i--) {
          bState.popups[i].y -= 28 * dt; bState.popups[i].life -= dt;
          if (bState.popups[i].life <= 0) bState.popups.splice(i, 1);
        }
      }
      renderBastionScene(now * 0.001);
    }
    requestAnimationFrame(bastionLoop);
  }

  function onBastionDefeat() {
    bState.waveActive = false;
    bState.defeated = true;
    const kp = getPathPos(1);
    spawnBurst(kp.x + 12, kp.y, '#b84a4a', 22);
    spawnBurst(kp.x + 12, kp.y - 16, '#4a4347', 14);
    synth.hit();

    const status = document.getElementById('bWaveStatus');
    status.textContent = 'Derrota! Bastiao destruido';
    status.classList.add('danger');
    document.getElementById('bStartWaveBtn').textContent = 'Tentar Novamente';

    const code = wb.getValue();
    const lvl = bState.level;
    const towerCount = bState.pads.filter(p => p.tower).length;
    let diag = 'Construa mais torres nos circulos (+) ou ajuste sua logica Haskell!';
    if (bState.shieldBlockedCount >= 3 || (lvl?.mode === 'TARGETS' && !/\bfilter\b/.test(code))) {
      diag = `Diagnostico: suas torres desperdicam tiros nos escudos dos Golems (${bState.shieldBlockedCount} bloqueios)! Use filter (\\e -> escudo e == 0).`;
    } else if (lvl?.mode === 'FOLD' && !/\bfold[lr]\b/.test(code)) {
      diag = 'Diagnostico: poderTotal ainda esta fixo! Use foldl (+) 0 torres para somar todas as torres.';
    } else if (towerCount < 2) {
      diag = `Diagnostico: voce so construiu ${towerCount} torre! Use seu Ouro clicando nos circulos (+).`;
    } else if (lvl?.mode === 'DAMAGE' && !/\bmap\b/.test(code)) {
      diag = 'Diagnostico: faltou dano explosivo! Use map e receberDano para abater os Wisps velozes.';
    }

    document.getElementById('bDefeatReason').textContent = `${bState.leakedTypes.length} inimigos (${bState.leakedTypes.join(', ')}) romperam as defesas do Bastiao.`;
    document.getElementById('bDefeatDiag').textContent = diag;
    document.getElementById('bDefeatBanner').classList.remove('hidden');
  }

  function updateBastionSim(dt) {
    const lvl = bState.level;
    if (!lvl) return;

    if (bState.spawnQueue.length > 0) {
      bState.spawnTimer -= dt;
      if (bState.spawnTimer <= 0) {
        const next = bState.spawnQueue.shift();
        bState.enemies.push({ id: bState.nextEnemyId++, ...next, maxHp: next.hp, t: 0, slowTimer: 0, hitFlash: 0, shieldFlash: 0, dmgTaken: 0 });
        bState.spawnTimer = next.type === 'boss' ? 1.8 : 1.35;
      }
    }

    for (let i = bState.enemies.length - 1; i >= 0; i--) {
      const en = bState.enemies[i];
      if (en.slowTimer > 0) en.slowTimer -= dt;
      if (en.hitFlash > 0) en.hitFlash -= dt;
      if (en.shieldFlash > 0) en.shieldFlash -= dt;
      en.t += en.speed * (en.slowTimer > 0 ? 0.55 : 1) * dt;
      if (en.t >= 1) {
        const dmgToKeep = en.type === 'boss' ? 60 : 25;
        bState.bastionHp = Math.max(0, bState.bastionHp - dmgToKeep);
        bState.leakedTypes.push(en.type);
        const kp = getPathPos(1);
        bState.popups.push({ x: kp.x + 8, y: kp.y - 46, text: `-${dmgToKeep} HP!`, col: '#ff6b6b', life: 1.0 });
        spawnBurst(kp.x + 12, kp.y, '#b84a4a', 12);
        triggerDamageFlash(`Dano no Bastiao! (${bState.bastionHp} HP)`);
        bState.enemies.splice(i, 1);
        synth.hit();
        updateBastionHud();
      }
    }

    refreshLiveTargets();

    const activeTowers = bState.pads.filter(p => p.tower);
    if (bState.enemies.length > 0 && bState.compiled) {
      if (lvl.mode === 'FOLD') {
        const leadPad = activeTowers[0];
        if (leadPad) {
          leadPad.tower.cooldown -= dt;
          if (leadPad.tower.cooldown <= 0) {
            leadPad.tower.cooldown = 1.25;
            try {
              const totalDmg = runBastionFn(bState.compiled.funcs, bState.compiled.mainName, activeTowers.map(p => p.tower.power));
              const target = bState.enemies[0];
              if (typeof totalDmg === 'number' && target) {
                const pos = getPathPos(target.t);
                activeTowers.forEach(p => {
                  const tp = getPadPos(p);
                  p.tower.angle = Math.atan2(pos.y - tp.y, pos.x - tp.x);
                  bState.projectiles.push({ x: tp.x, y: tp.y - 12, sx: tp.x, sy: tp.y - 12, tx: pos.x, ty: pos.y, targetId: target.id, dmg: totalDmg / activeTowers.length, color: '#d49b38', splash: 0, slow: 0, prog: 0 });
                });
                synth.jump();
              }
            } catch {}
          }
        }
      } else {
        for (const pad of activeTowers) {
          const spec = TOWER_TYPES[pad.tower.type];
          pad.tower.cooldown -= dt;
          if (pad.tower.cooldown <= 0) {
            pad.tower.cooldown = spec.rate;
            try {
              const snapshot = bState.enemies.map(e => ({ ...e, dmgTaken: 0 }));
              const selected = runBastionFn(bState.compiled.funcs, bState.compiled.mainName, snapshot);
              if (Array.isArray(selected) && selected.length > 0) {
                const chosen = selected[0];
                const realEnemy = bState.enemies.find(e => e.id === chosen.id);
                if (realEnemy) {
                  const pos = getPathPos(realEnemy.t), tp = getPadPos(pad);
                  pad.tower.angle = Math.atan2(pos.y - tp.y, pos.x - tp.x);
                  const baseDmg = chosen.dmgTaken ? Math.round(chosen.dmgTaken * (1 + (pad.tower.level - 1) * 0.35)) : pad.tower.power;
                  const dmg = realEnemy.shield > 0 ? 0 : baseDmg;
                  bState.projectiles.push({
                    x: tp.x, y: tp.y - 12, sx: tp.x, sy: tp.y - 12, tx: pos.x, ty: pos.y,
                    targetId: realEnemy.id, dmg, color: spec.color, splash: spec.splash, slow: spec.slow, prog: 0
                  });
                  synth.chip(2);
                }
              }
            } catch {}
          }
        }
      }
    }

    for (let i = bState.projectiles.length - 1; i >= 0; i--) {
      const pr = bState.projectiles[i];
      pr.prog += dt * 5.2;
      const en = bState.enemies.find(e => e.id === pr.targetId);
      if (en) {
        const ep = getPathPos(en.t);
        pr.tx = ep.x; pr.ty = ep.y;
      }
      pr.x = pr.sx + (pr.tx - pr.sx) * Math.min(1, pr.prog);
      pr.y = pr.sy + (pr.ty - pr.sy) * Math.min(1, pr.prog);

      if (pr.prog >= 1) {
        if (pr.dmg === 0) {
          bState.shieldBlockedCount++;
          if (en) en.shieldFlash = 0.32;
          bState.popups.push({ x: pr.tx, y: pr.ty - 24, text: 'BLOQUEADO!', col: '#ffd166', life: 0.78 });
          spawnBurst(pr.tx, pr.ty, '#ffd166', 7);
          if (bState.shieldBlockedCount === 2) {
            document.getElementById('bFeedback').className = 'feedback-line err';
            document.getElementById('bFeedback').textContent = 'Tiros bloqueados no escudo! Filtre (escudo e == 0)!';
          }
        } else {
          const targets = pr.splash > 0
            ? bState.enemies.filter(e => { const p = getPathPos(e.t); return Math.hypot(p.x - pr.tx, p.y - pr.ty) <= pr.splash && e.shield === 0; })
            : (en ? [en] : []);

          for (const tg of targets) {
            const tp = getPathPos(tg.t);
            tg.hp -= pr.dmg;
            tg.hitFlash = 0.14;
            if (pr.slow > 0) tg.slowTimer = 1.6;
            bState.popups.push({ x: tp.x, y: tp.y - 24, text: `-${Math.round(pr.dmg)}`, col: '#faf6f0', life: 0.65 });
            if (tg.hp <= 0) {
              const idx = bState.enemies.indexOf(tg);
              if (idx !== -1) bState.enemies.splice(idx, 1);
              spawnBurst(tp.x, tp.y, pr.color, 12);
              bState.gold += 22; bState.chips += 35;
              bState.popups.push({ x: tp.x + 12, y: tp.y - 36, text: '+22g', col: '#e2b86b', life: 0.75 });
              updateBastionHud();
            }
          }
          if (pr.splash > 0) spawnBurst(pr.tx, pr.ty, '#d49b38', 10);
        }
        bState.projectiles.splice(i, 1);
      }
    }

    for (let i = bState.particles.length - 1; i >= 0; i--) {
      const p = bState.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) bState.particles.splice(i, 1);
    }
    for (let i = bState.popups.length - 1; i >= 0; i--) {
      bState.popups[i].y -= 28 * dt; bState.popups[i].life -= dt;
      if (bState.popups[i].life <= 0) bState.popups.splice(i, 1);
    }

    if (bState.bastionHp <= 0) {
      onBastionDefeat();
    } else if (bState.spawnQueue.length === 0 && bState.enemies.length === 0 && !bState.waveDone) {
      bState.waveDone = true; bState.waveActive = false;
      onBastionWaveCleared();
    }
  }

  async function onBastionWaveCleared() {
    const lvl = bState.level;
    const earned = Math.round((lvl?.starsReward || 70) * (bState.mult / 2 + 0.5));
    const totalScore = Math.round(bState.chips * bState.mult) + earned;

    await ArcadeAPI.submitRun({
      game: 'bastion',
      seed: bState.seed,
      tier: bState.tier,
      score: totalScore,
      starsWon: earned,
      hofMult: Math.max(bState.mult, bState.serverHofMult || 1.0),
      code: wb.getValue()
    });

    unlockAchievement('bastion_defender');
    synth.win();

    document.getElementById('bWaveStatus').textContent = `Onda defendida! +${earned} estrelas`;
    const nextTier = bState.tier + 1;
    document.getElementById('infoModalTitle').textContent = `Vale ${lvl?.num || bState.tier} Defendido!`;
    document.getElementById('infoModalBody').innerHTML = `
      <p>Seu codigo protegeu o Bastiao na Seed #${bState.seed} e rendeu <b class="star-inline">+${earned} ${ArcadeUI.SVGS.star}</b> (HOF x${bState.mult}).</p>
      <button class="btn-primary" id="bNextModalBtn">Avancar para o Ante ${nextTier}</button>`;
    document.getElementById('infoModal').classList.remove('hidden');
    document.getElementById('bNextModalBtn').addEventListener('click', () => {
      document.getElementById('infoModal').classList.add('hidden');
      loadBastionLevel(bState.seed, nextTier);
    });
  }

  function renderBastionScene(tSec) {
    bCtx.clearRect(0, 0, bW, bH);
    const pal = COSMETICS.themes.find(t => t.id === playerSave.equippedTheme) || COSMETICS.themes[0];
    const meadowColors = pal.meadow || ['#6b8868', '#526e55'];
    const { topY, botY } = getPlayBounds();
    const horizonY = topY - 16;

    const gGrad = bCtx.createLinearGradient(0, horizonY, 0, bH);
    gGrad.addColorStop(0, meadowColors[0]); gGrad.addColorStop(1, meadowColors[1]);
    bCtx.fillStyle = gGrad;
    bCtx.beginPath(); bCtx.moveTo(0, horizonY + 12);
    for (let x = 0; x <= bW + 40; x += 40) bCtx.lineTo(x, horizonY + Math.sin(x * 0.008) * 9);
    bCtx.lineTo(bW, bH); bCtx.lineTo(0, bH); bCtx.closePath(); bCtx.fill();

    bCtx.fillStyle = 'rgba(255, 250, 235, 0.05)';
    bCtx.beginPath();
    bCtx.ellipse(bW * 0.32, horizonY + 130, bW * 0.28, 70, 0, 0, Math.PI * 2);
    bCtx.ellipse(bW * 0.72, horizonY + 210, bW * 0.24, 85, 0, 0, Math.PI * 2);
    bCtx.fill();

    bCtx.lineCap = 'round';
    bCtx.strokeStyle = 'rgba(32, 24, 22, 0.22)'; bCtx.lineWidth = 44;
    bCtx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.02) { const p = getPathPos(t); if (t === 0) bCtx.moveTo(p.x, p.y + 4); else bCtx.lineTo(p.x, p.y + 4); }
    bCtx.stroke();

    bCtx.strokeStyle = '#c49b72'; bCtx.lineWidth = 38;
    bCtx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.02) { const p = getPathPos(t); if (t === 0) bCtx.moveTo(p.x, p.y); else bCtx.lineTo(p.x, p.y); }
    bCtx.stroke();

    bCtx.strokeStyle = '#dfd0b8'; bCtx.lineWidth = 28;
    bCtx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.02) { const p = getPathPos(t); if (t === 0) bCtx.moveTo(p.x, p.y); else bCtx.lineTo(p.x, p.y); }
    bCtx.stroke();

    bCtx.strokeStyle = 'rgba(130, 102, 78, 0.28)'; bCtx.lineWidth = 2; bCtx.setLineDash([8, 12]); bCtx.stroke(); bCtx.setLineDash([]);

    for (const tr of bState.trees) {
      const tx = 34 + tr.nx * (bW - 96), ty = topY + tr.ny * (botY - topY);
      const sway = Math.sin(tSec * 1.8 + tr.nx * 10) * 2;
      bCtx.fillStyle = 'rgba(24, 18, 20, 0.18)'; bCtx.beginPath(); bCtx.ellipse(tx, ty + 4, 18 * tr.s, 6 * tr.s, 0, 0, Math.PI * 2); bCtx.fill();
      bCtx.fillStyle = '#5c4033'; bCtx.fillRect(tx - 4 * tr.s, ty - 22 * tr.s, 8 * tr.s, 24 * tr.s);
      bCtx.fillStyle = '#3f6351'; bCtx.beginPath(); bCtx.arc(tx + sway, ty - 28 * tr.s, 17 * tr.s, 0, Math.PI * 2); bCtx.fill();
      bCtx.fillStyle = '#5c8d76'; bCtx.beginPath(); bCtx.arc(tx - 5 * tr.s + sway, ty - 33 * tr.s, 13 * tr.s, 0, Math.PI * 2); bCtx.fill();
    }

    const kp = getPathPos(1), shk = bState.keepShake > 0 ? Math.sin(tSec * 60) * 5 : 0;
    const kx = kp.x + 14 + shk, ky = kp.y;
    bCtx.fillStyle = 'rgba(24, 18, 20, 0.28)'; bCtx.beginPath(); bCtx.ellipse(kx, ky + 28, 36, 10, 0, 0, Math.PI * 2); bCtx.fill();
    bCtx.fillStyle = bState.keepShake > 0 ? '#a85555' : (bState.defeated ? '#474347' : '#5f697a');
    bCtx.beginPath(); bCtx.roundRect(kx - 28, ky - 34, 56, 62, 10); bCtx.fill();
    bCtx.fillStyle = '#475061';
    for (let i = -24; i <= 16; i += 16) bCtx.fillRect(kx + i, ky - 42, 10, 10);
    bCtx.fillStyle = '#272022'; bCtx.beginPath(); bCtx.roundRect(kx - 10, ky + 4, 20, 24, [10, 10, 0, 0]); bCtx.fill();

    if (bState.bastionHp <= 55) {
      bCtx.strokeStyle = '#272022'; bCtx.lineWidth = 2;
      bCtx.beginPath(); bCtx.moveTo(kx - 18, ky - 22); bCtx.lineTo(kx - 10, ky - 10); bCtx.lineTo(kx - 16, ky); bCtx.stroke();
    }
    if (bState.defeated) {
      bCtx.fillStyle = 'rgba(70, 62, 66, 0.55)';
      bCtx.beginPath(); bCtx.arc(kx - 8, ky - 44 - (tSec * 12) % 18, 10, 0, Math.PI * 2); bCtx.fill();
    } else {
      bCtx.strokeStyle = '#f5efe6'; bCtx.lineWidth = 2.5; bCtx.beginPath(); bCtx.moveTo(kx, ky - 36); bCtx.lineTo(kx, ky - 62); bCtx.stroke();
      bCtx.fillStyle = '#c86d58';
      bCtx.beginPath(); bCtx.moveTo(kx, ky - 62); bCtx.lineTo(kx + 22, ky - 55 + Math.sin(tSec * 5) * 2.5); bCtx.lineTo(kx, ky - 48); bCtx.fill();
    }

    const hpRatio = Math.max(0, bState.bastionHp / 100);
    bCtx.fillStyle = 'rgba(24, 18, 20, 0.72)'; bCtx.beginPath(); bCtx.roundRect(kx - 34, ky - 82, 68, 16, 6); bCtx.fill();
    bCtx.fillStyle = hpRatio > 0.5 ? '#76b593' : hpRatio > 0.25 ? '#e2b86b' : '#d65a5a';
    bCtx.beginPath(); bCtx.roundRect(kx - 32, ky - 80, 64 * hpRatio, 12, 4); bCtx.fill();
    bCtx.fillStyle = '#fff'; bCtx.font = '800 9.5px "JetBrains Mono", monospace'; bCtx.textAlign = 'center';
    bCtx.fillText(`${bState.bastionHp} HP`, kx, ky - 71);

    for (const pad of bState.pads) {
      const pos = getPadPos(pad), hover = bState.hoveredPad === pad;
      bCtx.fillStyle = 'rgba(24, 18, 20, 0.22)'; bCtx.beginPath(); bCtx.ellipse(pos.x, pos.y + 6, 24, 10, 0, 0, Math.PI * 2); bCtx.fill();
      bCtx.fillStyle = hover ? '#faf6f0' : '#dcd0c0';
      bCtx.beginPath(); bCtx.arc(pos.x, pos.y, 20, 0, Math.PI * 2); bCtx.fill();
      bCtx.strokeStyle = hover ? '#d49b38' : '#7d6b61'; bCtx.lineWidth = 2.5; bCtx.stroke();

      if (pad.tower) {
        const spec = TOWER_TYPES[pad.tower.type];
        bCtx.fillStyle = '#4a4347'; bCtx.beginPath(); bCtx.roundRect(pos.x - 13, pos.y - 20, 26, 26, 7); bCtx.fill();
        bCtx.save();
        bCtx.translate(pos.x, pos.y - 16);
        if (pad.tower.type === 'mortar') {
          bCtx.rotate(pad.tower.angle);
          bCtx.fillStyle = '#272022'; bCtx.beginPath(); bCtx.roundRect(-4, -5, 22, 10, 4); bCtx.fill();
          bCtx.fillStyle = spec.color; bCtx.beginPath(); bCtx.arc(0, 0, 9, 0, Math.PI * 2); bCtx.fill();
        } else {
          const bob = Math.sin(tSec * 4 + pad.nx * 8) * 2.5;
          bCtx.fillStyle = spec.color;
          bCtx.beginPath(); bCtx.moveTo(0, -14 + bob); bCtx.lineTo(10, bob); bCtx.lineTo(0, 10 + bob); bCtx.lineTo(-10, bob); bCtx.closePath(); bCtx.fill();
          bCtx.fillStyle = '#faf6f0'; bCtx.beginPath(); bCtx.arc(0, -2 + bob, 3.2, 0, Math.PI * 2); bCtx.fill();
        }
        bCtx.restore();
        for (let lv = 0; lv < pad.tower.level; lv++) {
          bCtx.fillStyle = '#e2b86b';
          bCtx.beginPath(); bCtx.arc(pos.x - (pad.tower.level - 1) * 4 + lv * 8, pos.y + 13, 2.5, 0, Math.PI * 2); bCtx.fill();
        }
      } else {
        bCtx.fillStyle = '#635049'; bCtx.font = '800 15px "Plus Jakarta Sans", sans-serif';
        bCtx.textAlign = 'center'; bCtx.fillText('+', pos.x, pos.y + 5);
      }
    }

    for (const en of bState.enemies) {
      const p = getPathPos(en.t);
      const bounce = en.type === 'slime' ? Math.abs(Math.sin(tSec * 7 + en.id)) * -5 : Math.sin(tSec * 5 + en.id) * 3;
      const rad = en.type === 'boss' ? 23 : en.type === 'golem' ? 16 : 13;
      const isTargeted = bState.targetedIds.has(en.id);

      if (isTargeted) {
        bCtx.strokeStyle = en.id === bState.primaryTargetId ? '#e07a5f' : 'rgba(245, 239, 230, 0.55)';
        bCtx.lineWidth = en.id === bState.primaryTargetId ? 2.5 : 1.5;
        bCtx.setLineDash([4, 4]);
        bCtx.beginPath(); bCtx.ellipse(p.x, p.y + 12, rad + 7, 7, 0, 0, Math.PI * 2); bCtx.stroke();
        bCtx.setLineDash([]);
      }

      bCtx.fillStyle = 'rgba(24, 18, 20, 0.25)';
      bCtx.beginPath(); bCtx.ellipse(p.x, p.y + 12, rad * 0.9, 5, 0, 0, Math.PI * 2); bCtx.fill();

      const baseCol = en.hitFlash > 0 ? '#faf6f0'
        : en.slowTimer > 0 ? '#5c8d76'
        : en.type === 'golem' ? '#7a5c54'
        : en.type === 'wisp' ? '#7b5ca8'
        : en.type === 'boss' ? '#a63f46' : '#5c8d76';

      bCtx.fillStyle = baseCol;
      if (en.type === 'golem' || en.type === 'boss') {
        bCtx.beginPath(); bCtx.roundRect(p.x - rad, p.y - rad + bounce, rad * 2, rad * 2, 8); bCtx.fill();
      } else {
        bCtx.beginPath(); bCtx.arc(p.x, p.y + bounce, rad, 0, Math.PI * 2); bCtx.fill();
      }

      bCtx.fillStyle = '#faf6f0';
      bCtx.beginPath(); bCtx.arc(p.x - 4, p.y - 2 + bounce, 2.3, 0, Math.PI * 2); bCtx.arc(p.x + 5, p.y - 2 + bounce, 2.3, 0, Math.PI * 2); bCtx.fill();

      if (en.shield > 0) {
        bCtx.strokeStyle = en.shieldFlash > 0 ? '#fff' : '#e2b86b';
        bCtx.lineWidth = en.shieldFlash > 0 ? 5 : 3;
        bCtx.beginPath(); bCtx.arc(p.x, p.y + bounce, rad + 5, 0, Math.PI * 2); bCtx.stroke();
      }
      if (en.type === 'boss') {
        bCtx.fillStyle = '#e2b86b';
        bCtx.beginPath(); bCtx.moveTo(p.x - 10, p.y - rad + bounce); bCtx.lineTo(p.x - 6, p.y - rad - 10 + bounce); bCtx.lineTo(p.x, p.y - rad - 3 + bounce); bCtx.lineTo(p.x + 6, p.y - rad - 10 + bounce); bCtx.lineTo(p.x + 10, p.y - rad + bounce); bCtx.fill();
      }

      const bw = rad * 2.3;
      bCtx.fillStyle = 'rgba(24,18,20,0.45)'; bCtx.beginPath(); bCtx.roundRect(p.x - bw / 2, p.y - rad - 14 + bounce, bw, 5, 3); bCtx.fill();
      bCtx.fillStyle = en.shield > 0 ? '#e2b86b' : '#76b593';
      bCtx.beginPath(); bCtx.roundRect(p.x - bw / 2, p.y - rad - 14 + bounce, bw * Math.max(0, en.hp / en.maxHp), 5, 3); bCtx.fill();
    }

    for (const pr of bState.projectiles) {
      bCtx.strokeStyle = pr.color; bCtx.lineWidth = 3.5; bCtx.lineCap = 'round';
      bCtx.beginPath(); bCtx.moveTo(pr.x - (pr.tx - pr.sx) * 0.08, pr.y - (pr.ty - pr.sy) * 0.08); bCtx.lineTo(pr.x, pr.y); bCtx.stroke();
      bCtx.fillStyle = '#fff'; bCtx.beginPath(); bCtx.arc(pr.x, pr.y, 4, 0, Math.PI * 2); bCtx.fill();
    }
    for (const p of bState.particles) {
      bCtx.globalAlpha = Math.max(0, p.life * 2);
      bCtx.fillStyle = p.col; bCtx.beginPath(); bCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); bCtx.fill();
    }
    bCtx.globalAlpha = 1;
    for (const pop of bState.popups) {
      bCtx.globalAlpha = Math.min(1, pop.life * 2);
      bCtx.fillStyle = 'rgba(24,18,20,0.55)'; bCtx.font = '800 13px "JetBrains Mono", monospace'; bCtx.textAlign = 'center';
      bCtx.fillText(pop.text, pop.x + 1, pop.y + 1);
      bCtx.fillStyle = pop.col; bCtx.fillText(pop.text, pop.x, pop.y);
    }
    bCtx.globalAlpha = 1;
  }

  document.querySelectorAll('#bTowerPalette .tower-pick').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('#bTowerPalette .tower-pick').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    bState.selectedTool = btn.dataset.ttype;
    synth.chip(2);
  }));
  document.getElementById('bStepBackBtn').addEventListener('click', () => { bState.paused = true; document.getElementById('bPauseStepBtn').textContent = 'Retomar'; restoreBastionSnap(1); synth.chip(1); });
  document.getElementById('bDefeatRewindBtn').addEventListener('click', () => { bState.paused = true; document.getElementById('bPauseStepBtn').textContent = 'Retomar'; restoreBastionSnap(4); synth.chip(2); });
  document.getElementById('bDefeatRetryBtn').addEventListener('click', () => { resetBastionArena(true); startBastionWave(); });
  document.getElementById('bPauseStepBtn').addEventListener('click', (e) => {
    if (!bState.waveActive) return;
    bState.paused = !bState.paused; e.target.textContent = bState.paused ? 'Retomar' : 'Pausa';
  });
  document.getElementById('bStepFwdBtn').addEventListener('click', () => {
    if (!bState.waveActive) return;
    bState.paused = true; document.getElementById('bPauseStepBtn').textContent = 'Retomar';
    snapshotBastion(); updateBastionSim(0.25);
  });
  document.getElementById('bStartWaveBtn').addEventListener('click', startBastionWave);
  document.getElementById('bResetBtn').addEventListener('click', () => resetBastionArena(false));
  document.getElementById('bHintBtn').addEventListener('click', () => {
    const lvl = bState.level;
    document.getElementById('infoModalTitle').textContent = lvl ? `Bastion Guard — Ante ${bState.tier}` : 'Dica';
    document.getElementById('infoModalBody').innerHTML = `<p>${lvl?.hint || 'Use filter, map e foldl nas torres.'}</p><pre>${(lvl?.starterCode || '').replace(/</g, '&lt;')}</pre>`;
    document.getElementById('infoModal').classList.remove('hidden');
  });

  window.initBastionLevel = (seed = null, tier = 1) => loadBastionLevel(seed, tier);
  requestAnimationFrame(bastionLoop);
})();