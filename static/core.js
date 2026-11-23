/* =========================================================================
   CORE DA PLATAFORMA: Hub, Cenário, API Servant/PostgreSQL, SeedBar & Sandbox
   ========================================================================= */

const GAME_CATALOG = [
  {
    id: 'runner', num: '01', title: 'Lambda Runner', status: 'live', statusLabel: 'INFINITO',
    desc: 'Endless runner tático por Seed. Programe os reflexos do corredor e vença Bosses.',
    tags: ['Funções', 'Guards |', 'HOFs'], cta: 'Jogar agora',
    svg: `<svg viewBox="0 0 80 44" width="76" height="42" fill="none"><path d="M4 36 Q24 22 44 30 T76 26" stroke="#c86d58" stroke-width="2.5" stroke-linecap="round"/><rect x="20" y="13" width="12" height="17" rx="6" fill="#6c539e"/><circle cx="58" cy="14" r="5" fill="#d49b38"/></svg>`
  },
  {
    id: 'hexa', num: '02', title: 'HexaLambda', status: 'live', statusLabel: 'INFINITO',
    desc: 'Puzzle lógico certificado pelo Haskell. Resolva somas em grades com List Comprehensions.',
    tags: ['Listas', '[x | x <- ...]', 'Tuplas'], cta: 'Jogar agora',
    svg: `<svg viewBox="0 0 80 44" width="76" height="42" fill="none" stroke="#635049" stroke-width="2"><polygon points="28,8 37,13 37,23 28,28 19,23 19,13" fill="#e6dccd"/><polygon points="46,8 55,13 55,23 46,28 37,23 37,13" fill="#d49b38" fill-opacity="0.35"/><polygon points="37,23 46,28 46,38 37,43 28,38 28,28" fill="#5c8d76" fill-opacity="0.35"/></svg>`
  },
  {
    id: 'bastion', num: '03', title: 'Bastion Guard', status: 'live', statusLabel: 'INFINITO',
    desc: 'Defesa de torres procedural em vale aberto. Filtre alvos e combe com map e foldl.',
    tags: ['filter', 'map', 'foldl', '(.)'], cta: 'Jogar agora',
    svg: `<svg viewBox="0 0 80 44" width="76" height="42" fill="none"><rect x="28" y="14" width="24" height="24" rx="4" fill="#4f759b" fill-opacity="0.25" stroke="#4f759b" stroke-width="2"/><path d="M26 14h28M40 8v6" stroke="#272022" stroke-width="2.2" stroke-linecap="round"/><circle cx="40" cy="26" r="4" fill="#c86d58"/></svg>`
  },
  {
    id: 'lambdaman', num: '04', title: 'Lambda-Man', status: 'live', statusLabel: 'INFINITO',
    desc: 'Labirintos gerados por DFS + loops. Navegue usando Maybe e recursão sem null.',
    tags: ['Maybe', 'Recursão', 'case of'], cta: 'Jogar agora',
    svg: `<svg viewBox="0 0 80 44" width="76" height="42" fill="none"><path d="M12 10h56v24H12z" stroke="#635049" stroke-width="1.8" stroke-dasharray="6 4"/><circle cx="28" cy="22" r="7" fill="#d49b38"/><circle cx="46" cy="22" r="2.5" fill="#272022"/><circle cx="56" cy="22" r="2.5" fill="#272022"/></svg>`
  }
];

const COSMETICS = {
  skins: [
    { id: 'purple_classic', name: 'Roxo Clássico',  color: '#6c539e', price: 0 },
    { id: 'mint_sage',      name: 'Sálvia Suave',   color: '#5c8d76', price: 60 },
    { id: 'cobalt_sky',     name: 'Azul Ardósia',   color: '#4f759b', price: 90 },
    { id: 'golden_sun',     name: 'Ocre Solar',     color: '#c99038', price: 140 },
    { id: 'coral_ember',    name: 'Terracota Viva', color: '#c86d58', price: 120 },
    { id: 'obsidian_star',  name: 'Obsidiana',      color: '#342e3b', price: 180 }
  ],
  accessories: [
    { id: 'coral_pack',   name: 'Mochila Coral', tag: 'Mochila', price: 0 },
    { id: 'lambda_cape',  name: 'Capa Arcana',   tag: 'Capa',    price: 80 },
    { id: 'wizard_hat',   name: 'Chapéu Mago',   tag: 'Chapéu',  price: 110 },
    { id: 'angel_wings',  name: 'Asas Claras',   tag: 'Asas',    price: 160 },
    { id: 'lambda_crown', name: 'Coroa Lambda',  tag: 'Coroa',   price: 200 }
  ],
  trails: [
    { id: 'trail_none',   name: 'Sem Rastro',    color: '#d6cec5', price: 0 },
    { id: 'trail_stars',  name: 'Estrelinhas',   color: '#e2b86b', price: 90 },
    { id: 'trail_leaves', name: 'Folhas Verdes', color: '#5c8d76', price: 110 },
    { id: 'trail_arcane', name: 'Faísca Arcana', color: '#9c7cc4', price: 150 }
  ],
  pets: [
    { id: 'pet_none', name: 'Sozinho',     color: '#d6cec5', price: 0 },
    { id: 'pet_wisp', name: 'Fogo-Fátuo',  color: '#8cb6d9', price: 120 },
    { id: 'pet_cube', name: 'Cubo Rúnico', color: '#e2b86b', price: 160 },
    { id: 'pet_owl',  name: 'Coruja λ',    color: '#c86d58', price: 210 }
  ],
  themes: [
    { id: 'sunset',    name: 'Pôr do Sol',   color: '#cfa079', price: 0,   sky: ['#ba8c6d', '#cfa079', '#deb58d'], hills: ['#a37170', '#7e5d6e', '#4d6b66'], meadow: ['#6b8868', '#526e55'] },
    { id: 'twilight',  name: 'Crepúsculo',   color: '#947ca3', price: 70,  sky: ['#947ca3', '#c88c7e', '#e2b28a'], hills: ['#8d6474', '#69516b', '#475e5c'], meadow: ['#586b66', '#425251'] },
    { id: 'oasis',     name: 'Oásis Sálvia', color: '#6e8b94', price: 100, sky: ['#6e8b94', '#a6988c', '#dab68d'], hills: ['#7a6e77', '#5a636d', '#3f615b'], meadow: ['#668572', '#4c695a'] },
    { id: 'starlight', name: 'Noite Serena', color: '#454266', price: 150, sky: ['#383554', '#655175', '#b07b79'], hills: ['#554159', '#403b52', '#2d4447'], meadow: ['#395252', '#293e40'] }
  ]
};

