import { json, erro } from '../../../_lib/resposta.js';

const idValido = (v) => /^\d{1,12}$/.test(v);

// Marca ou desmarca o resgate do cupom: { "resgatado": true | false }
export async function onRequestPatch({ request, env, params, data }) {
  if (!idValido(params.id)) return erro(400, 'Cadastro inválido.');
  let corpo;
  try { corpo = await request.json(); } catch (e) { return erro(400, 'Corpo inválido.'); }
  if (typeof corpo.resgatado !== 'boolean') return erro(400, 'Informe "resgatado".');

  const r = corpo.resgatado
    ? await env.DB.prepare('UPDATE cadastros SET resgatado_em = ?, resgatado_por = ? WHERE id = ? AND resgatado_em IS NULL')
        .bind(Date.now(), data.usuario, params.id).run()
    : await env.DB.prepare('UPDATE cadastros SET resgatado_em = NULL, resgatado_por = NULL WHERE id = ?')
        .bind(params.id).run();

  const cadastro = await env.DB.prepare('SELECT id, resgatado_em, resgatado_por FROM cadastros WHERE id = ?').bind(params.id).first();
  if (!cadastro) return erro(404, 'Cadastro não encontrado.');
  return json({ ...cadastro, alterado: r.meta.changes > 0 });
}

// Exclui os dados pessoais do ganhador (pedido de exclusão, cadastro de teste etc.). O giro permanece.
export async function onRequestDelete({ env, params }) {
  if (!idValido(params.id)) return erro(400, 'Cadastro inválido.');
  const r = await env.DB.prepare('DELETE FROM cadastros WHERE id = ?').bind(params.id).run();
  if (!r.meta.changes) return erro(404, 'Cadastro não encontrado.');
  return json({ excluido: true });
}
