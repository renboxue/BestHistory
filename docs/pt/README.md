# BestHistory

<p align="center"><img src="../../assets/besthistory-icon.png" alt="BestHistory" width="112" /></p>
<p align="center"><strong>Transforme o histórico do navegador numa caixa de ferramentas de sites que você realmente consegue reencontrar.</strong></p>

<!-- BESTHISTORY_SEO_STEP27_SUMMARY_START -->
<p align="center">BestHistory é um gerenciador de histórico do navegador para Chrome e Chromium com foco em privacidade: ajuda a pesquisar histórico antigo, encontrar sites que você visitou e esqueceu e organizar o histórico por site, etiquetas, notas e títulos de páginas.</p>
<!-- BESTHISTORY_SEO_STEP27_SUMMARY_END -->

<p align="center">
[简体中文](../../README.md) · [繁體中文](../zh-TW/README.md) · [English](../en/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Español](../es/README.md) · Português · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Русский](../ru/README.md) · [العربية](../ar/README.md) · [हिन्दी](../hi/README.md) · [Bahasa Indonesia](../id/README.md) · [Türkçe](../tr/README.md) · [বাংলা](../bn/README.md) · [Tiếng Việt](../vi/README.md)
</p>

<p align="center"><a href="https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta"><strong>⬇️ Baixar Chrome Beta v0.1.0</strong></a> · <a href="INSTALL.md">Instalação</a> · <a href="../LANGUAGES.md">Documentação em 18 idiomas</a></p>

## Antes de tudo: por que o BestHistory existe

O BestHistory é uma ferramenta pequena que criei como desenvolvedor independente para resolver um problema que eu mesmo tinha todos os dias.

Eu encontrava um site ótimo, precisava dele novamente alguns dias depois e já não lembrava o nome. Às vezes só lembrava “vi isso em algum site”, mas não qual página. Com medo de nunca mais encontrar, eu mantinha abas e janelas abertas, fixava sites e salvava ainda mais coisas nos favoritos. Depois de um tempo havia histórico, abas fixadas, favoritos e dezenas de páginas que eu não queria fechar — e mesmo assim encontrar um site antigo continuava difícil.

Percebi que eu não queria apenas uma lista de histórico mais bonita.

Queria algo mais próximo da forma como eu realmente me lembro das coisas:

**posso esquecer o título da página e a data, mas geralmente lembro que tipo de site era e para que eu o usei.**

Foi daí que nasceu o BestHistory.

> **A ideia é permitir que você feche as abas que ficam abertas apenas por medo de nunca encontrá-las de novo.**  
> Quando precisar, o BestHistory deve ajudar você a voltar até elas.

O projeto ainda está no começo. Se ele resolver um problema que você também tem, isso já significa muito. E eu realmente quero ouvir o que funciona, o que incomoda e o que você gostaria que ele resolvesse depois.

<p align="center"><img src="../../assets/screenshots/home.webp" alt="BestHistory sites" width="100%" /></p>
<p align="center"><sub>De milhares de páginas para uma pergunta mais simples: “quais sites eu usei?”</sub></p>

---

## O que muda em relação ao histórico normal?

### 1. Primeiro os sites, não dezenas de milhares de páginas

O histórico tradicional coloca cada visita numa lista longa. Se você abrir muitas páginas no mesmo domínio, um único site pode dominar a tela.

O BestHistory agrupa primeiro por **site**. Você vê quais sites visitou recentemente, quais usa mais, quando foi a última visita e quais páginas específicas abriu dentro de cada site.

### 2. Diferentes formas de ordenar

- **Recentes**
- **Mais visitados**
- **Nome**
- **Fixados**
- estados separados como **Não organizados / Lixeira / Sites privados**

### 3. Suas próprias etiquetas

Um site pode ser “ferramenta” para alguém e “trabalho” para você. Também pode ser “design”, “IA” e “usar novamente” ao mesmo tempo.

O BestHistory permite **etiquetas personalizadas**, inclusive várias por site. O objetivo não é criar um sistema perfeito, mas deixar mais caminhos para reencontrar algo quando, meses depois, você só lembrar aproximadamente para que servia.

### 4. Linha do tempo que agrupa páginas do mesmo site

Às vezes ainda queremos lembrar: “o que eu estava vendo ontem à tarde?”

Na linha do tempo do BestHistory, páginas consecutivas do mesmo site ficam agrupadas e só são abertas quando você precisa dos detalhes.

<p align="center"><img src="../../assets/screenshots/timeline.webp" alt="Linha do tempo dobrável do BestHistory" width="100%" /></p>
<p align="center"><sub>As páginas do mesmo site ficam juntas, para que a linha do tempo pareça um percurso de navegação e não uma parede de títulos.</sub></p>

### 5. Uma descrição que só você precisa entender