const ACHIEVEMENTS = [
  { id: 'first_clear',      title: 'Primeiro Passo Funcional', desc: 'Concluiu o Ante 1 do Lambda Runner.', reward: 50 },
  { id: 'no_if',            title: 'Sem Rodinhas',             desc: 'Venceu uma onda sem usar "if" (apenas Guards ou Padrões).', reward: 70 },
  { id: 'hof_master',       title: 'Ordem Superior',           desc: 'Usou map, filter ou foldl em uma corrida válida.', reward: 90 },
  { id: 'hexa_solver',      title: 'Lógica Hexagonal',         desc: 'Resolveu um tabuleiro do HexaLambda.', reward: 65 },
  { id: 'bastion_defender', title: 'Arquiteto Funcional',      desc: 'Defendeu uma onda no Bastion Guard usando filter, map ou foldl.', reward: 80 },
  { id: 'lambdaman_master', title: 'Zero Nulls',               desc: 'Completou um labirinto do Lambda-Man usando Maybe.', reward: 85 },
  { id: 'big_score',        title: 'Quebra-Escala',            desc: 'Passou de 2.000 pontos em uma fase.', reward: 120 },
  { id: 'scholar',          title: 'Leitor de Haskell',        desc: 'Concluiu 3 ou mais Oficinas no Caderno de Haskell.', reward: 60 },
  { id: 'stylist',          title: 'Estilo Próprio',           desc: 'Desbloqueou um item no Estúdio Visual.', reward: 40 }
];

const SVGS = {
  infinity: `<svg viewBox="0 0 20 12" width="15" height="10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6.2 2.2c-2.2 0-3.7 1.7-3.7 3.8s1.5 3.8 3.7 3.8c2.4 0 3.8-3.8 3.8-3.8s1.4-3.8 3.8-3.8c2.2 0 3.7 1.7 3.7 3.8s-1.5 3.8-3.7 3.8c-2.4 0-3.8-3.8-3.8-3.8S8.6 2.2 6.2 2.2z"/></svg>`,
  shuffle: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4.5h3l5.5 7H14M14 4.5h-3.5l-1.5 2M2 11.5h3l1.5-2"/><path d="M12 2.5l2 2-2 2M12 9.5l2 2-2 2"/></svg>`,
  trophy: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2.5h7v4a3.5 3.5 0 01-7 0v-4zM8 10v3.5M5.5 13.5h5M4.5 3.5H2.5v1.5a2 2 0 002 2M11.5 3.5h2v1.5a2 2 0 01-2 2"/></svg>`,
  star: `<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M8 1.4l2 4.2 4.6.6-3.3 3.2.8 4.6L8 11.8 3.9 14l.8-4.6L1.4 6.2 6 5.6z"/></svg>`,
  user: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="5.2" r="2.7"/><path d="M3 13.5c.8-2.4 2.7-3.5 5-3.5s4.2 1.1 5 3.5"/></svg>`,
  refresh: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M13.5 8a5.5 5.5 0 11-1.4-3.7M13.5 2.5v2.8h-2.8"/></svg>`
};

class CozySynth {
  constructor() { this.ctx = null; this.muted = false; }
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(freq, dur = 0.09, type = 'sine', vol = 0.045, slide = null) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, now + dur);
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + dur);
  }
  chip(s = 1) { this.tone(440 + Math.min(s, 8) * 35, 0.08, 'triangle', 0.05, 660); }
  jump()    { this.tone(280, 0.13, 'sine', 0.05, 520); }
  duck()    { this.tone(320, 0.10, 'triangle', 0.04, 190); }
  drink()   { this.tone(520, 0.16, 'sine', 0.05, 880); }
  hit()     { this.tone(170, 0.20, 'triangle', 0.06, 95); }
  win()     { [523, 659, 784, 987].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.05), i * 95)); }
}
const synth = new CozySynth();

