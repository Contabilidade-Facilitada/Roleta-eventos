/* Protege os dados do painel com a senha única SENHA_ADMIN (segredo do Cloudflare Pages).
   O painel envia a senha no cabeçalho X-Senha-Admin, codificada com encodeURIComponent. */

import { senhaConfere } from '../../_lib/senha.js';
import { erro } from '../../_lib/resposta.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.SENHA_ADMIN) return erro(503, 'Senha do painel não configurada no servidor.');

  let senha = '';
  try { senha = decodeURIComponent(request.headers.get('X-Senha-Admin') || ''); } catch (e) { /* cabeçalho malformado */ }
  if (!(await senhaConfere(senha, env.SENHA_ADMIN))) return erro(401, 'Senha incorreta.');

  return context.next();
}
