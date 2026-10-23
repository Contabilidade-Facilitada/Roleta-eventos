// Prêmios aceitos pelo servidor. Mantenha as chaves iguais às de PREMIOS em assets/js/app.js.
// cupom: prefixo do código gerado para o ganhador; sem cupom, o prêmio não tem cadastro.
export const PREMIOS = {
  caneta:   { nome: 'Caneta', ganha: true },
  ecobag:   { nome: 'Ecobag', ganha: true },
  escola:   { nome: '1 mês de Escola Contábil grátis', ganha: true, cupom: 'EC1M' },
  desconto: { nome: '20% de desconto', ganha: true, cupom: 'CF20' },
  tente:    { nome: 'Tente outra vez', ganha: false }
};