const USER_KEY = 'lambda_arcade_username';
const SAVE_KEY = 'lambda_arcade_save_v3';
const defaultSave = {
  username: localStorage.getItem(USER_KEY) || 'lambda_hero',
  stars: 120, bestScore: 0, bestAnte: 1, runsCompleted: 0,
  cardsStudied: [], unlockedAchievements: [],
  unlockedItems: ['purple_classic', 'coral_pack', 'sunset', 'trail_none', 'pet_none'],
  equippedSkin: 'purple_classic', equippedAcc: 'coral_pack', equippedTheme: 'sunset',
  equippedTrail: 'trail_none', equippedPet: 'pet_none'
};
const playerSave = { ...defaultSave, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') };
playerSave.username = localStorage.getItem(USER_KEY) || playerSave.username || 'lambda_hero';

function applyThemeClass() {
  const isDark = playerSave.equippedTheme === 'starlight' || playerSave.equippedTheme === 'twilight';
  document.body.classList.toggle('dark-sky', isDark);
}

function persistSave() {
  localStorage.setItem(USER_KEY, playerSave.username);
  localStorage.setItem(SAVE_KEY, JSON.stringify(playerSave));
  applyThemeClass();
  const el = document.getElementById('starsCount');
  if (el) el.textContent = playerSave.stars;
  const uEl = document.getElementById('playerNameLabel');
  if (uEl) uEl.textContent = playerSave.username;
}

function showToast(title, sub) {
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `<div style="font-size:12.5px"><b>${title}</b><div style="font-size:11px;color:#635049">${sub}</div></div>`;
  document.getElementById('toastStack')?.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}

function unlockAchievement(achId) {
  if (playerSave.unlockedAchievements.includes(achId)) return;
  const ach = ACHIEVEMENTS.find(a => a.id === achId);
  if (!ach) return;
  playerSave.unlockedAchievements.push(achId);
  playerSave.stars += ach.reward;
  persistSave();
  showToast(`Conquista: ${ach.title}`, `+${ach.reward} estrelas`);
  synth.win();
  ArcadeAPI.saveProgress('achievement', achId, ach.reward);
}

// =========================================================================
// CLIENTE SERVANT + POSTGRESQL (ArcadeAPI)
// =========================================================================
const ArcadeAPI = {
  getUsername() {
    return playerSave.username || 'lambda_hero';
  },

  syncProfile(profile) {
    if (!profile) return playerSave;
    playerSave.username = profile.pUsername || playerSave.username;
    playerSave.stars = profile.pStars ?? playerSave.stars;
    playerSave.bestScore = profile.pBestScore ?? playerSave.bestScore;
    playerSave.bestAnte = profile.pBestAnte ?? playerSave.bestAnte;
    playerSave.runsCompleted = profile.pRunsCompleted ?? playerSave.runsCompleted;
    playerSave.equippedSkin = profile.pEquippedSkin || playerSave.equippedSkin;
    playerSave.equippedAcc = profile.pEquippedAcc || playerSave.equippedAcc;
    playerSave.equippedTheme = profile.pEquippedTheme || playerSave.equippedTheme;
    playerSave.equippedTrail = profile.pEquippedTrail || playerSave.equippedTrail || 'trail_none';
    playerSave.equippedPet = profile.pEquippedPet || playerSave.equippedPet || 'pet_none';

    const mergedItems = new Set([
      'purple_classic', 'coral_pack', 'sunset', 'trail_none', 'pet_none',
      ...(profile.pUnlockedItems || [])
    ]);
    playerSave.unlockedItems = Array.from(mergedItems);

    if (Array.isArray(profile.pUnlockedAchievements) && profile.pUnlockedAchievements.length) {
      playerSave.unlockedAchievements = Array.from(new Set([
        ...playerSave.unlockedAchievements,
        ...profile.pUnlockedAchievements
      ]));
    }
    if (Array.isArray(profile.pCardsStudied) && profile.pCardsStudied.length) {
      playerSave.cardsStudied = Array.from(new Set([
        ...playerSave.cardsStudied,
        ...profile.pCardsStudied
      ]));
    }
    persistSave();
    return playerSave;
  },

  async loadPlayer(username = this.getUsername()) {
    const clean = (username || 'lambda_hero').trim() || 'lambda_hero';
    playerSave.username = clean;
    localStorage.setItem(USER_KEY, clean);
    try {
      const res = await fetch(`/api/player/${encodeURIComponent(clean)}`);
      if (!res.ok) throw new Error('Falha ao carregar jogador.');
      const profile = await res.json();
      return this.syncProfile(profile);
    } catch (err) {
      console.warn('Servidor indisponivel para /api/player, usando cache local:', err);
      persistSave();
      return playerSave;
    }
  },

  async fetchLevel(game, seed = null, tier = 1) {
    const params = new URLSearchParams();
    if (seed !== null && seed !== undefined && seed !== '') params.set('seed', String(seed));
    params.set('tier', String(Math.max(1, Number(tier) || 1)));
    const res = await fetch(`/api/levels/${encodeURIComponent(game)}?${params.toString()}`);
    if (!res.ok) throw new Error(`Erro ao gerar nivel (${res.status}).`);
    return res.json();
  },

  async validateCode(game, code, tier = 1) {
    const res = await fetch(`/api/validate/${encodeURIComponent(game)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vCode: code, vTier: Math.max(1, Number(tier) || 1) })
    });
    if (!res.ok) throw new Error(`Erro ao validar codigo (${res.status}).`);
    return res.json();
  },

  async updateWardrobe(category, itemId, price) {
    const res = await fetch(`/api/player/${encodeURIComponent(this.getUsername())}/wardrobe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wCategory: category, wItemId: itemId, wPrice: price })
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Nao foi possivel equipar o item.');
    }
    const profile = await res.json();
    return this.syncProfile(profile);
  },

  async saveProgress(category, key, reward = 0) {
    try {
      const res = await fetch(`/api/player/${encodeURIComponent(this.getUsername())}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prCategory: category, prKey: key, prReward: reward })
      });
      if (!res.ok) throw new Error('Falha ao salvar progresso.');
      const profile = await res.json();
      return this.syncProfile(profile);
    } catch {
      if (category === 'card' && !playerSave.cardsStudied.includes(key)) {
        playerSave.cardsStudied.push(key);
        playerSave.stars += reward;
      } else if (category === 'achievement' && !playerSave.unlockedAchievements.includes(key)) {
        playerSave.unlockedAchievements.push(key);
        playerSave.stars += reward;
      }
      persistSave();
      return playerSave;
    }
  },

  async submitRun({ game, seed, tier, score, starsWon, hofMult, code }) {
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          srUsername: this.getUsername(),
          srGame: game,
          srSeed: Number(seed) || 1,
          srTier: Math.max(1, Number(tier) || 1),
          srScore: Math.round(Number(score) || 0),
          srStarsWon: Math.round(Number(starsWon) || 0),
          srHofMult: Number(hofMult) || 1.0,
          srCode: String(code || '')
        })
      });
      if (!res.ok) throw new Error('Falha ao salvar run no PostgreSQL.');
      const profile = await res.json();
      return this.syncProfile(profile);
    } catch (err) {
      console.warn('Falha ao enviar run para o servidor:', err);
      playerSave.stars += Math.round(Number(starsWon) || 0);
      playerSave.runsCompleted++;
      playerSave.bestScore = Math.max(playerSave.bestScore, Math.round(Number(score) || 0));
      playerSave.bestAnte = Math.max(playerSave.bestAnte, Number(tier) || 1);
      persistSave();
      return playerSave;
    }
  },

  async fetchLeaderboard(game, seed = null) {
    const qs = seed !== null && seed !== undefined ? `?seed=${encodeURIComponent(seed)}` : '';
    const res = await fetch(`/api/leaderboard/${encodeURIComponent(game)}${qs}`);
    if (!res.ok) throw new Error('Falha ao carregar ranking.');
    return res.json();
  }
};
window.ArcadeAPI = ArcadeAPI;

// =========================================================================
// UI COMPARTILHADA: Barra de Modo Infinito (Seed), Ranking & Jogador
// =========================================================================
function ensureSharedModals() {
  if (!document.getElementById('leaderboardModal')) {
    const lb = document.createElement('div');
    lb.id = 'leaderboardModal';
    lb.className = 'modal-backdrop hidden';
    lb.innerHTML = `
      <div class="paper-modal small-modal">
        <div class="modal-head">
          <div>
            <span class="eyebrow-tag" id="lbModalEyebrow">RANKING DA SEED</span>
            <h2 id="lbModalTitle">Classificacao</h2>
          </div>
          <button class="close-x" data-close="leaderboardModal" aria-label="Fechar">X</button>
        </div>
        <div class="level-tabs" id="lbScopeTabs">
          <button class="tab-pill active" data-scope="seed">Nesta Seed</button>
          <button class="tab-pill" data-scope="global">Global do Jogo</button>
        </div>
        <div class="lb-list" id="lbListBox"></div>
      </div>
    `;
    document.body.appendChild(lb);
    lb.querySelector('.close-x').addEventListener('click', () => lb.classList.add('hidden'));
  }

  if (!document.getElementById('playerSwitchModal')) {
    const pm = document.createElement('div');
    pm.id = 'playerSwitchModal';
    pm.className = 'modal-backdrop hidden';
    pm.innerHTML = `
      <div class="paper-modal small-modal">
        <div class="modal-head">
          <div>
            <span class="eyebrow-tag">PERFIL POSTGRESQL</span>
            <h2>Identificacao do Jogador</h2>
          </div>
          <button class="close-x" data-close="playerSwitchModal" aria-label="Fechar">X</button>
        </div>
        <p class="muted-copy">Suas estrelas, itens desbloqueados e recordes ficam salvos para este nome no banco de dados.</p>
        <div class="username-form">
          <input type="text" id="usernameSwitchInput" class="username-input" maxlength="24" placeholder="ex: lambda_hero" />
          <button class="btn-primary" id="usernameSwitchSaveBtn" style="flex:none">Entrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(pm);
    pm.querySelector('.close-x').addEventListener('click', () => pm.classList.add('hidden'));
    pm.querySelector('#usernameSwitchSaveBtn').addEventListener('click', async () => {
      const val = pm.querySelector('#usernameSwitchInput').value.trim();
      if (!val) return;
      await ArcadeAPI.loadPlayer(val);
      pm.classList.add('hidden');
      showToast('Perfil carregado', `Jogando como ${playerSave.username}`);
    });
  }

  const topLeft = document.querySelector('.topbar-left');
  if (topLeft && !document.getElementById('playerSwitchBtn')) {
    const btn = document.createElement('button');
    btn.id = 'playerSwitchBtn';
    btn.className = 'player-pill';
    btn.title = 'Trocar perfil de jogador';
    btn.innerHTML = `${SVGS.user}<span id="playerNameLabel">${playerSave.username}</span>`;
    btn.addEventListener('click', () => {
      const inp = document.getElementById('usernameSwitchInput');
      if (inp) inp.value = playerSave.username;
      document.getElementById('playerSwitchModal').classList.remove('hidden');
    });
    topLeft.appendChild(btn);
  }
}

const GAME_NAMES = {
  runner: 'Lambda Runner',
  hexa: 'HexaLambda',
  bastion: 'Bastion Guard',
  lambdaman: 'Lambda-Man'
};

async function renderLeaderboardData(game, seed, scope) {
  const box = document.getElementById('lbListBox');
  const ey = document.getElementById('lbModalEyebrow');
  const tt = document.getElementById('lbModalTitle');
  if (!box) return;

  ey.textContent = scope === 'seed' ? `SEED #${seed}` : 'RANKING GLOBAL';
  tt.textContent = GAME_NAMES[game] || game;
  box.innerHTML = `<div class="lb-empty">Carregando ranking...</div>`;

  try {
    const entries = await ArcadeAPI.fetchLeaderboard(game, scope === 'seed' ? seed : null);
    if (!entries.length) {
      box.innerHTML = `<div class="lb-empty">Nenhuma partida registrada ${scope === 'seed' ? `para a Seed #${seed}` : 'ainda'}. Conclua um Ante para estrear o placar!</div>`;
      return;
    }
    box.innerHTML = entries.map((e, i) => `
      <div class="lb-row ${i === 0 ? 'top-1' : ''}">
        <span class="lb-rank">#${i + 1}</span>
        <span class="lb-user">${e.leUsername}</span>
        <span class="lb-meta">Ante ${e.leTier}</span>
        <span class="lb-meta">x${Number(e.leHofMult).toFixed(1)}</span>
        <span class="lb-score">${fmt(e.leScore)}</span>
      </div>
    `).join('');
  } catch {
    box.innerHTML = `<div class="lb-empty">Nao foi possivel consultar o servidor.</div>`;
  }
}

function openLeaderboardModal(game, seed) {
  ensureSharedModals();
  const modal = document.getElementById('leaderboardModal');
  const tabs = modal.querySelectorAll('#lbScopeTabs .tab-pill');
  tabs.forEach(t => {
    t.classList.toggle('active', t.dataset.scope === 'seed');
    t.onclick = () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      renderLeaderboardData(game, seed, t.dataset.scope);
    };
  });
  modal.classList.remove('hidden');
  renderLeaderboardData(game, seed, 'seed');
}

