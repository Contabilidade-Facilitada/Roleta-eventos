/* Dados do painel. Os giros nunca mudam depois de gravados, então o painel pede só os
   novos (?desde=<último seq recebido>). Os cadastros mudam (resgate, exclusão) e vêm sempre completos. */

import { PREMIOS } from '../../_lib/premios.js';
import { json } from '../../_lib/resposta.js';

const LIMITE_GIROS = 5000;

export async function onRequestGet({ request, env }) {
  const desde = Math.max(0, parseInt(new URL(request.url).searchParams.get('desde'), 10) || 0);

  const [giros, cadastros] = await env.DB.batch([
    env.DB.prepare(
      'SELECT seq, momento, premio, evento, aparelho FROM giros WHERE seq > ? ORDER BY seq LIMIT ?'
    ).bind(desde, LIMITE_GIROS + 1),
    env.DB.prepare(
      `SELECT id, giro_id, premio, codigo, nome, email, telefone, marketing, evento, aparelho,
              criado_em, resgatado_em, resgatado_por
       FROM cadastros ORDER BY criado_em DESC`
    )
  ]);

  const linhas = giros.results.slice(0, LIMITE_GIROS);
  return json({
    premios: PREMIOS,
    // Formato compacto: [seq, momento, premio, evento, aparelho]
    giros: linhas.map((g) => [g.seq, g.momento, g.premio, g.evento, g.aparelho]),
    mais: giros.results.length > LIMITE_GIROS,
    cadastros: cadastros.results
  });
}
