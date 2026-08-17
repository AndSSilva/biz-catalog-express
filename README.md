# Quick Order Catalog

Criar MVP de Web App de Catálogo com Pedido via WhatsApp

Quero criar um MVP de um aplicativo web de catálogo de produtos, com foco absoluto em uma experiência simples, rápida e extremamente boa no celular.

A maioria dos usuários acessará pelo smartphone, então o projeto deve ser mobile-first, mas também precisa ter uma ótima experiência em desktop.

O objetivo do MVP é simples:

Usuário acessa → visualiza produtos → adiciona produtos ao carrinho → confere o carrinho → finaliza → WhatsApp abre com a mensagem pronta contendo os produtos selecionados.

Não quero transformar isso em um e-commerce complexo. O WhatsApp será responsável pela negociação/fechamento do pedido.

1. Objetivo do produto

Criar um catálogo online onde o cliente consiga:

Entrar no site sem criar conta.

Visualizar os produtos disponíveis.

Ver foto, nome e descrição dos produtos.

Adicionar produtos ao carrinho.

Alterar quantidade dos produtos.

Remover produtos.

Limpar o carrinho inteiro.

Visualizar um resumo do pedido.

Clicar em "Finalizar pedido".

O sistema abrir o WhatsApp com uma mensagem automaticamente preenchida contendo os produtos selecionados.

Depois de finalizar/encaminhar o pedido para o WhatsApp, o carrinho deve ser limpo para evitar pedidos duplicados.

2. Experiência do cliente

Tela inicial / catálogo

A tela inicial deve ser extremamente simples.

Prioridade:

Produtos > facilidade de navegação > velocidade > estética.

Cada produto deve apresentar:

Foto

Nome/título

Descrição curta

Botão para adicionar ao carrinho

Indicador visual quando o produto já estiver no carrinho

Controle de quantidade quando aplicável

O layout deve ser pensado primeiro para telas de aproximadamente 360px–430px de largura.

No celular, os produtos podem aparecer em formato de cards.

Evitar excesso de informações, menus complexos, animações exageradas ou elementos que deixem a navegação pesada.

3. Design / UI

Quero um design moderno, limpo, elegante e profissional.

O resultado não deve parecer um sistema administrativo.

Para o cliente, deve parecer um catálogo comercial moderno.

Mobile-first

O celular é a prioridade absoluta.

Considerar:

Botões grandes o suficiente para toque.

Espaçamento adequado.

Tipografia legível.

Fotos com boa proporção.

Navegação com uma mão.

Carrinho facilmente acessível.

Evitar elementos pequenos.

Evitar menus difíceis de tocar.

Evitar pop-ups desnecessários.

Boa performance em internet móvel.

Desktop

No desktop, o catálogo deve aproveitar melhor a largura da tela, utilizando uma grade de produtos adequada.

O layout deve ser responsivo e não simplesmente "esticar" a versão mobile.

4. Carrinho

O carrinho é uma parte muito importante do MVP.

Deve permitir:

Visualizar todos os produtos selecionados.

Alterar quantidade.

Remover um produto.

Limpar todo o carrinho.

Voltar para o catálogo.

Finalizar pedido.

Mostrar claramente:

Quantidade total de itens no carrinho.

Também quero um indicador persistente do carrinho, principalmente no celular.

Por exemplo, um botão/barra inferior:

🛒 Carrinho — 5 itens

Esse botão deve ficar facilmente acessível durante a navegação.

5. Limpar carrinho

Implementar corretamente todos os estados relacionados ao carrinho.

O usuário deve conseguir:

Limpar manualmente

Ter um botão:

"Limpar carrinho"

Preferencialmente pedir confirmação caso exista mais de um produto, para evitar cliques acidentais.

Após finalizar pedido

Quando o usuário clicar em:

"Finalizar pedido"

o sistema deve:

Registrar o evento de conversão/pedido.

Montar a mensagem do WhatsApp.

Abrir o WhatsApp.

Limpar o carrinho localmente.

Atualizar a interface imediatamente.

O sistema não deve deixar os produtos antigos no carrinho depois da finalização.

Também considerar situações em que o usuário fecha o WhatsApp ou volta para o navegador.

6. WhatsApp

O pedido será finalizado através do WhatsApp.

O número de WhatsApp do negócio deve ser configurável, e não ficar hardcoded espalhado pelo código.

Exemplo de mensagem:

"Olá! Gostaria de fazer um pedido:

Produto A — 2 unidades

Produto B — 1 unidade

Produto C — 3 unidades

Total de itens: 6

Aguardo confirmação. Obrigado!"

A mensagem deve ser construída automaticamente com base no conteúdo atual do carrinho.

O sistema deve utilizar uma URL de WhatsApp corretamente codificada para que acentos, espaços, quebras de linha etc. funcionem corretamente.

O número do WhatsApp deve ser configurável pelo administrador ou através de configuração segura da aplicação.

7. Importante: não precisa de cadastro para o cliente

O cliente NÃO deve precisar:

Criar conta.

Fazer login.

Informar e-mail.

Criar senha.

Confirmar telefone.