function createSeedBar(containerId, { game, onSelect }) {
  ensureSharedModals();
  const host = document.getElementById(containerId);
  if (!host) return null;

  let curSeed = 1;
  let curTier = 1;

  host.className = 'infinite-bar';
  host.innerHTML = `
    <span class="infinite-badge" title="Modo Infinito Procedural">${SVGS.infinity}<span class="ante-lbl">ANTE 1</span></span>
    <span class="seed-label">SEED</span>
    <input type="number" class="seed-input" value="1" min="1" aria-label="Seed do nivel" />
    <button class="seed-action-btn apply-seed-btn" title="Carregar Seed">Ir</button>
    <button class="seed-action-btn icon-btn rand-seed-btn" title="Gerar nova Seed aleatoria">${SVGS.shuffle}</button>
    <button class="seed-action-btn icon-btn lb-seed-btn" title="Ranking desta Seed">${SVGS.trophy}</button>
  `;

  const anteLbl = host.querySelector('.ante-lbl');
  const inp = host.querySelector('.seed-input');
  const applyBtn = host.querySelector('.apply-seed-btn');
  const randBtn = host.querySelector('.rand-seed-btn');
  const lbBtn = host.querySelector('.lb-seed-btn');

  const triggerSeed = (newSeed, newTier = 1) => {
    const parsed = Math.max(1, Math.floor(Number(newSeed) || 1));
    curSeed = parsed;
    curTier = Math.max(1, newTier);
    inp.value = String(curSeed);
    onSelect?.(curSeed, curTier);
  };

  applyBtn.addEventListener('click', () => triggerSeed(inp.value, 1));
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); triggerSeed(inp.value, 1); }
  });
  randBtn.addEventListener('click', () => {
    const rnd = Math.floor(1000 + Math.random() * 90000);
    synth.chip(3);
    triggerSeed(rnd, 1);
  });
  lbBtn.addEventListener('click', () => {
    openLeaderboardModal(game, curSeed);
  });

  return {
    update(seed, tier) {
      curSeed = Number(seed) || curSeed;
      curTier = Number(tier) || curTier;
      inp.value = String(curSeed);
      anteLbl.textContent = `ANTE ${curTier}`;
    },
    getSeed: () => curSeed,
    getTier: () => curTier
  };
}

