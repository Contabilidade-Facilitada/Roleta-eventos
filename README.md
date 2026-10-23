<div align="center">

<img src="assets/img/logo-cf-icone.png" alt="Contabilidade Facilitada" width="88">

# Roleta da Sorte

**Roleta de prêmios interativa do Contabilidade Facilitada para estandes e eventos presenciais.**

Abra o `index.html`, aperte a barra de espaço e deixe a sorte trabalhar.
Funciona sem internet, sem instalação e sem servidor.

<img src="docs/tela-inicial.png" alt="Tela inicial da roleta" width="900">

</div>

---

## Prêmios

| Resultado | Observação |
|---|---|
| 🖊️ **Caneta** | Brinde físico |
| 👜 **Ecobag** | Brinde físico |
| 🎓 **1 mês de Escola Contábil grátis** | Acesso à Escola Contábil |
| 🏷️ **20% de desconto** | Não cumulativo |
| 🔄 **Tente outra vez** | O participante gira de novo na hora |

Cada resultado ocupa duas fatias da roda (dez fatias no total). A chance real de cada um é definida no painel do operador, e não pelo tamanho da fatia.

## Experiência

- **Giro:** a roda recua antes de girar, desacelera aos poucos e cria suspense nos últimos pinos.
- **Ponteiro:** balança a cada pino que passa, com um estalo sonoro.
- **Lâmpadas no aro:** piscam devagar em espera, correm em sequência durante o giro e piscam juntas quando sai um prêmio.
- **Holofote:** a fatia sorteada fica iluminada e o restante da roda escurece.
- **Prêmio:** cartão animado, confete com as cores da marca e fanfarra.
- **Tente outra vez:** a roda treme e um botão de "Girar de novo" aparece.
- **Modo de atração:** enquanto ninguém joga, a roda gira devagar para chamar a atenção de quem passa.

<div align="center">
<img src="docs/resultado-premio.png" alt="Resultado com prêmio" width="440">
<img src="docs/resultado-tente.png" alt="Resultado Tente outra vez" width="440">
</div>

## Checklist para o dia do evento

1. Copie a pasta inteira para o notebook (ou clone este repositório).
2. Abra o `index.html` no **Google Chrome** ou no **Microsoft Edge**.
3. Pressione `P` e configure os **pesos** e o **estoque** de cada prêmio.
4. Pressione `F` para entrar em tela cheia.
5. Faça um giro de teste. Isso também libera o som, que o navegador bloqueia até a primeira interação.
6. No painel, clique em **Zerar histórico** para descartar o giro de teste.
7. Ao final do evento, clique em **Exportar CSV** para guardar o histórico.

> **Importante:** configurações e histórico ficam salvos no navegador do notebook. Use sempre o mesmo navegador e não abra a página em janela anônima.

## Atalhos

| Tecla | Ação |
|---|---|
| `Espaço` ou `Enter` | Gira a roleta; com o resultado aberto, fecha o resultado |
| `F` | Liga e desliga a tela cheia |
| `M` | Liga e desliga o som |
| `P` | Abre e fecha o painel do operador |
| `Esc` | Fecha o resultado ou o painel |

Também é possível girar clicando no botão **GIRAR** ou no logotipo no centro da roda.

## Painel do operador

<img src="docs/painel-operador.png" alt="Painel do operador" width="900">

| Campo | Como funciona |
|---|---|
| **Peso** | Chance relativa de cada resultado. Com todos em 20, cada um tem 20% de chance. Com Caneta em 40 e os demais em 15, a caneta passa a ter 40%. |
| **Chance** | Percentual calculado automaticamente a partir dos pesos. |
| **Estoque** | Quantidade disponível. Em branco significa ilimitado. A cada prêmio sorteado, o estoque diminui em 1. Ao chegar a zero, o prêmio deixa de ser sorteado e aparece como **Esgotado** na roda e na lista lateral. |
| **Saídas** | Quantas vezes o resultado saiu desde o último histórico zerado. |

Botões disponíveis:

- **Exportar CSV**: baixa o histórico (data, hora e resultado), pronto para abrir no Excel.
- **Zerar histórico**: apaga os giros registrados.
- **Restaurar padrão**: volta pesos e estoques ao padrão, sem apagar o histórico.

O sorteio usa o gerador criptográfico do navegador (`crypto.getRandomValues`), e o resultado é definido antes de a roda começar a girar. A animação apenas leva a roda até a fatia sorteada, sempre longe das divisórias, para evitar dúvida sobre onde ela parou.

## Personalização

Tudo o que muda com frequência fica no início de [`assets/js/app.js`](assets/js/app.js).

**Textos, cores e ícones dos prêmios:** objeto `PREMIOS`.

```js
caneta: {
  nome: 'Caneta',                         // nome no painel e na lista lateral
  linhas: [['CANETA', 1.05, 900]],        // texto na fatia: [texto, escala, peso da fonte]
  icone: 'caneta',
  cor: '#ff9933', texto: '#102850', destaque: '#102850',
  ganha: true, controlaEstoque: true,
  titulo: 'Caneta',                       // título do cartão de resultado
  subtitulo: 'Você ganhou uma caneta do Contabilidade Facilitada!',
  nota: 'Procure a nossa equipe para retirar o seu prêmio.'
}
```

**Ordem das fatias:** constante `ORDEM`, no sentido horário a partir do topo.

**Pesos e estoques iniciais:** função `estadoPadrao()`. Para valer em um notebook que já usou a roleta, clique em **Restaurar padrão** no painel.

**Cores gerais e tamanho da roda:** variáveis no início de [`assets/css/style.css`](assets/css/style.css).

## Estrutura

```
Roleta-eventos/
├── index.html              Página principal
├── assets/
│   ├── css/style.css       Layout, animações e tema
│   ├── js/app.js           Sorteio, animação, sons, confete e painel
│   ├── fonts/              Sora e Montserrat (locais, para uso sem internet)
│   └── img/                Logotipos do Contabilidade Facilitada e da Escola Contábil
└── docs/                   Capturas de tela deste README
```

## Tecnologia

- HTML, CSS e JavaScript puros, sem bibliotecas nem etapa de build.
- Roda desenhada em `<canvas>`, com nitidez ajustada à densidade de pixels da tela.
- Sons sintetizados com a Web Audio API, sem arquivos de áudio.
- Identidade visual do Contabilidade Facilitada: azul `#102850`, laranja `#FF9933`, fontes Sora e Montserrat.
- Layout pensado para notebooks na horizontal (testado em 1366×768 e 1920×1080), com adaptação para telas na vertical.

---

<div align="center">
<sub>Feito pelo time do <strong>Contabilidade Facilitada</strong>.</sub>
</div>
