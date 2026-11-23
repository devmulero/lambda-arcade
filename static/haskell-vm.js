/* =========================================================================
   HASKELL-VM: Interpretador Funcional Unificado + Lazy + Monads + Workbench
   ========================================================================= */

(function () {
  // ---------- TRADUTOR DE ERROS IMPERATIVO -> HASKELL ----------
  function translateError(msg, src = '') {
    if (/\breturn\b/.test(src) && !/\bdo\b/.test(src)) {
      return `${msg} (Dica: Não existe 'return' imperativo; a última expressão já é o valor retornado!)`;
    }
    if (/\b(for|while)\s*\(/.test(src)) {
      return `${msg} (Dica: Em Haskell não há laços 'for/while'; use map, filter, take ou recursão.)`;
    }
    if (/Esperado 'else'/.test(msg)) {
      return `${msg} (Dica: Todo 'if' em Haskell exige 'then' e 'else'.)`;
    }
    if (/Sintaxe extra perto de '='/.test(msg)) {
      return `${msg} (Dica: '=' define funções; para comparar igualdade use '=='.)`;
    }
    if (/não aplicável|argumentos/.test(msg) && /map\s+\w+\s+filter/.test(src)) {
      return `${msg} (Dica: Envolva 'filter ...' entre parênteses ou use composição '.'!)`;
    }
    return msg;
  }

  // ---------- RAIO-X DE TIPOS & BANCADA UNIFICADA ----------
  const TYPE_DOCS = {
    'String': 'Texto imutável entre aspas (ex: "pedra")',
    'Int': 'Número inteiro',
    'Bool': 'Booleano: True ou False',
    'Acao': 'Tipo algébrico: Pular | Abaixar | BeberAgua | Correr Int',
    'Maybe': 'Contexto opcional: Just valor | Nothing (zero null!)',
    'Either': 'Sucesso ou erro: Right valor | Left erro',
    '[Int]': 'Lista de inteiros',
    '[Inimigo]': 'Lista de inimigos ativos na pista',
    '[Direcao]': 'Lista de direções: [Norte, Leste, Sul, Oeste]',
    'Direcao': 'Norte | Sul | Leste | Oeste'
  };

  function renderTypeBar(el, sigStr) {
    if (!el || !sigStr) return;
    el.innerHTML = sigStr.split('->').map(part => {
      const clean = part.trim();
      const docKey = Object.keys(TYPE_DOCS).find(k => clean.includes(k));
      const tip = docKey ? TYPE_DOCS[docKey] : 'Função ou tipo polimórfico';
      return `<span class="type-chip" title="${tip}">${clean}</span>`;
    }).join('<span style="color:#8c8380">→</span>');
  }

  function createCodeWorkbench({ editorId, highlightId, lineNumsId, tokSelector, typeBarId, onRun, onInput }) {
    const ed = document.getElementById(editorId);
    const hl = document.getElementById(highlightId);
    const ln = document.getElementById(lineNumsId);
    const tb = typeBarId ? document.getElementById(typeBarId) : null;

    function sync() {
      if (!ed || !hl || !ln) return;
      hl.innerHTML = highlightHaskell(ed.value);
      ln.textContent = Array.from({ length: ed.value.split('\n').length }, (_, i) => i + 1).join('\n');
    }

    if (ed) {
      ed.addEventListener('input', () => { sync(); onInput?.(ed.value); });
      ed.addEventListener('scroll', () => {
        if (hl) { hl.scrollTop = ed.scrollTop; hl.scrollLeft = ed.scrollLeft; }
        if (ln) ln.scrollTop = ed.scrollTop;
      });
      ed.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); }
        if (e.key === 'Tab') {
          e.preventDefault();
          const s = ed.selectionStart;
          ed.value = ed.value.slice(0, s) + '  ' + ed.value.slice(ed.selectionEnd);
          ed.selectionStart = ed.selectionEnd = s + 2;
          sync(); onInput?.(ed.value);
        }
      });
    }

    if (tokSelector && ed) {
      document.querySelectorAll(tokSelector).forEach(b => b.addEventListener('click', () => {
        const snip = b.dataset.snip, s = ed.selectionStart ?? ed.value.length;
        ed.value = ed.value.slice(0, s) + snip + ed.value.slice(ed.selectionEnd ?? s);
        ed.focus(); ed.selectionStart = ed.selectionEnd = s + snip.length;
        sync(); onInput?.(ed.value);
      }));
    }

    return {
      sync,
      setValue: (v) => { if (ed) { ed.value = v; sync(); } },
      getValue: () => ed ? ed.value : '',
      setTypeSig: (sig) => renderTypeBar(tb, sig)
    };
  }

  // ---------- LAZY STREAMS (AVALIAÇÃO PREGUIÇOSA) ----------
  function makeLazyStream(nextFn, label = 'stream') {
    return { __lazy: true, next: nextFn, label };
  }

  function toLazyStream(val) {
    if (val?.__lazy) return val;
    if (Array.isArray(val)) {
      let idx = 0;
      return makeLazyStream(() => idx < val.length ? { done: false, value: val[idx++] } : { done: true }, 'list');
    }
    throw new Error('Esperada uma lista ou fluxo infinito.');
  }

  // ---------- TOKENIZER & PARSER UNIFICADO ----------
  function tokenizeVM(src) {
    const tokens = [];
    const lines = src.split('\n');
    for (let ln = 0; ln < lines.length; ln++) {
      const line = lines[ln];
      let i = 0;
      while (i < line.length) {
        const ch = line[i];
        if (/\s/.test(ch)) { i++; continue; }
        if (ch === '-' && line[i + 1] === '-') break;
        if (ch === '"') {
          let s = ''; i++;
          while (i < line.length && line[i] !== '"') {
            if (line[i] === '\\' && i + 1 < line.length) { s += line[i + 1]; i += 2; }
            else s += line[i++];
          }
          if (line[i] !== '"') throw new Error('String sem aspas de fechamento (").');
          i++; tokens.push({ type: 'STR', val: s, line: ln + 1, col: i }); continue;
        }
        if (/\d/.test(ch)) {
          const sc = i + 1;
          let n = ''; while (i < line.length && /[\d.]/.test(line[i])) n += line[i++];
          tokens.push({ type: 'NUM', val: Number(n), line: ln + 1, col: sc }); continue;
        }
        const three = line.slice(i, i + 3);
        if (['<$>', '<*>', '>>='].includes(three)) {
          tokens.push({ type: 'OP', val: three, line: ln + 1, col: i + 1 }); i += 3; continue;
        }
        const two = line.slice(i, i + 2);
        if (['==', '/=', '<=', '>=', '&&', '||', '->', '<-', '::', '++', '..'].includes(two)) {
          tokens.push({ type: 'OP', val: two, line: ln + 1, col: i + 1 }); i += 2; continue;
        }
        if ('()[]{},|\\=<>+-*/.:$;'.includes(ch)) {
          tokens.push({ type: (ch === '.' || ch === '$' || ch === ':') ? 'OP' : 'SYM', val: ch, line: ln + 1, col: i + 1 });
          i++; continue;
        }
        if (/[a-zA-Z_]/.test(ch)) {
          const sc = i + 1;
          let id = ''; while (i < line.length && /[a-zA-Z0-9_']/.test(line[i])) id += line[i++];
          tokens.push({ type: 'ID', val: id, line: ln + 1, col: sc }); continue;
        }
        throw new Error(`Caractere inesperado: '${ch}'`);
      }
    }
    return tokens;
  }

  function parsePattern(toks, getP, setP) {
    let p = getP();
    const t = toks[p];
    if (!t) throw new Error('Padrão incompleto.');
    if (t.type === 'NUM' || t.type === 'STR') { setP(p + 1); return { k: 'LIT', val: t.val }; }
    if (t.val === '[' && toks[p + 1]?.val === ']') { setP(p + 2); return { k: 'EMPTY' }; }
    if (t.val === '(') {
      p++;
      if (toks[p]?.type === 'ID' && toks[p + 1]?.val === ':' && toks[p + 2]?.type === 'ID' && toks[p + 3]?.val === ')') {
        const res = { k: 'CONS', head: toks[p].val, tail: toks[p + 2].val };
        setP(p + 4); return res;
      }
      if (toks[p]?.type === 'ID' && /^[A-Z]/.test(toks[p].val) && toks[p].val !== 'True' && toks[p].val !== 'False') {
        const ctor = toks[p++].val;
        const args = [];
        while (p < toks.length && toks[p].val !== ')') {
          args.push(parsePattern(toks, () => p, v => { p = v; }));
        }
        if (toks[p]?.val !== ')') throw new Error("Faltou ')' no padrão.");
        setP(p + 1);
        return { k: 'CTOR', ctor, args };
      }
      const items = [];
      items.push(parsePattern(toks, () => p, v => { p = v; }));
      while (toks[p]?.val === ',') {
        p++;
        items.push(parsePattern(toks, () => p, v => { p = v; }));
      }
      if (toks[p]?.val !== ')') throw new Error("Faltou ')' no padrão.");
      setP(p + 1);
      return items.length === 1 ? items[0] : { k: 'TUPLE', items };
    }
    if (t.type === 'ID') {
      setP(p + 1);
      if (t.val === '_') return { k: 'WILD' };
      if (t.val === 'True') return { k: 'LIT', val: true };
      if (t.val === 'False') return { k: 'LIT', val: false };
      if (/^[A-Z]/.test(t.val)) return { k: 'CTOR', ctor: t.val, args: [] };
      return { k: 'VAR', name: t.val };
    }
    throw new Error(`Padrão inválido perto de '${t.val}'`);
  }

  function parseVMExpr(tokens) {
    let pos = 0;
    const peek = () => tokens[pos], consume = () => tokens[pos++];

    function expr() {
      const t = peek();
      if (!t) throw new Error('Expressão incompleta.');
      if (t.type === 'ID' && t.val === 'if') {
        consume(); const cond = expr();
        if (consume()?.val !== 'then') throw new Error("Esperado 'then'.");
        const e1 = expr();
        if (consume()?.val !== 'else') throw new Error("Esperado 'else'.");
        return { k: 'IF', cond, e1, e2: expr() };
      }
      if (t.type === 'ID' && t.val === 'let') {
        consume();
        const binds = [];
        while (peek() && peek().val !== 'in') {
          const name = consume().val;
          if (consume()?.val !== '=') throw new Error("Esperado '=' no 'let'.");
          const valToks = [];
          while (peek() && peek().val !== 'in' && peek().val !== ';') valToks.push(consume());
          binds.push({ name, val: parseVMExpr(valToks) });
          if (peek()?.val === ';') consume();
        }
        if (consume()?.val !== 'in') throw new Error("Esperado 'in' após 'let'.");
        return { k: 'LET', binds, body: expr() };
      }
      if (t.type === 'ID' && t.val === 'do') {
        consume();
        const stmts = [];
        const baseCol = peek()?.col || 1;
        while (peek() && peek().col >= baseCol) {
          const stmtToks = [];
          const firstLine = peek().line;
          while (peek() && !(peek().col <= baseCol && peek().line > firstLine && stmtToks.length > 0)) {
            if (peek().val === ';') { consume(); break; }
            stmtToks.push(consume());
            if (peek() && peek().col <= baseCol && peek().line > stmtToks[stmtToks.length - 1].line) break;
          }
          if (stmtToks[0]?.type === 'ID' && stmtToks[1]?.val === '<-') {
            stmts.push({ kind: 'BIND', name: stmtToks[0].val, expr: parseVMExpr(stmtToks.slice(2)) });
          } else {
            stmts.push({ kind: 'EXPR', expr: parseVMExpr(stmtToks) });
          }
        }
        return { k: 'DO', stmts };
      }
      if (t.type === 'ID' && t.val === 'case') {
        consume(); const scrut = expr();
        if (consume()?.val !== 'of') throw new Error("Esperado 'of' após 'case'.");
        const branches = [], baseCol = peek()?.col;
        while (peek() && peek().col >= baseCol) {
          let pat;
          if (peek()?.type === 'ID' && /^[A-Z]/.test(peek().val) && peek().val !== 'True' && peek().val !== 'False') {
            const ctor = consume().val, args = [];
            let p = pos;
            while (tokens[p] && tokens[p].val !== '->') {
              args.push(parsePattern(tokens, () => p, v => { p = v; }));
            }
            pos = p;
            pat = { k: 'CTOR', ctor, args };
          } else {
            let p = pos;
            pat = parsePattern(tokens, () => p, v => { p = v; });
            pos = p;
          }
          if (consume()?.val !== '->') throw new Error("Esperado '->' no ramo do 'case'.");
          const bToks = [];
          while (peek() && !(peek().col <= baseCol && peek().line > tokens[pos - 1].line)) bToks.push(consume());
          branches.push({ pat, body: parseVMExpr(bToks) });
        }
        return { k: 'CASE', scrut, branches };
      }
      if (t.val === '\\') {
        consume(); const params = [];
        while (peek() && peek().val !== '->') params.push(consume().val);
        if (consume()?.val !== '->') throw new Error("Esperado '->' na lambda.");
        return { k: 'LAM', params, body: expr() };
      }
      return dollarExpr();
    }

    function dollarExpr() {
      const left = bindExpr();
      if (peek()?.val === '$') { consume(); return { k: 'APP', fn: left, arg: dollarExpr() }; }
      return left;
    }
    const bin = (nextFn, ops) => {
      let left = nextFn();
      while (peek() && ops.includes(peek().val)) left = { k: 'BIN', op: consume().val, left, right: nextFn() };
      return left;
    };
    const bindExpr = () => bin(fmapExpr, ['>>=']);
    const fmapExpr = () => bin(orExpr, ['<$>', '<*>']);
    const orExpr   = () => bin(andExpr, ['||']);
    const andExpr  = () => bin(cmpExpr, ['&&']);
    const cmpExpr  = () => bin(consExpr, ['==', '/=', '<', '>', '<=', '>=']);
    const consExpr = () => bin(addExpr, [':', '++']);
    const addExpr  = () => bin(mulExpr, ['+', '-']);
    const mulExpr  = () => bin(composeExpr, ['*', '/']);

    function composeExpr() {
      const left = appExpr();
      if (peek()?.val === '.') { consume(); return { k: 'COMPOSE', f: left, g: composeExpr() }; }
      return left;
    }

    function appExpr() {
      let fn = atom();
      while (peek() && isAtomStart(peek())) fn = { k: 'APP', fn, arg: atom() };
      return fn;
    }
    function isAtomStart(t) {
      if (t.type === 'STR' || t.type === 'NUM' || t.val === '(' || t.val === '[') return true;
      return t.type === 'ID' && !['then', 'else', 'of', 'in'].includes(t.val);
    }

    const OPS = ['+', '-', '*', '/', '==', '/=', '<', '>', '<=', '>=', ':', '++', '>>=', '<$>', '<*>'];

    function atom() {
      const t = peek();
      if (!t) throw new Error('Expressão vazia.');
      if (t.val === '-') {
        consume();
        return { k: 'BIN', op: '-', left: { k: 'LIT', val: 0 }, right: atom() };
      }
      if (t.type === 'NUM' || t.type === 'STR') { consume(); return { k: 'LIT', val: t.val }; }
      if (t.val === '(') {
        consume();
        if (OPS.includes(peek()?.val) && peek()?.val !== '-') {
          const op = consume().val;
          if (peek()?.val === ')') { consume(); return { k: 'OPFN', op }; }
          const right = expr();
          if (consume()?.val !== ')') throw new Error("Faltou ')' na seção.");
          return { k: 'RSEC', op, right };
        }
        const first = expr();
        if (peek()?.val === ',') {
          const items = [first];
          while (peek()?.val === ',') { consume(); items.push(expr()); }
          if (consume()?.val !== ')') throw new Error("Faltou ')' na tupla.");
          return { k: 'TUPLE', items };
        }
        if (consume()?.val !== ')') throw new Error("Faltou ')'.");
        return first;
      }
      if (t.val === '[') {
        consume();
        if (peek()?.val === ']') { consume(); return { k: 'LIST', items: [] }; }
        const first = expr();
        if (peek()?.val === '|') {
          consume(); const quals = [];
          while (true) {
            if (peek()?.type === 'ID' && tokens[pos + 1]?.val === '<-') {
              const name = consume().val; consume();
              quals.push({ kind: 'GEN', name, list: expr() });
            } else quals.push({ kind: 'GUARD', cond: expr() });
            if (peek()?.val === ',') { consume(); continue; }
            break;
          }
          if (consume()?.val !== ']') throw new Error("Faltou ']'.");
          return { k: 'COMP', out: first, quals };
        }
        if (peek()?.val === '..') {
          consume();
          if (peek()?.val === ']') { consume(); return { k: 'INFRANGE', start: first }; }
          const end = expr();
          if (consume()?.val !== ']') throw new Error("Faltou ']'.");
          return { k: 'RANGE', start: first, end };
        }
        const items = [first];
        while (peek()?.val === ',') { consume(); items.push(expr()); }
        if (consume()?.val !== ']') throw new Error("Faltou ']'.");
        return { k: 'LIST', items };
      }
      if (t.type === 'ID') {
        consume();
        if (t.val === 'True' || t.val === 'otherwise') return { k: 'LIT', val: true };
        if (t.val === 'False') return { k: 'LIT', val: false };
        return { k: 'VAR', name: t.val };
      }
      throw new Error(`Token inesperado: '${t.val}'`);
    }

    const ast = expr();
    if (pos < tokens.length) throw new Error(`Sintaxe extra perto de '${tokens[pos].val}'.`);
    return ast;
  }

  function splitTopLevelSlices(rawCode) {
    const toks = tokenizeVM(rawCode);
    const declSlices = [];
    for (const t of toks) {
      if (t.col === 1) declSlices.push([]);
      if (declSlices.length > 0) declSlices[declSlices.length - 1].push(t);
    }
    return declSlices;
  }

  function compileModule(rawCode, allowBareExpr = false) {
    const declSlices = splitTopLevelSlices(rawCode);
    const funcs = {};
    let bareExprAst = null;

    for (const slice of declSlices) {
      if (slice.length === 0) continue;
      if (slice[0].type === 'ID' && (slice[1]?.val === '::' || slice[0].val === 'data')) continue;

      // Detecta se é uma declaração de função (tem '=' ou '|' no nível do cabeçalho)
      const isDecl = slice[0].type === 'ID' && slice.some(t => t.val === '=' || t.val === '|');
      if (!isDecl) {
        if (allowBareExpr) {
          bareExprAst = parseVMExpr(slice);
          continue;
        }
        throw new Error(`Faltou '=' ou '|' em '${slice[0].val}'.`);
      }

      const fnName = slice[0].val;
      let p = 1; const params = [];
      while (p < slice.length && slice[p].val !== '=' && slice[p].val !== '|') {
        params.push(parsePattern(slice, () => p, v => { p = v; }));
      }
      if (p >= slice.length) throw new Error(`Faltou '=' ou '|' em '${fnName}'.`);
      const clause = { params, guards: [], body: null };
      if (slice[p].val === '|') {
        while (p < slice.length && slice[p].val === '|') {
          p++;
          const cT = [], bT = [];
          while (p < slice.length && slice[p].val !== '=') cT.push(slice[p++]);
          if (p >= slice.length) throw new Error(`Faltou '=' no guard em '${fnName}'.`);
          p++;
          while (p < slice.length && slice[p].val !== '|') bT.push(slice[p++]);
          clause.guards.push({ cond: parseVMExpr(cT), body: parseVMExpr(bT) });
        }
      } else {
        clause.body = parseVMExpr(slice.slice(p + 1));
      }
      if (!funcs[fnName]) funcs[fnName] = [];
      funcs[fnName].push(clause);
    }

    if (allowBareExpr) return { funcs, bareExprAst };
    return funcs;
  }

  function createRuntime(funcs, envExtras = {}) {
    let fuel = 45000;
    let thunks = 0;

    const mkB = (arity, fn) => ({ __partial: true, arity, fn, args: [] });
    function applyFn(fn, arg) {
      if (--fuel <= 0) throw new Error('Limite de reduções excedido (possível recursão infinita).');
      if (typeof fn === 'function') return fn(arg);
      if (fn?.__partial) {
        const next = [...fn.args, arg];
        return next.length < fn.arity ? { __partial: true, arity: fn.arity, fn: fn.fn, args: next } : fn.fn(...next);
      }
      throw new Error('Valor não aplicável como função.');
    }

    const opVal = (op, l, r) => {
      switch (op) {
        case '+': return l + r; case '-': return l - r; case '*': return l * r; case '/': return l / r;
        case '==': return JSON.stringify(l) === JSON.stringify(r);
        case '/=': return JSON.stringify(l) !== JSON.stringify(r);
        case '<': return l < r; case '>': return l > r; case '<=': return l <= r; case '>=': return l >= r;
        case '&&': return Boolean(l && r); case '||': return Boolean(l || r);
        case ':': return [l, ...(Array.isArray(r) ? r : pullAll(r))];
        case '++': return [...(Array.isArray(l) ? l : pullAll(l)), ...(Array.isArray(r) ? r : pullAll(r))];
      }
    };

    function pullAll(xs, max = 400) {
      if (Array.isArray(xs)) return xs;
      if (xs?.__lazy) {
        const res = [];
        for (let i = 0; i < max; i++) {
          const step = xs.next();
          thunks++;
          if (step.done) return res;
          res.push(step.value);
        }
        throw new Error('Loop infinito evitado: você tentou consumir uma lista infinita inteira sem "take"!');
      }
      throw new Error('Esperada uma lista.');
    }

    function fmapImpl(fn, box) {
      if (box?.__adt === 'Nothing') return box;
      if (box?.__adt === 'Just') return { __adt: 'Just', args: [applyFn(fn, box.args[0])] };
      if (box?.__adt === 'Left') return box;
      if (box?.__adt === 'Right') return { __adt: 'Right', args: [applyFn(fn, box.args[0])] };
      if (Array.isArray(box)) return box.map(x => applyFn(fn, x));
      if (box?.__lazy) {
        const s = toLazyStream(box);
        return makeLazyStream(() => {
          const r = s.next();
          return r.done ? r : { done: false, value: applyFn(fn, r.value) };
        }, 'map');
      }
      throw new Error('O alvo de fmap / <$> precisa ser um Functor (Maybe, Lista ou Either).');
    }

    function apImpl(fnBox, valBox) {
      if (fnBox?.__adt === 'Nothing' || valBox?.__adt === 'Nothing') return { __adt: 'Nothing', args: [] };
      if (fnBox?.__adt === 'Left') return fnBox;
      if (valBox?.__adt === 'Left') return valBox;
      if (fnBox?.__adt === 'Just' && valBox?.__adt === 'Just') return { __adt: 'Just', args: [applyFn(fnBox.args[0], valBox.args[0])] };
      if (fnBox?.__adt === 'Right' && valBox?.__adt === 'Right') return { __adt: 'Right', args: [applyFn(fnBox.args[0], valBox.args[0])] };
      if (Array.isArray(fnBox) && Array.isArray(valBox)) {
        const out = [];
        for (const f of fnBox) for (const v of valBox) out.push(applyFn(f, v));
        return out;
      }
      throw new Error('Operador <*> exige dois contextos compatíveis (Maybe, Either ou Lista).');
    }

    function bindImpl(box, fn) {
      if (box?.__adt === 'Nothing') return box;
      if (box?.__adt === 'Left') return box;
      if (box?.__adt === 'Just') return applyFn(fn, box.args[0]);
      if (box?.__adt === 'Right') return applyFn(fn, box.args[0]);
      if (Array.isArray(box)) return box.flatMap(x => applyFn(fn, x));
      throw new Error('Operador >>= exige uma Monad (Maybe, Either ou Lista).');
    }

    const adtCtor = (name, arity) => arity === 0
      ? { __adt: name, args: [] }
      : mkB(arity, (...args) => ({ __adt: name, args }));

    const builtins = {
      Nothing: adtCtor('Nothing', 0),
      Just: adtCtor('Just', 1),
      Left: adtCtor('Left', 1),
      Right: adtCtor('Right', 1),
      Espinho: adtCtor('Espinho', 0),
      Flor: adtCtor('Flor', 1),
      Galho: adtCtor('Galho', 2),
      fromMaybe: mkB(2, (d, m) => m?.__adt === 'Just' ? m.args[0] : d),
      fmap: mkB(2, fmapImpl),
      pure: mkB(1, x => ({ __adt: 'Just', args: [x] })),
      return: mkB(1, x => ({ __adt: 'Just', args: [x] })),
      id: mkB(1, x => x),
      const: mkB(2, (a, _b) => a),
      flip: mkB(3, (f, a, b) => applyFn(applyFn(f, b), a)),
      not: mkB(1, x => !x),
      even: mkB(1, x => x % 2 === 0),
      odd: mkB(1, x => Math.abs(x % 2) === 1),
      min: mkB(2, Math.min),
      max: mkB(2, Math.max),
      abs: mkB(1, Math.abs),
      mod: mkB(2, (a, b) => ((a % b) + b) % b),
      div: mkB(2, (a, b) => Math.trunc(a / b)),
      fst: mkB(1, t => t.__tuple[0]),
      snd: mkB(1, t => t.__tuple[1]),
      sum: mkB(1, xs => pullAll(xs).reduce((a, b) => a + b, 0)),
      product: mkB(1, xs => pullAll(xs).reduce((a, b) => a * b, 1)),
      length: mkB(1, xs => pullAll(xs).length),
      reverse: mkB(1, xs => [...pullAll(xs)].reverse()),
      head: mkB(1, xs => pullAll(xs, 1)[0]),
      tail: mkB(1, xs => pullAll(xs).slice(1)),
      null: mkB(1, xs => pullAll(xs, 1).length === 0),
      elem: mkB(2, (v, xs) => pullAll(xs).some(x => JSON.stringify(x) === JSON.stringify(v))),
      all: mkB(2, (pred, xs) => pullAll(xs).every(x => Boolean(applyFn(pred, x)))),
      any: mkB(2, (pred, xs) => pullAll(xs).some(x => Boolean(applyFn(pred, x)))),
      repeat: mkB(1, x => makeLazyStream(() => ({ done: false, value: x }), 'repeat')),
      cycle: mkB(1, xs => {
        const arr = pullAll(xs);
        if (!arr.length) throw new Error('cycle: lista vazia.');
        let i = 0;
        return makeLazyStream(() => ({ done: false, value: arr[i++ % arr.length] }), 'cycle');
      }),
      iterate: mkB(2, (f, x) => {
        let cur = x, first = true;
        return makeLazyStream(() => {
          if (first) { first = false; return { done: false, value: cur }; }
          cur = applyFn(f, cur);
          return { done: false, value: cur };
        }, 'iterate');
      }),
      take: mkB(2, (n, xs) => {
        const s = toLazyStream(xs), out = [];
        for (let i = 0; i < n; i++) {
          const r = s.next();
          if (r.done) break;
          thunks++;
          out.push(r.value);
        }
        return out;
      }),
      takeWhile: mkB(2, (pred, xs) => {
        const s = toLazyStream(xs), out = [];
        for (let i = 0; i < 200; i++) {
          const r = s.next();
          if (r.done) break;
          thunks++;
          if (!applyFn(pred, r.value)) break;
          out.push(r.value);
        }
        return out;
      }),
      zip: mkB(2, (xs, ys) => {
        const sx = toLazyStream(xs), sy = toLazyStream(ys);
        return makeLazyStream(() => {
          const rx = sx.next(), ry = sy.next();
          return (rx.done || ry.done) ? { done: true } : { done: false, value: { __tuple: [rx.value, ry.value] } };
        }, 'zip');
      }),
      zipWith: mkB(3, (f, xs, ys) => {
        const sx = toLazyStream(xs), sy = toLazyStream(ys);
        return makeLazyStream(() => {
          const rx = sx.next(), ry = sy.next();
          return (rx.done || ry.done) ? { done: true } : { done: false, value: applyFn(applyFn(f, rx.value), ry.value) };
        }, 'zipWith');
      }),
      map: mkB(2, (f, xs) => xs?.__lazy ? fmapImpl(f, xs) : xs.map(x => applyFn(f, x))),
      filter: mkB(2, (p, xs) => {
        if (xs?.__lazy) {
          const s = toLazyStream(xs);
          return makeLazyStream(() => {
            for (let g = 0; g < 300; g++) {
              const r = s.next();
              if (r.done) return r;
              thunks++;
              if (applyFn(p, r.value)) return r;
            }
            throw new Error('filter em stream não encontrou elementos.');
          }, 'filter');
        }
        return xs.filter(x => Boolean(applyFn(p, x)));
      }),
      foldl: mkB(3, (f, acc, xs) => pullAll(xs).reduce((a, x) => applyFn(applyFn(f, a), x), acc)),
      foldr: mkB(3, (f, acc, xs) => pullAll(xs).reduceRight((a, x) => applyFn(applyFn(f, x), a), acc)),
      ...envExtras
    };

    function matchPat(pat, val, env) {
      if (pat.k === 'WILD') return true;
      if (pat.k === 'VAR') { env[pat.name] = val; return true; }
      if (pat.k === 'LIT') return val === pat.val;
      if (pat.k === 'EMPTY') return Array.isArray(val) && val.length === 0;
      if (pat.k === 'CONS') {
        if (!Array.isArray(val) || val.length === 0) return false;
        env[pat.head] = val[0]; env[pat.tail] = val.slice(1); return true;
      }
      if (pat.k === 'TUPLE') {
        if (!val?.__tuple || val.__tuple.length !== pat.items.length) return false;
        return pat.items.every((p, i) => matchPat(p, val.__tuple[i], env));
      }
      if (pat.k === 'CTOR') {
        if (val?.__adt !== pat.ctor || (val.args?.length || 0) !== pat.args.length) return false;
        return pat.args.every((p, i) => matchPat(p, val.args[i], env));
      }
      return false;
    }

    function callUser(name, args) {
      const clauses = funcs[name];
      if (!clauses || clauses.length === 0) throw new Error(`Função desconhecida: '${name}'.`);
      const expectedArity = clauses[0].params.length;
      if (args.length < expectedArity) {
        return mkB(expectedArity - args.length, (...rest) => callUser(name, [...args, ...rest]));
      }
      for (const cl of clauses) {
        const env = {};
        if (cl.params.every((p, i) => matchPat(p, args[i], env))) {
          let result;
          if (cl.guards.length > 0) {
            let matchedGuard = false;
            for (const g of cl.guards) {
              if (evalNode(g.cond, env)) { result = evalNode(g.body, env); matchedGuard = true; break; }
            }
            if (!matchedGuard) continue;
          } else {
            result = evalNode(cl.body, env);
          }
          // Suporta definições Point-Free (ex: atacar = map ... . filter ...) recebendo argumentos extras
          for (let k = cl.params.length; k < args.length; k++) {
            result = applyFn(result, args[k]);
          }
          return result;
        }
      }
      throw new Error(`Pattern matching incompleto em '${name}'.`);
    }

    function evalNode(node, env) {
      if (--fuel <= 0) throw new Error('Limite de reduções excedido.');
      switch (node.k) {
        case 'LIT': return node.val;
        case 'LIST': return node.items.map(it => evalNode(it, env));
        case 'TUPLE': return { __tuple: node.items.map(it => evalNode(it, env)) };
        case 'RANGE': {
          const a = evalNode(node.start, env), b = evalNode(node.end, env), arr = [];
          for (let k = a; k <= b && arr.length < 300; k++) arr.push(k);
          return arr;
        }
        case 'INFRANGE': {
          let cur = evalNode(node.start, env);
          return makeLazyStream(() => ({ done: false, value: cur++ }), 'range..');
        }
        case 'COMP': {
          const out = [];
          function step(idx, curEnv) {
            if (out.length >= 250) return;
            if (idx >= node.quals.length) { out.push(evalNode(node.out, curEnv)); return; }
            const q = node.quals[idx];
            if (q.kind === 'GEN') {
              for (const v of pullAll(evalNode(q.list, curEnv))) step(idx + 1, { ...curEnv, [q.name]: v });
            } else if (evalNode(q.cond, curEnv)) step(idx + 1, curEnv);
          }
          step(0, env);
          return out;
        }
        case 'IF': return evalNode(node.cond, env) ? evalNode(node.e1, env) : evalNode(node.e2, env);
        case 'LET': {
          const local = { ...env };
          for (const b of node.binds) local[b.name] = evalNode(b.val, local);
          return evalNode(node.body, local);
        }
        case 'DO': {
          function runStmts(i, curEnv) {
            const st = node.stmts[i];
            if (i === node.stmts.length - 1) return evalNode(st.expr, curEnv);
            const mVal = evalNode(st.expr, curEnv);
            return bindImpl(mVal, (x) => runStmts(i + 1, st.kind === 'BIND' ? { ...curEnv, [st.name]: x } : curEnv));
          }
          return runStmts(0, env);
        }
        case 'CASE': {
          const v = evalNode(node.scrut, env);
          for (const br of node.branches) {
            const local = { ...env };
            if (matchPat(br.pat, v, local)) return evalNode(br.body, local);
          }
          throw new Error('Case não exaustivo!');
        }
        case 'LAM': return mkB(node.params.length, (...args) => {
          const local = { ...env };
          node.params.forEach((p, i) => { local[p] = args[i]; });
          return evalNode(node.body, local);
        });
        case 'OPFN': return mkB(2, (a, b) => opVal(node.op, a, b));
        case 'RSEC': {
          const r = evalNode(node.right, env);
          return mkB(1, l => opVal(node.op, l, r));
        }
        case 'COMPOSE': {
          const f = evalNode(node.f, env), g = evalNode(node.g, env);
          return mkB(1, x => applyFn(f, applyFn(g, x)));
        }
        case 'BIN': {
          if (node.op === '<$>') return fmapImpl(evalNode(node.left, env), evalNode(node.right, env));
          if (node.op === '<*>') return apImpl(evalNode(node.left, env), evalNode(node.right, env));
          if (node.op === '>>=') return bindImpl(evalNode(node.left, env), evalNode(node.right, env));
          const l = evalNode(node.left, env), r = evalNode(node.right, env);
          return opVal(node.op, l, r);
        }
        case 'VAR': {
          if (node.name in env) return env[node.name];
          if (node.name in builtins) return builtins[node.name];
          if (funcs[node.name]) {
            const ar = funcs[node.name][0].params.length;
            return ar === 0 ? callUser(node.name, []) : mkB(ar, (...xs) => callUser(node.name, xs));
          }
          throw new Error(`Identificador desconhecido: '${node.name}'.`);
        }
        case 'APP': return applyFn(evalNode(node.fn, env), evalNode(node.arg, env));
      }
    }

    return {
      call: (name, args = []) => callUser(name, args),
      evalAst: (ast, env = {}) => evalNode(ast, env),
      getThunks: () => thunks,
      mkB
    };
  }

  function evalScript(src, entryName = null, args = [], envExtras = {}) {
    const trimmed = src.trim();
    if (!trimmed) throw new Error('Editor vazio.');
    const { funcs, bareExprAst } = compileModule(src, true);
    const rt = createRuntime(funcs, envExtras);
    let val;
    if (entryName && funcs[entryName]) {
      val = rt.call(entryName, args);
    } else if (bareExprAst) {
      val = rt.evalAst(bareExprAst);
    } else if (Object.keys(funcs).length > 0) {
      const target = entryName || Object.keys(funcs).pop();
      val = rt.call(target, args);
    } else {
      val = rt.evalAst(parseVMExpr(tokenizeVM(trimmed)));
    }
    return { value: val, thunks: rt.getThunks(), funcs };
  }

  function formatValue(v) {
    if (v?.__lazy) return '<Stream Infinito (use take n)>';
    if (v?.__tuple) return `(${v.__tuple.map(formatValue).join(', ')})`;
    if (v?.__adt) return v.args?.length ? `${v.__adt} ${v.args.map(a => a?.__adt && a.args?.length ? `(${formatValue(a)})` : formatValue(a)).join(' ')}` : v.__adt;
    if (Array.isArray(v)) return `[${v.map(formatValue).join(', ')}]`;
    if (typeof v === 'string') return `"${v}"`;
    if (v?.__partial) return '<Função>';
    return String(v);
  }

  window.LambdaVM = {
    translateError,
    createCodeWorkbench,
    compileModule,
    createRuntime,
    evalScript,
    formatValue,
    tokenizeVM,
    parseVMExpr
  };
})();