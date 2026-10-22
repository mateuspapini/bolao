# Bolão Maurício Papini

Site do bolão da família Papini: classificação, evolução rodada a rodada, mapa de pontos,
palpites de cada rodada e página de cada participante.

Site 100% estático (Next.js com `output: "export"`): o build gera a pasta `out/`, que pode ser
hospedada na Vercel ou em qualquer hospedagem comum.

## Atualizar depois de uma rodada (enquanto o MVP ainda lê a planilha)

1. Daniel preenche a planilha como sempre e salva o `.xlsx`.
2. Importar os dados:
   ```bash
   python scripts/import_xlsx.py "C:\Users\conta\Downloads\Planilha Bolão Papini 2026 [OFICIAL].xlsx"
   ```
   O script gera `data/bolao.json`. Os pontos de cada jogo são recalculados pela regra (a planilha
   pode ter erro de digitação); o script lista as células onde a planilha está diferente, para o Daniel
   corrigir lá também. Bônus especiais (o "+N" somado na aba *Tabela por rodada*) são detectados sozinhos.
3. Gerar o site: `npm run build` (sai em `out/`).
4. Publicar (veja abaixo).

## Área do Daniel (`/daniel/`)

Página fora do menu (e fora do Google) para tirar o trabalho braçal de cada rodada:

1. **Rodada e jogos**: já vem com os jogos que estão na planilha (rodadas 32 a 38). O Daniel pode
   colar ali a mensagem que ele manda no grupo ("Cartola 🎩 Maurício Papini 2026 … 20h00 - Mirassol x
   Internacional"): os jogos são lidos dela e o botão "Copiar mensagem da rodada" passa a copiar ela igualzinha.
   As respostas no mesmo padrão ("20h00 - Mirassol 3x2 Internacional") são lidas sem precisar de ajuste.
2. **Colar os palpites**: selecione as mensagens no WhatsApp, copie e cole. O site reconhece quem
   mandou pelo nome do WhatsApp, entende apelidos dos times (Galo, SP, Inter, Mengão…), palpites
   com o visitante escrito primeiro e até só os placares em ordem. Quando não reconhece o nome,
   pergunta uma vez e passa a lembrar.
3. **Conferir e lançar placares**: grade editável com todos os palpites; ao preencher o placar dos
   jogos, os pontos aparecem pela regra (5/1, Galo 7/3). Mostra quem ainda não mandou e copia um lembrete.
4. **Levar para a planilha**: copia palpites **e pontos** num bloco só para colar na célula G da
   1ª linha da rodada, e os placares para colar na coluna C. Os pontos deixam de ser digitados à mão.
5. **Resultado no grupo**: mensagem pronta com o rei da rodada, os pontos da rodada e a
   classificação geral (com quem subiu/caiu), com botão para abrir direto no WhatsApp.

Tudo fica salvo no navegador de quem está usando (rodada por rodada), então o Daniel pode colar os
palpites aos poucos ao longo da semana. Por enquanto não vai para nenhum servidor: o site continua
lendo a planilha depois que a rodada é lançada nela.

## Fotos dos participantes

As fotinhas ficam em `public/fotos/<id>.webp` (ex.: `marcos.webp`, `natalia.webp`), recortadas em
quadrado de 256 px. Para trocar ou incluir alguém, coloque as fotos originais numa pasta com o nome da
pessoa no arquivo e rode:

```bash
npm run fotos -- "C:\Users\conta\Downloads\imagens-bolao"
```

Se o rosto ficar fora do centro, ajuste o foco daquela pessoa em `FOCO` no `scripts/fotos.mjs`.
Quem não tiver foto aparece com a inicial do nome.

## Rodar no computador

```bash
npm install
npm run dev
```

Abre em http://localhost:3000.

## Publicar em bolao.mapasolucoesdigitais.com.br

**Opção A: Vercel (recomendada, grátis)**
1. Suba esta pasta para um repositório no GitHub e importe em vercel.com (framework: Next.js).
2. Em *Settings → Domains*, adicione `bolao.mapasolucoesdigitais.com.br`.
3. No DNS do domínio, crie um registro `CNAME` com nome `bolao` apontando para `cname.vercel-dns.com`.
4. A cada `git push`, a Vercel publica sozinha.

**Opção B: hospedagem atual do domínio (cPanel/FTP)**
1. Crie o subdomínio `bolao` no painel da hospedagem.
2. Envie o conteúdo da pasta `out/` para a pasta do subdomínio.

## Estrutura

- `scripts/import_xlsx.py` lê a aba *Rodadas* da planilha e gera `data/bolao.json`.
- `lib/bolao.ts` calcula a classificação, as posições por rodada, o rei da rodada e as estatísticas.
- `app/` contém as páginas: `/`, `/rodadas/`, `/rodadas/[n]/`, `/participante/[id]/`, `/regras/`.
- `components/` contém o gráfico de evolução, o mapa de calor e o indicador de subida/queda.
