# Icarus Server Kit

Painel web de administração para o **servidor dedicado do Icarus**, no estilo do
[7DaysToDie-ServerKit](https://github.com/IceCoffee1024/7DaysToDie-ServerKit).

- Mapa do mundo com a posição e a direção dos jogadores em tempo real
- Lista de jogadores (vida, ping, Steam ID, coordenadas)
- Teleporte: clique no mapa → "Teleportar fulano aqui" (a altura do chão é calculada no jogo), por coordenadas, até outro jogador ou trazendo outro jogador
- Inventário do jogador com ícones (barra rápida, mochila, equipamento, traje); clique num slot para remover
- Catálogo com **3.031 itens** em português, ícones e categorias, com busca; clique → escolha jogador e quantidade → dar item
- Curar, definir vida/fome/sede/oxigênio/stamina, dar XP, matar, limpar inventário, expulsar e banir
- Mensagem global do servidor, velocidade do tempo, comandos de console
- Log ao vivo: chat dos jogadores, entradas e saídas, ações dos admins

## Como funciona

```
 Navegador ──HTTP/SSE──► panel/server.js (Node.js) ◄──arquivos──► Mod Lua (UE4SS) dentro do IcarusServer
                         porta 8090                  ipc/          ue4ss/Mods/IcarusServerKit
```

- **mod/IcarusServerKit**: mod Lua para o [UE4SS](https://github.com/UE4SS-RE/RE-UE4SS), carregado dentro de
  `IcarusServer-Win64-Shipping.exe`. Ele chama as funções nativas do jogo (por exemplo
  `AIcarusController:OnServer_AddItem`, `UTeleportManagerSubsystem:TeleportPlayer_Transform`,
  `UNetworkProxyComponent:Cheat_*` e `AIcarusGameModeBase:KickPlayer`). A cada segundo grava `state.json` e executa os
  comandos que chegam por `commands.jsonl`.
- **panel/**: servidor web sem dependências (Node 18+) com login e a interface.
- **tools/extractor**: ferramenta em Rust que lê os `.pak` do jogo (Oodle/Zlib) e gera `panel/public/data`
  (itens, ícones, nomes em pt-BR e os tiles dos mapas de Olympus, Styx, Prometheus, Elysium e dos outposts).

## Instalação

1. **Feche o servidor dedicado.**
2. Abra o PowerShell **na pasta do servidor dedicado** (a que tem `IcarusServer.exe`). No Explorer: Shift + botão direito → "Abrir janela do PowerShell aqui".
3. Rode:
   ```powershell
   irm https://raw.githubusercontent.com/BirdRa1n/IcarusServerKit/main/setup.ps1 | iex
   ```
4. Inicie o servidor normalmente e depois rode `Start_Panel.bat`, que o instalador cria na pasta do servidor. Na primeira
   vez, o console mostra a **senha do usuário `admin`**.
5. Abra `http://localhost:8090`.

O instalador:
- baixa o kit para `<servidor>\IcarusServerKit` (painel e ferramentas);
- instala o [UE4SS](https://github.com/UE4SS-RE/RE-UE4SS) em `Icarus\Binaries\Win64` (mantém um UE4SS que já esteja instalado);
- copia e ativa o mod em `ue4ss\Mods\IcarusServerKit`;
- procura o **jogo Icarus** (bibliotecas da Steam ou pastas ao lado do servidor) e gera a lista de itens, os ícones e
  os mapas a partir dos arquivos do jogo. Os arquivos do servidor dedicado não têm texturas: se o jogo não estiver
  instalado, o instalador baixa o **pacote de ícones e mapas** (`IcarusServerKit-data.zip`, ~80 MB) da release.
  A lista de itens é sempre gerada a partir do servidor instalado, para acompanhar a versão dele;
- oferece instalar o Node.js via `winget` se ele não existir;
- cria `Start_Panel.bat` (abre o painel) e `Update_ServerKit.bat` (atualiza o kit).

Opções (defina antes do comando):
```powershell
$env:ISK_GAME_DIR = "E:\SteamLibrary\steamapps\common\Icarus"   # onde está o jogo, se não for achado sozinho
# $env:ISK_GAME_DIR = "none"   # não procurar o jogo: usa o pacote de ícones e mapas da release
irm https://raw.githubusercontent.com/BirdRa1n/IcarusServerKit/main/setup.ps1 | iex
```

## Atualizar

Dê dois cliques em **`Update_ServerKit.bat`**, na pasta do servidor dedicado. Ele baixa a versão mais nova do mod, do
painel, dos ícones e dos mapas e reinstala tudo.

- Feche o servidor antes: com o servidor aberto, o atualizador para sem mudar nada.
- Se o painel estiver aberto, ele é fechado e reaberto sozinho. No navegador, recarregue com **Ctrl+F5**.
- O `config.json` (usuários e senhas) é mantido.

Se a sua instalação é anterior a esse arquivo, baixe
[`Update_ServerKit.bat`](https://raw.githubusercontent.com/BirdRa1n/IcarusServerKit/main/Update_ServerKit.bat)
(botão direito → "Salvar link como…") para a pasta do servidor, ou rode de novo o comando da instalação.

Conteúdo do `.bat`, caso prefira criar o arquivo à mão:
```bat
@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/BirdRa1n/IcarusServerKit/main/setup.ps1 | iex"
pause
```

### Ícones ou mapa não aparecem

O mapa aparece em grade e os itens sem imagem quando o pacote de ícones e mapas não foi instalado. Isso acontece em
instalações feitas antes da v1.1.0, ou quando o download falhou.

1. Feche o servidor e rode `Update_ServerKit.bat`. Durante a instalação deve aparecer `pacote de dados instalado` ou
   `jogo encontrado em ...`.
2. Recarregue o painel com **Ctrl+F5**.


## Configuração (config.json)

```json
{
  "port": 8090,
  "host": "0.0.0.0",
  "ipcDir": "../../ICARUS Dedicated Server/Icarus/Binaries/Win64/ue4ss/Mods/IcarusServerKit/ipc",
  "users": [
    { "name": "admin", "password": "...", "role": "admin" },
    { "name": "moderador", "password": "...", "role": "viewer" }
  ]
}
```

O papel `viewer` só pode ver o mapa, os jogadores e os inventários. Para acessar de fora da rede local, prefira
uma VPN ou um proxy com HTTPS: o painel usa HTTP puro.

## Depois de uma atualização do Icarus

- Rode `Update_ServerKit.bat`. Ele regenera a lista de itens a partir do servidor atualizado.
- Se o jogo mudar as funções usadas pelo mod, abra **Servidor → Diagnóstico → Testar mod** no painel para ver o que falhou.

## Uso

| Ação | Como |
|---|---|
| Teleportar | Clique (ou botão direito) no mapa → escolha o jogador |
| Ver inventário | Clique no jogador na lista ou no marcador do mapa |
| Remover item | Clique no slot do inventário |
| Dar item | Aba **Itens** → busque → clique no item → jogador e quantidade |
| Seguir mapa | "seguir mapa do servidor" troca o mapa sozinho conforme o prospect carregado |

## Estado dos testes

Foi verificado com o servidor dedicado 3.0.19 (build 154458):
- O UE4SS carrega no servidor e encontra todos os offsets do engine (UE 4.27).
- O mod inicia, grava o estado e responde aos comandos do painel (cerca de 0,5 s por comando).
- A leitura do template de item (`GetItemTemplateStruct`) e o line trace funcionam.
- O painel foi testado ponta a ponta com `tools/mock-mod.js` (jogadores simulados): mapa, marcadores, inventário, dar item e teleporte.

**Ainda não testado com um jogador real conectado:** teleporte, dar/remover item, cheats de status, kick e ban.
Sem um cliente conectado, o servidor dedicado não carrega o mundo. Todos os comandos têm tratamento de erro e
fallback (por exemplo, dar item tenta o caminho do controller e, se o inventário não mudar, coloca direto na mochila).
Se algo falhar, a mensagem de erro aparece no painel e em `UE4SS.log`.

## Desenvolvimento

- `node tools/mock-mod.js <pasta>` simula o mod. Para usá-lo, rode o painel com `ISK_CONFIG=<config com ipcDir=pasta>`.
- `dev/CXXHeaderDump/Icarus.hpp` traz o dump das classes do servidor gerado pelo UE4SS, como referência.
- Para compilar o extrator: `cd tools/extractor && cargo build --release`.
- `update-data.bat [pasta do jogo]` regenera `panel/public/data` no repositório.
- `build-release.ps1` gera `dist/IcarusServerKit.zip` (kit) e `dist/IcarusServerKit-data.zip` (ícones e mapas, a partir de
  `panel/public/data`). Os dois são assets da release usados pelo `setup.ps1`.
- Para testar o instalador com um zip local: `$env:ISK_LOCAL_KIT = "...\IcarusServerKit.zip"` e depois `Get-Content setup.ps1 -Raw | iex`.
