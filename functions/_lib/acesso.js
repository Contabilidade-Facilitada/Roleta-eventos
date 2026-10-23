/* Confere o token que o Cloudflare Access anexa a cada requisição já autenticada.
   O Access bloqueia quem não fez login antes de chegar aqui; esta verificação garante que
   ninguém alcance os dados por outro caminho (por exemplo, pelo endereço *.pages.dev). */

import { erro } from './resposta.js';

let cacheChaves = { equipe: '', chaves: null, ate: 0, buscadoEm: 0 };

function base64url(texto) {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// renovar: busca de novo (a Cloudflare troca as chaves periodicamente), no máximo uma vez por minuto
async function chavesPublicas(equipe, renovar = false) {
  const emCache = cacheChaves.equipe === equipe && cacheChaves.chaves;
  if (emCache && Date.now() < cacheChaves.ate && (!renovar || Date.now() - cacheChaves.buscadoEm < 60000)) {
    return cacheChaves.chaves;
  }
  const r = await fetch(`${equipe}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error(`certificados do Access indisponíveis (${r.status})`);
  const { keys } = await r.json();
  cacheChaves = { equipe, chaves: keys, ate: Date.now() + 60 * 60 * 1000, buscadoEm: Date.now() };
  return keys;
}

// Devolve o e-mail do usuário autenticado, ou null se o token não for válido
async function validarToken(token, env) {
  const equipe = String(env.ACCESS_EQUIPE || '').replace(/\/+$/, '');
  const audiencias = String(env.ACCESS_AUD || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!/^https:\/\//.test(equipe) || !audiencias.length) throw new Error('ACCESS_EQUIPE e ACCESS_AUD não configurados');

  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const cabecalho = JSON.parse(new TextDecoder().decode(base64url(partes[0])));
  const dados = JSON.parse(new TextDecoder().decode(base64url(partes[1])));
  if (cabecalho.alg !== 'RS256') return null;

  let jwk = (await chavesPublicas(equipe)).find((k) => k.kid === cabecalho.kid);
  if (!jwk) jwk = (await chavesPublicas(equipe, true)).find((k) => k.kid === cabecalho.kid);
  if (!jwk) return null;
  const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valido = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', chave, base64url(partes[2]), new TextEncoder().encode(`${partes[0]}.${partes[1]}`));
  if (!valido) return null;

  const agora = Date.now() / 1000;
  const aud = Array.isArray(dados.aud) ? dados.aud : [dados.aud];
  if (dados.iss !== equipe || !aud.some((a) => audiencias.includes(a))) return null;
  if (typeof dados.exp !== 'number' || dados.exp < agora) return null;
  if (typeof dados.nbf === 'number' && dados.nbf > agora + 60) return null;
  return typeof dados.email === 'string' ? dados.email.toLowerCase() : null;
}

function lerCookie(request, nome) {
  const cookies = request.headers.get('Cookie') || '';
  const par = cookies.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${nome}=`));
  return par ? par.slice(nome.length + 1) : '';
}

// Middleware do Pages: só deixa passar e-mails autenticados do domínio da empresa
export async function exigirAdmin(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Desenvolvimento local (wrangler pages dev): sem Access, mediante variável explícita
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  let email;
  if (local && env.ACESSO_LOCAL_SEM_LOGIN === 'sim') {
    email = 'desenvolvimento@localhost';
  } else {
    const token = request.headers.get('Cf-Access-Jwt-Assertion') || lerCookie(request, 'CF_Authorization');
    if (!token) return erro(401, 'Login necessário.');
    try {
      email = await validarToken(token, env);
    } catch (e) {
      console.error('Falha ao validar o login do Access:', e.message);
      return erro(503, 'Login indisponível. Verifique a configuração do Cloudflare Access.');
    }
    const dominio = String(env.DOMINIO_ADMIN || '').toLowerCase();
    if (!email || !dominio || !email.endsWith(`@${dominio}`)) return erro(403, 'Acesso não autorizado.');
  }

  // Alterações só a partir do próprio painel (proteção contra requisições forjadas por outros sites)
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origem = request.headers.get('Origin');
    if (origem !== url.origin) return erro(403, 'Origem não autorizada.');
  }

  context.data.usuario = email;
  return context.next();
}