window.ArcadeUI = {
  SVGS,
  createSeedBar,
  openLeaderboardModal,
  showToast
};

// =========================================================================
// SYNTAX HIGHLIGHTING & UTILITARIOS COMPARTILHADOS
// =========================================================================
function highlightHaskell(src) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rx = /(--[^\n]*)|("(?:\\.|[^"])*")|\b(if|then|else|case|of|otherwise|where|let|in|map|filter|foldl|foldr|sum|all|length|not|fromMaybe|take|iterate|div|mod|max|min)\b|\b(Pular|Abaixar|BeberAgua|Correr|Combo|Just|Nothing|Norte|Sul|Leste|Oeste|True|False|Int|String|Bool|Acao|Inimigo|Direcao|Maybe)\b|\b(\d+)\b|(\||==|\/=|<=|>=|&&|\|\||->|<-|::|=|\.\.)/g;
  let out = '', last = 0;
  for (const m of src.matchAll(rx)) {
    out += esc(src.slice(last, m.index));
    const [full, c, s, k, ct, n, o] = m;
    const safe = esc(full);
    if (c) out += `<span class="hl-comment">${safe}</span>`;
    else if (s) out += `<span class="hl-str">${safe}</span>`;
    else if (k) out += `<span class="hl-kw">${safe}</span>`;
    else if (ct) out += `<span class="hl-ctor">${safe}</span>`;
    else if (n) out += `<span class="hl-num">${safe}</span>`;
    else if (o) out += `<span class="hl-op">${safe}</span>`;
    last = m.index + full.length;
  }
  out += esc(src.slice(last));
  return src.endsWith('\n') ? out + ' ' : out;
}

function fmt(n) { return n >= 1e9 ? n.toExponential(2) : Math.floor(n).toLocaleString('pt-BR'); }

// =========================================================================
// CENARIO VIVO & MOTOR VISUAL
// =========================================================================
const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
let viewW = window.innerWidth, viewH = window.innerHeight;
function resizeWorld() {
  const dpr = window.devicePixelRatio || 1;
  viewW = window.innerWidth; viewH = window.innerHeight;
  canvas.width = viewW * dpr; canvas.height = viewH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeWorld);
resizeWorld();

const worldState = {
  mode: 'hub', paused: true, drawerMinimized: false,
  scrollX: 0, groundY: viewH * 0.80,
  clouds: [{ x: 140, y: 0.22, s: 1.0, v: 9 }, { x: 520, y: 0.30, s: 0.78, v: 6 }, { x: 960, y: 0.19, s: 1.1, v: 11 }],
  runner: { x: 0.26, y: 0, vy: 0, pose: 'idle', poseTimer: 0, walkTick: 0, speed: 220, blinkTimer: 2.5 },
  particles: [], floatingTexts: []
};

