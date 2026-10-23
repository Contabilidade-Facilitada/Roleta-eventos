// Compara a senha recebida com a configurada pelo resumo SHA-256 de ambas,
// em tempo constante e sem revelar o tamanho da senha.
async function resumo(texto) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
}

export async function senhaConfere(recebida, esperada) {
  if (typeof recebida !== 'string' || typeof esperada !== 'string' || !esperada) return false;
  const [a, b] = await Promise.all([resumo(recebida), resumo(esperada)]);
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
  return dif === 0;
}
