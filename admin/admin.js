/* ==========================================================
   Painel da Roleta | Contabilidade Facilitada
   Lê /api/admin/dados (protegido pelo Cloudflare Access) e monta
   indicadores, gráficos e a lista de ganhadores no navegador.
   ========================================================== */
(() => {
  'use strict';

  const INTERVALO_ATUALIZACAO_MS = 30000;
  const LINHAS_POR_PAGINA = 50;
  const CHAVE_FILTROS = 'roleta-cf-admin-filtros';
  const HORA = 3600000;
  const DIA = 24 * HORA;

  const $ = (s) => document.querySelector(s);

  const dados = {
    usuario: '',
    premios: {},
    giros: [],          // { t, premio, evento, aparelho }
    ultimoSeq: 0,
    cadastros: []
  };

  const filtros = carregarFiltros();
  let limiteLinhas = LINHAS_POR_PAGINA;
  let ultimaAtualizacao = null;
  let carregando = false;

  /* ---------- Formatação ---------- */

  const numero = new Intl.NumberFormat('pt-BR');
  const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const fmtHoraSeg = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtDiaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
  const fmtDiaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

  const pct = (parte, total) => (total ? `${(parte / total * 100).toFixed(1).replace('.', ',')}%` : '0%');
  const plural = (n, um, varios) => `${numero.format(n)} ${n === 1 ? um : varios}`;
  const nomePremio = (id) => (dados.premios[id] ? dados.premios[id].nome : id);

  function telefone(d) {
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return d;
  }

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  const ICONE_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const ICONE_RELOGIO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

  /* ---------- Filtros guardados neste navegador ---------- */

  function carregarFiltros() {
    const padrao = { periodo: 'tudo', evento: '', aparelho: '', premio: '', situacao: '' };
    try {
      return { ...padrao, ...JSON.parse(localStorage.getItem(CHAVE_FILTROS)) };
    } catch (e) {
      return padrao;
    }
  }

  function salvarFiltros() {
    try { localStorage.setItem(CHAVE_FILTROS, JSON.stringify(filtros)); } catch (e) { /* armazenamento indisponível */ }
  }

  function inicioPeriodo() {
    if (filtros.periodo === 'hoje') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (filtros.periodo === '7') return Date.now() - 7 * DIA;
    if (filtros.periodo === '30') return Date.now() - 30 * DIA;
    return -Infinity;
  }

  const passaFiltros = (t, evento, aparelho, inicio) =>
    t >= inicio && (!filtros.evento || evento === filtros.evento) && (!filtros.aparelho || aparelho === filtros.aparelho);

  /* ---------- Carga dos dados ---------- */

  async function carregar() {
    if (carregando) return;
    carregando = true;
    document.body.classList.add('carregando');
    try {
      let mais = true;
      while (mais) {
        const r = await fetch(`/api/admin/dados?desde=${dados.ultimoSeq}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (r.status === 401 || r.status === 403) {
          status('Acesso não autorizado para este usuário.', 'erro');
          return;
        }
        if (!r.ok) throw new Error(`erro ${r.status}`);
        const d = await r.json();
        dados.usuario = d.usuario;
        dados.premios = d.premios;
        d.giros.forEach(([seq, t, premio, evento, aparelho]) => {
          dados.giros.push({ t, premio, evento, aparelho });
          dados.ultimoSeq = Math.max(dados.ultimoSeq, seq);
        });
        dados.cadastros = d.cadastros;
        mais = d.mais;
      }
      ultimaAtualizacao = Date.now();
      status(`Atualizado às ${fmtHoraSeg.format(ultimaAtualizacao)}`);
      renderizar();
    } catch (e) {
      // Com a sessão do Access vencida, a requisição é redirecionada ao login e falha aqui
      status('Não foi possível atualizar. Se a sessão expirou, recarregue a página.', 'erro');
    } finally {
      carregando = false;
      document.body.classList.remove('carregando');
    }
  }

  function status(texto, tipo = '') {
    const el = $('#statusAtualizacao');
    el.textContent = texto;
    el.dataset.tipo = tipo;
  }

  /* ---------- Renderização ---------- */

  function renderizar() {
    $('#usuario').textContent = dados.usuario;
    renderizarOpcoes();

    const inicio = inicioPeriodo();
    const giros = dados.giros.filter((g) => passaFiltros(g.t, g.evento, g.aparelho, inicio));
    const cadastros = dados.cadastros.filter((c) => passaFiltros(c.criado_em, c.evento, c.aparelho, inicio));

    renderizarIndicadores(giros, cadastros);
    renderizarTempo(giros, cadastros);
    renderizarPremios(giros, cadastros);
    renderizarCadastros(cadastros);
  }

  function preencherSelect(el, valores, rotuloTodos, valorAtual, rotulo = (v) => v) {
    const opcoes = [`<option value="">${esc(rotuloTodos)}</option>`]
      .concat(valores.map((v) => `<option value="${esc(v)}">${esc(rotulo(v) || '(sem nome)')}</option>`));
    const html = opcoes.join('');
    if (el.dataset.html !== html) {
      el.innerHTML = html;
      el.dataset.html = html;
    }
    el.value = valores.includes(valorAtual) ? valorAtual : '';
  }

  function renderizarOpcoes() {
    const eventos = [...new Set(dados.giros.map((g) => g.evento))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const aparelhos = [...new Set(dados.giros
      .filter((g) => !filtros.evento || g.evento === filtros.evento)
      .map((g) => g.aparelho))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    preencherSelect($('#filtroEvento'), eventos, 'Todos os eventos', filtros.evento);
    preencherSelect($('#filtroAparelho'), aparelhos, 'Todos os aparelhos', filtros.aparelho);
    const comCupom = Object.keys(dados.premios).filter((id) => dados.premios[id].cupom);
    preencherSelect($('#filtroPremio'), comCupom, 'Todos os prêmios', filtros.premio, nomePremio);
    $('#filtroSituacao').value = filtros.situacao;
    document.querySelectorAll('#filtroPeriodo button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.periodo === filtros.periodo));
    });
  }

  function renderizarIndicadores(giros, cadastros) {
    const premiados = giros.filter((g) => dados.premios[g.premio] && dados.premios[g.premio].ganha).length;
    const sorteadosCupom = giros.filter((g) => dados.premios[g.premio] && dados.premios[g.premio].cupom).length;
    const resgatados = cadastros.filter((c) => c.resgatado_em).length;
    const ultimo = giros.reduce((m, g) => Math.max(m, g.t), 0);

    $('#kpiGiros').textContent = numero.format(giros.length);
    $('#kpiGirosSub').textContent = ultimo
      ? `Último às ${fmtHora.format(ultimo)}${Date.now() - ultimo > DIA ? ` de ${fmtDiaMes.format(ultimo)}` : ''}`
      : 'Nenhum giro no período';
    $('#kpiPremios').textContent = numero.format(premiados);
    $('#kpiPremiosSub').textContent = `${pct(premiados, giros.length)} dos giros`;
    $('#kpiCupons').textContent = numero.format(cadastros.length);
    $('#kpiCuponsSub').textContent = sorteadosCupom
      ? `${pct(cadastros.length, sorteadosCupom)} dos ${plural(sorteadosCupom, 'cupom sorteado', 'cupons sorteados')}`
      : 'Nenhum cupom sorteado';
    $('#kpiResgatados').textContent = numero.format(resgatados);
    $('#kpiResgatadosSub').textContent = `${pct(resgatados, cadastros.length)} dos emitidos`;
  }

  /* ---------- Gráfico de giros ao longo do tempo ---------- */

  function agrupar(giros, cadastros) {
    if (!giros.length) return { baldes: [], porHora: true };
    const min = giros.reduce((m, g) => Math.min(m, g.t), Infinity);
    const max = giros.reduce((m, g) => Math.max(m, g.t), -Infinity);
    const porHora = max - min <= 48 * HORA;

    const inicioBalde = (t) => {
      const d = new Date(t);
      if (porHora) d.setMinutes(0, 0, 0);
      else d.setHours(0, 0, 0, 0);
      return d.getTime();
    };
    const proximo = (t) => {
      const d = new Date(t);
      if (porHora) d.setHours(d.getHours() + 1);
      else d.setDate(d.getDate() + 1);
      return d.getTime();
    };

    const baldes = [];
    const indice = new Map();
    for (let t = inicioBalde(min); t <= max; t = proximo(t)) {
      indice.set(t, baldes.length);
      baldes.push({ t, giros: 0, premios: 0, cupons: 0 });
    }
    giros.forEach((g) => {
      const b = baldes[indice.get(inicioBalde(g.t))];
      b.giros++;
      if (dados.premios[g.premio] && dados.premios[g.premio].ganha) b.premios++;
    });
    cadastros.forEach((c) => {
      const i = indice.get(inicioBalde(c.criado_em));
      if (i !== undefined) baldes[i].cupons++;
    });
    return { baldes, porHora };
  }

  // Máximo "redondo" do eixo e o passo entre as linhas de grade (1, 2 ou 5 × 10^n)
  function escala(maximo) {
    if (maximo <= 4) return { topo: 4, passo: 1 };
    const bruto = maximo / 4;
    const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
    const passo = [1, 2, 5, 10].map((m) => m * potencia).find((p) => p >= bruto);
    return { topo: Math.ceil(maximo / passo) * passo, passo };
  }

  const compacto = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.', ',')} mil` : String(n));

  function rotuloBalde(t, porHora, longo = false) {
    if (!porHora) return longo ? fmtDiaSemana.format(t) : fmtDiaMes.format(t);
    const d = new Date(t);
    const fim = new Date(t + HORA);
    if (longo) return `${fmtDiaMes.format(t)}, das ${String(d.getHours()).padStart(2, '0')}h às ${String(fim.getHours()).padStart(2, '0')}h`;
    return d.getHours() === 0 ? fmtDiaMes.format(t) : `${d.getHours()}h`;
  }

  let ultimoTempo = null;

  function renderizarTempo(giros, cadastros) {
    const { baldes, porHora } = agrupar(giros, cadastros);
    ultimoTempo = { baldes, porHora };
    $('#subTempo').textContent = porHora ? 'Giros por hora' : 'Giros por dia';
    desenharTempo();

    $('#tabelaTempo').innerHTML = baldes.length
      ? `<table class="tabela"><thead><tr><th>${porHora ? 'Hora' : 'Dia'}</th><th class="num">Giros</th><th class="num">Prêmios</th><th class="num">Cupons emitidos</th></tr></thead><tbody>${
        baldes.filter((b) => b.giros || b.cupons).map((b) => `<tr><td class="data">${esc(rotuloBalde(b.t, porHora, true))}</td><td class="num">${numero.format(b.giros)}</td><td class="num">${numero.format(b.premios)}</td><td class="num">${numero.format(b.cupons)}</td></tr>`).join('')
      }</tbody></table>`
      : '<p class="vazio">Sem giros no período.</p>';
  }

  function desenharTempo() {
    const el = $('#graficoTempo');
    if (!ultimoTempo) return;
    const { baldes, porHora } = ultimoTempo;
    if (!baldes.length) {
      el.innerHTML = '<p class="vazio">Sem giros no período selecionado.</p>';
      return;
    }

    const L = el.clientWidth;
    const A = 250;
    const m = { topo: 18, dir: 6, base: 26, esq: 40 };
    const larguraUtil = Math.max(10, L - m.esq - m.dir);
    const alturaUtil = A - m.topo - m.base;
    const n = baldes.length;
    const faixa = larguraUtil / n;
    // Colunas de no máximo 24 px, com pelo menos 2 px de respiro entre vizinhas
    const largura = Math.max(1, Math.min(24, faixa * .62, faixa - 2));
    const maximo = Math.max(...baldes.map((b) => b.giros));
    const { topo, passo } = escala(maximo);
    const y = (v) => m.topo + alturaUtil - (v / topo) * alturaUtil;

    const partes = [];
    for (let v = 0; v <= topo; v += passo) {
      const yy = y(v).toFixed(1);
      partes.push(`<line class="${v === 0 ? 'base' : 'grade'}" x1="${m.esq}" x2="${L - m.dir}" y1="${yy}" y2="${yy}"/>`);
      partes.push(`<text class="rotulo" x="${m.esq - 8}" y="${yy}" text-anchor="end" dominant-baseline="middle">${compacto(v)}</text>`);
    }

    // Rótulos do eixo horizontal espaçados para não se sobreporem
    const cada = Math.max(1, Math.ceil(46 / faixa));
    const iMaximo = baldes.findIndex((b) => b.giros === maximo);

    baldes.forEach((b, i) => {
      const cx = m.esq + faixa * i + faixa / 2;
      const x = cx - largura / 2;
      const yTopo = y(b.giros);
      const h = m.topo + alturaUtil - yTopo;
      const r = Math.min(4, largura / 2, h);
      // Coluna com a ponta arredondada e a base reta
      const caminho = h > 0
        ? `M${x.toFixed(1)} ${(yTopo + h).toFixed(1)}V${(yTopo + r).toFixed(1)}Q${x.toFixed(1)} ${yTopo.toFixed(1)} ${(x + r).toFixed(1)} ${yTopo.toFixed(1)}H${(x + largura - r).toFixed(1)}Q${(x + largura).toFixed(1)} ${yTopo.toFixed(1)} ${(x + largura).toFixed(1)} ${(yTopo + r).toFixed(1)}V${(yTopo + h).toFixed(1)}Z`
        : '';
      partes.push(`<rect class="alvo" data-i="${i}" tabindex="0" x="${(m.esq + faixa * i).toFixed(1)}" y="${m.topo}" width="${faixa.toFixed(1)}" height="${alturaUtil}" aria-label="${esc(rotuloBalde(b.t, porHora, true))}: ${b.giros} giros"/>`);
      partes.push(`<path class="coluna" d="${caminho}"/>`);
      if (i === iMaximo && maximo > 0) {
        partes.push(`<text class="valor" x="${cx.toFixed(1)}" y="${(yTopo - 6).toFixed(1)}" text-anchor="middle">${numero.format(maximo)}</text>`);
      }
      if (i % cada === 0) {
        partes.push(`<text class="rotulo" x="${cx.toFixed(1)}" y="${A - 8}" text-anchor="middle">${esc(rotuloBalde(b.t, porHora))}</text>`);
      }
    });

    el.innerHTML = `<svg width="${L}" height="${A}" viewBox="0 0 ${L} ${A}" role="img" aria-label="Giros ${porHora ? 'por hora' : 'por dia'}">${partes.join('')}</svg>`;
  }

  /* ---------- Resultados por prêmio ---------- */

  function renderizarPremios(giros, cadastros) {
    const ids = Object.keys(dados.premios);
    const contagem = Object.fromEntries(ids.map((id) => [id, 0]));
    giros.forEach((g) => { if (g.premio in contagem) contagem[g.premio]++; });
    const cupons = Object.fromEntries(ids.map((id) => [id, 0]));
    cadastros.forEach((c) => { if (c.premio in cupons) cupons[c.premio]++; });
    const maximo = Math.max(1, ...Object.values(contagem));

    $('#graficoPremios').innerHTML = giros.length
      ? ids.map((id) => `
        <div class="barra" tabindex="0" data-premio="${esc(id)}" data-giros="${contagem[id]}" data-cupons="${dados.premios[id].cupom ? cupons[id] : ''}" data-total="${giros.length}">
          <span class="barra-nome">${esc(nomePremio(id))}</span>
          <span class="barra-linha">
            <span class="barra-trilho"><span class="barra-preenchida" style="width:${(contagem[id] / maximo * 100).toFixed(2)}%"></span></span>
            <span class="barra-valor">${numero.format(contagem[id])} · ${pct(contagem[id], giros.length)}</span>
          </span>
        </div>`).join('')
      : '<p class="vazio">Sem giros no período selecionado.</p>';
  }

  /* ---------- Dica ao passar o mouse ou focar ---------- */

  const dica = $('#dica');

  function mostrarDica(titulo, linhas, alvo, evento) {
    dica.replaceChildren();
    const t = document.createElement('div');
    t.className = 'dica-titulo';
    t.textContent = titulo;
    dica.appendChild(t);
    linhas.forEach(([valor, rotulo, neutra]) => {
      const l = document.createElement('div');
      l.className = 'dica-linha';
      const chave = document.createElement('i');
      chave.className = `dica-chave${neutra ? ' neutra' : ''}`;
      const v = document.createElement('strong');
      v.textContent = valor;
      const r = document.createElement('span');
      r.textContent = rotulo;
      l.append(chave, v, r);
      dica.appendChild(l);
    });
    dica.classList.add('visivel');

    const caixa = dica.getBoundingClientRect();
    let x;
    let y;
    if (evento && evento.clientX !== undefined) {
      x = evento.clientX + 14;
      y = evento.clientY - caixa.height - 12;
    } else {
      const r = alvo.getBoundingClientRect();
      x = r.left + r.width / 2 - caixa.width / 2;
      y = r.top - caixa.height - 8;
    }
    x = Math.max(8, Math.min(window.innerWidth - caixa.width - 8, x));
    if (y < 8) y = (evento && evento.clientY !== undefined ? evento.clientY : alvo.getBoundingClientRect().bottom) + 16;
    dica.style.left = `${x}px`;
    dica.style.top = `${y}px`;
  }

  const esconderDica = () => dica.classList.remove('visivel');

  function dicaTempo(alvo, evento) {
    const b = ultimoTempo.baldes[Number(alvo.dataset.i)];
    mostrarDica(rotuloBalde(b.t, ultimoTempo.porHora, true), [
      [numero.format(b.giros), b.giros === 1 ? 'giro' : 'giros'],
      [numero.format(b.premios), b.premios === 1 ? 'prêmio' : 'prêmios', true],
      [numero.format(b.cupons), b.cupons === 1 ? 'cupom emitido' : 'cupons emitidos', true]
    ], alvo, evento);
  }

  function dicaPremio(alvo, evento) {
    const g = Number(alvo.dataset.giros);
    const linhas = [[numero.format(g), `${g === 1 ? 'giro' : 'giros'} · ${pct(g, Number(alvo.dataset.total))}`]];
    if (alvo.dataset.cupons !== '') {
      const c = Number(alvo.dataset.cupons);
      linhas.push([numero.format(c), c === 1 ? 'cupom emitido' : 'cupons emitidos', true]);
    }
    mostrarDica(nomePremio(alvo.dataset.premio), linhas, alvo, evento);
  }

  function ligarDicas(container, seletor, funcao) {
    container.addEventListener('pointermove', (e) => {
      const alvo = e.target.closest(seletor);
      if (alvo) funcao(alvo, e);
      else esconderDica();
    });
    container.addEventListener('pointerleave', esconderDica);
    container.addEventListener('focusin', (e) => {
      const alvo = e.target.closest(seletor);
      if (alvo) funcao(alvo);
    });
    container.addEventListener('focusout', esconderDica);
  }

  /* ---------- Ganhadores de cupom ---------- */

  function cadastrosVisiveis(cadastros) {
    const termo = $('#busca').value.trim().toLowerCase();
    const termoDigitos = termo.replace(/\D/g, '');
    return cadastros.filter((c) => {
      if (filtros.premio && c.premio !== filtros.premio) return false;
      if (filtros.situacao === 'resgatado' && !c.resgatado_em) return false;
      if (filtros.situacao === 'emitido' && c.resgatado_em) return false;
      if (!termo) return true;
      return c.nome.toLowerCase().includes(termo)
        || c.email.includes(termo)
        || c.codigo.toLowerCase().includes(termo)
        || (termoDigitos.length >= 3 && c.telefone.includes(termoDigitos));
    });
  }

  let ultimosCadastros = [];

  function renderizarCadastros(cadastros) {
    ultimosCadastros = cadastros;
    const visiveis = cadastrosVisiveis(cadastros);
    const resgatados = cadastros.filter((c) => c.resgatado_em).length;
    $('#subGanhadores').textContent = `${plural(cadastros.length, 'cadastro', 'cadastros')} no período · ${plural(resgatados, 'resgatado', 'resgatados')}`;

    const linhas = visiveis.slice(0, limiteLinhas).map((c) => `
      <tr>
        <td class="data">${esc(fmtData.format(c.criado_em))}<br>${esc(fmtHora.format(c.criado_em))}</td>
        <td>
          <span class="principal">${esc(c.nome)}</span>
          <span class="secundario" style="display:block">${esc(c.email)}</span>
          <span class="secundario telefone" style="display:block">${esc(telefone(c.telefone))}</span>
        </td>
        <td>
          <span style="display:block">${esc(nomePremio(c.premio))}</span>
          <span class="codigo">${esc(c.codigo)}</span>
        </td>
        <td>
          <span style="display:block">${esc(c.evento || '(sem nome)')}</span>
          <span class="secundario">${esc(c.aparelho)}</span>
        </td>
        <td>${c.marketing ? 'Aceitou' : 'Não aceitou'}</td>
        <td>${c.resgatado_em
          ? `<span class="situacao resgatado">${ICONE_OK}Resgatado</span><span class="por">${esc(fmtData.format(c.resgatado_em))} ${esc(fmtHora.format(c.resgatado_em))}${c.resgatado_por ? ` · ${esc(c.resgatado_por)}` : ''}</span>`
          : `<span class="situacao">${ICONE_RELOGIO}Não resgatado</span>`}</td>
        <td>
          <div class="acoes">
            <button class="botao" type="button" data-acao="${c.resgatado_em ? 'desfazer' : 'resgatar'}" data-id="${c.id}">${c.resgatado_em ? 'Desfazer resgate' : 'Marcar resgate'}</button>
            <button class="botao excluir" type="button" data-acao="excluir" data-id="${c.id}">Excluir</button>
          </div>
        </td>
      </tr>`);

    $('#tabelaCadastros').innerHTML = linhas.length
      ? linhas.join('')
      : `<tr class="linha-vazia"><td colspan="7">${cadastros.length ? 'Nenhum ganhador corresponde à busca.' : 'Nenhum ganhador cadastrado no período.'}</td></tr>`;

    const btn = $('#btnMostrarMais');
    btn.hidden = visiveis.length <= limiteLinhas;
    btn.textContent = `Mostrar mais (${numero.format(visiveis.length - Math.min(limiteLinhas, visiveis.length))} restantes)`;
  }

  async function acaoCadastro(e) {
    const botao = e.target.closest('button[data-acao]');
    if (!botao) return;
    const id = Number(botao.dataset.id);
    const cadastro = dados.cadastros.find((c) => c.id === id);
    if (!cadastro) return;

    if (botao.dataset.acao === 'excluir'
      && !confirm(`Excluir os dados de ${cadastro.nome} (cupom ${cadastro.codigo})? Esta ação não pode ser desfeita.`)) return;

    botao.disabled = true;
    try {
      let r;
      if (botao.dataset.acao === 'excluir') {
        r = await fetch(`/api/admin/cadastros/${id}`, { method: 'DELETE' });
        if (!r.ok) throw new Error(`erro ${r.status}`);
        dados.cadastros = dados.cadastros.filter((c) => c.id !== id);
      } else {
        r = await fetch(`/api/admin/cadastros/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resgatado: botao.dataset.acao === 'resgatar' })
        });
        if (!r.ok) throw new Error(`erro ${r.status}`);
        const atualizado = await r.json();
        cadastro.resgatado_em = atualizado.resgatado_em;
        cadastro.resgatado_por = atualizado.resgatado_por;
      }
      renderizar();
    } catch (err) {
      botao.disabled = false;
      alert('Não foi possível salvar a alteração. Verifique a conexão e tente de novo.');
    }
  }

  /* ---------- Exportação ---------- */

  // Evita que o Excel interprete como fórmula um texto digitado que comece com =, +, - ou @
  function celula(v) {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function baixarCsv(nome, linhas) {
    const csv = '﻿' + linhas.map((l) => l.map(celula).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nome}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportarCadastros() {
    const linhas = [['Data', 'Hora', 'Nome', 'E-mail', 'Telefone', 'Prêmio', 'Código', 'Aceita comunicações', 'Evento', 'Aparelho', 'Resgatado em', 'Resgatado por']];
    cadastrosVisiveis(ultimosCadastros).forEach((c) => linhas.push([
      fmtData.format(c.criado_em), fmtHoraSeg.format(c.criado_em), c.nome, c.email, telefone(c.telefone),
      nomePremio(c.premio), c.codigo, c.marketing ? 'Sim' : 'Não', c.evento, c.aparelho,
      c.resgatado_em ? `${fmtData.format(c.resgatado_em)} ${fmtHoraSeg.format(c.resgatado_em)}` : '', c.resgatado_por || ''
    ]));
    baixarCsv('roleta-ganhadores', linhas);
  }

  function exportarGiros() {
    const inicio = inicioPeriodo();
    const linhas = [['Data', 'Hora', 'Resultado', 'Evento', 'Aparelho']];
    dados.giros.filter((g) => passaFiltros(g.t, g.evento, g.aparelho, inicio)).forEach((g) => linhas.push([
      fmtData.format(g.t), fmtHoraSeg.format(g.t), nomePremio(g.premio), g.evento, g.aparelho
    ]));
    baixarCsv('roleta-giros', linhas);
  }

  /* ---------- Eventos ---------- */

  function alterarFiltro(campo, valor) {
    filtros[campo] = valor;
    if (campo === 'evento') filtros.aparelho = '';
    limiteLinhas = LINHAS_POR_PAGINA;
    salvarFiltros();
    renderizar();
  }

  $('#filtroPeriodo').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-periodo]');
    if (b) alterarFiltro('periodo', b.dataset.periodo);
  });
  $('#filtroEvento').addEventListener('change', (e) => alterarFiltro('evento', e.target.value));
  $('#filtroAparelho').addEventListener('change', (e) => alterarFiltro('aparelho', e.target.value));
  $('#filtroPremio').addEventListener('change', (e) => alterarFiltro('premio', e.target.value));
  $('#filtroSituacao').addEventListener('change', (e) => alterarFiltro('situacao', e.target.value));
  $('#busca').addEventListener('input', () => {
    limiteLinhas = LINHAS_POR_PAGINA;
    renderizarCadastros(ultimosCadastros);
  });
  $('#btnMostrarMais').addEventListener('click', () => {
    limiteLinhas += LINHAS_POR_PAGINA;
    renderizarCadastros(ultimosCadastros);
  });
  $('#tabelaCadastros').addEventListener('click', acaoCadastro);
  $('#btnAtualizar').addEventListener('click', carregar);
  $('#btnExportarCadastros').addEventListener('click', exportarCadastros);
  $('#btnExportarGiros').addEventListener('click', exportarGiros);

  ligarDicas($('#graficoTempo'), '.alvo', dicaTempo);
  ligarDicas($('#graficoPremios'), '.barra', dicaPremio);
  new ResizeObserver(() => desenharTempo()).observe($('#graficoTempo'));

  // Atualiza sozinho enquanto a aba está visível
  setInterval(() => { if (document.visibilityState === 'visible') carregar(); }, INTERVALO_ATUALIZACAO_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - (ultimaAtualizacao || 0) > INTERVALO_ATUALIZACAO_MS) carregar();
  });

  renderizarOpcoes();
  carregar();
})();