O fluxo deve ser:

Entrou → escolheu → carrinho → WhatsApp.

Quanto menos fricção, melhor.

O carrinho pode ser persistido localmente no navegador para evitar que o usuário perca a seleção ao navegar entre as páginas.

8. Área administrativa

Preciso de uma área separada para o dono do negócio.

A área administrativa deve exigir autenticação.

O administrador poderá:

Produtos

Adicionar produto.

Editar produto.

Remover/desativar produto.

Alterar foto.

Alterar título.

Alterar descrição.

Definir se o produto está ativo ou não.

Reordenar os produtos manualmente.

O catálogo público deve respeitar exatamente a ordem definida pelo administrador.

9. Cadastro de produto

O cadastro deve ser simples.

Campos mínimos:

Foto

Título

Descrição

Status: ativo/inativo

Ordem de exibição

Não adicionar campos desnecessários no MVP.

Se houver necessidade de preço, estoque, categorias, variantes etc., estruturar o sistema de maneira que isso possa ser adicionado posteriormente, mas não implementar complexidade desnecessária agora.

10. IA para criação dos produtos

Quero uma funcionalidade simples utilizando IA para ajudar o administrador a cadastrar produtos.

No cadastro do produto, o administrador pode informar algo como:

"Camisa masculina preta, algodão, manga curta, modelo básico."

E clicar em:

"Gerar com IA"

A IA deve sugerir:

Título do produto

Descrição curta

Opcionalmente uma descrição um pouco mais comercial

O administrador deve poder editar o resultado antes de salvar.

A IA NÃO deve publicar automaticamente o produto.

O administrador sempre terá a palavra final.

Essa funcionalidade deve ser implementada de forma desacoplada, para que o provedor/modelo de IA possa ser alterado posteriormente.

11. Analytics / produtos mais selecionados

Preciso que o administrador consiga visualizar quais produtos estão sendo mais selecionados.

O gatilho principal para contabilizar uma conversão é:

quando o usuário clicar em "Finalizar pedido" e o sistema iniciar o fluxo para o WhatsApp.

Nesse momento, registrar os produtos presentes no carrinho.

Preciso conseguir visualizar na área administrativa algo como:

Produtos mais selecionados

Produto A — 152 seleções

Produto B — 98 seleções

Produto C — 76 seleções

Também seria interessante mostrar:

Total de pedidos iniciados

Total de itens selecionados

Produtos mais selecionados

Últimos pedidos/conversões

Não é necessário construir um sistema avançado de BI.

O objetivo é apenas dar ao dono uma visão rápida do que os clientes estão mais interessados em comprar.

12. Métrica importante

Não contar simplesmente quando o usuário adiciona um produto ao carrinho.

A métrica principal deve acontecer no momento em que o usuário:

clica em "Finalizar pedido".

Isso representa uma intenção muito mais forte de compra.

Se um pedido possui:

Produto A × 2

Produto B × 1

registrar:

1 pedido/conversão

Produto A: +2 seleções

Produto B: +1 seleção

Assim será possível entender tanto o número de pedidos quanto a quantidade de unidades selecionadas.

13. Dashboard administrativo

Criar um dashboard simples.

Exemplo:

Dashboard

Pedidos iniciados: 324

Itens selecionados: 1.284

Produto mais selecionado: Produto A

Produtos ativos: 48

E abaixo:

Produtos mais selecionados

ProdutoQuantidade Produto A152 Produto B98 Produto C76

Manter o dashboard simples e útil.

Não quero um painel administrativo cheio de gráficos desnecessários.

14. Gerenciamento da ordem dos produtos

O administrador precisa conseguir definir a ordem dos produtos.

Preferencialmente implementar drag-and-drop:

Produto A
Produto B
Produto C
Produto D

O administrador arrasta e define:

Produto C
Produto A
Produto D
Produto B

O catálogo público deve refletir essa ordem.

Se drag-and-drop aumentar muito a complexidade do MVP, utilizar controles simples de mover para cima/mover para baixo.

15. Estados e UX

Prestar muita atenção aos estados da aplicação.

Implementar corretamente:

Loading.

Produto sendo adicionado.

Produto já adicionado.

Carrinho vazio.

Carrinho com produtos.

Produto removido.

Carrinho limpo.

Erro ao carregar catálogo.

Erro ao salvar produto.

Erro no upload da imagem.

Erro na geração de IA.

Catálogo sem produtos.

Produto desativado.

Finalização do pedido.

A experiência deve parecer fluida.

Evitar que o usuário fique sem saber se uma ação funcionou.

Exemplo:

Ao clicar em "Adicionar":

✓ Adicionado ao carrinho

e atualizar o contador do carrinho imediatamente.

16. Performance

Como o público principal será mobile, performance é prioridade.

O projeto deve:

Otimizar imagens.

Utilizar lazy loading quando apropriado.

Evitar bibliotecas desnecessárias.

Evitar JavaScript pesado.

Carregar inicialmente apenas o necessário.

Ter boa performance em dispositivos móveis medianos.

Ser responsivo.

Ter boa acessibilidade.

