# Para o Claude da sessão local (no PC do Luis): como sincronizar com a sessão da nuvem

Leia isto inteiro antes de mexer em qualquer coisa. Depois, explique ao Luis em poucas linhas o que você fez.

## 1. O contexto
- O Luis trabalha com **duas sessões do Claude no mesmo projeto**:
  - **Sessão na nuvem** (claude.ai/code): roda num contêiner com uma cópia do repositório. Não acessa o PC, o Chrome nem o Google Flow.
  - **Você, a sessão local**: roda na pasta do projeto no PC do Luis. Tem o Chrome e o Flow.
- **O GitHub é o ponto de encontro**: `gomesluisfernando-afk/relogio-de-sol`, branches `main` e `v2-arthur`, que andam juntos.
  - Uma sessão não vê a conversa da outra. O que passa entre elas são os commits, o `CLAUDE.md` e os arquivos em `docs/`.
- A sessão da nuvem fez muita coisa nova e já enviou tudo ao GitHub. A pasta local ainda não tem isso.

## 2. Trazer o trabalho da nuvem para a pasta local
Rode, na pasta do projeto:

1. `git status`: veja o branch atual e se há alterações locais.
2. Se houver alterações locais ainda fora de commit, **não as descarte**: `git stash`.
3. `git pull origin main`, ou `git pull origin v2-arthur` se o branch local for o `v2-arthur`.
4. Se você fez o stash no passo 2: `git stash pop`. Se der conflito, mostre ao Luis o arquivo e as duas versões antes de escolher.
5. Confira com `git log --oneline -5`. Devem aparecer commits como:
   - "docs: roteiro das 49 imagens que faltam…"
   - "Mundo aberto: brilho (✦) como segunda moeda…"
6. Confira que existem `world.js`, `docs/imagens_faltando.md` e a seção "Mundo aberto" no `CLAUDE.md`.
7. Leia o `CLAUDE.md` de novo: ele mudou bastante.
8. Rode `node tools/check.mjs`. Tem que terminar em "tudo ok".

**Nunca** use `git reset --hard`, `git push --force` nem apague arquivos para "resolver" a sincronização.

`SUPER_MD_relogio_de_sol.md`, a pasta `hota/` e `.claude/` ficam só no PC, de propósito. O pull não mexe neles, e eles não devem ser versionados.

## 3. O que mudou na nuvem (resumo)
- **Toque:** diálogo só avança no botão ▶ e janela só fecha no FECHAR; joystick e A somem com diálogo ou janela aberta.
- **Letra:** sem sombra em lugar nenhum, e 15% maior no celular (menos nos diálogos).
- **Economia:** relatório lido paga +$20; botas a $400; sabatina sem "quer outra?" (errou, volta para a primeira).
- **Moenda:** refeita à moda do Space Invaders.
- **Atualização:** o jogo recarrega sozinho quando sai versão nova.
- **Mundo aberto** (`world.js`):
  - brilho (✦) como segunda moeda;
  - 37 NPCs de curiosidade;
  - folclore e bestiário;
  - itens com raridade e inventário em abas;
  - comidas com efeito;
  - pousos de tropeiro;
  - 10 missões extras;
  - museu, antiquário, chapeleiro e doações;
  - Pergunta do Sineiro;
  - eventos do calendário.

## 4. Divisão de trabalho (para não dar conflito)
- **Você (local):** imagens e mídia (`img/`, `assets/`, `video/`, `audio/`), com o Google Flow no Chrome e o ElevenLabs.
- **Nuvem:** código e conteúdo (`game.js`, `world.js`, `minis.js`, `maps/`, `data/`).
- Sempre `git pull` ao começar e `git push` (no `main` e no `v2-arthur`) ao terminar.
- Ao publicar, suba o cache em `sw.js` (`relogio-v2-N`). Se der conflito nessa linha, fique com o número maior e some 1.

## 5. A próxima tarefa da sessão local
Gerar as imagens que faltam, seguindo **`docs/imagens_faltando.md`**: 48 retratos e o fundo da Moenda.
- Gere em lotes e mostre o primeiro ao Luis antes de seguir, para ele aprovar o estilo.
- **O retrato do Amado (parceiro real) só depois da autorização por escrito dele.**
- No fim: `node tools/check.mjs`, subir o cache em `sw.js`, commit, push no `main` e no `v2-arthur`.
