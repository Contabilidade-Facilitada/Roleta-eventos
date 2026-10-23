<div align="center">

<img src="assets/img/logo-cf-icone.png" alt="Contabilidade Facilitada" width="88">

# Roleta da Sorte

**Roleta de prêmios interativa do Contabilidade Facilitada para estandes e eventos presenciais.**

Abra o `index.html`, aperte a barra de espaço e deixe a sorte trabalhar.
Funciona no notebook, no tablet e no celular, sem instalação.

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
- **Deslizar com o dedo:** em telas de toque, o participante segura a roda, arrasta e solta. Ela gira no sentido do movimento.
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

1. Abra **https://roletacf.contabilidadefacilitada.com** no **Google Chrome** ou no **Microsoft Edge**. Para enviar giros e cadastros ao painel `/admin`, a roleta precisa ser aberta por esse endereço, e não pelo arquivo `index.html`.
2. Pressione `P` e configure os **pesos** e o **estoque** de cada prêmio.
3. Em **Envio ao painel**, preencha o **evento**, o nome do **aparelho** e a **chave do aparelho**.
4. Pressione `F` para entrar em tela cheia.
5. Faça um giro de teste. Isso também libera o som, que o navegador bloqueia até a primeira interação. O giro de teste também é enviado ao painel; para separá-lo, use um evento chamado "Teste" nesse giro.
6. No painel do operador, clique em **Zerar histórico** para descartar o giro de teste do histórico local.
7. Ao final do evento, confira em **Envio ao painel** se a mensagem é "Tudo enviado." e clique em **Exportar CSV** para guardar uma cópia do histórico local.

> **Importante:** configurações, histórico e a fila de envio ficam salvos no navegador do aparelho. Use sempre o mesmo navegador e não abra a página em janela anônima.

## Cadastro do ganhador de cupom

Quando sai um prêmio com cupom (**20% de desconto** ou **1 mês de Escola Contábil grátis**), o cartão de resultado mostra um formulário para o operador preencher com **nome**, **e-mail** e **telefone** do ganhador, além da opção de aceitar comunicações do Contabilidade Facilitada.

- **Gerar cupom** cria um código único, por exemplo `CF20-K7Q2X9MP`, e o mostra na tela. O código também fica no histórico do painel do operador.
- **Pular cadastro** fecha o resultado sem registrar o ganhador.
- Com o formulário aberto, a barra de espaço, o `Esc` e o toque fora do cartão não fecham o resultado, para que nenhum cadastro se perca por engano.
- Os prefixos dos códigos ficam no campo `cupom` de `PREMIOS`, em [`assets/js/app.js`](assets/js/app.js), e devem ser iguais aos de [`functions/_lib/premios.js`](functions/_lib/premios.js).
- O link da política de privacidade aparece no formulário quando a constante `POLITICA_PRIVACIDADE` de [`assets/js/app.js`](assets/js/app.js) estiver preenchida.

**Envio ao servidor.** Cada giro e cada cadastro entra numa fila guardada no aparelho e é enviado ao servidor a cada 20 segundos, logo após cada giro e quando a internet volta. Sem conexão, a roleta continua funcionando e envia tudo depois. O reenvio não duplica registros. A situação do envio aparece no painel do operador.

## Painel `/admin`

Em **https://roletacf.contabilidadefacilitada.com/admin**, protegido por login com e-mail `@contabilidadefacilitada.com`:

- **Filtros** de período (hoje, 7 dias, 30 dias, tudo), evento e aparelho, que valem para todos os números da página.
- **Indicadores:** giros, prêmios distribuídos, cupons emitidos (e o percentual dos cupons sorteados que foram cadastrados) e cupons resgatados.
- **Giros ao longo do tempo**, por hora (até 48 horas de dados) ou por dia, com os valores ao passar o mouse e a opção **Ver em tabela**.
- **Resultados por prêmio**, com quantidade e percentual.
- **Ganhadores de cupom:** busca por nome, e-mail, telefone ou código; filtros por prêmio e situação; **Marcar resgate** (registra data, hora e quem marcou); **Excluir**, para pedidos de exclusão de dados ou cadastros de teste.
- **Exportar ganhadores** e **Exportar giros** em CSV, respeitando os filtros.
- Atualização automática a cada 30 segundos enquanto a aba estiver aberta.

## Configuração na Cloudflare