function drawLabelPill(text, x, y) {
  ctx.font = '700 10.5px "JetBrains Mono", monospace';
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = 'rgba(34, 28, 32, 0.72)';
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - 11, w, 16, 6); ctx.fill();
  ctx.fillStyle = '#f5efe6'; ctx.textAlign = 'center'; ctx.fillText(text, x, y + 1);
}

function worldLoop(now) {
  const dt = Math.min(0.05, (now - worldLoop.last) / 1000);
  worldLoop.last = now;

  let targetGround = viewH * 0.80;
  if (worldState.mode === 'runner') {
    targetGround = worldState.drawerMinimized ? viewH * 0.78 : Math.min(viewH - 295, viewH * 0.54);
  } else if (worldState.mode === 'bastion') {
    targetGround = viewH * 0.28;
  } else if (worldState.mode !== 'hub') {
    targetGround = viewH * 0.86;
  }
  worldState.groundY += (targetGround - worldState.groundY) * Math.min(1, dt * 8);

  for (const c of worldState.clouds) { c.x -= c.v * dt; if (c.x < -140) c.x = viewW + 120; }
  worldState.runner.blinkTimer -= dt;
  if (worldState.runner.blinkTimer < -0.12) worldState.runner.blinkTimer = 2.4 + Math.random() * 2.4;

  if (worldState.mode === 'hub') {
    worldState.scrollX += 42 * dt;
    worldState.runner.walkTick += dt * 3.5;
    worldState.runner.pose = 'walk';
  } else if (worldState.mode === 'runner' && !worldState.paused) {
    window.updateRunnerSim?.(dt);
  }

  renderWorld(now * 0.001);
  requestAnimationFrame(worldLoop);
}
worldLoop.last = performance.now();

function renderWorld(tSec) {
  const w = viewW, h = viewH, gy = worldState.groundY;
  const pal = COSMETICS.themes.find(t => t.id === playerSave.equippedTheme) || COSMETICS.themes[0];

  const skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(gy, h * 0.4));
  skyGrad.addColorStop(0, pal.sky[0]); skyGrad.addColorStop(0.55, pal.sky[1]); skyGrad.addColorStop(1, pal.sky[2]);
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(238, 232, 198, 0.72)';
  ctx.beginPath(); ctx.arc(w * 0.79, Math.min(gy, h * 0.5) * 0.36, 32, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(255, 245, 232, 0.16)';
  for (const c of worldState.clouds) {
    const cy = Math.min(gy, h * 0.55) * c.y;
    ctx.beginPath();
    ctx.roundRect(c.x - 36 * c.s, cy, 72 * c.s, 14 * c.s, 7 * c.s);
    ctx.arc(c.x - 10 * c.s, cy, 13 * c.s, 0, Math.PI * 2);
    ctx.arc(c.x + 12 * c.s, cy + 2 * c.s, 10 * c.s, 0, Math.PI * 2);
    ctx.fill();
  }

  const drawHills = (off, amp, freq, col, ph) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, gy + 40);
    for (let x = 0; x <= w + 24; x += 24) {
      ctx.lineTo(x, gy - amp - Math.sin((x + off) * freq + ph) * (amp * 0.55) - Math.cos((x + off) * freq * 0.5) * 10);
    }
    ctx.lineTo(w, gy + 40); ctx.closePath(); ctx.fill();
  };
  drawHills(worldState.scrollX * 0.08, 42, 0.0042, pal.hills[0], 0.5);
  drawHills(worldState.scrollX * 0.18, 26, 0.0055, pal.hills[1], 2.1);
  drawHills(worldState.scrollX * 0.30, 14, 0.0070, pal.hills[2], 4.0);

  if (worldState.mode === 'hub' || worldState.mode === 'runner') {
    ctx.fillStyle = '#c48f65'; ctx.fillRect(0, gy - 14, w, 14);
    ctx.fillStyle = 'rgba(44, 36, 40, 0.18)';
    const cOff = worldState.scrollX % 90;
    for (let x = -cOff; x < w + 90; x += 90) ctx.fillRect(x, gy - 8, 22, 2);

    ctx.fillStyle = '#5c5a65'; ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = 'rgba(232, 222, 188, 0.65)';
    const dOff = worldState.scrollX % 95;
    for (let x = -dOff; x < w + 95; x += 95) ctx.fillRect(x, gy + 44, 34, 3);

    const trackY = gy + 12;
    if (worldState.mode === 'runner') window.drawRunnerObstacles?.(ctx, trackY, tSec);
    drawCharacter(worldState.runner, trackY, tSec);
  }

  for (const p of worldState.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const ft of worldState.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, ft.life * 1.4);
    ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(44, 36, 40, 0.35)'; ctx.fillText(ft.text, ft.x + 1, ft.y + 2);
    ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