Ter boa experiência em conexão 4G/5G e também conexões mais lentas.

17. Arquitetura

Quero uma arquitetura simples e preparada para crescer, mas sem overengineering.

Separar claramente:

Catálogo público.

Carrinho.

Área administrativa.

Produtos.

Autenticação do administrador.

Analytics/conversões.

Integração com WhatsApp.

Integração com IA.

Utilizar componentes reutilizáveis.

Manter o código organizado e fácil de manter.

Não criar funcionalidades que não foram solicitadas.

18. Segurança

A área administrativa deve ser protegida.

Um visitante comum não pode acessar funções administrativas apenas conhecendo a URL.

As operações administrativas precisam ser protegidas no backend, e não apenas escondendo botões no frontend.

Também proteger:

Upload de imagens.

Alteração/exclusão de produtos.

Configurações.

Credenciais.

Chaves da API de IA.

Nunca expor secrets ou API keys no frontend.

19. Responsividade

Testar pelo menos mentalmente/visualmente os seguintes cenários:

Mobile

360px

375px

390px

414px

430px

Desktop

1280px

1440px

1920px

O design deve continuar bonito e funcional em todos esses tamanhos.

20. PWA / experiência de aplicativo

Se for simples de implementar dentro da arquitetura escolhida, preparar o projeto para uma boa experiência de PWA no futuro.

Mas isso NÃO deve atrasar o MVP.

Não implementar funcionalidades complexas de aplicativo nativo.

21. SEO e compartilhamento

Como o catálogo será público, preparar o básico para:

Título da página.

Meta description.

Open Graph.

Favicon.

URL amigável.

Se alguém compartilhar o link do catálogo no WhatsApp, quero que ele tenha uma aparência profissional na prévia do link.

22. Escopo do MVP

É MUITO importante respeitar o escopo.

O MVP DEVE ter:

Catálogo público.

Visualização dos produtos.

Fotos.

Títulos.

Descrições.

Adicionar ao carrinho.

Alterar quantidade.

Remover produtos.

Limpar carrinho.

Carrinho persistente localmente.

Finalização via WhatsApp.

Limpeza automática do carrinho após iniciar a finalização.

Login administrativo.

CRUD de produtos.

Upload de fotos.

Ativar/desativar produtos.

Ordenação dos produtos.

Geração de título/descrição com IA.

Dashboard simples.

Contagem de produtos selecionados.

Contagem de pedidos iniciados.

Configuração do número de WhatsApp.

NÃO implementar neste primeiro momento:

Pagamento online.

Checkout próprio.

Cadastro de clientes.

Login de clientes.

Recuperação de senha para clientes.

Sistema de pedidos completo.

Estoque.

Cupons.

Frete.

Marketplace.

Avaliações.

Chat interno.

Notificações complexas.

Programa de fidelidade.

Sistema financeiro.

CRM completo.

A prioridade é colocar esse fluxo no ar rapidamente e validar o negócio.

23. Fluxo principal

O fluxo ideal deve ser:

CLIENTE
   ↓
Acessa catálogo
   ↓
Visualiza produtos
   ↓
Adiciona produtos
   ↓
Continua navegando
   ↓
Abre carrinho
   ↓
Confere produtos
   ↓
Ajusta quantidades
   ↓
Finaliza pedido
   ↓
Registra conversão
   ↓
Gera mensagem
   ↓
Abre WhatsApp
   ↓
Limpa carrinho


Administrador:

ADMIN
   ↓
Login
   ↓
Dashboard
   ├── Produtos
   │     ├── Adicionar
   │     ├── Editar
   │     ├── Remover
   │     ├── Ativar/Desativar
   │     └── Reordenar
   │
   ├── IA
   │     └── Gerar título/descrição
   │
   └── Analytics
         ├── Pedidos iniciados
         ├── Itens selecionados
         └── Produtos mais selecionados


24. Antes de começar a programar

Antes de escrever o código:

Analise os requisitos.

Escolha uma stack moderna e adequada para esse tipo de MVP.

Explique brevemente a stack escolhida e por quê.

Defina a estrutura de dados necessária.

Defina as principais páginas/telas.

Defina os componentes principais.

Defina como será feita a autenticação do administrador.

Defina como as imagens serão armazenadas.

Defina como será feita a integração com IA.

Defina como serão registradas as conversões.

Defina como será construída a URL/mensagem do WhatsApp.

Depois disso, implemente o projeto.

25. Critério principal de sucesso

O aplicativo precisa passar neste teste:

Um usuário que nunca viu o sistema deve conseguir entrar pelo celular e, sem nenhuma explicação, entender:

"Escolho os produtos → adiciono ao carrinho → finalizo → continuo a conversa no WhatsApp."

Se houver alguma funcionalidade ou decisão de design que deixe esse fluxo mais complicado, prefira a solução mais simples.

Mobile first. Simples. Rápido. Bonito. Fluido.

O objetivo não é criar o sistema mais completo possível.

O objetivo é criar um MVP extremamente bem executado para validar o modelo de negócio.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://biz-catalog-express.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2939f905-87cc-48e8-870f-d28bdc4c3054).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