Feita uma única vez, por quem administra a conta da Cloudflare. Os comandos usam o Wrangler, a ferramenta de linha de comando da Cloudflare (`npx wrangler@4 ...`).

1. **Banco de dados.** Rode `npx wrangler@4 login` e depois `npx wrangler@4 d1 create roleta-cf`. Copie o `database_id` exibido para o [`wrangler.toml`](wrangler.toml).
2. **Tabelas.** Rode `npx wrangler@4 d1 migrations apply roleta-cf --remote`.
3. **Chave dos aparelhos.** No painel da Cloudflare, em **Workers & Pages › (projeto da roleta) › Settings › Variables and Secrets**, crie o segredo `CHAVE_OPERADOR` com uma senha longa. É ela que se digita em **Chave do aparelho** no painel do operador.
4. **Login do `/admin`.** Em **Zero Trust › Access › Applications**, crie uma aplicação **Self-hosted** com dois destinos: `roletacf.contabilidadefacilitada.com/admin` e `roletacf.contabilidadefacilitada.com/api/admin`. Crie uma política **Allow** com a regra **Emails ending in** `@contabilidadefacilitada.com`.
5. **Variáveis do Access.** No [`wrangler.toml`](wrangler.toml), preencha `ACCESS_EQUIPE` com o domínio da equipe (em **Zero Trust › Settings › Custom Pages**, no formato `https://<equipe>.cloudflareaccess.com`) e `ACCESS_AUD` com o **Application Audience (AUD) Tag** da aplicação criada no passo 4.
6. Envie as alterações para a branch `main`. O Cloudflare Pages publica sozinho.

> **Atenção:** com o `wrangler.toml` no repositório, as ligações e variáveis definidas nele substituem as do painel da Cloudflare. Não publique com os valores `PREENCHER`. Sem o Access configurado, o `/admin` recusa todos os acessos; a roleta continua funcionando e guarda a fila no aparelho.

O servidor confere o login do Access em toda requisição do painel, inclusive pelo endereço `*.pages.dev`, e só aceita alterações feitas a partir do próprio painel.

**Desenvolvimento local.** Copie `.dev.vars.example` para `.dev.vars`, rode `npx wrangler@4 d1 migrations apply roleta-cf --local` e depois `npx wrangler@4 pages dev .`. Em `localhost`, a variável `ACESSO_LOCAL_SEM_LOGIN=sim` libera o `/admin` sem login. O Wrangler local depende do Microsoft Visual C++ Redistributable no Windows.

## Atalhos

| Tecla | Ação |
|---|---|
| `Espaço` ou `Enter` | Gira a roleta; com o resultado aberto, fecha o resultado |
| `F` | Liga e desliga a tela cheia |
| `M` | Liga e desliga o som |
| `P` | Abre e fecha o painel do operador |
| `Esc` | Fecha o resultado ou o painel |

Também é possível girar clicando no botão **GIRAR** ou no logotipo no centro da roda, ou arrastando a roda com o mouse.

## Tablet e celular

O layout se adapta sozinho ao tamanho e à orientação da tela.

| Modo | Como fica |
|---|---|
| **Celular em pé** | Logo e título no topo, roda no centro ocupando a largura, botão **GIRAR** embaixo, ao alcance do polegar |
| **Celular deitado** | Texto à esquerda e roda à direita, em versão compacta |
| **Tablet em pé** | Igual ao celular, com a lista de prêmios acima da roda nos tablets maiores |
| **Tablet deitado** | Igual ao notebook, com a lista de prêmios em uma coluna |

<div align="center">
<img src="docs/celular.png" alt="Celular em pé" width="200">
<img src="docs/tablet.png" alt="Tablet em pé" width="300">
<img src="docs/celular-deitado.png" alt="Celular deitado" width="420">
</div>

**Recursos de toque**

- Segure a roda, arraste e solte para girar. Um toque parado não dispara o giro.
- Tocar no logotipo do centro ou no botão **GIRAR** também gira.
- No Android, o aparelho vibra a cada pino e no resultado. O botão de som também desliga a vibração.
- O painel do operador abre pelo ícone de engrenagem no canto superior direito.
- No iPhone o navegador não permite tela cheia, por isso o botão de tela cheia some. Use **Compartilhar › Adicionar à Tela de Início**: a roleta passa a abrir como um aplicativo, sem barras do navegador. No Android, use **Menu › Adicionar à tela inicial**.