window.drawStyledRunner = function (c, { x, baseY, y = 0, pose = 'walk', walkTick = 0, blinkTimer = 1, tSec = 0 }) {
  const py = baseY + y;
  const isDuck = pose === 'duck', bodyH = isDuck ? 20 : 34;
  const skinColor = (COSMETICS.skins.find(s => s.id === playerSave.equippedSkin) || COSMETICS.skins[0]).color;
  const acc = playerSave.equippedAcc;
  const trail = playerSave.equippedTrail || 'trail_none';
  const pet = playerSave.equippedPet || 'pet_none';

  c.save();

  // Rastro animado
  if (trail !== 'trail_none' && pose !== 'idle') {
    const tCol = trail === 'trail_stars' ? '#e2b86b' : trail === 'trail_leaves' ? '#5c8d76' : '#bfa6d9';
    for (let i = 1; i <= 5; i++) {
      const tx = x - i * 11 - ((tSec * 45) % 8);
      const ty = py - 14 + Math.sin(tSec * 9 + i * 1.4) * 5;
      c.globalAlpha = 0.72 - i * 0.12;
      c.fillStyle = tCol;
      c.beginPath(); c.arc(tx, ty, Math.max(1.5, 4.5 - i * 0.5), 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  }

  // Sombra
  const sh = Math.max(0.45, 1 + y / 140);
  c.fillStyle = 'rgba(28, 22, 30, 0.28)';
  c.beginPath(); c.ellipse(x, baseY + 3, 20 * sh, 5 * sh, 0, 0, Math.PI * 2); c.fill();

  // Pernas
  const swing = pose === 'idle' ? 0.25 : (pose === 'jump' ? 0.8 : Math.sin(walkTick * 1.9) * 0.9);
  const leg = (ang, lc, sc) => {
    const hipY = py - 16, fx = x + Math.sin(ang) * 12;
    const fy = py - (pose === 'jump' ? 4 : Math.max(0, -Math.cos(ang) * 4));
    c.strokeStyle = lc; c.lineWidth = 6.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, hipY); c.lineTo(fx, fy - 2); c.stroke();
    c.fillStyle = sc; c.beginPath(); c.ellipse(fx + 3, fy, 7, 3.8, 0, 0, Math.PI * 2); c.fill();
  };
  leg(-swing, '#232030', '#9f99ac');
  leg(swing,  '#2b273a', '#cfc9d8');

  const bob = pose === 'idle' ? Math.sin(tSec * 3) * 1.5 : Math.abs(Math.sin(walkTick * 1.9)) * -2.5;
  const bodyTop = py - 14 - bodyH + bob;

  // Pet / Companheiro flutuante
  if (pet !== 'pet_none') {
    const px = x - 34, ppy = bodyTop - 4 + Math.sin(tSec * 4.5) * 5;
    if (pet === 'pet_wisp') {
      c.fillStyle = 'rgba(140, 182, 217, 0.35)'; c.beginPath(); c.arc(px, ppy, 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8cb6d9'; c.beginPath(); c.arc(px, ppy, 6, 0, Math.PI * 2); c.fill();
    } else if (pet === 'pet_cube') {
      c.fillStyle = '#e2b86b'; c.beginPath(); c.roundRect(px - 6, ppy - 6, 12, 12, 3); c.fill();
      c.fillStyle = '#272022'; c.fillRect(px - 2, ppy - 2, 4, 4);
    } else if (pet === 'pet_owl') {
      c.fillStyle = '#c86d58'; c.beginPath(); c.arc(px, ppy, 7.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(px - 2.5, ppy - 1, 2, 0, Math.PI * 2); c.arc(px + 2.5, ppy - 1, 2, 0, Math.PI * 2); c.fill();
    }
  }

  // Acessorios traseiros
  if (acc === 'coral_pack') { c.fillStyle = '#c86d58'; c.beginPath(); c.roundRect(x - 17, bodyTop + 10, 9, 18, 4); c.fill(); }
  else if (acc === 'lambda_cape') { c.fillStyle = '#735c88'; c.beginPath(); c.moveTo(x - 6, bodyTop + 8); c.lineTo(x - 24, bodyTop + 26 + Math.sin(tSec * 8) * 3); c.lineTo(x - 8, bodyTop + 28); c.fill(); }
  else if (acc === 'angel_wings') { c.fillStyle = 'rgba(245, 239, 230, 0.9)'; c.beginPath(); c.ellipse(x - 14, bodyTop + 14 + Math.sin(tSec * 9) * 4, 10, 5, -0.4, 0, Math.PI * 2); c.fill(); }

  // Corpo
  c.fillStyle = pose === 'hit' ? '#b84a4a' : skinColor;
  c.beginPath(); c.roundRect(x - 11, bodyTop, 23, bodyH + 4, 12); c.fill();

  // Chapeus / Coroa
  if (acc === 'wizard_hat') {
    c.fillStyle = '#3c2a4d';
    c.beginPath(); c.ellipse(x, bodyTop + 2, 16, 4, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(x - 9, bodyTop + 2); c.lineTo(x - 2, bodyTop - 18); c.lineTo(x + 9, bodyTop + 2); c.fill();
  } else if (acc === 'lambda_crown') {
    c.fillStyle = '#e2b86b';
    c.beginPath();
    c.moveTo(x - 8, bodyTop + 1); c.lineTo(x - 7, bodyTop - 9); c.lineTo(x - 2, bodyTop - 3);
    c.lineTo(x + 1, bodyTop - 11); c.lineTo(x + 4, bodyTop - 3); c.lineTo(x + 9, bodyTop - 9); c.lineTo(x + 9, bodyTop + 1);
    c.closePath(); c.fill();
  }

  c.fillStyle = 'rgba(255, 255, 255, 0.22)';
  c.beginPath(); c.arc(x - 3, bodyTop + 7, 4, 0, Math.PI * 2); c.fill();

  if (blinkTimer > 0) {
    c.fillStyle = '#232030';
    c.beginPath(); c.arc(x + 3, bodyTop + 11, 2, 0, Math.PI * 2); c.arc(x + 9, bodyTop + 11, 2, 0, Math.PI * 2); c.fill();
  } else {
    c.strokeStyle = '#232030'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x + 1, bodyTop + 11); c.lineTo(x + 5, bodyTop + 11); c.moveTo(x + 7, bodyTop + 11); c.lineTo(x + 11, bodyTop + 11); c.stroke();
  }
  c.fillStyle = '#e8e4ec';
  c.beginPath(); c.arc(x + 9, bodyTop + 21, 3.2, 0, Math.PI * 2); c.fill();
  c.restore();
};

function drawCharacter(r, baseY, tSec) {
  window.drawStyledRunner(ctx, {
    x: viewW * r.x,
    baseY,
    y: r.y,
    pose: r.pose,
    walkTick: r.walkTick,
    blinkTimer: r.blinkTimer,
    tSec
  });
}

// =========================================================================
// NAVEGACAO & MODAIS
// =========================================================================
function hideAllViews() {
  ['hubView', 'runnerView', 'hexaView', 'bastionView', 'lambdamanView', 'hubHeaderCenter', 'gameHeaderCenter']
    .forEach(id => document.getElementById(id)?.classList.add('hidden'));
}

function enterHub() {
  hideAllViews();
  worldState.mode = 'hub'; worldState.paused = true;
  document.getElementById('hubView')?.classList.remove('hidden');
  document.getElementById('hubHeaderCenter')?.classList.remove('hidden');
  document.getElementById('backToHubBtn')?.classList.add('hidden');
  document.getElementById('hubBrandMark')?.classList.remove('hidden');
}

function enterGameView(mode) {
  hideAllViews();
  worldState.mode = mode;
  const viewMap = { runner: 'runnerView', hexa: 'hexaView', bastion: 'bastionView', lambdaman: 'lambdamanView' };
  document.getElementById(viewMap[mode])?.classList.remove('hidden');
  document.getElementById('gameHeaderCenter')?.classList.remove('hidden');
  document.getElementById('backToHubBtn')?.classList.remove('hidden');
  document.getElementById('hubBrandMark')?.classList.add('hidden');

  if (mode === 'runner')    window.initRunnerStage?.(null, 1);
  if (mode === 'hexa')      window.initHexaLevel?.(null, 1);
  if (mode === 'bastion')   window.initBastionLevel?.(null, 1);
  if (mode === 'lambdaman') window.initLambdaManLevel?.(null, 1);
}

function renderHub() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const g of GAME_CATALOG) {
    const card = document.createElement('div');
    card.className = 'game-card live-card';
    card.innerHTML = `
      <div>
        <div class="gc-top"><span>JOGO ${g.num}</span><span class="gc-state live">${g.statusLabel}</span></div>
        <div class="gc-art">${g.svg}</div>
        <div class="gc-title">${g.title}</div>
        <p class="gc-desc">${g.desc}</p>
      </div>
      <div>
        <div class="gc-tags">${g.tags.map(t => `<span class="gc-tag">${t}</span>`).join('')}</div>
        <button class="gc-cta">${g.cta}</button>
      </div>`;
    card.addEventListener('click', () => enterGameView(g.id));
    grid.appendChild(card);
  }
}

function runSandboxExpr() {
  const out = document.getElementById('sandboxOutput');
  const code = document.getElementById('sandboxInput').value;
  try {
    const res = window.LambdaVM.evalScript(code);
    out.textContent = `=> ${window.LambdaVM.formatValue(res.value)}`;
    out.style.borderColor = 'rgba(92,141,118,0.5)';
    synth.chip(4);
  } catch (err) {
    out.textContent = `Erro: ${window.LambdaVM.translateError(err.message, code)}`;
    out.style.borderColor = 'rgba(184,74,74,0.6)';
    synth.hit();
  }
}

document.getElementById('sandboxRunBtn')?.addEventListener('click', runSandboxExpr);
document.getElementById('sandboxInput')?.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runSandboxExpr(); }
});
document.querySelectorAll('.sbx-preset').forEach(b => b.addEventListener('click', () => {
  document.getElementById('sandboxInput').value = b.dataset.code;
  runSandboxExpr();
}));