O nome oficial de um site nem sempre me lembra para que eu o usei. Por isso você pode adicionar seu próprio nome, nota ou descrição:

> “O site que usei para transformar PDF em imagens”
>
> “A referência que encontrei para ilustrações infantis”
>
> “Aquela ferramenta para consultar preços antigos”

Essas palavras também entram na busca. Muitas vezes a sua própria descrição se aproxima mais da memória real do que o título oficial.

<p align="center"><img src="../../assets/screenshots/site-detail.webp" alt="Detalhes, etiquetas e notas do BestHistory" width="100%" /></p>

---

## Modo Privado: histórico que quero lembrar, mas não quero deixar à vista

Há sites que não queremos esquecer. Só não queremos que fiquem misturados ao histórico normal, visíveis para qualquer pessoa que use o navegador.

O **Modo Privado (Pro)** criptografa localmente URLs privadas, títulos e visitas. Eles só ficam visíveis depois que você digita a senha privada que definiu.

Se você autorizar explicitamente o BestHistory a rodar em janelas anônimas, ele também pode salvar essas visitas de forma criptografada. Elas não aparecem na lista normal e ficam ocultas enquanto o Modo Privado estiver bloqueado.

> **Os sites que não combinam com o histórico comum também podem ser lembrados, discretamente, pelo BestHistory.**

Os dados privados continuam no seu dispositivo. O servidor do BestHistory não armazena URLs privadas, títulos, histórico privado ou sua senha.

---

## Busca, fixados e Lixeira

A busca usa sites, domínios, etiquetas, notas e títulos de páginas. Mesmo que você esqueça o nome do site, lembrar algo que viu nele pode ser suficiente para reencontrá-lo.

Sites frequentes podem ser fixados. Sites que você não quer ver agora podem ir para a **Lixeira** sem serem apagados imediatamente; depois você pode restaurar ou excluir de vez.

Organizar o histórico não deveria obrigar você a tomar uma decisão permanente a cada clique. “Guardar de lado por enquanto” também é uma opção válida.

---

## Backup, restauração e migração entre navegadores

Os dados de organização do BestHistory ficam principalmente no dispositivo.

Um único arquivo `.bhbackup` permite mover e mesclar dados entre computadores, instalações, dispositivos e navegadores. A restauração usa uma mesclagem segura, não uma substituição cega de todo o estado atual.

Os dados do Modo Privado continuam criptografados no backup e exigem a senha original.

> Por enquanto, “sincronização entre navegadores” significa transferência e mesclagem via backup local. O BestHistory **não** envia todo o seu histórico para a nuvem para sincronização em tempo real.

Essa escolha é intencional: quero que o BestHistory seja primeiro uma ferramenta **local-first**.

---

## Privacidade, Free e Pro

O servidor do BestHistory não armazena seu histórico, URLs, títulos, etiquetas, notas, pesquisas, registros privados, chaves de criptografia nem o conteúdo de `.bhbackup`.

Se você entrar na conta, o servidor lida principalmente com autenticação e direitos Free / Trial / Pro. Veja [PRIVACY.md](PRIVACY.md).

Os principais recursos locais funcionam **sem login**. Durante o Beta, novas contas recebem atualmente **30 dias de teste Pro**. Hoje, o Modo Privado é o principal recurso Pro.

---

## Interface e documentação em 18 idiomas

<p align="center"><img src="../../assets/screenshots/languages.webp" alt="BestHistory em 18 idiomas" width="100%" /></p>

README, instalação, privacidade, FAQ, segurança, changelog e Release Note também existem nos 18 idiomas. Veja o [índice de idiomas](../LANGUAGES.md).

---

## Isto ainda é só o começo

O BestHistory nasceu porque eu mesmo tinha medo de fechar abas e depois nunca mais encontrar os sites.

Hoje ele já pode ajudar a recuperar sites depois que são fechados. Quero continuar trabalhando em torno desse mesmo problema: fechar abas com mais tranquilidade e organizar melhor os sites que realmente usamos, em vez de adicionar recursos só por adicionar.

Se o BestHistory ajudar você, eu agradeço uma ⭐ Star, um Issue quando algo falhar ou simplesmente uma mensagem contando como você gerencia histórico, favoritos e abas demais. Para feedback privado: **besthistory@126.com**.

Não coloque URLs privadas, senhas, histórico privado ou backups completos em Issues públicos.

---

## Instalação Beta

**[⬇️ BestHistory v0.1.0 Beta para Chrome](https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta)**

Por enquanto a instalação é manual: **Modo do desenvolvedor → Carregar sem compactação**. Consulte [INSTALL.md](INSTALL.md).

---

**O código-fonte da aplicação BestHistory é proprietário e não é publicado neste repositório.**

Versão atual: **v0.1.0 Beta** · [CHANGELOG.md](CHANGELOG.md)