**Como abrir no tablet ou no celular**

Tablets e celulares não abrem bem o `index.html` direto da memória do aparelho, por isso a roleta precisa estar em um endereço web. Escolha uma das opções:

1. **Hospedagem estática** (GitHub Pages, Netlify, Vercel ou o servidor do site): basta publicar a pasta como está. Este repositório é privado; no GitHub Pages, a publicação de repositórios privados depende do plano da organização, e o site publicado fica acessível a quem tiver o endereço.
2. **Rede local do evento:** no notebook, dentro da pasta do projeto, rode `npx serve .` (ou `python -m http.server 8080`) e abra no tablet o endereço mostrado, por exemplo `http://192.168.0.10:8080`. Notebook e tablet precisam estar na mesma rede Wi-Fi.

Depois que a página carrega, a roleta continua funcionando mesmo se a internet cair, desde que a página não seja recarregada.

> **Atenção:** pesos, estoque e histórico ficam salvos em cada aparelho. Se usar mais de um tablet, configure cada um com um nome de aparelho diferente. O painel `/admin` junta os giros e cadastros de todos eles.

## Painel do operador

<img src="docs/painel-operador.png" alt="Painel do operador" width="900">

| Campo | Como funciona |
|---|---|
| **Peso** | Chance relativa de cada resultado. Com todos em 20, cada um tem 20% de chance. Com Caneta em 40 e os demais em 15, a caneta passa a ter 40%. |
| **Chance** | Percentual calculado automaticamente a partir dos pesos. |
| **Estoque** | Quantidade disponível. Em branco significa ilimitado. A cada prêmio sorteado, o estoque diminui em 1. Ao chegar a zero, o prêmio deixa de ser sorteado e aparece como **Esgotado** na roda e na lista lateral. |
| **Saídas** | Quantas vezes o resultado saiu desde o último histórico zerado. |

Botões disponíveis:

- **Exportar CSV**: baixa o histórico deste aparelho (data, hora, resultado e código do cupom), pronto para abrir no Excel.
- **Enviar agora**: tenta enviar na hora o que está na fila de envio.
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
├── manifest.webmanifest    Permite instalar na tela inicial de tablets e celulares
├── assets/
│   ├── css/style.css       Layout, animações, tema e adaptação a cada tela
│   ├── js/app.js           Sorteio, animação, gestos, sons, confete e painel
│   ├── fonts/              Sora e Montserrat (locais, para uso sem internet)
│   └── img/                Logotipos e ícones do aplicativo
├── admin/                  Painel /admin (página, estilos e scripts)
├── functions/              Rotas do servidor (Cloudflare Pages Functions)
│   ├── api/sincronizar.js  Recebe giros e cadastros dos aparelhos
│   ├── api/admin/          Dados do painel, resgate e exclusão de cadastros
│   ├── admin/              Proteção da página /admin
│   └── _lib/               Prêmios aceitos, verificação do login e respostas
├── migrations/             Tabelas do banco de dados D1
├── wrangler.toml           Configuração do Cloudflare Pages e do banco
└── docs/                   Capturas de tela deste README
```

## Tecnologia

- HTML, CSS e JavaScript puros, sem bibliotecas nem etapa de build.
- Servidor em Cloudflare Pages Functions, banco de dados Cloudflare D1 e login do painel pelo Cloudflare Access.
- Gráficos do painel desenhados em SVG, sem bibliotecas.
- Roda desenhada em `<canvas>`, com nitidez ajustada à densidade de pixels da tela.
- Sons sintetizados com a Web Audio API, sem arquivos de áudio.
- Identidade visual do Contabilidade Facilitada: azul `#102850`, laranja `#FF9933`, fontes Sora e Montserrat.
- Gestos com Pointer Events (toque, caneta e mouse) e vibração com a Vibration API.
- Layout responsivo com *container queries*: no modo em pé, a roda ocupa todo o espaço livre, seja qual for a altura da tela.
- Testado em celulares de 360×740 a 430×932 (em pé e deitados), tablets de 768×1024 e 820×1180 (em pé e deitados) e notebooks de 1366×768 e 1920×1080.

---

<div align="center">
<sub>Feito pelo time do <strong>Contabilidade Facilitada</strong>.</sub>
</div>
