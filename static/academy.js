/* =========================================================================
   ACADEMY.JS — Oficinas Interativas de Haskell com Minigames Animados
   ========================================================================= */

(function () {
  const LESSONS = [
    {
      id: 'gym_pure',
      level: 'Iniciante',
      scene: 'athlete_lift',
      reward: 25,
      title: '1. O Atleta & A Barra',
      concept: 'Funções Puras',
      sig: 'Int -> Int -> Int',
      entry: 'pesoTotal',
      summary: 'Ajude o atleta a calcular o peso total da barra antes de erguer! A barra vazia pesa <code>barra</code> kg e existem <b>duas</b> anilhas iguais (uma de cada lado).',
      tokens: ['barra + anilha * 2', '* 2', '+ '],
      starterCode:
`-- Barra no centro + 1 anilha de cada lado
pesoTotal :: Int -> Int -> Int
pesoTotal barra anilha = barra + anilha`,
      hint: 'Como há uma anilha em cada ponta da barra, multiplique <code>anilha * 2</code>:<br><code>pesoTotal barra anilha = barra + anilha * 2</code>',
      tests: [
        { label: '20 + 10kg/lado', args: [20, 10], expected: 40 },
        { label: '20 + 25kg/lado', args: [20, 25], expected: 70 },
        { label: '15 + 30kg/lado', args: [15, 30], expected: 75 }
      ]
    },
    {
      id: 'gym_guards',
      level: 'Iniciante',
      scene: 'athlete_guards',
      reward: 30,
      title: '2. Treino por Zonas',
      concept: 'Guards (|)',
      sig: 'Int -> String',
      entry: 'esforco',
      summary: 'Ajude o treinador a classificar a carga: até <code>40</code> é <code>"Leve"</code>, até <code>90</code> é <code>"Medio"</code> e acima disso é <code>"Pesado"</code>.',
      tokens: ['| carga <= 90 = "Medio"', '| otherwise = ', '<= '],
      starterCode:
`-- Complete a faixa intermediaria com Guard (|)
esforco :: Int -> String
esforco carga
  | carga <= 40 = "Leve"
  | otherwise   = "Pesado"`,
      hint: 'Adicione antes de <code>otherwise</code>:<br><code>| carga <= 90 = "Medio"</code>',
      tests: [
        { label: '30kg', args: [30], expected: 'Leve' },
        { label: '75kg', args: [75], expected: 'Medio' },
        { label: '130kg', args: [130], expected: 'Pesado' }
      ]
    },
    {
      id: 'chef_filter',
      level: 'Intermediário',
      scene: 'chef_filter',
      reward: 35,
      title: '3. Cozinha Limpa',
      concept: 'filter & Lambdas',
      sig: '[String] -> [String]',
      entry: 'servirBons',
      summary: 'Ajude o cozinheiro a servir apenas pratos prontos! Use <code>filter</code> para remover <code>"queimado"</code> e <code>"cru"</code> da esteira.',
      tokens: ['filter (\\p -> ', 'p /= "queimado"', ' && ', 'p /= "cru") '],
      starterCode:
`-- Sirva apenas o que nao esta "queimado" nem "cru"
servirBons :: [String] -> [String]
servirBons pratos = pratos`,
      hint: 'Use <code>filter</code> com uma função anônima:<br><code>servirBons pratos = filter (\\p -> p /= "queimado" && p /= "cru") pratos</code>',
      tests: [
        { label: 'Pedido 1', args: [['pizza', 'queimado', 'sopa']], expected: ['pizza', 'sopa'] },
        { label: 'Pedido 2', args: [['cru', 'bolo', 'queimado']], expected: ['bolo'] }
      ]
    },
    {
      id: 'chef_map',
      level: 'Intermediário',
      scene: 'chef_map',
      reward: 35,
      title: '4. Cardápio em Promoção',
      concept: 'map (Transformação)',
      sig: '[Int] -> [Int]',
      entry: 'desconto',
      summary: 'Hora da promoção! Ajude o cozinheiro a subtrair <b>5 moedas</b> do preço de cada prato usando <code>map</code>.',
      tokens: ['map (\\p -> p - 5) ', 'map ', '(\\p -> p - 5)'],
      starterCode:
`-- Reduza 5 moedas de cada preco da lista
desconto :: [Int] -> [Int]
desconto precos = precos`,
      hint: 'Aplique uma lambda em todos os preços:<br><code>desconto precos = map (\\p -> p - 5) precos</code>',
      tests: [
        { label: 'Mesa 1', args: [[18, 25, 12]], expected: [13, 20, 7] },
        { label: 'Mesa 2', args: [[10, 30]], expected: [5, 25] }
      ]
    },
    {
      id: 'alchemist_maybe',
      level: 'Intermediário',
      scene: 'alchemist_maybe',
      reward: 40,
      title: '5. Alquimista Seguro',
      concept: 'Maybe (Zero Null)',
      sig: 'Int -> Int -> Maybe Int',
      entry: 'dividirPocao',
      summary: 'Se tentarmos dividir a poção por <code>0</code> frascos, o caldeirão explode! Retorne <code>Nothing</code> quando <code>frascos == 0</code> e <code>Just (div total frascos)</code> caso contrário.',
      tokens: ['dividirPocao _ 0 = Nothing', 'Just ', 'Nothing', 'div '],
      starterCode:
`-- Proteja a divisao por zero usando Maybe
dividirPocao :: Int -> Int -> Maybe Int
dividirPocao total frascos = Just (div total frascos)`,
      hint: 'Adicione um caso base antes da linha principal:<br><code>dividirPocao _ 0 = Nothing</code>',
      tests: [
        { label: '100ml / 4', args: [100, 4], expected: { __adt: 'Just', args: [25] } },
        { label: '50ml / 0', args: [50, 0], expected: { __adt: 'Nothing', args: [] } }
      ]
    },
    {
      id: 'boxes_recursion',
      level: 'Avançado',
      scene: 'boxes_recursion',
      reward: 45,
      title: '6. Pilha Recursiva',
      concept: 'Recursão (x:xs)',
      sig: '[Int] -> Int',
      entry: 'somarCaixas',
      summary: 'Sem laços <code>for</code>, some o peso da primeira caixa <code>x</code> com a chamada recursiva para o restante da pilha <code>xs</code>.',
      tokens: ['x + somarCaixas xs', 'somarCaixas [] = 0', '(x:xs)'],
      starterCode:
`-- Caso base: lista vazia = 0. Recursao: x + resto
somarCaixas :: [Int] -> Int
somarCaixas []     = 0
somarCaixas (x:xs) = x`,
      hint: 'Complete a segunda cláusula:<br><code>somarCaixas (x:xs) = x + somarCaixas xs</code>',
      tests: [
        { label: 'Pilha A', args: [[12, 8, 25, 5]], expected: 50 },
        { label: 'Vazia', args: [[]], expected: 0 }
      ]
    },
    {
      id: 'runes_comp',
      level: 'Avançado',
      scene: 'runes_comp',
      reward: 45,
      title: '7. Forja de Runas',
      concept: 'List Comprehension',
      sig: '[(Int, Int)]',
      entry: 'combinar',
      summary: 'Filtre pares de runas <code>(f, a)</code> onde a soma <code>f + a</code> seja exatamente <code>5</code>.',
      tokens: [', f + a == 5', 'f <- [1..4]', '== 5'],
      starterCode:
`-- Adicione o filtro apos a virgula
combinar :: [(Int, Int)]
combinar = [ (f, a) | f <- [1..4], a <- [1..4] ]`,
      hint: 'Adicione o filtro antes do <code>]</code>:<br><code>combinar = [ (f, a) | f <- [1..4], a <- [1..4], f + a == 5 ]</code>',
      tests: [
        {
          label: 'Soma == 5',
          args: [],
          expected: [
            { __tuple: [1, 4] },
            { __tuple: [2, 3] },
            { __tuple: [3, 2] },
            { __tuple: [4, 1] }
          ]
        }
      ]
    },
    {
      id: 'clock_lazy',
      level: 'Avançado',
      scene: 'clock_lazy',
      reward: 50,
      title: '8. Relojoeiro Infinito',
      concept: 'Lazy + take/iterate',
      sig: 'Int -> [Int]',
      entry: 'engrenagens',
      summary: 'Gere uma sequência infinita dobrando o tamanho de cada engrenagem com <code>iterate (* 2) 1</code> e pegue apenas as <code>n</code> primeiras.',
      tokens: ['iterate (* 2) 1', 'take n ', '(* 2)'],
      starterCode:
`-- Troque (* 1) para dobrar (* 2) a cada passo
engrenagens :: Int -> [Int]
engrenagens n = take n (iterate (* 1) 1)`,
      hint: 'Use <code>(* 2)</code> dentro do <code>iterate</code>:<br><code>engrenagens n = take n (iterate (* 2) 1)</code>',
      tests: [
        { label: 'n = 5', args: [5], expected: [1, 2, 4, 8, 16] },
        { label: 'n = 3', args: [3], expected: [1, 2, 4] }
      ]
    }
  ];

  const aState = {
    filter: 'all',
    selectedId: LESSONS[0].id,
    wb: null,
    lastRunOk: false,
    lastResult: null,
    animPhase: 0,
    animSuccess: false,
    rafId: null
  };

  function getSkinColor() {
    return (COSMETICS.skins.find(s => s.id === playerSave.equippedSkin) || COSMETICS.skins[0]).color;
  }

  function ensureWorkbench() {
    if (aState.wb) return aState.wb;
    aState.wb = window.LambdaVM.createCodeWorkbench({
      editorId: 'academyCodeEditor',
      highlightId: 'academyCodeHighlight',
      lineNumsId: 'academyLineNumbers',
      typeBarId: 'academyTypeBar',
      onRun: () => runLessonCode()
    });
    return aState.wb;
  }

  function activeLesson() {
    return LESSONS.find(l => l.id === aState.selectedId) || LESSONS[0];
  }

  function renderLessonList() {
    const grid = document.getElementById('studyCardsGrid');
    if (!grid) return;
    const list = aState.filter === 'all' ? LESSONS : LESSONS.filter(l => l.level === aState.filter);
    grid.innerHTML = '';

    for (const l of list) {
      const done = playerSave.cardsStudied.includes(l.id);
      const btn = document.createElement('button');
      btn.className = `study-card-btn ${l.id === aState.selectedId ? 'selected' : ''} ${done ? 'completed' : ''}`;
      btn.innerHTML = `
        <div class="sc-top-row">
          <span class="sc-level">${l.level}</span>
          <span class="sc-reward ${done ? 'done' : ''}">${done ? '✓ Feito' : `+${l.reward} ★`}</span>
        </div>
        <span class="sc-title">${l.title}</span>
        <span class="sc-concept">${l.concept}</span>
      `;
      btn.addEventListener('click', () => {
        aState.selectedId = l.id;
        loadLessonIntoWorkbench(l);
        renderLessonList();
      });
      grid.appendChild(btn);
    }
  }

  function loadLessonIntoWorkbench(lesson) {
    const wb = ensureWorkbench();
    aState.lastRunOk = false;
    aState.lastResult = null;
    aState.animPhase = 0;

    document.getElementById('lessonEyebrow').textContent = `${lesson.level.toUpperCase()} · ${lesson.concept.toUpperCase()}`;
    document.getElementById('lessonTitle').textContent = lesson.title;
    document.getElementById('lessonSummary').innerHTML = lesson.summary;
    wb.setTypeSig(lesson.sig);
    wb.setValue(lesson.starterCode);

    const tokWrap = document.getElementById('academyQuickTokens');
    tokWrap.innerHTML = lesson.tokens.map(t =>
      `<button class="tok-btn atok" data-snip="${t.replace(/"/g, '&quot;')}">${t.length > 18 ? t.slice(0, 16) + '…' : t}</button>`
    ).join('');
    tokWrap.querySelectorAll('.atok').forEach(b => b.addEventListener('click', () => {
      const ed = document.getElementById('academyCodeEditor');
      const snip = b.dataset.snip;
      const s = ed.selectionStart ?? ed.value.length;
      ed.value = ed.value.slice(0, s) + snip + ed.value.slice(ed.selectionEnd ?? s);
      ed.focus();
      ed.selectionStart = ed.selectionEnd = s + snip.length;
      wb.sync();
    }));

    document.getElementById('academyFeedback').className = 'feedback-line';
    document.getElementById('academyFeedback').textContent = 'Edite o código Haskell e clique em Executar & Animar!';
    document.getElementById('academyHintBox').classList.add('hidden');
    renderTestCases(lesson, null);
  }

  function renderTestCases(lesson, results) {
    const box = document.getElementById('academyTestsStrip');
    box.innerHTML = lesson.tests.map((t, idx) => {
      const r = results?.[idx];
      const cls = !r ? '' : r.ok ? 'pass' : 'fail';
      const outTxt = !r ? window.LambdaVM.formatValue(t.expected) : r.outText;
      return `
        <div class="case-pill ${cls}">
          <span class="case-in">${t.label}</span>
          <span class="case-out">${outTxt}</span>
          <span class="${!r ? '' : r.ok ? 'case-ok' : 'case-bad'}">${!r ? '…' : r.ok ? 'OK' : 'X'}</span>
        </div>`;
    }).join('');
  }

  async function runLessonCode() {
    const lesson = activeLesson();
    const code = ensureWorkbench().getValue();
    const fb = document.getElementById('academyFeedback');

    try {
      const results = [];
      let allPass = true;
      let sampleOut = null;

      for (let i = 0; i < lesson.tests.length; i++) {
        const tc = lesson.tests[i];
        const res = window.LambdaVM.evalScript(code, lesson.entry, tc.args);
        const ok = JSON.stringify(res.value) === JSON.stringify(tc.expected);
        if (!ok) allPass = false;
        if (i === 0) sampleOut = res.value;
        results.push({ ok, val: res.value, outText: window.LambdaVM.formatValue(res.value) });
      }

      renderTestCases(lesson, results);
      aState.lastResult = sampleOut;
      aState.animSuccess = allPass;
      aState.animPhase = 1.0;

      if (allPass) {
        aState.lastRunOk = true;
        fb.className = 'feedback-line ok';
        fb.textContent = 'Todos os testes passaram! Minigame concluído com sucesso.';
        synth.win();

        if (!playerSave.cardsStudied.includes(lesson.id)) {
          await ArcadeAPI.saveProgress('card', lesson.id, lesson.reward);
          showToast(`Oficina concluída: ${lesson.title}`, `+${lesson.reward} estrelas`);
          if (playerSave.cardsStudied.length >= 3) unlockAchievement('scholar');
          renderLessonList();
        }
      } else {
        fb.className = 'feedback-line err';
        fb.textContent = 'Quase lá! Confira os casos marcados com X e tente ajustar a lógica.';
        synth.hit();
      }
    } catch (err) {
      aState.animSuccess = false;
      aState.animPhase = 0.8;
      fb.className = 'feedback-line err';
      fb.textContent = window.LambdaVM.translateError(err.message, code);
      synth.hit();
    }
  }

  // ==================== MOTOR DE MINIGAMES CANVAS ====================
  function drawMiniScene(ctx, w, h, tSec) {
    const lesson = activeLesson();
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#f3ebdf');
    bg.addColorStop(1, '#e4d6c4');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const floorY = h - 24;
    ctx.fillStyle = '#c8b49d';
    ctx.fillRect(0, floorY, w, h - floorY);

    const anim = aState.animPhase;
    const ok = aState.animSuccess;
    const skin = getSkinColor();

    if (lesson.scene === 'athlete_lift' || lesson.scene === 'athlete_guards') {
      const cx = w * 0.5;
      const lift = anim > 0 ? (ok ? Math.sin(Math.min(1, 1 - anim) * Math.PI * 0.5) * 42 : Math.sin(tSec * 28) * 3) : 0;
      const crouch = anim > 0 && !ok ? 6 : 0;

      ctx.fillStyle = 'rgba(39,32,34,0.16)';
      ctx.beginPath(); ctx.ellipse(cx, floorY + 3, 46, 6, 0, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#272022'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 8, floorY - 22 + crouch); ctx.lineTo(cx - 14, floorY);
      ctx.moveTo(cx + 8, floorY - 22 + crouch); ctx.lineTo(cx + 14, floorY);
      ctx.stroke();

      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.roundRect(cx - 14, floorY - 56 + crouch, 28, 36, 12); ctx.fill();

      ctx.fillStyle = '#faf6f0';
      ctx.beginPath(); ctx.arc(cx - 5, floorY - 43 + crouch, 2.2, 0, Math.PI * 2); ctx.arc(cx + 5, floorY - 43 + crouch, 2.2, 0, Math.PI * 2); ctx.fill();

      const barY = floorY - 34 + crouch - lift;
      ctx.strokeStyle = '#272022'; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 12, floorY - 46 + crouch); ctx.lineTo(cx - 24, barY);
      ctx.moveTo(cx + 12, floorY - 46 + crouch); ctx.lineTo(cx + 24, barY);
      ctx.stroke();

      ctx.strokeStyle = '#5c5863'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(cx - 72, barY); ctx.lineTo(cx + 72, barY); ctx.stroke();

      const plateColor = ok ? '#5c8d76' : '#c86d58';
      [-62, -52, 52, 62].forEach((ox, idx) => {
        ctx.fillStyle = idx === 0 || idx === 3 ? '#d49b38' : plateColor;
        ctx.beginPath(); ctx.roundRect(cx + ox - 4, barY - 15, 8, 30, 3); ctx.fill();
      });

      const txt = lesson.scene === 'athlete_lift'
        ? (aState.lastResult !== null ? `Calculado: ${aState.lastResult}kg` : 'Barra (20kg) + 2x Anilha')
        : (aState.lastResult !== null ? `Zona: "${aState.lastResult}"` : 'Classifique a carga');
      ctx.fillStyle = ok ? '#365e4b' : '#272022';
      ctx.font = '800 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(txt, cx, 22);
    } else if (lesson.scene === 'chef_filter' || lesson.scene === 'chef_map') {
      ctx.fillStyle = '#8b5e4d';
      ctx.fillRect(24, floorY - 26, w - 48, 26);
      ctx.fillStyle = '#a87662';
      ctx.fillRect(20, floorY - 30, w - 40, 8);

      const cx = 74;
      const bob = anim > 0 ? Math.abs(Math.sin(tSec * 14)) * -5 : Math.sin(tSec * 3) * 1.5;
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.roundRect(cx - 14, floorY - 68 + bob, 28, 38, 12); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect(cx - 12, floorY - 82 + bob, 24, 15, 4); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - 7, floorY - 84 + bob, 8, 0, Math.PI * 2); ctx.arc(cx + 6, floorY - 84 + bob, 8, 0, Math.PI * 2); ctx.arc(cx, floorY - 88 + bob, 9, 0, Math.PI * 2); ctx.fill();

      const items = lesson.scene === 'chef_filter'
        ? (Array.isArray(aState.lastResult) ? aState.lastResult : ['pizza', 'queimado', 'sopa'])
        : (Array.isArray(aState.lastResult) ? aState.lastResult.map(v => `${v}g`) : ['18g', '25g', '12g']);

      items.slice(0, 4).forEach((item, idx) => {
        const px = 160 + idx * 82 + (anim > 0 && ok ? (1 - anim) * 18 : 0);
        const py = floorY - 34;
        const bad = item === 'queimado' || item === 'cru';
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(px, py, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bad ? '#4a3d3b' : '#d49b38';
        ctx.beginPath(); ctx.arc(px, py - 5, 10, Math.PI, 0); ctx.fill();
        ctx.fillStyle = bad ? '#b84a4a' : '#272022';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(item), px, py - 20);
      });
    } else if (lesson.scene === 'alchemist_maybe') {
      const cx = w * 0.5;
      ctx.fillStyle = '#332d36';
      ctx.beginPath(); ctx.arc(cx, floorY - 22, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = anim > 0 && !ok ? '#b84a4a' : '#5c8d76';
      ctx.beginPath(); ctx.ellipse(cx, floorY - 40, 22, 6, 0, 0, Math.PI * 2); ctx.fill();

      for (let i = 0; i < 4; i++) {
        const by = floorY - 46 - ((tSec * 25 + i * 14) % 36);
        ctx.fillStyle = anim > 0 && !ok ? 'rgba(184,74,74,0.65)' : 'rgba(118,181,147,0.7)';
        ctx.beginPath(); ctx.arc(cx - 12 + i * 8, by, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#272022';
      ctx.font = '800 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const label = aState.lastResult ? window.LambdaVM.formatValue(aState.lastResult) : 'Just valor | Nothing';
      ctx.fillText(label, cx, 22);
    } else if (lesson.scene === 'boxes_recursion') {
      const cx = w * 0.5;
      [12, 8, 25, 5].forEach((val, idx) => {
        const bx = cx - 96 + idx * 52;
        const by = floorY - 34;
        ctx.fillStyle = '#c89b6e';
        ctx.beginPath(); ctx.roundRect(bx, by, 38, 34, 5); ctx.fill();
        ctx.strokeStyle = '#7d5a3c'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#272022'; ctx.font = '800 12px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(String(val), bx + 19, by + 21);
      });
      ctx.fillStyle = ok ? '#365e4b' : '#272022';
      ctx.font = '800 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(aState.lastResult !== null ? `Total na pilha: ${aState.lastResult}` : 'Pilha: [12, 8, 25, 5]', cx, 22);
    } else if (lesson.scene === 'runes_comp') {
      const pairs = Array.isArray(aState.lastResult) ? aState.lastResult.slice(0, 5) : [{ __tuple: [1, 4] }, { __tuple: [2, 3] }];
      const startX = w * 0.5 - (pairs.length - 1) * 38;
      pairs.forEach((p, idx) => {
        const gx = startX + idx * 76, gy = floorY - 40 + Math.sin(tSec * 3 + idx) * 3;
        ctx.fillStyle = ok ? '#5c8d76' : '#735c88';
        ctx.beginPath();
        ctx.moveTo(gx, gy - 20); ctx.lineTo(gx + 22, gy); ctx.lineTo(gx, gy + 20); ctx.lineTo(gx - 22, gy);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(window.LambdaVM.formatValue(p), gx, gy + 4);
      });
    } else {
      const gears = Array.isArray(aState.lastResult) ? aState.lastResult.slice(0, 5) : [1, 1, 1, 1, 1];
      const startX = w * 0.5 - (gears.length - 1) * 36;
      gears.forEach((val, idx) => {
        const gx = startX + idx * 72, gy = floorY - 40;
        const rad = Math.min(26, 13 + idx * 2.8);
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate((idx % 2 === 0 ? 1 : -1) * tSec * (ok ? 1.8 : 0.4));
        ctx.fillStyle = ok ? '#d49b38' : '#4f759b';
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#272022'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = '800 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(String(val), gx, gy + 4);
      });
    }
  }

  function startAnimLoop() {
    if (aState.rafId) return;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const modal = document.getElementById('academyModal');
      if (modal && !modal.classList.contains('hidden')) {
        if (aState.animPhase > 0) aState.animPhase = Math.max(0, aState.animPhase - dt * 0.45);
        const cv = document.getElementById('academyMiniCanvas');
        if (cv) {
          const rect = cv.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          if (cv.width !== Math.round(rect.width * dpr)) {
            cv.width = Math.round(rect.width * dpr);
            cv.height = Math.round(rect.height * dpr);
          }
          const c = cv.getContext('2d');
          c.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawMiniScene(c, rect.width, rect.height, now * 0.001);
        }
      }
      aState.rafId = requestAnimationFrame(tick);
    };
    aState.rafId = requestAnimationFrame(tick);
  }

  function openAcademy(filter = 'all') {
    aState.filter = filter;
    const studyBox = document.getElementById('academyStudyLayout');
    const sandboxBox = document.getElementById('academySandboxLayout');
    if (filter === 'Sandbox') {
      studyBox.classList.add('hidden');
      sandboxBox.classList.remove('hidden');
      return;
    }
    studyBox.classList.remove('hidden');
    sandboxBox.classList.add('hidden');

    const visibleList = filter === 'all' ? LESSONS : LESSONS.filter(l => l.level === filter);
    if (visibleList.length && !visibleList.some(l => l.id === aState.selectedId)) {
      aState.selectedId = visibleList[0].id;
    }

    renderLessonList();
    loadLessonIntoWorkbench(activeLesson());
    startAnimLoop();
  }

  document.getElementById('academyRunBtn')?.addEventListener('click', runLessonCode);
  document.getElementById('academyHintBtn')?.addEventListener('click', () => {
    const box = document.getElementById('academyHintBox');
    box.innerHTML = activeLesson().hint;
    box.classList.toggle('hidden');
  });

  window.AcademyUI = { open: openAcademy, LESSONS };
})();