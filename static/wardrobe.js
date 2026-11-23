/* =========================================================================
   WARDROBE.JS — Estúdio Visual com Preview em Tempo Real, Rastros e Pets
   ========================================================================= */

(function () {
  const wState = {
    tab: 'skin',
    previewPose: 'run', // 'idle' | 'run' | 'jump'
    rafId: null,
    scrollX: 0,
    walkTick: 0
  };

  const TABS = [
    { id: 'skin',  label: 'Cores',      listKey: 'skins',       eqKey: 'equippedSkin',  isColor: true },
    { id: 'acc',   label: 'Acessórios', listKey: 'accessories', eqKey: 'equippedAcc',   isColor: false },
    { id: 'trail', label: 'Rastros',    listKey: 'trails',      eqKey: 'equippedTrail', isColor: true },
    { id: 'pet',   label: 'Pets',       listKey: 'pets',        eqKey: 'equippedPet',   isColor: true },
    { id: 'theme', label: 'Paisagem',   listKey: 'themes',      eqKey: 'equippedTheme', isColor: true }
  ];

  function renderWardrobeStudio() {
    const tabBar = document.getElementById('wardrobeTabs');
    const grid = document.getElementById('wardrobeItemsGrid');
    if (!tabBar || !grid) return;

    tabBar.innerHTML = TABS.map(t =>
      `<button class="tab-pill ${t.id === wState.tab ? 'active' : ''}" data-wtab="${t.id}">${t.label}</button>`
    ).join('');
    tabBar.querySelectorAll('.tab-pill').forEach(b => b.addEventListener('click', () => {
      wState.tab = b.dataset.wtab;
      renderWardrobeStudio();
    }));

    const activeTab = TABS.find(t => t.id === wState.tab) || TABS[0];
    const items = COSMETICS[activeTab.listKey] || [];
    const totalOwned = playerSave.unlockedItems.length;
    const totalAll = Object.values(COSMETICS).reduce((s, arr) => s + arr.length, 0);
    document.getElementById('wardrobeCountLabel').textContent = `${totalOwned}/${totalAll} desbloqueados`;

    grid.innerHTML = '';
    for (const it of items) {
      const owned = playerSave.unlockedItems.includes(it.id);
      const eq = playerSave[activeTab.eqKey] === it.id;
      const el = document.createElement('div');
      el.className = `cosmetic-item ${eq ? 'equipped' : ''}`;
      const priceMarkup = eq
        ? 'Equipado'
        : owned
          ? 'Equipar'
          : `<span class="star-inline">${it.price} ${SVGS.star}</span>`;

      el.innerHTML = `
        ${activeTab.isColor
          ? `<div class="swatch" style="background:${it.color || '#d6cec5'}"></div>`
          : `<div class="acc-tag">${it.tag || 'Item'}</div>`}
        <div>${it.name}</div>
        <small style="color:${eq ? '#365e4b' : '#635049'}">${priceMarkup}</small>
      `;

      el.addEventListener('click', async () => {
        if (!owned && playerSave.stars < it.price) {
          synth.hit();
          showToast('Estrelas insuficientes', `Você precisa de ${it.price} estrelas.`);
          return;
        }
        try {
          await ArcadeAPI.updateWardrobe(activeTab.id, it.id, it.price);
          renderWardrobeStudio();
          if (!owned) {
            unlockAchievement('stylist');
            synth.win();
          } else {
            synth.chip(3);
          }
        } catch (err) {
          synth.hit();
          showToast('Visual', err.message || 'Erro ao equipar item.');
        }
      });
      grid.appendChild(el);
    }
  }

  function startPreviewLoop() {
    if (wState.rafId) return;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const modal = document.getElementById('wardrobeModal');
      if (modal && !modal.classList.contains('hidden')) {
        const cv = document.getElementById('wardrobePreviewCanvas');
        if (cv) {
          const rect = cv.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          if (cv.width !== Math.round(rect.width * dpr)) {
            cv.width = Math.round(rect.width * dpr);
            cv.height = Math.round(rect.height * dpr);
          }
          const c = cv.getContext('2d');
          c.setTransform(dpr, 0, 0, dpr, 0, 0);

          const w = rect.width, h = rect.height, gy = h - 42;
          const pal = COSMETICS.themes.find(t => t.id === playerSave.equippedTheme) || COSMETICS.themes[0];
          const sky = c.createLinearGradient(0, 0, 0, gy);
          sky.addColorStop(0, pal.sky[0]); sky.addColorStop(0.6, pal.sky[1]); sky.addColorStop(1, pal.sky[2]);
          c.fillStyle = sky; c.fillRect(0, 0, w, h);

          if (wState.previewPose === 'run') { wState.scrollX += 68 * dt; wState.walkTick += dt * 7; }
          else if (wState.previewPose === 'jump') { wState.scrollX += 50 * dt; }

          c.fillStyle = pal.hills[1];
          c.beginPath(); c.moveTo(0, gy);
          for (let x = 0; x <= w + 20; x += 20) c.lineTo(x, gy - 22 - Math.sin((x + wState.scrollX * 0.25) * 0.025) * 14);
          c.lineTo(w, gy + 10); c.lineTo(0, gy + 10); c.closePath(); c.fill();

          c.fillStyle = '#c48f65'; c.fillRect(0, gy - 8, w, 8);
          c.fillStyle = '#5c5a65'; c.fillRect(0, gy, w, h - gy);

          const jumpY = wState.previewPose === 'jump' ? -Math.abs(Math.sin(now * 0.005)) * 34 : 0;
          window.drawStyledRunner?.(c, {
            x: w * 0.56,
            baseY: gy + 10,
            y: jumpY,
            pose: wState.previewPose,
            walkTick: wState.walkTick,
            blinkTimer: Math.sin(now * 0.0018) > -0.92 ? 1 : -0.1,
            tSec: now * 0.001
          });
        }
      }
      wState.rafId = requestAnimationFrame(tick);
    };
    wState.rafId = requestAnimationFrame(tick);
  }

  document.querySelectorAll('.wpose-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.wpose-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    wState.previewPose = btn.dataset.pose;
  }));

  window.WardrobeUI = {
    open() {
      renderWardrobeStudio();
      startPreviewLoop();
    }
  };
})();