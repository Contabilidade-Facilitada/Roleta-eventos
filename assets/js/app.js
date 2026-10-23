/* ==========================================================
   Roleta da Sorte | Contabilidade Facilitada
   ========================================================== */
(() => {
  'use strict';

  /* ---------- Configuração dos prêmios ----------
     linhas: [texto, escala da fonte, peso da fonte] desenhadas na fatia, de fora para dentro.
     Os textos do resultado (titulo, subtitulo, nota) podem ser editados livremente.
     cupom: prefixo do código do cupom. Prêmios com cupom abrem o cadastro do ganhador;
     mantenha igual a functions/_lib/premios.js, que o servidor usa para validar. */
  const PREMIOS = {
    caneta: {
      nome: 'Caneta',
      linhas: [['CANETA', 1.05, 900]],
      icone: 'caneta',
      cor: '#ff9933', texto: '#102850', destaque: '#102850',
      ganha: true, controlaEstoque: true,
      titulo: 'Caneta',
      subtitulo: 'Você ganhou uma caneta do Contabilidade Facilitada!',
      nota: 'Procure a nossa equipe para retirar o seu prêmio.'
    },
    escola: {
      nome: '1 mês de Escola Contábil grátis',
      linhas: [['1 MÊS', 1.05, 900], ['GRÁTIS', .78, 900], ['ESCOLA CONTÁBIL', .5, 700]],
      icone: 'escola',
      cor: '#102850', texto: '#ffffff', destaque: '#ff9933',
      ganha: true, controlaEstoque: true, cupom: 'EC1M',
      titulo: '1 mês de Escola Contábil grátis',
      subtitulo: 'Você ganhou 1 mês de acesso à Escola Contábil!',
      nota: 'Procure a nossa equipe para resgatar o seu prêmio.',
      imagem: 'assets/img/escola-contabil.png'
    },
    ecobag: {
      nome: 'Ecobag',
      linhas: [['ECOBAG', 1.05, 900]],
      icone: 'ecobag',
      cor: '#f4f4f6', texto: '#102850', destaque: '#ff9933',
      ganha: true, controlaEstoque: true,
      titulo: 'Ecobag',
      subtitulo: 'Você ganhou uma ecobag do Contabilidade Facilitada!',
      nota: 'Procure a nossa equipe para retirar o seu prêmio.'
    },
    desconto: {
      nome: '20% de desconto',
      tag: 'Não cumulativo',
      linhas: [['20%', 1.5, 900], ['DE DESCONTO', .58, 800]],
      icone: 'desconto',
      cor: '#ec7a1c', texto: '#ffffff', destaque: '#102850',
      ganha: true, controlaEstoque: true, cupom: 'CF20',
      titulo: '20% de desconto',
      subtitulo: 'Desconto de 20%, não cumulativo.',
      nota: 'Procure a nossa equipe para resgatar o seu desconto.'
    },
    tente: {
      nome: 'Tente outra vez',
      linhas: [['TENTE', 1, 900], ['OUTRA VEZ', .78, 800]],
      icone: 'tente',
      cor: '#24539e', texto: '#ffffff', destaque: '#ffb366',
      ganha: false, controlaEstoque: false,
      titulo: 'Tente outra vez',
      subtitulo: 'Foi por pouco! Gire a roleta mais uma vez.',
      nota: ''
    }
  };

  // Ordem das fatias no sentido horário, a partir do topo. Cada resultado aparece duas vezes.
  const ORDEM = ['caneta', 'escola', 'ecobag', 'desconto', 'tente', 'caneta', 'escola', 'ecobag', 'desconto', 'tente'];

  // Ordem de exibição na lista lateral
  const LISTA_LATERAL = ['caneta', 'ecobag', 'escola', 'desconto'];

  // Endereço da política de privacidade exibido no cadastro do ganhador. Em branco, o link não aparece.
  const POLITICA_PRIVACIDADE = '';

  // Rota do servidor que recebe giros e cadastros (Cloudflare Pages Functions)
  const ENDERECO_ENVIO = '/api/sincronizar';
  const INTERVALO_ENVIO_MS = 20000;

  const ICONES = {
    caneta: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
    ecobag: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
    escola: ['M22 10 12 5 2 10l10 5 10-5Z', 'M6 12v5c3 3 9 3 12 0v-5', 'M22 10v6'],
    desconto: ['M19 5 5 19', 'M9 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0', 'M20 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0'],
    tente: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
    somLigado: ['M11 5 6 9H2v6h4l5 4V5Z', 'M15.54 8.46a5 5 0 0 1 0 7.07', 'M19.07 4.93a10 10 0 0 1 0 14.14'],
    somDesligado: ['M11 5 6 9H2v6h4l5 4V5Z', 'M22 9l-6 6', 'M16 9l6 6']
  };

  const N = ORDEM.length;
  const FATIA = 360 / N;
  const RECUO_MS = 450;
  const RECUO_GRAUS = 14;
  const NUM_LAMPADAS = 28;

  /* ---------- Utilidades ---------- */

  const $ = (s) => document.querySelector(s);

  function aleatorio() {
    const v = new Uint32Array(1);
    crypto.getRandomValues(v);
    return v[0] / 4294967296;
  }

  function svgIcone(nome) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      ICONES[nome].map((d) => `<path d="${d}"/>`).join('') + '</svg>';
  }

  // Identificador do giro, gerado no aparelho para que o reenvio não duplique registros
  function novoId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const v = new Uint8Array(16);
    crypto.getRandomValues(v);
    return Array.from(v, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Código do cupom: prefixo + 8 caracteres sem os ambíguos 0, O, 1 e I (ex.: CF20-K7Q2X9MP)
  function gerarCodigo(prefixo) {
    const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const v = new Uint8Array(8);
    crypto.getRandomValues(v);
    return `${prefixo}-${Array.from(v, (b) => ALFABETO[b % 32]).join('')}`;
  }

  // Clareia (fator > 0) ou escurece (fator < 0) uma cor hexadecimal
  function ajustarCor(hex, fator) {
    const n = parseInt(hex.slice(1), 16);
    const canais = [n >> 16, (n >> 8) & 255, n & 255].map((c) =>
      Math.round(fator >= 0 ? c + (255 - c) * fator : c * (1 + fator)));
    return `rgb(${canais.join(',')})`;
  }

  /* ---------- Estado persistente ---------- */

  const CHAVE = 'roleta-cf-v1';

  function estadoPadrao() {
    return {
      pesos: { caneta: 20, escola: 20, ecobag: 20, desconto: 20, tente: 20 },
      estoque: { caneta: null, escola: null, ecobag: null, desconto: null },
      som: true,
      historico: [],
      // Identificação do aparelho e situação do envio ao servidor
      sinc: { evento: '', aparelho: '', chave: '', ultimoEnvio: null, erro: '', recusados: [] },
      // Giros e cadastros ainda não confirmados pelo servidor
      fila: { giros: [], cadastros: [] }
    };
  }

  function carregar() {
    const padrao = estadoPadrao();
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE));
      if (salvo) {
        return {
          ...padrao,
          ...salvo,
          pesos: { ...padrao.pesos, ...salvo.pesos },
          estoque: { ...padrao.estoque, ...salvo.estoque },
          historico: Array.isArray(salvo.historico) ? salvo.historico : [],
          sinc: { ...padrao.sinc, ...salvo.sinc },
          fila: {
            giros: Array.isArray(salvo.fila && salvo.fila.giros) ? salvo.fila.giros : [],
            cadastros: Array.isArray(salvo.fila && salvo.fila.cadastros) ? salvo.fila.cadastros : []
          }
        };
      }
    } catch (e) { /* armazenamento indisponível */ }
    return padrao;
  }

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* armazenamento indisponível */ }
  }

  let estado = carregar();

  const esgotado = (id) => PREMIOS[id].controlaEstoque && estado.estoque[id] !== null && estado.estoque[id] <= 0;
  const pesoEfetivo = (id) => (esgotado(id) ? 0 : Math.max(0, Number(estado.pesos[id]) || 0));

  function sortear() {
    const ids = Object.keys(PREMIOS);
    const total = ids.reduce((s, id) => s + pesoEfetivo(id), 0);
    if (total <= 0) return null;
    let r = aleatorio() * total;
    for (const id of ids) {
      r -= pesoEfetivo(id);
      if (r < 0) return id;
    }
    return ids.filter((id) => pesoEfetivo(id) > 0).pop();
  }

  /* ---------- Áudio sintetizado ---------- */

  let audio = null;
  let saida = null;

  function prepararAudio() {
    if (!audio) {
      try {
        audio = new (window.AudioContext || window.webkitAudioContext)();
        saida = audio.createGain();
        saida.gain.value = .55;
        saida.connect(audio.destination);
      } catch (e) { audio = null; }
    }
    if (audio && audio.state === 'suspended') audio.resume();
  }

  function tom(freq, inicio, dur, tipo = 'triangle', vol = .25, freqFinal = null) {
    if (!audio || !estado.som) return;
    const t = audio.currentTime + inicio;
    const osc = audio.createOscillator();
    const ganho = audio.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t);
    if (freqFinal) osc.frequency.exponentialRampToValueAtTime(freqFinal, t + dur);
    ganho.gain.setValueAtTime(.0001, t);
    ganho.gain.exponentialRampToValueAtTime(vol, t + .012);
    ganho.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(ganho).connect(saida);
    osc.start(t);
    osc.stop(t + dur + .03);
  }

  const somTique = () => tom(1500, 0, .05, 'square', .06, 500);

  // Vibração em celulares Android (o iOS não oferece essa função). Segue o botão de som.
  function vibrar(padrao) {
    if (!estado.som || !navigator.vibrate) return;
    try { navigator.vibrate(padrao); } catch (e) { /* sem suporte */ }
  }

  function somGiro() {
    if (!audio || !estado.som) return;
    const dur = 1.3;
    const buffer = audio.createBuffer(1, audio.sampleRate * dur, audio.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    const fonte = audio.createBufferSource();
    fonte.buffer = buffer;
    const filtro = audio.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 1.2;
    const t = audio.currentTime;
    filtro.frequency.setValueAtTime(300, t);
    filtro.frequency.exponentialRampToValueAtTime(2400, t + .45);
    filtro.frequency.exponentialRampToValueAtTime(500, t + dur);
    const ganho = audio.createGain();
    ganho.gain.setValueAtTime(.0001, t);
    ganho.gain.exponentialRampToValueAtTime(.35, t + .4);
    ganho.gain.exponentialRampToValueAtTime(.0001, t + dur);
    fonte.connect(filtro).connect(ganho).connect(saida);
    fonte.start(t);
  }

  function somVitoria() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tom(f, i * .11, .35, 'triangle', .26));
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f) => tom(f, .48, 1.4, 'triangle', .1));
    [1046.5, 1318.5, 1568].forEach((f, i) => tom(f, .48 + i * .02, 1.1, 'sine', .08));
    for (let k = 0; k < 10; k++) tom(1800 + aleatorio() * 2400, .6 + k * .07, .14, 'sine', .05);
  }

  function somDerrota() {
    tom(392, 0, .32, 'triangle', .22, 370);
    tom(330, .3, .32, 'triangle', .22, 311);
    tom(262, .6, .75, 'triangle', .22, 220);
  }

  /* ---------- Elementos ---------- */

  const canvas = $('#canvasRoda');
  const ctx = canvas.getContext('2d');
  const roda = $('#roda');
  const rodaArea = $('#rodaArea');
  const elPonteiro = $('#ponteiro');
  const botaoGirar = $('#botaoGirar');
  const botaoWrap = botaoGirar.parentElement;
  const holofote = $('#holofote');
  const resultado = $('#resultado');
  const botaoResultado = $('#botaoResultado');
  const painel = $('#painel');

  /* ---------- Desenho da roleta ---------- */

  function desenharRoda() {
    const tam = canvas.clientWidth;
    if (!tam) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(tam * dpr);
    canvas.height = canvas.width;
    const R = tam / 2;
    const fatiaRad = FATIA * Math.PI / 180;

    ctx.setTransform(dpr, 0, 0, dpr, R * dpr, R * dpr);
    ctx.clearRect(-R, -R, tam, tam);

    // Fatias
    ORDEM.forEach((id, i) => {
      const p = PREMIOS[id];
      const a0 = -Math.PI / 2 + i * fatiaRad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a0 + fatiaRad);
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, 0, R * .12, 0, 0, R);
      grad.addColorStop(0, ajustarCor(p.cor, -.38));
      grad.addColorStop(.55, p.cor);
      grad.addColorStop(1, ajustarCor(p.cor, .1));
      ctx.fillStyle = grad;
      ctx.fill();
      if (esgotado(id)) {
        ctx.fillStyle = 'rgba(24, 30, 46, .72)';
        ctx.fill();
      }
    });

    // Divisórias
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, .95)';
    ctx.lineWidth = Math.max(2, R * .012);
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + i * fatiaRad;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * .2, Math.sin(a) * R * .2);
      ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      ctx.stroke();
    }

    // Pinos onde o ponteiro bate
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + i * fatiaRad;
      const x = Math.cos(a) * R * .935;
      const y = Math.sin(a) * R * .935;
      const r = R * .03;
      const g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#b8bfcc');
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, .45)';
      ctx.shadowBlur = R * .015;
      ctx.shadowOffsetY = R * .006;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    }

    // Ícones e textos
    const tangente = Math.tan(fatiaRad / 2);
    const base = R * .115;
    ORDEM.forEach((id, i) => {
      const p = PREMIOS[id];
      const fora = esgotado(id);
      ctx.save();
      ctx.rotate(i * fatiaRad + fatiaRad / 2);
      ctx.globalAlpha = fora ? .4 : 1;

      const tamIcone = R * .14;
      ctx.save();
      ctx.translate(0, -R * .77);
      ctx.scale(tamIcone / 24, tamIcone / 24);
      ctx.translate(-12, -12);
      ctx.strokeStyle = p.destaque;
      ctx.lineWidth = 2.3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ICONES[p.icone].forEach((d) => ctx.stroke(new Path2D(d)));
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = p.texto;
      const textoClaro = p.texto.toLowerCase() === '#ffffff';
      if (textoClaro) {
        ctx.shadowColor = 'rgba(0, 0, 0, .35)';
        ctx.shadowBlur = R * .012;
        ctx.shadowOffsetY = R * .005;
      }

      let y = R * (p.linhas.length > 1 ? .6 : .54);
      p.linhas.forEach(([texto, escala, peso], k) => {
        let fs = base * escala;
        if (k > 0) y -= fs * .55;
        const larguraMax = 2 * y * tangente * .84;
        ctx.font = `${peso} ${fs}px Montserrat, sans-serif`;
        const largura = ctx.measureText(texto).width;
        if (largura > larguraMax) {
          fs *= larguraMax / largura;
          ctx.font = `${peso} ${fs}px Montserrat, sans-serif`;
        }
        ctx.fillText(texto, 0, -y);
        y -= fs * .62;
      });

      if (fora) {
        ctx.globalAlpha = 1;
        ctx.shadowColor = 'transparent';
        ctx.font = `800 ${R * .05}px Montserrat, sans-serif`;
        ctx.fillStyle = '#ffb366';
        ctx.fillText('ESGOTADO', 0, -R * .34);
      }
      ctx.restore();
    });
  }

  /* ---------- Lâmpadas e faíscas ---------- */

  function criarLampadas() {
    const container = $('#lampadas');
    for (let i = 0; i < NUM_LAMPADAS; i++) {
      const l = document.createElement('span');
      l.className = 'lampada';
      l.style.setProperty('--a', `${(i * 360) / NUM_LAMPADAS}deg`);
      l.style.setProperty('--i', i);
      l.style.setProperty('--par', i % 2);
      container.appendChild(l);
    }
  }

  function criarFaiscas() {
    const container = $('#faiscas');
    for (let i = 0; i < 28; i++) {
      const f = document.createElement('span');
      f.style.left = `${aleatorio() * 100}%`;
      f.style.setProperty('--dx', `${(aleatorio() - .5) * 160}px`);
      f.style.setProperty('--s', (.5 + aleatorio() * 1.1).toFixed(2));
      const dur = 9 + aleatorio() * 12;
      f.style.animationDuration = `${dur}s`;
      f.style.animationDelay = `${-aleatorio() * dur}s`;
      container.appendChild(f);
    }
  }

  /* ---------- Movimento ---------- */

  let rot = aleatorio() * 360;   // rotação atual da roda, em graus (sentido horário)
  let animacao = null;
  let girando = false;
  let ultimoQuadro = performance.now();
  let ultimoTique = 0;
  let ultimaVibracao = 0;
  let arrasto = null;            // dedo ou mouse segurando a roda
  const ponteiro = { ang: 0, vel: 0 };

  const indiceSobPonteiro = (r) => Math.floor((((-r % 360) + 360) % 360) / FATIA) % N;
  let ultimoIndice = indiceSobPonteiro(rot);

  const desacelerar = (p) => 1 - Math.pow(1 - p, 4);

  function quadro(t) {
    const dt = Math.min(.05, (t - ultimoQuadro) / 1000);
    ultimoQuadro = t;
    const anterior = rot;

    if (animacao) {
      const decorrido = t - animacao.inicio;
      const { recuoMs, recuoGraus } = animacao;
      if (decorrido < recuoMs) {
        rot = animacao.de - recuoGraus * Math.sin((decorrido / recuoMs) * Math.PI / 2);
      } else {
        const p = Math.min(1, (decorrido - recuoMs) / animacao.duracao);
        const inicio = animacao.de - recuoGraus;
        rot = inicio + (animacao.para - inicio) * desacelerar(p);
        if (p >= 1) {
          rot = animacao.para;
          const fim = animacao;
          animacao = null;
          aoParar(fim);
        }
      }
    } else if (!girando && !arrasto && !resultado.classList.contains('aberto')) {
      rot += 5 * dt;   // movimento lento de atração enquanto ninguém joga
    }

    canvas.style.transform = `rotate(${rot}deg)`;

    const indice = indiceSobPonteiro(rot);
    if (indice !== ultimoIndice) {
      ultimoIndice = indice;
      const direcao = Math.sign(rot - anterior) || 1;
      ponteiro.vel -= direcao * (girando || arrasto ? 320 : 110);
      if ((girando || arrasto) && t - ultimoTique > 32) {
        ultimoTique = t;
        somTique();
      }
      if ((girando || arrasto) && t - ultimaVibracao > 70) {
        ultimaVibracao = t;
        vibrar(6);
      }
    }

    // Mola do ponteiro
    ponteiro.vel += (-620 * ponteiro.ang - 20 * ponteiro.vel) * dt;
    ponteiro.ang = Math.max(-34, Math.min(34, ponteiro.ang + ponteiro.vel * dt));
    elPonteiro.style.transform = `rotate(${ponteiro.ang}deg)`;

    requestAnimationFrame(quadro);
  }

  // sentido: 1 = horário, -1 = anti-horário. lancado: giro iniciado por um gesto, sem o recuo inicial.
  function girar({ sentido = 1, lancado = false } = {}) {
    if (girando || resultado.classList.contains('aberto')) return;
    prepararAudio();

    const id = sortear();
    if (!id) {
      mostrarAviso('Nenhum resultado disponível. Ajuste as chances no painel do operador (tecla P).');
      return;
    }

    const posicoes = ORDEM.map((x, i) => (x === id ? i : -1)).filter((i) => i >= 0);
    const indice = posicoes[Math.floor(aleatorio() * posicoes.length)];
    const alvo = indice * FATIA + FATIA * (.15 + aleatorio() * .7);   // evita parar em cima da divisória
    const voltas = 6 + Math.floor(aleatorio() * 3);
    // Graus que faltam, no sentido do giro, para o alvo parar sob o ponteiro
    const ajuste = sentido > 0
      ? (((-alvo - rot) % 360) + 360) % 360
      : (((rot + alvo) % 360) + 360) % 360;

    animacao = {
      inicio: performance.now(),
      de: rot,
      para: rot + sentido * (voltas * 360 + ajuste),
      duracao: 6600 + aleatorio() * 1200,
      recuoMs: lancado ? 0 : RECUO_MS,
      recuoGraus: lancado ? 0 : sentido * RECUO_GRAUS,
      id,
      indice
    };

    girando = true;
    roda.dataset.modo = 'girando';
    botaoGirar.disabled = true;
    botaoWrap.classList.add('inativo');
    holofote.classList.remove('ativo');
    somGiro();
  }

  function aoParar({ id, indice }) {
    const p = PREMIOS[id];

    if (p.controlaEstoque && estado.estoque[id] !== null) {
      estado.estoque[id] = Math.max(0, estado.estoque[id] - 1);
    }
    const giro = {
      id: novoId(),
      momento: Date.now(),
      premio: id,
      evento: estado.sinc.evento,
      aparelho: estado.sinc.aparelho
    };
    estado.historico.push({ t: giro.momento, id, giro: giro.id });
    estado.fila.giros.push(giro);
    salvar();
    renderizarPainel();
    sincronizar();

    mostrarHolofote(indice);
    if (p.ganha) {
      roda.dataset.modo = 'vitoria';
      rodaArea.classList.add('vitoria');
      somVitoria();
      vibrar([60, 50, 60, 50, 180]);
    } else {
      roda.dataset.modo = 'derrota';
      rodaArea.classList.remove('tremer');
      void rodaArea.offsetWidth;
      rodaArea.classList.add('tremer');
      somDerrota();
      vibrar(150);
    }

    setTimeout(() => mostrarResultado(id, giro.id), p.ganha ? 1100 : 800);
  }

  /* ---------- Arrastar e lançar a roda (dedo ou mouse) ---------- */

  function anguloNoCentro(e) {
    const r = rodaArea.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  }

  rodaArea.addEventListener('pointerdown', (e) => {
    if (girando || arrasto || resultado.classList.contains('aberto') || e.target.closest('.centro')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    prepararAudio();
    rodaArea.setPointerCapture(e.pointerId);
    const agora = performance.now();
    arrasto = { id: e.pointerId, angulo: anguloNoCentro(e), total: 0, amostras: [{ t: agora, a: 0 }] };
  });

  rodaArea.addEventListener('pointermove', (e) => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const angulo = anguloNoCentro(e);
    let delta = angulo - arrasto.angulo;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    arrasto.angulo = angulo;
    arrasto.total += delta;
    rot += delta;
    const agora = performance.now();
    arrasto.amostras.push({ t: agora, a: arrasto.total });
    while (arrasto.amostras.length > 2 && agora - arrasto.amostras[0].t > 120) arrasto.amostras.shift();
  });

  rodaArea.addEventListener('pointerup', (e) => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const agora = performance.now();
    const primeira = arrasto.amostras[0];
    // Velocidade angular dos últimos 120 ms, em graus por segundo
    const velocidade = ((arrasto.total - primeira.a) / Math.max(16, agora - primeira.t)) * 1000;
    arrasto = null;
    if (Math.abs(velocidade) > 120) girar({ sentido: Math.sign(velocidade), lancado: true });
  });

  rodaArea.addEventListener('pointercancel', (e) => {
    if (arrasto && e.pointerId === arrasto.id) arrasto = null;
  });

  /* ---------- Holofote na fatia sorteada ---------- */

  function caminhoFatia(a0, a1, r) {
    const ponto = (a) => [r * Math.sin(a * Math.PI / 180), -r * Math.cos(a * Math.PI / 180)];
    const [x0, y0] = ponto(a0);
    const [x1, y1] = ponto(a1);
    return `M0 0L${x0.toFixed(3)} ${y0.toFixed(3)}A${r} ${r} 0 0 1 ${x1.toFixed(3)} ${y1.toFixed(3)}Z`;
  }

  function mostrarHolofote(indice) {
    const a0 = ((indice * FATIA + rot) % 360 + 360) % 360;
    const fatia = caminhoFatia(a0, a0 + FATIA, 100);
    $('#holofoteMascara').setAttribute('d', 'M0 -100A100 100 0 1 1 0 100A100 100 0 1 1 0 -100Z' + fatia);
    $('#holofoteFatia').setAttribute('d', fatia);
    holofote.classList.add('ativo');
  }

  /* ---------- Resultado ---------- */

  function animarTitulo(el, texto) {
    el.textContent = '';
    let d = 0;
    texto.split(' ').forEach((palavra, i, todas) => {
      const p = document.createElement('span');
      p.className = 'palavra';
      for (const ch of palavra) {
        const l = document.createElement('span');
        l.className = 'letra';
        l.textContent = ch;
        l.style.setProperty('--d', d++);
        p.appendChild(l);
      }
      el.appendChild(p);
      if (i < todas.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  function mostrarResultado(id, giroId) {
    const p = PREMIOS[id];
    resultado.classList.toggle('derrota', !p.ganha);
    resultado.classList.remove('registrado');
    resultado.classList.toggle('com-cadastro', Boolean(p.cupom));
    cadastroAberto = p.cupom ? { id, giroId } : null;
    if (p.cupom) limparCadastro();
    $('#resultadoIcone').innerHTML = svgIcone(p.icone);
    $('#resultadoSobre').textContent = p.ganha ? 'PARABÉNS!' : 'QUASE!';
    animarTitulo($('#resultadoTitulo'), p.titulo);
    $('#resultadoSub').textContent = p.subtitulo;
    $('#resultadoNota').textContent = p.nota || '';
    const img = $('#resultadoImagem');
    img.classList.toggle('visivel', Boolean(p.imagem));
    if (p.imagem) img.src = p.imagem;
    botaoResultado.textContent = p.ganha ? 'Próximo participante' : 'Girar de novo';
    botaoResultado.dataset.girarDeNovo = p.ganha ? '' : '1';

    resultado.classList.add('aberto');
    if (p.ganha) {
      confete.disparar();
      setTimeout(() => confete.disparar(.5), 900);
    }
  }

  function fecharResultado(permitirNovoGiro = true) {
    // Com o cadastro aberto, só "Gerar cupom" ou "Pular cadastro" fecham o resultado
    if (!resultado.classList.contains('aberto') || cadastroAberto) return;
    const girarDeNovo = permitirNovoGiro && botaoResultado.dataset.girarDeNovo === '1';
    resultado.classList.remove('aberto');
    holofote.classList.remove('ativo');
    rodaArea.classList.remove('vitoria', 'tremer');
    roda.dataset.modo = 'ocioso';
    girando = false;
    botaoGirar.disabled = false;
    botaoWrap.classList.remove('inativo');
    desenharRoda();
    renderizarLista();
    if (girarDeNovo) setTimeout(girar, 500);
  }

  /* ---------- Cadastro do ganhador de cupom ---------- */

  let cadastroAberto = null;   // { id do prêmio, id do giro } enquanto o formulário está na tela
  const formCadastro = $('#cadastro');
  const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function limparCadastro() {
    formCadastro.reset();
    $('#cadErro').textContent = '';
    formCadastro.querySelectorAll('.invalido').forEach((el) => el.classList.remove('invalido'));
  }

  // (11) 98765-4321 enquanto digita; números com mais de 11 dígitos (DDI) ficam sem máscara
  function formatarTelefone(valor) {
    const d = valor.replace(/\D/g, '');
    if (d.length > 11) return d.slice(0, 13);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    const meio = d.length > 10 ? 7 : 6;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`;
  }

  function enviarCadastro(e) {
    e.preventDefault();
    if (!cadastroAberto) return;
    const nome = $('#cadNome').value.trim().replace(/\s+/g, ' ');
    const email = $('#cadEmail').value.trim().toLowerCase();
    const telefone = $('#cadTelefone').value.replace(/\D/g, '');

    const erros = [];
    const marcar = (sel, invalido) => $(sel).classList.toggle('invalido', invalido);
    marcar('#cadNome', nome.length < 2);
    marcar('#cadEmail', !EMAIL_VALIDO.test(email));
    marcar('#cadTelefone', telefone.length < 10 || telefone.length > 13);
    if (nome.length < 2) erros.push('o nome');
    if (!EMAIL_VALIDO.test(email)) erros.push('um e-mail válido');
    if (telefone.length < 10 || telefone.length > 13) erros.push('o telefone com DDD');
    if (erros.length) {
      $('#cadErro').textContent = `Informe ${erros.join(', ').replace(/, ([^,]*)$/, ' e $1')}.`;
      formCadastro.querySelector('.invalido').focus();
      return;
    }

    const { id, giroId } = cadastroAberto;
    const codigo = gerarCodigo(PREMIOS[id].cupom);
    estado.fila.cadastros.push({
      giro: giroId, codigo, nome, email, telefone,
      marketing: $('#cadMarketing').checked,
      momento: Date.now()
    });
    const registro = estado.historico.find((h) => h.giro === giroId);
    if (registro) registro.codigo = codigo;
    salvar();
    renderizarPainel();
    sincronizar();

    cadastroAberto = null;
    if (document.activeElement) document.activeElement.blur();
    limparCadastro();
    $('#cupomCodigo').textContent = codigo;
    resultado.classList.add('registrado');
    botaoResultado.textContent = 'Próximo participante';
  }

  function pularCadastro() {
    if (!cadastroAberto) return;
    cadastroAberto = null;
    limparCadastro();
    if (document.activeElement) document.activeElement.blur();
    fecharResultado();
  }

  /* ---------- Envio ao servidor ----------
     Giros e cadastros entram numa fila guardada no aparelho e saem em lotes. O que o servidor
     confirma (ou recusa por estar inválido) sai da fila; o resto é reenviado na próxima tentativa. */

  let enviando = false;

  async function sincronizar() {
    const { giros, cadastros } = estado.fila;
    if (enviando || (!giros.length && !cadastros.length)) return;
    if (location.protocol === 'file:' || !estado.sinc.chave) {
      atualizarStatusEnvio();
      return;
    }

    enviando = true;
    const lote = { giros: giros.slice(0, 200), cadastros: cadastros.slice(0, 100) };
    let continuar = false;
    try {
      const r = await fetch(ENDERECO_ENVIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Chave-Operador': estado.sinc.chave },
        body: JSON.stringify(lote)
      });
      if (r.status === 401) {
        estado.sinc.erro = 'Chave do aparelho recusada pelo servidor.';
      } else if (!r.ok) {
        estado.sinc.erro = `O servidor respondeu com erro ${r.status}.`;
      } else {
        const resp = await r.json();
        const saiGiro = new Set([...resp.giros.aceitos, ...resp.giros.rejeitados.map((x) => x.id)]);
        const saiCadastro = new Set([...resp.cadastros.aceitos, ...resp.cadastros.rejeitados.map((x) => x.giro)]);
        estado.fila.giros = estado.fila.giros.filter((g) => !saiGiro.has(g.id));
        estado.fila.cadastros = estado.fila.cadastros.filter((c) => !saiCadastro.has(c.giro));

        const recusados = [
          ...resp.giros.rejeitados.map((x) => ({ t: Date.now(), tipo: 'giro', motivo: x.motivo })),
          ...resp.cadastros.rejeitados.map((x) => ({ t: Date.now(), tipo: 'cadastro', motivo: x.motivo }))
        ];
        if (recusados.length) {
          estado.sinc.recusados = [...estado.sinc.recusados, ...recusados].slice(-20);
          console.warn('Itens recusados pelo servidor:', resp.giros.rejeitados, resp.cadastros.rejeitados);
        }
        estado.sinc.ultimoEnvio = Date.now();
        estado.sinc.erro = '';
        // Continua se ainda há itens além deste lote (cadastros pendentes esperam o próximo ciclo)
        continuar = estado.fila.giros.length > 0 || estado.fila.cadastros.length > resp.cadastros.pendentes.length;
      }
    } catch (e) {
      estado.sinc.erro = 'Sem conexão com o servidor. Os dados continuam guardados neste aparelho.';
    }
    enviando = false;
    salvar();
    atualizarStatusEnvio();
    if (continuar) sincronizar();
  }

  function atualizarStatusEnvio() {
    const el = $('#sincStatus');
    if (!el) return;
    const { giros, cadastros } = estado.fila;
    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
    const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let situacao;
    let tipo = 'ok';
    if (location.protocol === 'file:') {
      situacao = 'Aberto direto do arquivo: o envio só funciona pelo endereço publicado.';
      tipo = 'alerta';
    } else if (!estado.sinc.chave) {
      situacao = 'Informe a chave do aparelho para enviar os dados.';
      tipo = 'alerta';
    } else if (estado.sinc.erro) {
      situacao = estado.sinc.erro;
      tipo = 'alerta';
    } else if (giros.length || cadastros.length) {
      situacao = 'Enviando…';
    } else {
      situacao = 'Tudo enviado.';
    }

    const pendentes = giros.length || cadastros.length
      ? `Na fila: ${plural(giros.length, 'giro', 'giros')} e ${plural(cadastros.length, 'cadastro', 'cadastros')}.`
      : '';
    const ultimo = estado.sinc.ultimoEnvio ? `Último envio às ${hora.format(estado.sinc.ultimoEnvio)}.` : '';
    const recusados = estado.sinc.recusados.length
      ? `${plural(estado.sinc.recusados.length, 'item recusado', 'itens recusados')} pelo servidor (último motivo: ${estado.sinc.recusados[estado.sinc.recusados.length - 1].motivo}).`
      : '';

    el.dataset.tipo = tipo;
    el.textContent = [situacao, pendentes, ultimo, recusados].filter(Boolean).join(' ');
  }

  function atualizarCampoEnvio(e) {
    const campo = { sincEvento: 'evento', sincAparelho: 'aparelho', sincChave: 'chave' }[e.target.id];
    if (!campo) return;
    estado.sinc[campo] = e.target.value.trim();
    if (campo === 'chave') estado.sinc.erro = '';
    salvar();
    atualizarStatusEnvio();
    if (campo === 'chave') sincronizar();
  }

  /* ---------- Confete ---------- */

  const confete = (() => {
    const cv = $('#confete');
    const c = cv.getContext('2d');
    const CORES = ['#ff9933', '#ffb366', '#ffffff', '#ffd166', '#5b9bff', '#e2700f', '#ffe0bd'];
    let particulas = [];
    let ativo = false;
    let L = 0, A = 0, anterior = 0;

    function ajustar() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      L = window.innerWidth;
      A = window.innerHeight;
      cv.width = L * dpr;
      cv.height = A * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function nova(x, y, ang, vel) {
      return {
        x, y,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        l: 7 + Math.random() * 8,
        a: 9 + Math.random() * 10,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - .5) * 14,
        osc: Math.random() * Math.PI * 2,
        cor: CORES[Math.floor(Math.random() * CORES.length)],
        circulo: Math.random() < .22
      };
    }

    function disparar(intensidade = 1) {
      ajustar();
      const qtd = Math.round(130 * intensidade);
      for (let i = 0; i < qtd; i++) {
        const ang = -Math.PI * (.22 + Math.random() * .2);
        const vel = 1300 + Math.random() * 1100;
        particulas.push(nova(-10, A * .92, ang, vel));
        particulas.push(nova(L + 10, A * .92, -Math.PI - ang, vel));
      }
      for (let i = 0; i < qtd * .8; i++) {
        particulas.push(nova(Math.random() * L, -20 - Math.random() * A * .5, Math.PI / 2, 60 + Math.random() * 160));
      }
      if (!ativo) {
        ativo = true;
        anterior = performance.now();
        requestAnimationFrame(passo);
      }
    }

    function passo(t) {
      const dt = Math.min(.035, (t - anterior) / 1000);
      anterior = t;
      c.clearRect(0, 0, L, A);
      particulas = particulas.filter((p) => p.y < A + 40 && p.x > -60 && p.x < L + 60);
      for (const p of particulas) {
        p.vy += 820 * dt;
        p.vx -= p.vx * 2 * dt;
        p.vy -= p.vy * 2 * dt;
        p.x += (p.vx + Math.sin(p.osc) * 30) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.osc += dt * 7;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.scale(1, Math.cos(p.osc));
        c.fillStyle = p.cor;
        if (p.circulo) {
          c.beginPath();
          c.arc(0, 0, p.l * .45, 0, Math.PI * 2);
          c.fill();
        } else {
          c.fillRect(-p.l / 2, -p.a / 2, p.l, p.a);
        }
        c.restore();
      }
      if (particulas.length) {
        requestAnimationFrame(passo);
      } else {
        ativo = false;
        c.clearRect(0, 0, L, A);
      }
    }

    return { disparar };
  })();

  /* ---------- Lista lateral ---------- */

  function renderizarLista() {
    $('#listaPremios').innerHTML = LISTA_LATERAL.map((id) => {
      const p = PREMIOS[id];
      const tag = esgotado(id) ? 'Esgotado' : (p.tag || '');
      return `<li class="premio${esgotado(id) ? ' esgotado' : ''}">
        <span class="ic">${svgIcone(p.icone)}</span>
        <span><span class="nome">${p.nome}</span>${tag ? `<span class="tag">${tag}</span>` : ''}</span>
      </li>`;
    }).join('');
  }

  /* ---------- Painel do operador ---------- */

  function renderizarPainel() {
    const ids = Object.keys(PREMIOS);
    const total = ids.reduce((s, id) => s + pesoEfetivo(id), 0);
    const saidas = {};
    estado.historico.forEach((h) => { saidas[h.id] = (saidas[h.id] || 0) + 1; });

    $('#tabelaPremios').innerHTML = ids.map((id) => {
      const p = PREMIOS[id];
      const chance = total ? (pesoEfetivo(id) / total) * 100 : 0;
      const estoque = p.controlaEstoque
        ? `<input type="number" min="0" step="1" data-estoque="${id}" value="${estado.estoque[id] ?? ''}" placeholder="∞">`
        : '—';
      return `<tr>
        <td><span class="cor" style="background:${p.cor}"></span>${p.nome}</td>
        <td><input type="number" min="0" step="1" data-peso="${id}" value="${estado.pesos[id]}"></td>
        <td class="chance${chance === 0 ? ' zerado' : ''}">${chance.toFixed(1).replace('.', ',')}%</td>
        <td>${estoque}</td>
        <td>${saidas[id] || 0}</td>
      </tr>`;
    }).join('');

    const premiados = estado.historico.filter((h) => PREMIOS[h.id] && PREMIOS[h.id].ganha).length;
    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
    $('#resumoHistorico').textContent = `· ${plural(estado.historico.length, 'giro', 'giros')}, ${plural(premiados, 'prêmio', 'prêmios')}`;

    const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const itens = estado.historico.slice(-100).reverse()
      .map((h) => `<li><span>${fmt.format(h.t)}</span><span>${PREMIOS[h.id] ? PREMIOS[h.id].nome : h.id}${h.codigo ? `<b class="codigo">${h.codigo}</b>` : ''}</span></li>`);
    $('#historico').innerHTML = itens.length ? itens.join('') : '<li class="vazio">Nenhum giro registrado.</li>';

    $('#sincEvento').value = estado.sinc.evento;
    $('#sincAparelho').value = estado.sinc.aparelho;
    $('#sincChave').value = estado.sinc.chave;
    atualizarStatusEnvio();
  }

  function atualizarCampo(e) {
    const el = e.target;
    if (el.dataset.peso) {
      estado.pesos[el.dataset.peso] = Math.max(0, parseInt(el.value, 10) || 0);
    } else if (el.dataset.estoque) {
      const v = el.value.trim();
      estado.estoque[el.dataset.estoque] = v === '' ? null : Math.max(0, parseInt(v, 10) || 0);
    } else {
      return;
    }
    salvar();
    renderizarPainel();
    renderizarLista();
    desenharRoda();
  }

  function exportarCsv() {
    const linhas = [['Data', 'Hora', 'Resultado', 'Código do cupom']];
    estado.historico.forEach((h) => {
      const d = new Date(h.t);
      linhas.push([d.toLocaleDateString('pt-BR'), d.toLocaleTimeString('pt-BR'), PREMIOS[h.id] ? PREMIOS[h.id].nome : h.id, h.codigo || '']);
    });
    const csv = '﻿' + linhas.map((l) => l.join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `roleta-historico-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function alternarPainel(abrir) {
    const deveAbrir = abrir ?? !painel.classList.contains('aberto');
    painel.classList.toggle('aberto', deveAbrir);
    if (deveAbrir) renderizarPainel();
    else if (document.activeElement) document.activeElement.blur();
  }

  /* ---------- Som, tela cheia e avisos ---------- */

  function atualizarBotaoSom() {
    $('#btnSom').innerHTML = svgIcone(estado.som ? 'somLigado' : 'somDesligado');
  }

  function alternarSom() {
    estado.som = !estado.som;
    salvar();
    atualizarBotaoSom();
    mostrarAviso(estado.som ? 'Som ligado' : 'Som desligado');
  }

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  let temporizadorAviso = null;
  function mostrarAviso(texto) {
    const el = $('#aviso');
    el.textContent = texto;
    el.classList.add('visivel');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => el.classList.remove('visivel'), 2600);
  }

  /* ---------- Eventos ---------- */

  function acaoPrincipal() {
    if (resultado.classList.contains('aberto')) {
      fecharResultado();
      return;
    }
    botaoGirar.classList.add('pressionado');
    setTimeout(() => botaoGirar.classList.remove('pressionado'), 140);
    girar();
  }

  botaoGirar.addEventListener('click', (e) => { e.currentTarget.blur(); girar(); });
  $('#centro').addEventListener('click', (e) => { e.currentTarget.blur(); girar(); });
  botaoResultado.addEventListener('click', () => fecharResultado());
  resultado.addEventListener('click', (e) => { if (e.target === resultado) fecharResultado(false); });

  $('#btnSom').addEventListener('click', (e) => { e.currentTarget.blur(); alternarSom(); });
  $('#btnTelaCheia').addEventListener('click', (e) => { e.currentTarget.blur(); alternarTelaCheia(); });
  $('#btnPainel').addEventListener('click', (e) => { e.currentTarget.blur(); alternarPainel(); });
  $('#painelFechar').addEventListener('click', () => alternarPainel(false));
  $('#tabelaPremios').addEventListener('change', atualizarCampo);
  $('.campos-sinc').addEventListener('change', atualizarCampoEnvio);
  $('#btnEnviar').addEventListener('click', () => {
    estado.sinc.erro = '';
    sincronizar();
    atualizarStatusEnvio();
  });
  formCadastro.addEventListener('submit', enviarCadastro);
  $('#cadPular').addEventListener('click', pularCadastro);
  $('#cadTelefone').addEventListener('input', (e) => { e.target.value = formatarTelefone(e.target.value); });
  formCadastro.addEventListener('input', (e) => e.target.classList.remove('invalido'));
  $('#btnExportar').addEventListener('click', exportarCsv);
  $('#btnZerar').addEventListener('click', () => {
    if (!confirm('Apagar todo o histórico de giros?')) return;
    estado.historico = [];
    salvar();
    renderizarPainel();
  });
  $('#btnPadrao').addEventListener('click', () => {
    if (!confirm('Restaurar pesos e estoques para o padrão? O histórico será mantido.')) return;
    const padrao = estadoPadrao();
    estado.pesos = padrao.pesos;
    estado.estoque = padrao.estoque;
    salvar();
    renderizarPainel();
    renderizarLista();
    desenharRoda();
  });

  // Campos e botões do cadastro mantêm o comportamento normal do teclado
  const noFormulario = (alvo) => alvo instanceof HTMLInputElement || (alvo instanceof Element && alvo.closest('form'));

  document.addEventListener('keydown', (e) => {
    if (noFormulario(e.target)) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat && !painel.classList.contains('aberto')) acaoPrincipal();
      return;
    }
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    switch (e.key.toLowerCase()) {
      case 'f': alternarTelaCheia(); break;
      case 'm': alternarSom(); break;
      case 'p': alternarPainel(); break;
      case 'escape':
        if (painel.classList.contains('aberto')) alternarPainel(false);
        else fecharResultado(false);
        break;
    }
  });

  document.addEventListener('keyup', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !noFormulario(e.target)) e.preventDefault();
  });

  // Toque: evita o menu de pressão longa na roda e o zoom de pinça do Safari
  rodaArea.addEventListener('contextmenu', (e) => e.preventDefault());
  botaoGirar.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  /* ---------- Início ---------- */

  // O iPhone não permite tela cheia em páginas; nele, use "Adicionar à Tela de Início"
  if (!document.fullscreenEnabled) $('#btnTelaCheia').style.display = 'none';

  if (POLITICA_PRIVACIDADE) {
    $('#cadPolitica').href = POLITICA_PRIVACIDADE;
    $('#cadPolitica').hidden = false;
  }

  criarLampadas();
  criarFaiscas();
  atualizarBotaoSom();
  renderizarLista();
  renderizarPainel();

  sincronizar();
  setInterval(sincronizar, INTERVALO_ENVIO_MS);
  window.addEventListener('online', sincronizar);

  new ResizeObserver(() => desenharRoda()).observe(canvas);
  Promise.all([
    document.fonts.load('900 40px Montserrat'),
    document.fonts.load('700 40px Montserrat')
  ]).catch(() => {}).then(desenharRoda);

  requestAnimationFrame(quadro);
})();