async function renderRecords() {
  await ArcadeAPI.loadPlayer();
  document.getElementById('recordsSummary').innerHTML = `
    <div class="rec-box"><b>${fmt(playerSave.bestScore)}</b><span>Melhor Pontuacao</span></div>
    <div class="rec-box"><b>ANTE ${playerSave.bestAnte}</b><span>Maior Ante</span></div>
    <div class="rec-box"><b>${playerSave.runsCompleted}</b><span>Fases Concluidas</span></div>`;
  document.getElementById('achievementsGrid').innerHTML = ACHIEVEMENTS.map(a => {
    const ok = playerSave.unlockedAchievements.includes(a.id);
    return `<div class="ach-card ${ok ? 'unlocked' : ''}"><div class="ach-title">${a.title}</div><div class="ach-desc">${a.desc} (<span class="star-inline">+${a.reward} ${SVGS.star}</span>)</div></div>`;
  }).join('');
}

document.getElementById('backToHubBtn')?.addEventListener('click', enterHub);
document.getElementById('openAcademyBtn')?.addEventListener('click', () => {
  window.AcademyUI?.open('all');
  document.getElementById('academyModal').classList.remove('hidden');
});
document.querySelectorAll('#academyTabs .tab-pill').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('#academyTabs .tab-pill').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  window.AcademyUI?.open(tab.dataset.level);
}));
document.getElementById('openWardrobeBtn')?.addEventListener('click', () => {
  window.WardrobeUI?.open();
  document.getElementById('wardrobeModal').classList.remove('hidden');
});
document.getElementById('openRecordsBtn')?.addEventListener('click', () => { renderRecords(); document.getElementById('recordsModal').classList.remove('hidden'); });
document.getElementById('muteBtn')?.addEventListener('click', () => {
  synth.muted = !synth.muted;
  document.getElementById('soundIconOn')?.classList.toggle('hidden', synth.muted);
  document.getElementById('soundIconOff')?.classList.toggle('hidden', !synth.muted);
});
document.querySelectorAll('.close-x').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.close)?.classList.add('hidden')));

ensureSharedModals();
persistSave();
ArcadeAPI.loadPlayer();
renderHub();
enterHub();
requestAnimationFrame(worldLoop);