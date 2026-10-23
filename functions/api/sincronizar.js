/* Recebe dos aparelhos da roleta os giros e os cadastros de ganhadores que estavam na fila.
   O envio é repetível: um giro ou cadastro já gravado é ignorado e confirmado de novo. */

import { PREMIOS } from '../_lib/premios.js';
import { json, erro } from '../_lib/resposta.js';
import { senhaConfere } from '../_lib/senha.js';

const MAX_GIROS = 500;
const MAX_CADASTROS = 200;
const ID = /^[A-Za-z0-9-]{8,64}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODIGO = /^[A-Z0-9]{2,8}-[2-9A-HJ-NP-Z]{8}$/;

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Momento informado pelo aparelho: aceita de 2025 até 1 dia à frente do relógio do servidor
function momentoValido(v) {
  return Number.isInteger(v) && v > Date.UTC(2025, 0, 1) && v < Date.now() + 86400000;
}

function validarGiro(g) {
  if (!g || !ID.test(g.id)) return 'id inválido';
  if (!PREMIOS[g.premio]) return 'prêmio desconhecido';
  if (!momentoValido(g.momento)) return 'momento inválido';
  return '';
}

function validarCadastro(c) {
  if (!c || !ID.test(c.giro)) return 'giro inválido';
  if (!CODIGO.test(c.codigo)) return 'código inválido';
  const nome = texto(c.nome, 120);
  if (nome.length < 2) return 'nome inválido';
  if (!EMAIL.test(texto(c.email, 160))) return 'e-mail inválido';
  const telefone = String(c.telefone || '').replace(/\D/g, '');
  if (telefone.length < 10 || telefone.length > 13) return 'telefone inválido';
  if (!momentoValido(c.momento)) return 'momento inválido';
  return '';
}

export async function onRequestPost({ request, env }) {
  if (!env.CHAVE_OPERADOR || !env.DB) return erro(503, 'Servidor sem configuração.');
  if (!(await senhaConfere(request.headers.get('X-Chave-Operador') || '', env.CHAVE_OPERADOR))) {
    return erro(401, 'Chave do aparelho inválida.');
  }

  let corpo;
  try { corpo = await request.json(); } catch (e) { return erro(400, 'Corpo inválido.'); }
  const giros = Array.isArray(corpo.giros) ? corpo.giros : [];
  const cadastros = Array.isArray(corpo.cadastros) ? corpo.cadastros : [];
  if (giros.length > MAX_GIROS || cadastros.length > MAX_CADASTROS) return erro(413, 'Lote grande demais.');

  // aceitos: gravados agora ou antes; rejeitados: inválidos, não adianta reenviar;
  // pendentes: cadastro cujo giro ainda não chegou, deve ser reenviado depois
  const resultado = {
    giros: { aceitos: [], rejeitados: [] },
    cadastros: { aceitos: [], rejeitados: [], pendentes: [] }
  };
  const agora = Date.now();

  const validos = [];
  for (const g of giros) {
    const motivo = validarGiro(g);
    if (motivo) resultado.giros.rejeitados.push({ id: g && g.id, motivo });
    else validos.push(g);
  }
  if (validos.length) {
    await env.DB.batch(validos.map((g) => env.DB.prepare(
      `INSERT INTO giros (id, momento, premio, ganhou, evento, aparelho, recebido_em)
       VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`
    ).bind(g.id, g.momento, g.premio, PREMIOS[g.premio].ganha ? 1 : 0, texto(g.evento, 80), texto(g.aparelho, 40), agora)));
    resultado.giros.aceitos = validos.map((g) => g.id);
  }

  for (const c of cadastros) {
    const motivo = validarCadastro(c);
    if (motivo) {
      resultado.cadastros.rejeitados.push({ giro: c && c.giro, motivo });
      continue;
    }
    const giro = await env.DB.prepare('SELECT premio, evento, aparelho FROM giros WHERE id = ?').bind(c.giro).first();
    if (!giro) {
      resultado.cadastros.pendentes.push(c.giro);
      continue;
    }
    const premio = PREMIOS[giro.premio];
    if (!premio || !premio.cupom || !c.codigo.startsWith(`${premio.cupom}-`)) {
      resultado.cadastros.rejeitados.push({ giro: c.giro, motivo: 'giro sem cupom' });
      continue;
    }
    try {
      await env.DB.prepare(
        `INSERT INTO cadastros (giro_id, premio, codigo, nome, email, telefone, marketing, evento, aparelho, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (giro_id) DO NOTHING`
      ).bind(
        c.giro, giro.premio, c.codigo, texto(c.nome, 120), texto(c.email, 160).toLowerCase(),
        String(c.telefone).replace(/\D/g, ''), c.marketing ? 1 : 0, giro.evento, giro.aparelho, c.momento
      ).run();
      resultado.cadastros.aceitos.push(c.giro);
    } catch (e) {
      // Restrição UNIQUE do código: outro giro já usa este código (chance desprezível)
      if (/UNIQUE/i.test(e.message)) resultado.cadastros.rejeitados.push({ giro: c.giro, motivo: 'código repetido' });
      else throw e;
    }
  }

  return json(resultado);
}
