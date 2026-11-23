/* =========================================================================
   GAME 02: HEXALAMBDA — Modo Infinito Certificado pelo Servant + PostgreSQL
   ========================================================================= */

(function () {
  function mountHexaViewIfNeeded() {
    if (document.getElementById('hexaView')) return;
    const section = document.createElement('section');
    section.id = 'hexaView';
    section.className = 'hexa-view hidden';
    section.innerHTML = `
      <canvas id="hexaCanvas"></canvas>

      <div class="runner-subhud">
        <div class="subhud-left">
          <div class="stage-tag">
            <span class="stage-num" id="hexaStageNum">01</span>
            <span id="hexaStageName">Santuario</span>
          </div>
          <div class="stage-dots-nav" id="hexaLevelNav"></div>
        </div>
        <div class="subhud-right">
          <div class="score-strip">
            <span class="chip-tag" id="hexaChipsBox"><b id="hexaChips">65</b></span>
            <span class="times-sep">x</span>
            <span class="mult-tag" id="hexaMultBox"><b id="hexaMult">1</b></span>
            <span class="strip-sep"></span>
            <span class="total-readout" id="hexaStatusBadge">0/0 somas fechadas</span>
          </div>
        </div>
      </div>

      <div class="hexa-hud-bar">
        <span class="hexa-pill" id="hexaHoverPill">Passe o mouse nos circulos de soma para ver os fios · Clique nas pecas para testar</span>
        <span class="hexa-pill mono" id="hexaSearchPill">Candidatos: —</span>
      </div>

      <section class="logic-dock">
        <div class="workbench-card hexa-workbench">
          <div class="editor-col">
            <div class="editor-toolbar">
              <span class="panel-label">LIST COMPREHENSION</span>
              <div class="type-xray-bar" id="hexaTypeBar"></div>
              <div class="quick-tokens">
                <button class="tok-btn htok" data-snip="[1..3]">[1..3]</button>
                <button class="tok-btn htok" data-snip=" /= ">/=</button>
                <button class="tok-btn htok" data-snip=" == ">==</button>
                <button class="tok-btn htok" data-snip="sum [a, b]">sum [...]</button>
              </div>
            </div>
            <div class="code-box">
              <div class="line-nums" id="hexaLineNumbers">1</div>
              <div class="code-layers">
                <pre class="code-hl" id="hexaCodeHighlight" aria-hidden="true"></pre>
                <textarea id="hexaCodeEditor" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
              </div>
            </div>
          </div>
          <div class="logic-col">
            <div class="cases-header">
              <span class="panel-label">DEDUCAO LOGICA</span>
              <span class="cases-count" id="hexaConstraintsCount">0/0 somas</span>
            </div>
            <div class="hexa-solutions-box" id="hexaSolutionsBox">
              Adicione restricoes na List Comprehension ate restar apenas 1 solucao unica (x2 / x4 bonus!).
            </div>
            <div class="feedback-line" id="hexaFeedback">Complete todas as somas indicadas nos medalhoes.</div>
            <div class="action-row">
              <button class="btn-primary" id="hexaRunBtn">Executar Compreensao</button>
              <button class="btn-ghost" id="hexaResetBtn">Limpar</button>
              <button class="btn-ghost" id="hexaHintBtn">?</button>
            </div>
          </div>
        </div>
      </section>
    `;
    document.body.appendChild(section);
  }

  mountHexaViewIfNeeded();

  const AXIS_VECTORS = { row: { dq: 1, dr: 0 }, diagR: { dq: 0, dr: 1 }, diagL: { dq: -1, dr: 1 } };

  const wb = window.LambdaVM.createCodeWorkbench({
    editorId: 'hexaCodeEditor', highlightId: 'hexaCodeHighlight', lineNumsId: 'hexaLineNumbers',
    tokSelector: '.tok-btn.htok', typeBarId: 'hexaTypeBar',
    onRun: () => runHexaComprehension()
  });

  const hCanvas = document.getElementById('hexaCanvas');
  const hCtx = hCanvas.getContext('2d');
  let hW = window.innerWidth, hH = window.innerHeight;
  function resizeHexa() {
    const dpr = window.devicePixelRatio || 1;
    hW = window.innerWidth; hH = window.innerHeight;
    hCanvas.width = hW * dpr; hCanvas.height = hH * dpr;
    hCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeHexa);
  resizeHexa();

  const hexaState = {
    seed: 1,
    tier: 1,
    level: null,
    loadSeq: 0,
    cells: [],
    solved: false,
    hoveredCellId: null,
    hoveredConIdx: -1,
    hitCells: [],
    hitCons: [],
    particles: [],
    prevOkSet: new Set()
  };

  let seedBar = null;
  function ensureSeedBar() {
    if (!seedBar && window.ArcadeUI?.createSeedBar) {
      seedBar = window.ArcadeUI.createSeedBar('hexaLevelNav', {
        game: 'hexa',
        onSelect: (newSeed, newTier) => loadHexaLevel(newSeed, newTier)
      });
    }
    return seedBar;
  }

  const hexToXY = (q, r, size = 44) => ({ x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r });

  function drawHexPoly(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function spawnHexParticles(x, y, col, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 35 + Math.random() * 80;
      hexaState.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 15, r: 2.5 + Math.random() * 2.5, col, life: 0.65 });
    }
  }

  async function loadHexaLevel(seed = null, tier = 1) {
    const reqId = ++hexaState.loadSeq;
    ensureSeedBar();

    hexaState.solved = false;
    hexaState.hoveredCellId = null;
    hexaState.hoveredConIdx = -1;
    hexaState.particles = [];
    hexaState.prevOkSet = new Set();

    const fb = document.getElementById('hexaFeedback');
    fb.className = 'feedback-line';
    fb.textContent = 'Certificando tabuleiro unico em Haskell...';

    try {
      const data = await ArcadeAPI.fetchLevel('hexa', seed, tier);
      if (reqId !== hexaState.loadSeq) return;

      const lvl = data.glPayload;
      hexaState.seed = data.glSeed;
      hexaState.tier = data.glTier;
      hexaState.level = lvl;
      hexaState.cells = (lvl.cells || []).map(c => ({ ...c, lift: 0 }));

      seedBar?.update(hexaState.seed, hexaState.tier);

      document.getElementById('hexaStageNum').textContent = lvl.num || String(hexaState.tier);
      document.getElementById('hexaStageName').textContent = lvl.name || `Ante ${hexaState.tier}`;
      document.getElementById('missionEyebrow').textContent = lvl.eyebrow || `HEXALAMBDA · ANTE ${hexaState.tier}`;
      document.getElementById('missionTitle').textContent = lvl.title || 'Tabuleiro Certificado';
      document.getElementById('missionSub').innerHTML = lvl.sub || '';
      document.getElementById('hexaChips').textContent = lvl.baseChips || 75;
      document.getElementById('hexaMult').textContent = '1';
      document.getElementById('hexaSearchPill').textContent = `Espaco: ${Math.pow(3, (lvl.vars || []).length)} combinacoes`;
      wb.setTypeSig(lvl.sig || '[Int] -> [(Int, ...)]');

      const badge = document.getElementById('hexaStatusBadge');
      badge.textContent = `0/${(lvl.constraints || []).length} somas`;
      badge.classList.remove('solved');

      wb.setValue(lvl.starterCode || '');
      document.getElementById('hexaSolutionsBox').textContent = 'Adicione as somas das bordas na compreensao ou clique nas pecas para testar.';
      fb.className = 'feedback-line';
      fb.textContent = 'Complete todas as somas indicadas nos medalhoes.';
      resizeHexa();
    } catch (err) {
      if (reqId !== hexaState.loadSeq) return;
      fb.className = 'feedback-line err';
      fb.textContent = err.message || 'Erro ao gerar tabuleiro.';
      synth.hit();
    }
  }

  async function checkHexaVictory(viaHaskell, usedBonus, serverHofMult = 1.0) {
    const lvl = hexaState.level;
    if (!lvl || hexaState.solved) return;

    const allFilled = hexaState.cells.every(c => c.val >= 1 && c.val <= 3);
    const allOk = (lvl.constraints || []).every(con =>
      con.ids.reduce((acc, id) => acc + (hexaState.cells.find(c => c.id === id)?.val || 0), 0) === con.target
    );

    if (allFilled && allOk) {
      hexaState.solved = true;
      synth.win();
      hexaState.hitCells.forEach(hc => spawnHexParticles(hc.x, hc.y, '#e2b86b', 8));

      const mult = (viaHaskell ? 2 : 1) + (viaHaskell && usedBonus ? 2 : 0);
      const baseChips = lvl.baseChips || 75;
      const total = Math.round(baseChips * mult);
      const effectiveHof = viaHaskell ? Math.max(mult, serverHofMult) : 1.0;

      document.getElementById('hexaChips').textContent = baseChips;
      document.getElementById('hexaMult').textContent = mult;
      const badge = document.getElementById('hexaStatusBadge');
      badge.textContent = `Resolvido! +${total} estrelas`;
      badge.classList.add('solved');

      await ArcadeAPI.submitRun({
        game: 'hexa',
        seed: hexaState.seed,
        tier: hexaState.tier,
        score: total,
        starsWon: total,
        hofMult: effectiveHof,
        code: viaHaskell ? wb.getValue() : '-- resolvido manualmente no tabuleiro'
      });

      unlockAchievement('hexa_solver');

      const fb = document.getElementById('hexaFeedback');
      fb.className = 'feedback-line ok';
      fb.textContent = `Tabuleiro completo! +${total} estrelas (${baseChips} x ${mult}).`;

      const nextTier = hexaState.tier + 1;
      setTimeout(() => {
        document.getElementById('infoModalTitle').textContent = `Santuario ${lvl.num || hexaState.tier} Resolvido!`;
        document.getElementById('infoModalBody').innerHTML = `
          <p>Voce ganhou <b class="star-inline">+${total} ${ArcadeUI.SVGS.star}</b> (${baseChips} Fichas x ${mult} Mult) na Seed #${hexaState.seed}.</p>
          <button class="btn-primary" id="hexaNextModalBtn" style="margin-top:6px">Avancar para o Ante ${nextTier}</button>`;
        document.getElementById('infoModal').classList.remove('hidden');
        document.getElementById('hexaNextModalBtn').addEventListener('click', () => {
          document.getElementById('infoModal').classList.add('hidden');
          loadHexaLevel(hexaState.seed, nextTier);
        });
      }, 650);
    }
  }

  async function runHexaComprehension() {
    const lvl = hexaState.level;
    if (!lvl) return;
    const code = wb.getValue();
    const box = document.getElementById('hexaSolutionsBox');
    const fb = document.getElementById('hexaFeedback');

    try {
      const valResp = await ArcadeAPI.validateCode('hexa', code, hexaState.tier);
      if (!valResp.vrValid) {
        throw new Error(valResp.vrMessage || 'List Comprehension invalida.');
      }

      const { value: result } = window.LambdaVM.evalScript(code, 'solucao');
      if (!Array.isArray(result)) throw new Error('Sua definicao precisa retornar uma lista de tuplas.');

      const usedBonusSyntax = /(\/=|\bsum\b|\ball\b)/.test(code);
      const vars = lvl.vars || [];
      const maxCand = Math.pow(3, vars.length);
      document.getElementById('hexaSearchPill').textContent = `Podado: ${maxCand} -> ${result.length} candidato(s)`;
      box.textContent = result.length === 0
        ? '[] — Nenhuma combinacao satisfez.'
        : `${result.length} solucao(oes): ${result.slice(0, 6).map(v => window.LambdaVM.formatValue(v)).join('  ')}${result.length > 6 ? ' ...' : ''}`;

      if (result.length === 1 && result[0]?.__tuple && result[0].__tuple.length === vars.length) {
        vars.forEach((vName, idx) => {
          const c = hexaState.cells.find(x => x.id === vName);
          if (c) { c.val = result[0].__tuple[idx]; c.lift = 1; }
        });
        fb.className = 'feedback-line ok';
        fb.textContent = 'Solucao unica deduzida com sucesso!';
        await checkHexaVictory(true, usedBonusSyntax, valResp.vrHofMult || 1.0);
      } else if (result.length > 1) {
        fb.className = 'feedback-line';
        fb.textContent = `Restam ${result.length} candidatos. Adicione mais somas para chegar a 1!`;
        synth.chip(2);
      } else {
        fb.className = 'feedback-line err';
        fb.textContent = 'Lista vazia! Confira as somas nos medalhoes.';
        synth.hit();
      }
    } catch (err) {
      fb.className = 'feedback-line err';
      fb.textContent = window.LambdaVM.translateError(err.message, code);
      synth.hit();
    }
  }

  hCanvas.addEventListener('mousemove', (e) => {
    if (worldState.mode !== 'hexa' || !hexaState.level) return;
    const rect = hCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hc = hexaState.hitCells.find(c => Math.hypot(mx - c.x, my - c.y) <= 38);
    hexaState.hoveredCellId = hc && !hc.fixed ? hc.id : null;

    const conIdx = hexaState.hitCons.findIndex(c => Math.hypot(mx - c.x, my - c.y) <= 20);
    hexaState.hoveredConIdx = conIdx;

    const pill = document.getElementById('hexaHoverPill');
    if (conIdx !== -1) {
      const lvl = hexaState.level, con = lvl.constraints[conIdx];
      const expr = con.ids.map(id => {
        const cell = hexaState.cells.find(x => x.id === id);
        return cell?.fixed ? cell.val : (cell?.label || '?');
      }).join(' + ');
      const curSum = con.ids.reduce((a, id) => a + (hexaState.cells.find(x => x.id === id)?.val || 0), 0);
      pill.textContent = `Soma destacada: ${expr} == ${con.target}   (Atual no altar: ${curSum})`;
    } else {
      pill.textContent = 'Passe o mouse nos circulos de soma para ver a expressao · Clique nas pecas para testar';
    }
  });

  hCanvas.addEventListener('click', (e) => {
    if (worldState.mode !== 'hexa' || hexaState.solved || !hexaState.level) return;
    const rect = hCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hc = hexaState.hitCells.find(c => Math.hypot(mx - c.x, my - c.y) <= 38);
    if (hc && !hc.fixed) {
      const cell = hexaState.cells.find(x => x.id === hc.id);
      cell.val = (cell.val + 1) % 4; cell.lift = 1;
      synth.chip(cell.val || 1);
      checkHexaVictory(false, false, 1.0);
    }
  });

  hCanvas.addEventListener('contextmenu', (e) => {
    if (worldState.mode !== 'hexa') return;
    e.preventDefault();
    if (hexaState.solved || !hexaState.level) return;
    const rect = hCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hc = hexaState.hitCells.find(c => Math.hypot(mx - c.x, my - c.y) <= 38);
    if (hc && !hc.fixed) {
      const cell = hexaState.cells.find(x => x.id === hc.id);
      cell.val = (cell.val + 3) % 4; cell.lift = 1;
      synth.chip(cell.val || 1);
      checkHexaVictory(false, false, 1.0);
    }
  });

  let hLast = performance.now();
  function hexaLoop(now) {
    const dt = Math.min(0.05, (now - hLast) / 1000); hLast = now;
    if (worldState.mode === 'hexa') {
      for (const c of hexaState.cells) if (c.lift > 0) c.lift = Math.max(0, c.lift - dt * 5);
      for (let i = hexaState.particles.length - 1; i >= 0; i--) {
        const p = hexaState.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.life -= dt;
        if (p.life <= 0) hexaState.particles.splice(i, 1);
      }
      renderHexaScene();
    }
    requestAnimationFrame(hexaLoop);
  }

  function renderHexaScene() {
    hCtx.clearRect(0, 0, hW, hH);
    const pal = COSMETICS.themes.find(t => t.id === playerSave.equippedTheme) || COSMETICS.themes[0];
    const meadow = pal.meadow || ['#6b8868', '#526e55'];
    const lvl = hexaState.level;

    const topBound = 165, botBound = hH - 252;
    const centerX = hW * 0.5, centerY = (topBound + botBound) * 0.52;
    const horizonY = Math.max(topBound + 20, centerY - 120);

    // 1. Terraco integrado ao fundo
    const mGrad = hCtx.createLinearGradient(0, horizonY, 0, hH);
    mGrad.addColorStop(0, meadow[0]); mGrad.addColorStop(1, meadow[1]);
    hCtx.fillStyle = mGrad;
    hCtx.beginPath(); hCtx.moveTo(0, horizonY + 14);
    for (let x = 0; x <= hW + 40; x += 40) hCtx.lineTo(x, horizonY + Math.sin(x * 0.007) * 10);
    hCtx.lineTo(hW, hH); hCtx.lineTo(0, hH); hCtx.closePath(); hCtx.fill();

    const altarRx = Math.min(265, hW * 0.36), altarRy = Math.min(138, (botBound - topBound) * 0.44);
    hCtx.fillStyle = 'rgba(24, 18, 22, 0.24)';
    hCtx.beginPath(); hCtx.ellipse(centerX, centerY + 18, altarRx + 10, altarRy + 6, 0, 0, Math.PI * 2); hCtx.fill();
    hCtx.fillStyle = 'rgba(235, 226, 212, 0.24)';
    hCtx.strokeStyle = 'rgba(245, 239, 230, 0.32)'; hCtx.lineWidth = 2;
    hCtx.beginPath(); hCtx.ellipse(centerX, centerY + 6, altarRx, altarRy, 0, 0, Math.PI * 2); hCtx.fill(); hCtx.stroke();

    if (!lvl || hexaState.cells.length === 0) return;

    // 2. Layout dinamico dos hexagonos
    const size = Math.min(44, Math.max(28, (botBound - topBound) / 7.2));
    const coords = hexaState.cells.map(c => hexToXY(c.q, c.r, size));
    const avgX = coords.reduce((s, p) => s + p.x, 0) / coords.length;
    const avgY = coords.reduce((s, p) => s + p.y, 0) / coords.length;
    const cellPos = id => {
      const c = hexaState.cells.find(x => x.id === id);
      const p = hexToXY(c.q, c.r, size);
      return { x: centerX + (p.x - avgX), y: centerY + (p.y - avgY) };
    };

    // 3. Fios de energia e Medalhoes de Soma
    hexaState.hitCons = [];
    let satisfied = 0;
    const constraints = lvl.constraints || [];
    const highlightedIds = new Set(hexaState.hoveredConIdx !== -1 ? constraints[hexaState.hoveredConIdx].ids : []);

    constraints.forEach((con, idx) => {
      const sum = con.ids.reduce((acc, id) => acc + (hexaState.cells.find(c => c.id === id)?.val || 0), 0);
      const allFilled = con.ids.every(id => (hexaState.cells.find(c => c.id === id)?.val || 0) > 0);
      const ok = allFilled && sum === con.target, over = sum > con.target;
      if (ok) {
        satisfied++;
        if (!hexaState.prevOkSet.has(idx)) {
          hexaState.prevOkSet.add(idx);
          const pLast = cellPos(con.ids[con.ids.length - 1]);
          spawnHexParticles(pLast.x, pLast.y, '#76b593', 7);
        }
      } else hexaState.prevOkSet.delete(idx);

      const vec = AXIS_VECTORS[con.dir];
      const anchor = hexaState.cells.find(c => c.id === (con.side === 'end' ? con.ids[con.ids.length - 1] : con.ids[0]));
      const sign = con.side === 'end' ? 1 : -1;
      const pTarget = hexToXY(anchor.q + vec.dq * sign * 1.15, anchor.r + vec.dr * sign * 1.15, size);
      const tx = centerX + (pTarget.x - avgX), ty = centerY + (pTarget.y - avgY);
      const pStart = cellPos(con.ids[0]), pEnd = cellPos(con.ids[con.ids.length - 1]);
      const isHov = hexaState.hoveredConIdx === idx;

      hCtx.strokeStyle = isHov ? '#ffd166' : ok ? '#76b593' : over ? '#e07a5f' : 'rgba(245, 239, 230, 0.35)';
      hCtx.lineWidth = isHov ? 4 : ok ? 3 : 2;
      if (!ok && !isHov) hCtx.setLineDash([5, 5]);
      hCtx.beginPath(); hCtx.moveTo(pStart.x, pStart.y); hCtx.lineTo(pEnd.x, pEnd.y); hCtx.lineTo(tx, ty); hCtx.stroke();
      hCtx.setLineDash([]);

      hCtx.fillStyle = 'rgba(20, 14, 18, 0.32)';
      hCtx.beginPath(); hCtx.arc(tx, ty + 3, 17, 0, Math.PI * 2); hCtx.fill();
      hCtx.fillStyle = ok ? '#5c8d76' : over ? '#b84a4a' : isHov ? '#d49b38' : '#272022';
      hCtx.beginPath(); hCtx.arc(tx, ty, 16.5, 0, Math.PI * 2); hCtx.fill();
      hCtx.strokeStyle = isHov ? '#fff' : '#f5efe6'; hCtx.lineWidth = 2.2; hCtx.stroke();
      hCtx.fillStyle = '#faf6f0'; hCtx.font = '800 13px "JetBrains Mono", monospace'; hCtx.textAlign = 'center';
      hCtx.fillText(String(con.target), tx, ty + 4.5);

      hexaState.hitCons.push({ x: tx, y: ty, idx });
    });

    document.getElementById('hexaConstraintsCount').textContent = `${satisfied}/${constraints.length} somas`;
    if (!hexaState.solved) {
      document.getElementById('hexaStatusBadge').textContent = `${satisfied}/${constraints.length} somas fechadas`;
    }

    // 4. Pecas Hexagonais com Borda 3D Chanfrada
    hexaState.hitCells = [];
    for (const cell of hexaState.cells) {
      const p = cellPos(cell.id);
      const isHov = hexaState.hoveredCellId === cell.id;
      const inLine = highlightedIds.has(cell.id);
      const cy = p.y - (isHov ? 4 : 0) - cell.lift * 5;
      const r = size - 3;

      hCtx.fillStyle = 'rgba(20, 14, 18, 0.28)';
      drawHexPoly(hCtx, p.x, p.y + 8, r); hCtx.fill();

      hCtx.fillStyle = cell.fixed ? '#a69686' : (cell.val > 0 ? '#b86852' : '#bfb3a2');
      drawHexPoly(hCtx, p.x, cy + 5, r); hCtx.fill();

      hCtx.fillStyle = cell.fixed ? '#dfd2c0' : (isHov ? '#ffffff' : cell.val > 0 ? '#faf6f0' : '#f0e7da');
      drawHexPoly(hCtx, p.x, cy, r); hCtx.fill();
      hCtx.strokeStyle = inLine ? '#d49b38' : cell.fixed ? '#8c796e' : (cell.val > 0 ? '#c86d58' : '#736158');
      hCtx.lineWidth = inLine ? 3.2 : 2.2; hCtx.stroke();

      const gemCol = cell.fixed ? '#4e423d' : (cell.val === 3 ? '#c86d58' : cell.val === 2 ? '#4f759b' : '#5c8d76');
      const drawGem = (gx, gy, rad) => {
        hCtx.fillStyle = gemCol; hCtx.beginPath(); hCtx.arc(gx, gy, rad, 0, Math.PI * 2); hCtx.fill();
        hCtx.fillStyle = 'rgba(255,255,255,0.4)'; hCtx.beginPath(); hCtx.arc(gx - rad * 0.28, gy - rad * 0.28, rad * 0.32, 0, Math.PI * 2); hCtx.fill();
      };
      if (cell.val === 1) drawGem(p.x, cy, 6.5);
      if (cell.val === 2) { drawGem(p.x - 9, cy - 4, 5.5); drawGem(p.x + 9, cy + 4, 5.5); }
      if (cell.val === 3) { drawGem(p.x, cy - 10, 5.2); drawGem(p.x - 9.5, cy + 6.5, 5.2); drawGem(p.x + 9.5, cy + 6.5, 5.2); }

      if (cell.label) {
        hCtx.fillStyle = cell.val > 0 ? 'rgba(99, 80, 73, 0.72)' : '#635049';
        hCtx.font = cell.val > 0 ? '700 10px "JetBrains Mono", monospace' : '800 13px "JetBrains Mono", monospace';
        hCtx.textAlign = 'center';
        hCtx.fillText(cell.label, p.x, cell.val > 0 ? cy + r * 0.68 : cy + 4);
      }

      hexaState.hitCells.push({ id: cell.id, x: p.x, y: cy, fixed: cell.fixed });
    }

    for (const pt of hexaState.particles) {
      hCtx.globalAlpha = Math.max(0, pt.life * 1.5);
      hCtx.fillStyle = pt.col; hCtx.beginPath(); hCtx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); hCtx.fill();
    }
    hCtx.globalAlpha = 1;
  }

  document.getElementById('hexaRunBtn').addEventListener('click', runHexaComprehension);
  document.getElementById('hexaResetBtn').addEventListener('click', () => loadHexaLevel(hexaState.seed, hexaState.tier));
  document.getElementById('hexaHintBtn').addEventListener('click', () => {
    const lvl = hexaState.level;
    document.getElementById('infoModalTitle').textContent = lvl ? `HexaLambda — Ante ${hexaState.tier}` : 'Dica';
    document.getElementById('infoModalBody').innerHTML = `<p>${lvl?.hint || 'Complete as somas dos medalhoes na List Comprehension.'}</p><pre>${(lvl?.starterCode || '').replace(/</g, '&lt;')}</pre>`;
    document.getElementById('infoModal').classList.remove('hidden');
  });

  window.initHexaLevel = (seed = null, tier = 1) => loadHexaLevel(seed, tier);
  requestAnimationFrame(hexaLoop);
})();