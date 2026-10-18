// UI translations for every language shipped with Icarus. Game names (items, creatures, maps)
// come from data/i18n/<lang>.json, generated from the game's own localization files.

export const LANGUAGES = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  'es-419': 'Español (Latinoamérica)',
  'fr-FR': 'Français',
  'de-DE': 'Deutsch',
  'ru-RU': 'Русский',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
};

const UI = {
  en: {
    'login.user': 'Username', 'login.password': 'Password', 'login.submit': 'Sign in', 'login.invalid': 'Invalid username or password',
    'top.online': 'Server online', 'top.offline': 'Mod offline', 'top.logout': 'Sign out',
    'tab.players': 'Players', 'tab.items': 'Items', 'tab.creatures': 'Creatures', 'tab.world': 'World', 'tab.rules': 'Rules', 'tab.log': 'Log',
    'map.follow': 'Follow server map', 'map.fit': 'Fit map', 'map.none': 'No players online', 'map.tpHere': 'Teleport {name} here', 'map.tpAll': 'Teleport everyone here', 'map.copy': 'Copy coordinates', 'map.copied': 'Coordinates copied',
    'players.empty': 'No players online', 'players.waiting': 'Waiting for the server mod…', 'players.noChar': 'no character', 'players.idle': 'idle {time}', 'players.exempt': 'exempt',
    'stat.health': 'Health', 'stat.stamina': 'Stamina', 'stat.food': 'Food', 'stat.water': 'Water', 'stat.oxygen': 'Oxygen', 'stat.level': 'Level', 'stat.xp': 'XP', 'stat.position': 'Position',
    'act.heal': 'Heal', 'act.xp': 'Give XP', 'act.give': 'Give item', 'act.spawn': 'Spawn', 'act.tp': 'Teleport XYZ', 'act.goto': 'Go to player', 'act.bring': 'Bring player', 'act.bringAll': 'Bring all', 'act.stats': 'Set stat', 'act.kill': 'Kill', 'act.clear': 'Clear inv.', 'act.kick': 'Kick', 'act.ban': 'Ban', 'act.exempt': 'Exempt', 'act.unexempt': 'Unexempt',
    'inv.title': 'Inventory', 'inv.refresh': 'Refresh', 'inv.empty': 'Empty inventory', 'inv.Quickbar': 'Quickbar', 'inv.Backpack': 'Backpack', 'inv.Equipment': 'Equipment', 'inv.Suit': 'Envirosuit', 'inv.General': 'General', 'inv.remove': 'Remove item', 'inv.howMany': 'How many?', 'inv.durability': 'Durability',
    'items.search': 'Search items…', 'items.count': '{n} items', 'items.more': 'Show more', 'all': 'All',
    'cat.weapons': 'Weapons', 'cat.ammo': 'Ammo', 'cat.tools': 'Tools', 'cat.armor': 'Armor', 'cat.attachments': 'Attachments', 'cat.consumables': 'Consumables', 'cat.farming': 'Farming', 'cat.building': 'Building', 'cat.benches': 'Benches', 'cat.decoration': 'Decoration', 'cat.deployables': 'Deployables', 'cat.resources': 'Resources', 'cat.workshop': 'Workshop', 'cat.other': 'Other',
    'give.player': 'Player', 'give.qty': 'Quantity', 'give.stack': 'Stack', 'give.submit': 'Give', 'give.weight': 'Weight', 'give.maxStack': 'Max stack', 'give.noPlayers': 'No players online',
    'cr.search': 'Search creatures…', 'cr.count': '{n} creatures', 'tag.passive': 'Passive', 'tag.hostile': 'Hostile', 'tag.boss': 'Boss', 'tag.special': 'Special',
    'spawn.title': 'Spawn creatures', 'spawn.amount': 'Amount', 'spawn.level': 'Level', 'spawn.near': 'Near player', 'spawn.min': 'Min. distance (m)', 'spawn.max': 'Max. distance (m)', 'spawn.submit': 'Spawn', 'spawn.hint': 'Creatures appear at random points around the player.',
    'world.time': 'Time of day', 'world.timeDesc': 'Jump to a time of day on the current map.', 'world.setTime': 'Set', 'world.weather': 'Weather', 'world.weatherDesc': 'End every running storm and weather event.', 'world.stopWeather': 'Clear weather', 'world.save': 'Save world', 'world.saveDesc': 'Write the prospect save to disk right now.', 'world.saveBtn': 'Save now', 'world.broadcast': 'Message to everyone', 'world.message': 'Server message…', 'world.send': 'Send', 'world.console': 'Console command', 'world.run': 'Run', 'world.diag': 'Diagnostics', 'world.diagDesc': 'Checks which game functions the mod can reach.', 'world.test': 'Test mod', 'world.bringAll': 'Gather players', 'world.bringAllDesc': 'Teleport every player to the selected player.',
    'rules.idle': 'Inactivity kick', 'rules.idleDesc': 'Players that neither move nor chat are warned and then kicked.', 'rules.minutes': 'Kick after (min)', 'rules.warn': 'Warn before (min)',
    'rules.min': 'Minimum players', 'rules.minDesc': 'While fewer players are online a countdown runs, with periodic warnings. When it ends everyone is kicked, so nobody progresses alone. It resets as soon as enough players join.', 'rules.players': 'Players required', 'rules.after': 'Kick after (min)', 'rules.every': 'Warn every (min)', 'rules.countdown': 'Everyone will be kicked in',
    'rules.messages': 'In-game messages', 'rules.placeholders': 'Placeholders: {name}, {minutes}, {players}', 'rules.save': 'Save rules', 'rules.saved': 'Rules saved', 'rules.exempt': 'Exempt players', 'rules.exemptDesc': 'Never kicked by the rules above.', 'rules.exemptAdd': 'Steam ID', 'rules.add': 'Add', 'rules.bans': 'Bans', 'rules.noBans': 'Nobody is banned', 'rules.noExempt': 'No exempt players', 'rules.unban': 'Unban', 'rules.remove': 'Remove',
    'msg.idleWarning': 'Inactivity warning', 'msg.idleKick': 'Inactivity kick reason', 'msg.soloWarning': 'Not-enough-players warning', 'msg.soloKick': 'Not-enough-players kick reason', 'msg.banKick': 'Ban reason',
    'log.all': 'All', 'log.chat': 'Chat', 'log.admin': 'Admin', 'log.joins': 'Joins', 'log.rules': 'Rules', 'log.errors': 'Errors', 'log.empty': 'No events yet', 'log.join': '{name} joined', 'log.leave': '{name} left', 'log.offline': 'The server mod stopped responding', 'log.settings': 'rules updated',
    'dlg.cancel': 'Cancel', 'dlg.confirm': 'Confirm', 'dlg.reason': 'Reason', 'dlg.amount': 'Amount', 'dlg.coords': 'Coordinates (X Y, Z optional)', 'dlg.player': 'Player', 'dlg.stat': 'Stat', 'dlg.percent': 'Value (%)',
    'confirm.kill': 'Kill {name}?', 'confirm.clear': "Delete every item in {name}'s backpack and quickbar? This cannot be undone.", 'confirm.kick': 'Kick {name}?', 'confirm.ban': 'Ban {name}? They will be kicked now and on every return.',
    'err.timeout': 'The server mod did not answer (server off or mod not installed?)', 'err.forbidden': 'You do not have permission', 'ok': 'Done',
    'perks.title': 'Unlimited', 'perks.immune': 'Immune to conditions', 'perks.hint': 'refilled whenever it drops',
  },
  'pt-BR': {
    'login.user': 'Usuário', 'login.password': 'Senha', 'login.submit': 'Entrar', 'login.invalid': 'Usuário ou senha inválidos',
    'top.online': 'Servidor online', 'top.offline': 'Mod offline', 'top.logout': 'Sair',
    'tab.players': 'Jogadores', 'tab.items': 'Itens', 'tab.creatures': 'Criaturas', 'tab.world': 'Mundo', 'tab.rules': 'Regras', 'tab.log': 'Log',
    'map.follow': 'Seguir mapa do servidor', 'map.fit': 'Enquadrar mapa', 'map.none': 'Nenhum jogador online', 'map.tpHere': 'Teleportar {name} aqui', 'map.tpAll': 'Teleportar todos aqui', 'map.copy': 'Copiar coordenadas', 'map.copied': 'Coordenadas copiadas',
    'players.empty': 'Nenhum jogador online', 'players.waiting': 'Aguardando o mod do servidor…', 'players.noChar': 'sem personagem', 'players.idle': 'parado há {time}', 'players.exempt': 'isento',
    'stat.health': 'Vida', 'stat.stamina': 'Stamina', 'stat.food': 'Comida', 'stat.water': 'Água', 'stat.oxygen': 'Oxigênio', 'stat.level': 'Nível', 'stat.xp': 'XP', 'stat.position': 'Posição',
    'act.heal': 'Curar', 'act.xp': 'Dar XP', 'act.give': 'Dar item', 'act.spawn': 'Criaturas', 'act.tp': 'Teleporte XYZ', 'act.goto': 'Ir até jogador', 'act.bring': 'Trazer jogador', 'act.bringAll': 'Trazer todos', 'act.stats': 'Ajustar status', 'act.kill': 'Matar', 'act.clear': 'Limpar inv.', 'act.kick': 'Expulsar', 'act.ban': 'Banir', 'act.exempt': 'Isentar', 'act.unexempt': 'Remover isenção',
    'inv.title': 'Inventário', 'inv.refresh': 'Atualizar', 'inv.empty': 'Inventário vazio', 'inv.Quickbar': 'Barra rápida', 'inv.Backpack': 'Mochila', 'inv.Equipment': 'Equipamento', 'inv.Suit': 'Traje', 'inv.General': 'Geral', 'inv.remove': 'Remover item', 'inv.howMany': 'Quantos?', 'inv.durability': 'Durabilidade',
    'items.search': 'Buscar itens…', 'items.count': '{n} itens', 'items.more': 'Mostrar mais', 'all': 'Todos',
    'cat.weapons': 'Armas', 'cat.ammo': 'Munição', 'cat.tools': 'Ferramentas', 'cat.armor': 'Armaduras', 'cat.attachments': 'Acessórios', 'cat.consumables': 'Consumíveis', 'cat.farming': 'Agricultura', 'cat.building': 'Construção', 'cat.benches': 'Bancadas', 'cat.decoration': 'Decoração', 'cat.deployables': 'Implantáveis', 'cat.resources': 'Recursos', 'cat.workshop': 'Workshop', 'cat.other': 'Outros',
    'give.player': 'Jogador', 'give.qty': 'Quantidade', 'give.stack': 'Pilha', 'give.submit': 'Dar', 'give.weight': 'Peso', 'give.maxStack': 'Pilha máx.', 'give.noPlayers': 'Nenhum jogador online',
    'cr.search': 'Buscar criaturas…', 'cr.count': '{n} criaturas', 'tag.passive': 'Passiva', 'tag.hostile': 'Hostil', 'tag.boss': 'Chefe', 'tag.special': 'Especial',
    'spawn.title': 'Gerar criaturas', 'spawn.amount': 'Quantidade', 'spawn.level': 'Nível', 'spawn.near': 'Perto do jogador', 'spawn.min': 'Distância mín. (m)', 'spawn.max': 'Distância máx. (m)', 'spawn.submit': 'Gerar', 'spawn.hint': 'As criaturas aparecem em pontos aleatórios ao redor do jogador.',
    'world.time': 'Hora do dia', 'world.timeDesc': 'Muda a hora do dia no mapa atual.', 'world.setTime': 'Aplicar', 'world.weather': 'Clima', 'world.weatherDesc': 'Encerra todas as tempestades e eventos de clima.', 'world.stopWeather': 'Limpar clima', 'world.save': 'Salvar mundo', 'world.saveDesc': 'Grava o save do prospect no disco agora.', 'world.saveBtn': 'Salvar agora', 'world.broadcast': 'Mensagem para todos', 'world.message': 'Mensagem do servidor…', 'world.send': 'Enviar', 'world.console': 'Comando de console', 'world.run': 'Executar', 'world.diag': 'Diagnóstico', 'world.diagDesc': 'Verifica quais funções do jogo o mod consegue acessar.', 'world.test': 'Testar mod', 'world.bringAll': 'Reunir jogadores', 'world.bringAllDesc': 'Teleporta todos até o jogador selecionado.',
    'rules.idle': 'Expulsão por inatividade', 'rules.idleDesc': 'Jogadores que não se movem nem falam no chat recebem um aviso e depois são expulsos.', 'rules.minutes': 'Expulsar após (min)', 'rules.warn': 'Avisar antes (min)',
    'rules.min': 'Mínimo de jogadores', 'rules.minDesc': 'Com menos jogadores online, uma contagem regressiva começa, com avisos periódicos. Ao terminar, todos são expulsos, para ninguém evoluir sozinho. A contagem zera assim que entrarem jogadores suficientes.', 'rules.players': 'Jogadores necessários', 'rules.after': 'Expulsar após (min)', 'rules.every': 'Avisar a cada (min)', 'rules.countdown': 'Todos serão expulsos em',
    'rules.messages': 'Mensagens no jogo', 'rules.placeholders': 'Variáveis: {name}, {minutes}, {players}', 'rules.save': 'Salvar regras', 'rules.saved': 'Regras salvas', 'rules.exempt': 'Jogadores isentos', 'rules.exemptDesc': 'Nunca são expulsos pelas regras acima.', 'rules.exemptAdd': 'Steam ID', 'rules.add': 'Adicionar', 'rules.bans': 'Banimentos', 'rules.noBans': 'Ninguém banido', 'rules.noExempt': 'Nenhum jogador isento', 'rules.unban': 'Desbanir', 'rules.remove': 'Remover',
    'msg.idleWarning': 'Aviso de inatividade', 'msg.idleKick': 'Motivo da expulsão por inatividade', 'msg.soloWarning': 'Aviso de jogadores insuficientes', 'msg.soloKick': 'Motivo da expulsão por jogadores insuficientes', 'msg.banKick': 'Motivo do banimento',
    'log.all': 'Tudo', 'log.chat': 'Chat', 'log.admin': 'Admin', 'log.joins': 'Entradas', 'log.rules': 'Regras', 'log.errors': 'Erros', 'log.empty': 'Nenhum evento ainda', 'log.join': '{name} entrou', 'log.leave': '{name} saiu', 'log.offline': 'O mod do servidor parou de responder', 'log.settings': 'regras atualizadas',
    'dlg.cancel': 'Cancelar', 'dlg.confirm': 'Confirmar', 'dlg.reason': 'Motivo', 'dlg.amount': 'Quantidade', 'dlg.coords': 'Coordenadas (X Y, Z opcional)', 'dlg.player': 'Jogador', 'dlg.stat': 'Status', 'dlg.percent': 'Valor (%)',
    'confirm.kill': 'Matar {name}?', 'confirm.clear': 'Apagar todos os itens da mochila e da barra rápida de {name}? Não dá para desfazer.', 'confirm.kick': 'Expulsar {name}?', 'confirm.ban': 'Banir {name}? O jogador será expulso agora e sempre que voltar.',
    'err.timeout': 'O mod do servidor não respondeu (servidor desligado ou mod não instalado?)', 'err.forbidden': 'Você não tem permissão', 'ok': 'Feito',
    'perks.title': 'Ilimitado', 'perks.immune': 'Imune a condições', 'perks.hint': 'recarrega sempre que diminuir',
  },
  'es-419': {
    'login.user': 'Usuario', 'login.password': 'Contraseña', 'login.submit': 'Entrar', 'login.invalid': 'Usuario o contraseña incorrectos',
    'top.online': 'Servidor en línea', 'top.offline': 'Mod sin conexión', 'top.logout': 'Salir',
    'tab.players': 'Jugadores', 'tab.items': 'Objetos', 'tab.creatures': 'Criaturas', 'tab.world': 'Mundo', 'tab.rules': 'Reglas', 'tab.log': 'Registro',
    'map.follow': 'Seguir mapa del servidor', 'map.fit': 'Ajustar mapa', 'map.none': 'No hay jugadores en línea', 'map.tpHere': 'Teletransportar a {name} aquí', 'map.tpAll': 'Teletransportar a todos aquí', 'map.copy': 'Copiar coordenadas', 'map.copied': 'Coordenadas copiadas',
    'players.empty': 'No hay jugadores en línea', 'players.waiting': 'Esperando el mod del servidor…', 'players.noChar': 'sin personaje', 'players.idle': 'inactivo {time}', 'players.exempt': 'exento',
    'stat.health': 'Salud', 'stat.stamina': 'Resistencia', 'stat.food': 'Comida', 'stat.water': 'Agua', 'stat.oxygen': 'Oxígeno', 'stat.level': 'Nivel', 'stat.xp': 'XP', 'stat.position': 'Posición',
    'act.heal': 'Curar', 'act.xp': 'Dar XP', 'act.give': 'Dar objeto', 'act.spawn': 'Criaturas', 'act.tp': 'Teletransporte XYZ', 'act.goto': 'Ir al jugador', 'act.bring': 'Traer jugador', 'act.bringAll': 'Traer a todos', 'act.stats': 'Ajustar estado', 'act.kill': 'Matar', 'act.clear': 'Vaciar inv.', 'act.kick': 'Expulsar', 'act.ban': 'Banear', 'act.exempt': 'Eximir', 'act.unexempt': 'Quitar exención',
    'inv.title': 'Inventario', 'inv.refresh': 'Actualizar', 'inv.empty': 'Inventario vacío', 'inv.Quickbar': 'Barra rápida', 'inv.Backpack': 'Mochila', 'inv.Equipment': 'Equipo', 'inv.Suit': 'Traje', 'inv.General': 'General', 'inv.remove': 'Quitar objeto', 'inv.howMany': '¿Cuántos?', 'inv.durability': 'Durabilidad',
    'items.search': 'Buscar objetos…', 'items.count': '{n} objetos', 'items.more': 'Mostrar más', 'all': 'Todos',
    'cat.weapons': 'Armas', 'cat.ammo': 'Munición', 'cat.tools': 'Herramientas', 'cat.armor': 'Armaduras', 'cat.attachments': 'Accesorios', 'cat.consumables': 'Consumibles', 'cat.farming': 'Agricultura', 'cat.building': 'Construcción', 'cat.benches': 'Bancos', 'cat.decoration': 'Decoración', 'cat.deployables': 'Desplegables', 'cat.resources': 'Recursos', 'cat.workshop': 'Taller', 'cat.other': 'Otros',
    'give.player': 'Jugador', 'give.qty': 'Cantidad', 'give.stack': 'Pila', 'give.submit': 'Dar', 'give.weight': 'Peso', 'give.maxStack': 'Pila máx.', 'give.noPlayers': 'No hay jugadores en línea',
    'cr.search': 'Buscar criaturas…', 'cr.count': '{n} criaturas', 'tag.passive': 'Pasiva', 'tag.hostile': 'Hostil', 'tag.boss': 'Jefe', 'tag.special': 'Especial',
    'spawn.title': 'Generar criaturas', 'spawn.amount': 'Cantidad', 'spawn.level': 'Nivel', 'spawn.near': 'Cerca del jugador', 'spawn.min': 'Distancia mín. (m)', 'spawn.max': 'Distancia máx. (m)', 'spawn.submit': 'Generar', 'spawn.hint': 'Las criaturas aparecen en puntos aleatorios alrededor del jugador.',
    'world.time': 'Hora del día', 'world.timeDesc': 'Cambia la hora del día en el mapa actual.', 'world.setTime': 'Aplicar', 'world.weather': 'Clima', 'world.weatherDesc': 'Termina todas las tormentas y eventos de clima.', 'world.stopWeather': 'Despejar clima', 'world.save': 'Guardar mundo', 'world.saveDesc': 'Escribe ahora el guardado del prospecto en disco.', 'world.saveBtn': 'Guardar ahora', 'world.broadcast': 'Mensaje para todos', 'world.message': 'Mensaje del servidor…', 'world.send': 'Enviar', 'world.console': 'Comando de consola', 'world.run': 'Ejecutar', 'world.diag': 'Diagnóstico', 'world.diagDesc': 'Comprueba qué funciones del juego alcanza el mod.', 'world.test': 'Probar mod', 'world.bringAll': 'Reunir jugadores', 'world.bringAllDesc': 'Teletransporta a todos al jugador seleccionado.',
    'rules.idle': 'Expulsión por inactividad', 'rules.idleDesc': 'Los jugadores que no se mueven ni chatean reciben un aviso y luego son expulsados.', 'rules.minutes': 'Expulsar tras (min)', 'rules.warn': 'Avisar antes (min)',
    'rules.min': 'Mínimo de jugadores', 'rules.minDesc': 'Con menos jugadores en línea corre una cuenta regresiva con avisos periódicos. Al terminar todos son expulsados, para que nadie avance solo. Se reinicia en cuanto entran suficientes jugadores.', 'rules.players': 'Jugadores necesarios', 'rules.after': 'Expulsar tras (min)', 'rules.every': 'Avisar cada (min)', 'rules.countdown': 'Todos serán expulsados en',
    'rules.messages': 'Mensajes en el juego', 'rules.placeholders': 'Variables: {name}, {minutes}, {players}', 'rules.save': 'Guardar reglas', 'rules.saved': 'Reglas guardadas', 'rules.exempt': 'Jugadores exentos', 'rules.exemptDesc': 'Nunca son expulsados por las reglas.', 'rules.exemptAdd': 'Steam ID', 'rules.add': 'Agregar', 'rules.bans': 'Baneos', 'rules.noBans': 'Nadie está baneado', 'rules.noExempt': 'Ningún jugador exento', 'rules.unban': 'Desbanear', 'rules.remove': 'Quitar',
    'msg.idleWarning': 'Aviso de inactividad', 'msg.idleKick': 'Motivo de expulsión por inactividad', 'msg.soloWarning': 'Aviso de jugadores insuficientes', 'msg.soloKick': 'Motivo de expulsión por jugadores insuficientes', 'msg.banKick': 'Motivo del baneo',
    'log.all': 'Todo', 'log.chat': 'Chat', 'log.admin': 'Admin', 'log.joins': 'Entradas', 'log.rules': 'Reglas', 'log.errors': 'Errores', 'log.empty': 'Aún no hay eventos', 'log.join': '{name} entró', 'log.leave': '{name} salió', 'log.offline': 'El mod del servidor dejó de responder', 'log.settings': 'reglas actualizadas',
    'dlg.cancel': 'Cancelar', 'dlg.confirm': 'Confirmar', 'dlg.reason': 'Motivo', 'dlg.amount': 'Cantidad', 'dlg.coords': 'Coordenadas (X Y, Z opcional)', 'dlg.player': 'Jugador', 'dlg.stat': 'Estado', 'dlg.percent': 'Valor (%)',
    'confirm.kill': '¿Matar a {name}?', 'confirm.clear': '¿Borrar todos los objetos de la mochila y barra rápida de {name}? No se puede deshacer.', 'confirm.kick': '¿Expulsar a {name}?', 'confirm.ban': '¿Banear a {name}? Será expulsado ahora y cada vez que vuelva.',
    'err.timeout': 'El mod del servidor no respondió (¿servidor apagado o mod no instalado?)', 'err.forbidden': 'No tienes permiso', 'ok': 'Listo',
    'perks.title': 'Ilimitado', 'perks.immune': 'Inmune a condiciones', 'perks.hint': 'se recarga cuando baja',
  },
  'fr-FR': {
    'login.user': "Nom d'utilisateur", 'login.password': 'Mot de passe', 'login.submit': 'Se connecter', 'login.invalid': 'Identifiants invalides',
    'top.online': 'Serveur en ligne', 'top.offline': 'Mod hors ligne', 'top.logout': 'Déconnexion',
    'tab.players': 'Joueurs', 'tab.items': 'Objets', 'tab.creatures': 'Créatures', 'tab.world': 'Monde', 'tab.rules': 'Règles', 'tab.log': 'Journal',
    'map.follow': 'Suivre la carte du serveur', 'map.fit': 'Ajuster la carte', 'map.none': 'Aucun joueur en ligne', 'map.tpHere': 'Téléporter {name} ici', 'map.tpAll': 'Téléporter tout le monde ici', 'map.copy': 'Copier les coordonnées', 'map.copied': 'Coordonnées copiées',
    'players.empty': 'Aucun joueur en ligne', 'players.waiting': 'En attente du mod serveur…', 'players.noChar': 'sans personnage', 'players.idle': 'inactif {time}', 'players.exempt': 'exempté',
    'stat.health': 'Santé', 'stat.stamina': 'Endurance', 'stat.food': 'Nourriture', 'stat.water': 'Eau', 'stat.oxygen': 'Oxygène', 'stat.level': 'Niveau', 'stat.xp': 'XP', 'stat.position': 'Position',
    'act.heal': 'Soigner', 'act.xp': 'Donner XP', 'act.give': 'Donner objet', 'act.spawn': 'Créatures', 'act.tp': 'Téléport. XYZ', 'act.goto': 'Aller au joueur', 'act.bring': 'Amener joueur', 'act.bringAll': 'Amener tous', 'act.stats': 'Régler stat', 'act.kill': 'Tuer', 'act.clear': 'Vider inv.', 'act.kick': 'Expulser', 'act.ban': 'Bannir', 'act.exempt': 'Exempter', 'act.unexempt': 'Retirer exemption',
    'inv.title': 'Inventaire', 'inv.refresh': 'Actualiser', 'inv.empty': 'Inventaire vide', 'inv.Quickbar': "Barre d'accès", 'inv.Backpack': 'Sac à dos', 'inv.Equipment': 'Équipement', 'inv.Suit': 'Combinaison', 'inv.General': 'Général', 'inv.remove': "Retirer l'objet", 'inv.howMany': 'Combien ?', 'inv.durability': 'Durabilité',
    'items.search': 'Rechercher des objets…', 'items.count': '{n} objets', 'items.more': 'Afficher plus', 'all': 'Tous',
    'cat.weapons': 'Armes', 'cat.ammo': 'Munitions', 'cat.tools': 'Outils', 'cat.armor': 'Armures', 'cat.attachments': 'Accessoires', 'cat.consumables': 'Consommables', 'cat.farming': 'Agriculture', 'cat.building': 'Construction', 'cat.benches': 'Établis', 'cat.decoration': 'Décoration', 'cat.deployables': 'Déployables', 'cat.resources': 'Ressources', 'cat.workshop': 'Atelier', 'cat.other': 'Autres',
    'give.player': 'Joueur', 'give.qty': 'Quantité', 'give.stack': 'Pile', 'give.submit': 'Donner', 'give.weight': 'Poids', 'give.maxStack': 'Pile max.', 'give.noPlayers': 'Aucun joueur en ligne',
    'cr.search': 'Rechercher des créatures…', 'cr.count': '{n} créatures', 'tag.passive': 'Passive', 'tag.hostile': 'Hostile', 'tag.boss': 'Boss', 'tag.special': 'Spéciale',
    'spawn.title': 'Faire apparaître des créatures', 'spawn.amount': 'Quantité', 'spawn.level': 'Niveau', 'spawn.near': 'Près du joueur', 'spawn.min': 'Distance min. (m)', 'spawn.max': 'Distance max. (m)', 'spawn.submit': 'Faire apparaître', 'spawn.hint': 'Les créatures apparaissent à des points aléatoires autour du joueur.',
    'world.time': 'Heure du jour', 'world.timeDesc': "Change l'heure du jour sur la carte actuelle.", 'world.setTime': 'Appliquer', 'world.weather': 'Météo', 'world.weatherDesc': 'Met fin à toutes les tempêtes et événements météo.', 'world.stopWeather': 'Dégager la météo', 'world.save': 'Sauvegarder le monde', 'world.saveDesc': 'Écrit la sauvegarde du prospect sur le disque maintenant.', 'world.saveBtn': 'Sauvegarder', 'world.broadcast': 'Message à tous', 'world.message': 'Message du serveur…', 'world.send': 'Envoyer', 'world.console': 'Commande console', 'world.run': 'Exécuter', 'world.diag': 'Diagnostic', 'world.diagDesc': 'Vérifie quelles fonctions du jeu le mod peut atteindre.', 'world.test': 'Tester le mod', 'world.bringAll': 'Rassembler les joueurs', 'world.bringAllDesc': 'Téléporte tous les joueurs vers le joueur sélectionné.',
    'rules.idle': "Expulsion pour inactivité", 'rules.idleDesc': 'Les joueurs qui ne bougent ni ne parlent sont avertis puis expulsés.', 'rules.minutes': 'Expulser après (min)', 'rules.warn': 'Avertir avant (min)',
    'rules.min': 'Joueurs minimum', 'rules.minDesc': "Avec trop peu de joueurs en ligne, un compte à rebours démarre avec des avertissements. À la fin, tout le monde est expulsé pour que personne ne progresse seul. Il est réinitialisé dès qu'assez de joueurs sont là.", 'rules.players': 'Joueurs requis', 'rules.after': 'Expulser après (min)', 'rules.every': 'Avertir toutes les (min)', 'rules.countdown': 'Tout le monde sera expulsé dans',
    'rules.messages': 'Messages en jeu', 'rules.placeholders': 'Variables : {name}, {minutes}, {players}', 'rules.save': 'Enregistrer les règles', 'rules.saved': 'Règles enregistrées', 'rules.exempt': 'Joueurs exemptés', 'rules.exemptDesc': 'Jamais expulsés par les règles.', 'rules.exemptAdd': 'Steam ID', 'rules.add': 'Ajouter', 'rules.bans': 'Bannissements', 'rules.noBans': "Personne n'est banni", 'rules.noExempt': 'Aucun joueur exempté', 'rules.unban': 'Débannir', 'rules.remove': 'Retirer',
    'msg.idleWarning': "Avertissement d'inactivité", 'msg.idleKick': "Motif d'expulsion pour inactivité", 'msg.soloWarning': 'Avertissement joueurs insuffisants', 'msg.soloKick': "Motif d'expulsion joueurs insuffisants", 'msg.banKick': 'Motif du bannissement',
    'log.all': 'Tout', 'log.chat': 'Chat', 'log.admin': 'Admin', 'log.joins': 'Connexions', 'log.rules': 'Règles', 'log.errors': 'Erreurs', 'log.empty': "Aucun événement pour l'instant", 'log.join': '{name} a rejoint', 'log.leave': '{name} est parti', 'log.offline': 'Le mod serveur ne répond plus', 'log.settings': 'règles mises à jour',
    'dlg.cancel': 'Annuler', 'dlg.confirm': 'Confirmer', 'dlg.reason': 'Motif', 'dlg.amount': 'Quantité', 'dlg.coords': 'Coordonnées (X Y, Z facultatif)', 'dlg.player': 'Joueur', 'dlg.stat': 'Stat', 'dlg.percent': 'Valeur (%)',
    'confirm.kill': 'Tuer {name} ?', 'confirm.clear': "Supprimer tous les objets du sac et de la barre d'accès de {name} ? Action irréversible.", 'confirm.kick': 'Expulser {name} ?', 'confirm.ban': 'Bannir {name} ? Il sera expulsé maintenant et à chaque retour.',
    'err.timeout': "Le mod serveur n'a pas répondu (serveur arrêté ou mod non installé ?)", 'err.forbidden': "Vous n'avez pas la permission", 'ok': 'Terminé',
    'perks.title': 'Illimité', 'perks.immune': 'Immunisé aux affections', 'perks.hint': 'rechargé dès qu’il baisse',
  },
  'de-DE': {
    'login.user': 'Benutzername', 'login.password': 'Passwort', 'login.submit': 'Anmelden', 'login.invalid': 'Benutzername oder Passwort ungültig',
    'top.online': 'Server online', 'top.offline': 'Mod offline', 'top.logout': 'Abmelden',
    'tab.players': 'Spieler', 'tab.items': 'Gegenstände', 'tab.creatures': 'Kreaturen', 'tab.world': 'Welt', 'tab.rules': 'Regeln', 'tab.log': 'Protokoll',
    'map.follow': 'Serverkarte folgen', 'map.fit': 'Karte einpassen', 'map.none': 'Keine Spieler online', 'map.tpHere': '{name} hierher teleportieren', 'map.tpAll': 'Alle hierher teleportieren', 'map.copy': 'Koordinaten kopieren', 'map.copied': 'Koordinaten kopiert',
    'players.empty': 'Keine Spieler online', 'players.waiting': 'Warte auf den Server-Mod…', 'players.noChar': 'kein Charakter', 'players.idle': 'inaktiv {time}', 'players.exempt': 'ausgenommen',
    'stat.health': 'Gesundheit', 'stat.stamina': 'Ausdauer', 'stat.food': 'Nahrung', 'stat.water': 'Wasser', 'stat.oxygen': 'Sauerstoff', 'stat.level': 'Stufe', 'stat.xp': 'EP', 'stat.position': 'Position',
    'act.heal': 'Heilen', 'act.xp': 'EP geben', 'act.give': 'Item geben', 'act.spawn': 'Kreaturen', 'act.tp': 'Teleport XYZ', 'act.goto': 'Zum Spieler', 'act.bring': 'Spieler holen', 'act.bringAll': 'Alle holen', 'act.stats': 'Wert setzen', 'act.kill': 'Töten', 'act.clear': 'Inv. leeren', 'act.kick': 'Kicken', 'act.ban': 'Bannen', 'act.exempt': 'Ausnehmen', 'act.unexempt': 'Ausnahme entfernen',
    'inv.title': 'Inventar', 'inv.refresh': 'Aktualisieren', 'inv.empty': 'Inventar leer', 'inv.Quickbar': 'Schnellleiste', 'inv.Backpack': 'Rucksack', 'inv.Equipment': 'Ausrüstung', 'inv.Suit': 'Anzug', 'inv.General': 'Allgemein', 'inv.remove': 'Gegenstand entfernen', 'inv.howMany': 'Wie viele?', 'inv.durability': 'Haltbarkeit',
    'items.search': 'Gegenstände suchen…', 'items.count': '{n} Gegenstände', 'items.more': 'Mehr anzeigen', 'all': 'Alle',
    'cat.weapons': 'Waffen', 'cat.ammo': 'Munition', 'cat.tools': 'Werkzeuge', 'cat.armor': 'Rüstung', 'cat.attachments': 'Aufsätze', 'cat.consumables': 'Verbrauchsgüter', 'cat.farming': 'Landwirtschaft', 'cat.building': 'Bauen', 'cat.benches': 'Werkbänke', 'cat.decoration': 'Dekoration', 'cat.deployables': 'Platzierbares', 'cat.resources': 'Ressourcen', 'cat.workshop': 'Werkstatt', 'cat.other': 'Sonstiges',
    'give.player': 'Spieler', 'give.qty': 'Menge', 'give.stack': 'Stapel', 'give.submit': 'Geben', 'give.weight': 'Gewicht', 'give.maxStack': 'Max. Stapel', 'give.noPlayers': 'Keine Spieler online',
    'cr.search': 'Kreaturen suchen…', 'cr.count': '{n} Kreaturen', 'tag.passive': 'Friedlich', 'tag.hostile': 'Feindlich', 'tag.boss': 'Boss', 'tag.special': 'Speziell',
    'spawn.title': 'Kreaturen erscheinen lassen', 'spawn.amount': 'Anzahl', 'spawn.level': 'Stufe', 'spawn.near': 'Nahe Spieler', 'spawn.min': 'Min. Abstand (m)', 'spawn.max': 'Max. Abstand (m)', 'spawn.submit': 'Erscheinen lassen', 'spawn.hint': 'Kreaturen erscheinen an zufälligen Punkten rund um den Spieler.',
    'world.time': 'Tageszeit', 'world.timeDesc': 'Ändert die Tageszeit auf der aktuellen Karte.', 'world.setTime': 'Setzen', 'world.weather': 'Wetter', 'world.weatherDesc': 'Beendet alle Stürme und Wetterereignisse.', 'world.stopWeather': 'Wetter klären', 'world.save': 'Welt speichern', 'world.saveDesc': 'Schreibt den Prospect-Spielstand jetzt auf die Festplatte.', 'world.saveBtn': 'Jetzt speichern', 'world.broadcast': 'Nachricht an alle', 'world.message': 'Servernachricht…', 'world.send': 'Senden', 'world.console': 'Konsolenbefehl', 'world.run': 'Ausführen', 'world.diag': 'Diagnose', 'world.diagDesc': 'Prüft, welche Spielfunktionen der Mod erreicht.', 'world.test': 'Mod testen', 'world.bringAll': 'Spieler sammeln', 'world.bringAllDesc': 'Teleportiert alle Spieler zum ausgewählten Spieler.',
    'rules.idle': 'Kick bei Inaktivität', 'rules.idleDesc': 'Spieler, die sich nicht bewegen und nicht chatten, werden gewarnt und dann gekickt.', 'rules.minutes': 'Kick nach (Min.)', 'rules.warn': 'Warnung vorher (Min.)',
    'rules.min': 'Mindestspieler', 'rules.minDesc': 'Sind zu wenige Spieler online, läuft ein Countdown mit regelmäßigen Warnungen. Danach werden alle gekickt, damit niemand allein vorankommt. Er wird zurückgesetzt, sobald genug Spieler da sind.', 'rules.players': 'Benötigte Spieler', 'rules.after': 'Kick nach (Min.)', 'rules.every': 'Warnen alle (Min.)', 'rules.countdown': 'Alle werden gekickt in',
    'rules.messages': 'Nachrichten im Spiel', 'rules.placeholders': 'Platzhalter: {name}, {minutes}, {players}', 'rules.save': 'Regeln speichern', 'rules.saved': 'Regeln gespeichert', 'rules.exempt': 'Ausgenommene Spieler', 'rules.exemptDesc': 'Werden nie durch die Regeln gekickt.', 'rules.exemptAdd': 'Steam-ID', 'rules.add': 'Hinzufügen', 'rules.bans': 'Banns', 'rules.noBans': 'Niemand ist gebannt', 'rules.noExempt': 'Keine ausgenommenen Spieler', 'rules.unban': 'Entbannen', 'rules.remove': 'Entfernen',
    'msg.idleWarning': 'Inaktivitätswarnung', 'msg.idleKick': 'Kick-Grund Inaktivität', 'msg.soloWarning': 'Warnung zu wenige Spieler', 'msg.soloKick': 'Kick-Grund zu wenige Spieler', 'msg.banKick': 'Bann-Grund',
    'log.all': 'Alle', 'log.chat': 'Chat', 'log.admin': 'Admin', 'log.joins': 'Beitritte', 'log.rules': 'Regeln', 'log.errors': 'Fehler', 'log.empty': 'Noch keine Ereignisse', 'log.join': '{name} ist beigetreten', 'log.leave': '{name} hat verlassen', 'log.offline': 'Der Server-Mod antwortet nicht mehr', 'log.settings': 'Regeln aktualisiert',
    'dlg.cancel': 'Abbrechen', 'dlg.confirm': 'Bestätigen', 'dlg.reason': 'Grund', 'dlg.amount': 'Menge', 'dlg.coords': 'Koordinaten (X Y, Z optional)', 'dlg.player': 'Spieler', 'dlg.stat': 'Wert', 'dlg.percent': 'Wert (%)',
    'confirm.kill': '{name} töten?', 'confirm.clear': 'Alle Gegenstände aus Rucksack und Schnellleiste von {name} löschen? Nicht umkehrbar.', 'confirm.kick': '{name} kicken?', 'confirm.ban': '{name} bannen? Der Spieler wird jetzt und bei jeder Rückkehr gekickt.',
    'err.timeout': 'Der Server-Mod hat nicht geantwortet (Server aus oder Mod nicht installiert?)', 'err.forbidden': 'Keine Berechtigung', 'ok': 'Erledigt',
    'perks.title': 'Unbegrenzt', 'perks.immune': 'Immun gegen Zustände', 'perks.hint': 'wird aufgefüllt, sobald es sinkt',
  },
  'ru-RU': {
    'login.user': 'Логин', 'login.password': 'Пароль', 'login.submit': 'Войти', 'login.invalid': 'Неверный логин или пароль',
    'top.online': 'Сервер онлайн', 'top.offline': 'Мод офлайн', 'top.logout': 'Выйти',
    'tab.players': 'Игроки', 'tab.items': 'Предметы', 'tab.creatures': 'Существа', 'tab.world': 'Мир', 'tab.rules': 'Правила', 'tab.log': 'Журнал',
    'map.follow': 'Следовать карте сервера', 'map.fit': 'Вписать карту', 'map.none': 'Нет игроков онлайн', 'map.tpHere': 'Телепортировать {name} сюда', 'map.tpAll': 'Телепортировать всех сюда', 'map.copy': 'Скопировать координаты', 'map.copied': 'Координаты скопированы',
    'players.empty': 'Нет игроков онлайн', 'players.waiting': 'Ожидание мода сервера…', 'players.noChar': 'нет персонажа', 'players.idle': 'бездействует {time}', 'players.exempt': 'исключение',
    'stat.health': 'Здоровье', 'stat.stamina': 'Выносливость', 'stat.food': 'Еда', 'stat.water': 'Вода', 'stat.oxygen': 'Кислород', 'stat.level': 'Уровень', 'stat.xp': 'Опыт', 'stat.position': 'Позиция',
    'act.heal': 'Вылечить', 'act.xp': 'Дать опыт', 'act.give': 'Дать предмет', 'act.spawn': 'Существа', 'act.tp': 'Телепорт XYZ', 'act.goto': 'К игроку', 'act.bring': 'Притянуть', 'act.bringAll': 'Собрать всех', 'act.stats': 'Параметр', 'act.kill': 'Убить', 'act.clear': 'Очистить инв.', 'act.kick': 'Кикнуть', 'act.ban': 'Забанить', 'act.exempt': 'Исключить', 'act.unexempt': 'Снять исключение',
    'inv.title': 'Инвентарь', 'inv.refresh': 'Обновить', 'inv.empty': 'Инвентарь пуст', 'inv.Quickbar': 'Панель быстрого доступа', 'inv.Backpack': 'Рюкзак', 'inv.Equipment': 'Снаряжение', 'inv.Suit': 'Скафандр', 'inv.General': 'Общий', 'inv.remove': 'Убрать предмет', 'inv.howMany': 'Сколько?', 'inv.durability': 'Прочность',
    'items.search': 'Поиск предметов…', 'items.count': 'Предметов: {n}', 'items.more': 'Показать ещё', 'all': 'Все',
    'cat.weapons': 'Оружие', 'cat.ammo': 'Боеприпасы', 'cat.tools': 'Инструменты', 'cat.armor': 'Броня', 'cat.attachments': 'Модули', 'cat.consumables': 'Расходники', 'cat.farming': 'Фермерство', 'cat.building': 'Строительство', 'cat.benches': 'Верстаки', 'cat.decoration': 'Декор', 'cat.deployables': 'Размещаемое', 'cat.resources': 'Ресурсы', 'cat.workshop': 'Мастерская', 'cat.other': 'Прочее',
    'give.player': 'Игрок', 'give.qty': 'Количество', 'give.stack': 'Стопка', 'give.submit': 'Выдать', 'give.weight': 'Вес', 'give.maxStack': 'Макс. стопка', 'give.noPlayers': 'Нет игроков онлайн',
    'cr.search': 'Поиск существ…', 'cr.count': 'Существ: {n}', 'tag.passive': 'Мирное', 'tag.hostile': 'Враждебное', 'tag.boss': 'Босс', 'tag.special': 'Особое',
    'spawn.title': 'Призвать существ', 'spawn.amount': 'Количество', 'spawn.level': 'Уровень', 'spawn.near': 'Рядом с игроком', 'spawn.min': 'Мин. расстояние (м)', 'spawn.max': 'Макс. расстояние (м)', 'spawn.submit': 'Призвать', 'spawn.hint': 'Существа появляются в случайных точках вокруг игрока.',
    'world.time': 'Время суток', 'world.timeDesc': 'Меняет время суток на текущей карте.', 'world.setTime': 'Применить', 'world.weather': 'Погода', 'world.weatherDesc': 'Завершает все бури и погодные события.', 'world.stopWeather': 'Очистить погоду', 'world.save': 'Сохранить мир', 'world.saveDesc': 'Записать сохранение проспекта на диск прямо сейчас.', 'world.saveBtn': 'Сохранить', 'world.broadcast': 'Сообщение всем', 'world.message': 'Сообщение сервера…', 'world.send': 'Отправить', 'world.console': 'Консольная команда', 'world.run': 'Выполнить', 'world.diag': 'Диагностика', 'world.diagDesc': 'Проверяет, какие функции игры доступны моду.', 'world.test': 'Проверить мод', 'world.bringAll': 'Собрать игроков', 'world.bringAllDesc': 'Телепортирует всех игроков к выбранному игроку.',
    'rules.idle': 'Кик за бездействие', 'rules.idleDesc': 'Игроки, которые не двигаются и не пишут в чат, получают предупреждение, а затем кик.', 'rules.minutes': 'Кик через (мин)', 'rules.warn': 'Предупредить за (мин)',
    'rules.min': 'Минимум игроков', 'rules.minDesc': 'Если игроков меньше нужного, запускается отсчёт с предупреждениями. По его окончании всех кикает, чтобы никто не развивался в одиночку. Отсчёт сбрасывается, когда игроков достаточно.', 'rules.players': 'Нужно игроков', 'rules.after': 'Кик через (мин)', 'rules.every': 'Предупреждать каждые (мин)', 'rules.countdown': 'Всех кикнет через',
    'rules.messages': 'Сообщения в игре', 'rules.placeholders': 'Переменные: {name}, {minutes}, {players}', 'rules.save': 'Сохранить правила', 'rules.saved': 'Правила сохранены', 'rules.exempt': 'Исключённые игроки', 'rules.exemptDesc': 'Никогда не кикаются правилами.', 'rules.exemptAdd': 'Steam ID', 'rules.add': 'Добавить', 'rules.bans': 'Баны', 'rules.noBans': 'Никто не забанен', 'rules.noExempt': 'Нет исключённых игроков', 'rules.unban': 'Разбанить', 'rules.remove': 'Убрать',
    'msg.idleWarning': 'Предупреждение о бездействии', 'msg.idleKick': 'Причина кика за бездействие', 'msg.soloWarning': 'Предупреждение о нехватке игроков', 'msg.soloKick': 'Причина кика при нехватке игроков', 'msg.banKick': 'Причина бана',
    'log.all': 'Все', 'log.chat': 'Чат', 'log.admin': 'Админ', 'log.joins': 'Входы', 'log.rules': 'Правила', 'log.errors': 'Ошибки', 'log.empty': 'Событий пока нет', 'log.join': '{name} зашёл', 'log.leave': '{name} вышел', 'log.offline': 'Мод сервера перестал отвечать', 'log.settings': 'правила обновлены',
    'dlg.cancel': 'Отмена', 'dlg.confirm': 'Подтвердить', 'dlg.reason': 'Причина', 'dlg.amount': 'Количество', 'dlg.coords': 'Координаты (X Y, Z необязательно)', 'dlg.player': 'Игрок', 'dlg.stat': 'Параметр', 'dlg.percent': 'Значение (%)',
    'confirm.kill': 'Убить {name}?', 'confirm.clear': 'Удалить все предметы из рюкзака и панели {name}? Это необратимо.', 'confirm.kick': 'Кикнуть {name}?', 'confirm.ban': 'Забанить {name}? Игрока кикнет сейчас и при каждом возвращении.',
    'err.timeout': 'Мод сервера не ответил (сервер выключен или мод не установлен?)', 'err.forbidden': 'Нет доступа', 'ok': 'Готово',
    'perks.title': 'Бесконечно', 'perks.immune': 'Иммунитет к состояниям', 'perks.hint': 'восполняется при снижении',
  },
  'ja-JP': {
    'login.user': 'ユーザー名', 'login.password': 'パスワード', 'login.submit': 'ログイン', 'login.invalid': 'ユーザー名またはパスワードが違います',
    'top.online': 'サーバー稼働中', 'top.offline': 'MOD オフライン', 'top.logout': 'ログアウト',
    'tab.players': 'プレイヤー', 'tab.items': 'アイテム', 'tab.creatures': 'クリーチャー', 'tab.world': 'ワールド', 'tab.rules': 'ルール', 'tab.log': 'ログ',
    'map.follow': 'サーバーのマップに追従', 'map.fit': 'マップ全体を表示', 'map.none': 'オンラインのプレイヤーはいません', 'map.tpHere': '{name} をここへテレポート', 'map.tpAll': '全員をここへテレポート', 'map.copy': '座標をコピー', 'map.copied': '座標をコピーしました',
    'players.empty': 'オンラインのプレイヤーはいません', 'players.waiting': 'サーバー MOD を待っています…', 'players.noChar': 'キャラクターなし', 'players.idle': '放置 {time}', 'players.exempt': '除外',
    'stat.health': '体力', 'stat.stamina': 'スタミナ', 'stat.food': '食料', 'stat.water': '水分', 'stat.oxygen': '酸素', 'stat.level': 'レベル', 'stat.xp': 'XP', 'stat.position': '位置',
    'act.heal': '回復', 'act.xp': 'XP 付与', 'act.give': 'アイテム付与', 'act.spawn': 'クリーチャー', 'act.tp': 'XYZ テレポート', 'act.goto': 'プレイヤーへ移動', 'act.bring': 'プレイヤーを呼ぶ', 'act.bringAll': '全員を呼ぶ', 'act.stats': 'ステータス設定', 'act.kill': 'キル', 'act.clear': 'インベントリ消去', 'act.kick': 'キック', 'act.ban': 'BAN', 'act.exempt': '除外する', 'act.unexempt': '除外を解除',
    'inv.title': 'インベントリ', 'inv.refresh': '更新', 'inv.empty': 'インベントリは空です', 'inv.Quickbar': 'クイックバー', 'inv.Backpack': 'バックパック', 'inv.Equipment': '装備', 'inv.Suit': 'スーツ', 'inv.General': '一般', 'inv.remove': 'アイテムを削除', 'inv.howMany': 'いくつ？', 'inv.durability': '耐久度',
    'items.search': 'アイテムを検索…', 'items.count': '{n} 件', 'items.more': 'さらに表示', 'all': 'すべて',
    'cat.weapons': '武器', 'cat.ammo': '弾薬', 'cat.tools': 'ツール', 'cat.armor': '防具', 'cat.attachments': 'アタッチメント', 'cat.consumables': '消耗品', 'cat.farming': '農業', 'cat.building': '建築', 'cat.benches': '作業台', 'cat.decoration': '装飾', 'cat.deployables': '設置物', 'cat.resources': '資源', 'cat.workshop': 'ワークショップ', 'cat.other': 'その他',
    'give.player': 'プレイヤー', 'give.qty': '数量', 'give.stack': 'スタック', 'give.submit': '付与', 'give.weight': '重量', 'give.maxStack': '最大スタック', 'give.noPlayers': 'オンラインのプレイヤーはいません',
    'cr.search': 'クリーチャーを検索…', 'cr.count': '{n} 体', 'tag.passive': '非敵対', 'tag.hostile': '敵対', 'tag.boss': 'ボス', 'tag.special': '特殊',
    'spawn.title': 'クリーチャーを出現', 'spawn.amount': '数', 'spawn.level': 'レベル', 'spawn.near': '近くのプレイヤー', 'spawn.min': '最小距離 (m)', 'spawn.max': '最大距離 (m)', 'spawn.submit': '出現させる', 'spawn.hint': 'プレイヤーの周囲のランダムな地点に出現します。',
    'world.time': '時刻', 'world.timeDesc': '現在のマップの時刻を変更します。', 'world.setTime': '適用', 'world.weather': '天候', 'world.weatherDesc': '進行中の嵐と天候イベントをすべて終了します。', 'world.stopWeather': '天候をクリア', 'world.save': 'ワールドを保存', 'world.saveDesc': 'プロスペクトのセーブを今すぐ書き込みます。', 'world.saveBtn': '今すぐ保存', 'world.broadcast': '全員へのメッセージ', 'world.message': 'サーバーメッセージ…', 'world.send': '送信', 'world.console': 'コンソールコマンド', 'world.run': '実行', 'world.diag': '診断', 'world.diagDesc': 'MOD が利用できるゲーム機能を確認します。', 'world.test': 'MOD をテスト', 'world.bringAll': 'プレイヤーを集める', 'world.bringAllDesc': '全プレイヤーを選択中のプレイヤーへテレポートします。',
    'rules.idle': '放置キック', 'rules.idleDesc': '移動もチャットもしないプレイヤーに警告し、その後キックします。', 'rules.minutes': 'キックまで (分)', 'rules.warn': '事前警告 (分)',
    'rules.min': '最少プレイヤー数', 'rules.minDesc': 'オンライン人数が足りない間はカウントダウンが進み、定期的に警告します。終了すると全員がキックされ、1人での進行を防ぎます。人数が揃うとリセットされます。', 'rules.players': '必要な人数', 'rules.after': 'キックまで (分)', 'rules.every': '警告の間隔 (分)', 'rules.countdown': '全員キックまで',
    'rules.messages': 'ゲーム内メッセージ', 'rules.placeholders': '変数: {name}, {minutes}, {players}', 'rules.save': 'ルールを保存', 'rules.saved': 'ルールを保存しました', 'rules.exempt': '除外プレイヤー', 'rules.exemptDesc': '上記のルールでキックされません。', 'rules.exemptAdd': 'Steam ID', 'rules.add': '追加', 'rules.bans': 'BAN リスト', 'rules.noBans': 'BAN されたプレイヤーはいません', 'rules.noExempt': '除外プレイヤーはいません', 'rules.unban': 'BAN 解除', 'rules.remove': '削除',
    'msg.idleWarning': '放置の警告', 'msg.idleKick': '放置キックの理由', 'msg.soloWarning': '人数不足の警告', 'msg.soloKick': '人数不足キックの理由', 'msg.banKick': 'BAN の理由',
    'log.all': 'すべて', 'log.chat': 'チャット', 'log.admin': '管理', 'log.joins': '入退室', 'log.rules': 'ルール', 'log.errors': 'エラー', 'log.empty': 'イベントはまだありません', 'log.join': '{name} が参加しました', 'log.leave': '{name} が退出しました', 'log.offline': 'サーバー MOD が応答しなくなりました', 'log.settings': 'ルールを更新',
    'dlg.cancel': 'キャンセル', 'dlg.confirm': '確認', 'dlg.reason': '理由', 'dlg.amount': '量', 'dlg.coords': '座標 (X Y、Z は任意)', 'dlg.player': 'プレイヤー', 'dlg.stat': 'ステータス', 'dlg.percent': '値 (%)',
    'confirm.kill': '{name} をキルしますか？', 'confirm.clear': '{name} のバックパックとクイックバーのアイテムをすべて削除しますか？元に戻せません。', 'confirm.kick': '{name} をキックしますか？', 'confirm.ban': '{name} を BAN しますか？今すぐ、そして戻るたびにキックされます。',
    'err.timeout': 'サーバー MOD が応答しません (サーバー停止中または MOD 未導入？)', 'err.forbidden': '権限がありません', 'ok': '完了',
    'perks.title': '無制限', 'perks.immune': '状態異常無効', 'perks.hint': '減ると自動で回復',
  },
  'ko-KR': {
    'login.user': '사용자 이름', 'login.password': '비밀번호', 'login.submit': '로그인', 'login.invalid': '사용자 이름 또는 비밀번호가 올바르지 않습니다',
    'top.online': '서버 온라인', 'top.offline': '모드 오프라인', 'top.logout': '로그아웃',
    'tab.players': '플레이어', 'tab.items': '아이템', 'tab.creatures': '생물', 'tab.world': '월드', 'tab.rules': '규칙', 'tab.log': '로그',
    'map.follow': '서버 맵 따라가기', 'map.fit': '맵 맞추기', 'map.none': '접속 중인 플레이어가 없습니다', 'map.tpHere': '{name}을(를) 여기로 순간이동', 'map.tpAll': '모두 여기로 순간이동', 'map.copy': '좌표 복사', 'map.copied': '좌표를 복사했습니다',
    'players.empty': '접속 중인 플레이어가 없습니다', 'players.waiting': '서버 모드를 기다리는 중…', 'players.noChar': '캐릭터 없음', 'players.idle': '{time} 동안 비활동', 'players.exempt': '예외',
    'stat.health': '체력', 'stat.stamina': '스태미나', 'stat.food': '음식', 'stat.water': '물', 'stat.oxygen': '산소', 'stat.level': '레벨', 'stat.xp': 'XP', 'stat.position': '위치',
    'act.heal': '치료', 'act.xp': 'XP 지급', 'act.give': '아이템 지급', 'act.spawn': '생물', 'act.tp': 'XYZ 순간이동', 'act.goto': '플레이어에게 이동', 'act.bring': '플레이어 소환', 'act.bringAll': '모두 소환', 'act.stats': '상태 설정', 'act.kill': '처치', 'act.clear': '인벤토리 비우기', 'act.kick': '추방', 'act.ban': '차단', 'act.exempt': '예외 지정', 'act.unexempt': '예외 해제',
    'inv.title': '인벤토리', 'inv.refresh': '새로고침', 'inv.empty': '인벤토리가 비어 있습니다', 'inv.Quickbar': '퀵바', 'inv.Backpack': '배낭', 'inv.Equipment': '장비', 'inv.Suit': '슈트', 'inv.General': '일반', 'inv.remove': '아이템 제거', 'inv.howMany': '몇 개?', 'inv.durability': '내구도',
    'items.search': '아이템 검색…', 'items.count': '아이템 {n}개', 'items.more': '더 보기', 'all': '전체',
    'cat.weapons': '무기', 'cat.ammo': '탄약', 'cat.tools': '도구', 'cat.armor': '방어구', 'cat.attachments': '부착물', 'cat.consumables': '소모품', 'cat.farming': '농사', 'cat.building': '건축', 'cat.benches': '작업대', 'cat.decoration': '장식', 'cat.deployables': '설치물', 'cat.resources': '자원', 'cat.workshop': '워크숍', 'cat.other': '기타',
    'give.player': '플레이어', 'give.qty': '수량', 'give.stack': '스택', 'give.submit': '지급', 'give.weight': '무게', 'give.maxStack': '최대 스택', 'give.noPlayers': '접속 중인 플레이어가 없습니다',
    'cr.search': '생물 검색…', 'cr.count': '생물 {n}종', 'tag.passive': '온순', 'tag.hostile': '적대', 'tag.boss': '보스', 'tag.special': '특수',
    'spawn.title': '생물 소환', 'spawn.amount': '수량', 'spawn.level': '레벨', 'spawn.near': '플레이어 근처', 'spawn.min': '최소 거리 (m)', 'spawn.max': '최대 거리 (m)', 'spawn.submit': '소환', 'spawn.hint': '플레이어 주변의 임의 지점에 나타납니다.',
    'world.time': '시간', 'world.timeDesc': '현재 맵의 시간을 변경합니다.', 'world.setTime': '적용', 'world.weather': '날씨', 'world.weatherDesc': '진행 중인 모든 폭풍과 날씨 이벤트를 종료합니다.', 'world.stopWeather': '날씨 맑음', 'world.save': '월드 저장', 'world.saveDesc': '지금 프로스펙트 저장 파일을 디스크에 기록합니다.', 'world.saveBtn': '지금 저장', 'world.broadcast': '전체 메시지', 'world.message': '서버 메시지…', 'world.send': '보내기', 'world.console': '콘솔 명령', 'world.run': '실행', 'world.diag': '진단', 'world.diagDesc': '모드가 사용할 수 있는 게임 기능을 확인합니다.', 'world.test': '모드 테스트', 'world.bringAll': '플레이어 모으기', 'world.bringAllDesc': '모든 플레이어를 선택한 플레이어에게 순간이동합니다.',
    'rules.idle': '비활동 추방', 'rules.idleDesc': '움직이지도 채팅하지도 않는 플레이어에게 경고 후 추방합니다.', 'rules.minutes': '추방까지 (분)', 'rules.warn': '사전 경고 (분)',
    'rules.min': '최소 플레이어', 'rules.minDesc': '접속 인원이 부족하면 주기적인 경고와 함께 카운트다운이 진행됩니다. 끝나면 모두 추방되어 혼자 진행하는 것을 막습니다. 인원이 채워지면 초기화됩니다.', 'rules.players': '필요 인원', 'rules.after': '추방까지 (분)', 'rules.every': '경고 간격 (분)', 'rules.countdown': '전원 추방까지',
    'rules.messages': '게임 내 메시지', 'rules.placeholders': '변수: {name}, {minutes}, {players}', 'rules.save': '규칙 저장', 'rules.saved': '규칙을 저장했습니다', 'rules.exempt': '예외 플레이어', 'rules.exemptDesc': '위 규칙으로 추방되지 않습니다.', 'rules.exemptAdd': 'Steam ID', 'rules.add': '추가', 'rules.bans': '차단 목록', 'rules.noBans': '차단된 플레이어가 없습니다', 'rules.noExempt': '예외 플레이어가 없습니다', 'rules.unban': '차단 해제', 'rules.remove': '제거',
    'msg.idleWarning': '비활동 경고', 'msg.idleKick': '비활동 추방 사유', 'msg.soloWarning': '인원 부족 경고', 'msg.soloKick': '인원 부족 추방 사유', 'msg.banKick': '차단 사유',
    'log.all': '전체', 'log.chat': '채팅', 'log.admin': '관리', 'log.joins': '접속', 'log.rules': '규칙', 'log.errors': '오류', 'log.empty': '아직 이벤트가 없습니다', 'log.join': '{name} 접속', 'log.leave': '{name} 퇴장', 'log.offline': '서버 모드가 응답하지 않습니다', 'log.settings': '규칙 업데이트',
    'dlg.cancel': '취소', 'dlg.confirm': '확인', 'dlg.reason': '사유', 'dlg.amount': '수량', 'dlg.coords': '좌표 (X Y, Z는 선택)', 'dlg.player': '플레이어', 'dlg.stat': '상태', 'dlg.percent': '값 (%)',
    'confirm.kill': '{name}을(를) 처치할까요?', 'confirm.clear': '{name}의 배낭과 퀵바 아이템을 모두 삭제할까요? 되돌릴 수 없습니다.', 'confirm.kick': '{name}을(를) 추방할까요?', 'confirm.ban': '{name}을(를) 차단할까요? 지금과 다시 접속할 때마다 추방됩니다.',
    'err.timeout': '서버 모드가 응답하지 않습니다 (서버 꺼짐 또는 모드 미설치?)', 'err.forbidden': '권한이 없습니다', 'ok': '완료',
    'perks.title': '무제한', 'perks.immune': '상태 이상 면역', 'perks.hint': '줄어들면 자동으로 회복',
  },
  'zh-Hans': {
    'login.user': '用户名', 'login.password': '密码', 'login.submit': '登录', 'login.invalid': '用户名或密码错误',
    'top.online': '服务器在线', 'top.offline': '模组离线', 'top.logout': '退出',
    'tab.players': '玩家', 'tab.items': '物品', 'tab.creatures': '生物', 'tab.world': '世界', 'tab.rules': '规则', 'tab.log': '日志',
    'map.follow': '跟随服务器地图', 'map.fit': '适应地图', 'map.none': '没有在线玩家', 'map.tpHere': '将 {name} 传送到这里', 'map.tpAll': '将所有人传送到这里', 'map.copy': '复制坐标', 'map.copied': '坐标已复制',
    'players.empty': '没有在线玩家', 'players.waiting': '正在等待服务器模组…', 'players.noChar': '无角色', 'players.idle': '闲置 {time}', 'players.exempt': '豁免',
    'stat.health': '生命', 'stat.stamina': '耐力', 'stat.food': '食物', 'stat.water': '水分', 'stat.oxygen': '氧气', 'stat.level': '等级', 'stat.xp': '经验', 'stat.position': '位置',
    'act.heal': '治疗', 'act.xp': '给予经验', 'act.give': '给予物品', 'act.spawn': '生物', 'act.tp': 'XYZ 传送', 'act.goto': '前往玩家', 'act.bring': '召唤玩家', 'act.bringAll': '召唤所有人', 'act.stats': '设置属性', 'act.kill': '击杀', 'act.clear': '清空背包', 'act.kick': '踢出', 'act.ban': '封禁', 'act.exempt': '豁免', 'act.unexempt': '取消豁免',
    'inv.title': '物品栏', 'inv.refresh': '刷新', 'inv.empty': '物品栏为空', 'inv.Quickbar': '快捷栏', 'inv.Backpack': '背包', 'inv.Equipment': '装备', 'inv.Suit': '环境服', 'inv.General': '通用', 'inv.remove': '移除物品', 'inv.howMany': '数量？', 'inv.durability': '耐久度',
    'items.search': '搜索物品…', 'items.count': '{n} 个物品', 'items.more': '显示更多', 'all': '全部',
    'cat.weapons': '武器', 'cat.ammo': '弹药', 'cat.tools': '工具', 'cat.armor': '护甲', 'cat.attachments': '配件', 'cat.consumables': '消耗品', 'cat.farming': '种植', 'cat.building': '建筑', 'cat.benches': '工作台', 'cat.decoration': '装饰', 'cat.deployables': '可部署', 'cat.resources': '资源', 'cat.workshop': '工坊', 'cat.other': '其他',
    'give.player': '玩家', 'give.qty': '数量', 'give.stack': '整组', 'give.submit': '给予', 'give.weight': '重量', 'give.maxStack': '最大堆叠', 'give.noPlayers': '没有在线玩家',
    'cr.search': '搜索生物…', 'cr.count': '{n} 种生物', 'tag.passive': '温顺', 'tag.hostile': '敌对', 'tag.boss': '首领', 'tag.special': '特殊',
    'spawn.title': '生成生物', 'spawn.amount': '数量', 'spawn.level': '等级', 'spawn.near': '靠近玩家', 'spawn.min': '最小距离 (米)', 'spawn.max': '最大距离 (米)', 'spawn.submit': '生成', 'spawn.hint': '生物会出现在玩家周围的随机位置。',
    'world.time': '时间', 'world.timeDesc': '更改当前地图的时间。', 'world.setTime': '应用', 'world.weather': '天气', 'world.weatherDesc': '结束所有风暴和天气事件。', 'world.stopWeather': '清除天气', 'world.save': '保存世界', 'world.saveDesc': '立即将勘探存档写入磁盘。', 'world.saveBtn': '立即保存', 'world.broadcast': '全体消息', 'world.message': '服务器消息…', 'world.send': '发送', 'world.console': '控制台命令', 'world.run': '执行', 'world.diag': '诊断', 'world.diagDesc': '检查模组可以访问哪些游戏功能。', 'world.test': '测试模组', 'world.bringAll': '集合玩家', 'world.bringAllDesc': '将所有玩家传送到所选玩家处。',
    'rules.idle': '闲置踢出', 'rules.idleDesc': '既不移动也不聊天的玩家会先收到警告，然后被踢出。', 'rules.minutes': '踢出时间 (分钟)', 'rules.warn': '提前警告 (分钟)',
    'rules.min': '最少玩家数', 'rules.minDesc': '在线人数不足时开始倒计时并定期警告。结束时所有人都会被踢出，防止有人独自推进。人数足够时倒计时重置。', 'rules.players': '所需玩家', 'rules.after': '踢出时间 (分钟)', 'rules.every': '警告间隔 (分钟)', 'rules.countdown': '所有人将在以下时间后被踢出',
    'rules.messages': '游戏内消息', 'rules.placeholders': '变量：{name}、{minutes}、{players}', 'rules.save': '保存规则', 'rules.saved': '规则已保存', 'rules.exempt': '豁免玩家', 'rules.exemptDesc': '不会被以上规则踢出。', 'rules.exemptAdd': 'Steam ID', 'rules.add': '添加', 'rules.bans': '封禁列表', 'rules.noBans': '没有被封禁的玩家', 'rules.noExempt': '没有豁免玩家', 'rules.unban': '解封', 'rules.remove': '移除',
    'msg.idleWarning': '闲置警告', 'msg.idleKick': '闲置踢出原因', 'msg.soloWarning': '人数不足警告', 'msg.soloKick': '人数不足踢出原因', 'msg.banKick': '封禁原因',
    'log.all': '全部', 'log.chat': '聊天', 'log.admin': '管理', 'log.joins': '进出', 'log.rules': '规则', 'log.errors': '错误', 'log.empty': '暂无事件', 'log.join': '{name} 加入了', 'log.leave': '{name} 离开了', 'log.offline': '服务器模组停止响应', 'log.settings': '规则已更新',
    'dlg.cancel': '取消', 'dlg.confirm': '确认', 'dlg.reason': '原因', 'dlg.amount': '数量', 'dlg.coords': '坐标 (X Y，Z 可选)', 'dlg.player': '玩家', 'dlg.stat': '属性', 'dlg.percent': '数值 (%)',
    'confirm.kill': '击杀 {name}？', 'confirm.clear': '删除 {name} 背包和快捷栏中的所有物品？此操作无法撤销。', 'confirm.kick': '踢出 {name}？', 'confirm.ban': '封禁 {name}？该玩家会被立即踢出，并在每次返回时被踢出。',
    'err.timeout': '服务器模组没有响应（服务器已关闭或未安装模组？）', 'err.forbidden': '没有权限', 'ok': '完成',
    'perks.title': '无限', 'perks.immune': '免疫异常状态', 'perks.hint': '下降时自动恢复',
  },
  'zh-Hant': {
    'login.user': '使用者名稱', 'login.password': '密碼', 'login.submit': '登入', 'login.invalid': '使用者名稱或密碼錯誤',
    'top.online': '伺服器在線', 'top.offline': '模組離線', 'top.logout': '登出',
    'tab.players': '玩家', 'tab.items': '物品', 'tab.creatures': '生物', 'tab.world': '世界', 'tab.rules': '規則', 'tab.log': '日誌',
    'map.follow': '跟隨伺服器地圖', 'map.fit': '縮放至地圖', 'map.none': '沒有在線玩家', 'map.tpHere': '將 {name} 傳送到這裡', 'map.tpAll': '將所有人傳送到這裡', 'map.copy': '複製座標', 'map.copied': '座標已複製',
    'players.empty': '沒有在線玩家', 'players.waiting': '正在等待伺服器模組…', 'players.noChar': '無角色', 'players.idle': '閒置 {time}', 'players.exempt': '豁免',
    'stat.health': '生命', 'stat.stamina': '耐力', 'stat.food': '食物', 'stat.water': '水分', 'stat.oxygen': '氧氣', 'stat.level': '等級', 'stat.xp': '經驗', 'stat.position': '位置',
    'act.heal': '治療', 'act.xp': '給予經驗', 'act.give': '給予物品', 'act.spawn': '生物', 'act.tp': 'XYZ 傳送', 'act.goto': '前往玩家', 'act.bring': '召喚玩家', 'act.bringAll': '召喚所有人', 'act.stats': '設定屬性', 'act.kill': '擊殺', 'act.clear': '清空背包', 'act.kick': '踢出', 'act.ban': '封鎖', 'act.exempt': '豁免', 'act.unexempt': '取消豁免',
    'inv.title': '物品欄', 'inv.refresh': '重新整理', 'inv.empty': '物品欄是空的', 'inv.Quickbar': '快捷欄', 'inv.Backpack': '背包', 'inv.Equipment': '裝備', 'inv.Suit': '環境服', 'inv.General': '一般', 'inv.remove': '移除物品', 'inv.howMany': '數量？', 'inv.durability': '耐久度',
    'items.search': '搜尋物品…', 'items.count': '{n} 個物品', 'items.more': '顯示更多', 'all': '全部',
    'cat.weapons': '武器', 'cat.ammo': '彈藥', 'cat.tools': '工具', 'cat.armor': '護甲', 'cat.attachments': '配件', 'cat.consumables': '消耗品', 'cat.farming': '種植', 'cat.building': '建築', 'cat.benches': '工作台', 'cat.decoration': '裝飾', 'cat.deployables': '可部署', 'cat.resources': '資源', 'cat.workshop': '工坊', 'cat.other': '其他',
    'give.player': '玩家', 'give.qty': '數量', 'give.stack': '整組', 'give.submit': '給予', 'give.weight': '重量', 'give.maxStack': '最大堆疊', 'give.noPlayers': '沒有在線玩家',
    'cr.search': '搜尋生物…', 'cr.count': '{n} 種生物', 'tag.passive': '溫馴', 'tag.hostile': '敵對', 'tag.boss': '首領', 'tag.special': '特殊',
    'spawn.title': '生成生物', 'spawn.amount': '數量', 'spawn.level': '等級', 'spawn.near': '靠近玩家', 'spawn.min': '最小距離 (公尺)', 'spawn.max': '最大距離 (公尺)', 'spawn.submit': '生成', 'spawn.hint': '生物會出現在玩家周圍的隨機位置。',
    'world.time': '時間', 'world.timeDesc': '變更目前地圖的時間。', 'world.setTime': '套用', 'world.weather': '天氣', 'world.weatherDesc': '結束所有風暴與天氣事件。', 'world.stopWeather': '清除天氣', 'world.save': '儲存世界', 'world.saveDesc': '立即將探勘存檔寫入磁碟。', 'world.saveBtn': '立即儲存', 'world.broadcast': '全體訊息', 'world.message': '伺服器訊息…', 'world.send': '傳送', 'world.console': '主控台指令', 'world.run': '執行', 'world.diag': '診斷', 'world.diagDesc': '檢查模組能存取哪些遊戲功能。', 'world.test': '測試模組', 'world.bringAll': '集合玩家', 'world.bringAllDesc': '將所有玩家傳送到所選玩家處。',
    'rules.idle': '閒置踢出', 'rules.idleDesc': '既不移動也不聊天的玩家會先收到警告，然後被踢出。', 'rules.minutes': '踢出時間 (分鐘)', 'rules.warn': '提前警告 (分鐘)',
    'rules.min': '最少玩家數', 'rules.minDesc': '在線人數不足時開始倒數並定期警告。結束時所有人都會被踢出，避免有人獨自推進。人數足夠時倒數會重設。', 'rules.players': '所需玩家', 'rules.after': '踢出時間 (分鐘)', 'rules.every': '警告間隔 (分鐘)', 'rules.countdown': '所有人將在以下時間後被踢出',
    'rules.messages': '遊戲內訊息', 'rules.placeholders': '變數：{name}、{minutes}、{players}', 'rules.save': '儲存規則', 'rules.saved': '規則已儲存', 'rules.exempt': '豁免玩家', 'rules.exemptDesc': '不會被以上規則踢出。', 'rules.exemptAdd': 'Steam ID', 'rules.add': '新增', 'rules.bans': '封鎖清單', 'rules.noBans': '沒有被封鎖的玩家', 'rules.noExempt': '沒有豁免玩家', 'rules.unban': '解除封鎖', 'rules.remove': '移除',
    'msg.idleWarning': '閒置警告', 'msg.idleKick': '閒置踢出原因', 'msg.soloWarning': '人數不足警告', 'msg.soloKick': '人數不足踢出原因', 'msg.banKick': '封鎖原因',
    'log.all': '全部', 'log.chat': '聊天', 'log.admin': '管理', 'log.joins': '進出', 'log.rules': '規則', 'log.errors': '錯誤', 'log.empty': '尚無事件', 'log.join': '{name} 加入了', 'log.leave': '{name} 離開了', 'log.offline': '伺服器模組停止回應', 'log.settings': '規則已更新',
    'dlg.cancel': '取消', 'dlg.confirm': '確認', 'dlg.reason': '原因', 'dlg.amount': '數量', 'dlg.coords': '座標 (X Y，Z 可選)', 'dlg.player': '玩家', 'dlg.stat': '屬性', 'dlg.percent': '數值 (%)',
    'confirm.kill': '擊殺 {name}？', 'confirm.clear': '刪除 {name} 背包與快捷欄中的所有物品？此動作無法復原。', 'confirm.kick': '踢出 {name}？', 'confirm.ban': '封鎖 {name}？該玩家會被立即踢出，並在每次返回時被踢出。',
    'err.timeout': '伺服器模組沒有回應（伺服器已關閉或未安裝模組？）', 'err.forbidden': '沒有權限', 'ok': '完成',
    'perks.title': '無限', 'perks.immune': '免疫異常狀態', 'perks.hint': '下降時自動恢復',
  },
};

let lang = 'en';
let game = {}; // data/i18n/<lang>.json
const listeners = new Set();

/** Picks the saved language, else the closest match to the browser language. */
export function detectLanguage() {
  try {
    const saved = localStorage.getItem('isk.lang');
    if (saved && LANGUAGES[saved]) return saved;
  } catch {}
  for (const l of navigator.languages || [navigator.language]) {
    if (LANGUAGES[l]) return l;
    const base = l.split('-')[0].toLowerCase();
    if (base === 'zh') return /TW|HK|Hant/i.test(l) ? 'zh-Hant' : 'zh-Hans';
    const hit = Object.keys(LANGUAGES).find((k) => k.split('-')[0] === base);
    if (hit) return hit;
  }
  return 'en';
}

export async function setLanguage(next) {
  lang = LANGUAGES[next] ? next : 'en';
  try {
    localStorage.setItem('isk.lang', lang);
  } catch {}
  document.documentElement.lang = lang;
  try {
    game = await fetch(`data/i18n/${lang}.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {}));
  } catch {
    game = {};
  }
  translateDom();
  for (const fn of listeners) fn(lang);
}

export const currentLanguage = () => lang;
export const onLanguageChange = (fn) => listeners.add(fn);

/** UI string with {placeholders}. */
export function t(key, vars) {
  const s = UI[lang]?.[key] ?? UI.en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : s;
}

/** Localized game name: section is items | creatures | maps. Returns [name, description?]. */
export function gameText(section, id, fallback) {
  const v = game[section]?.[id];
  if (Array.isArray(v)) return [v[0] || fallback, v[1] || ''];
  return [v || fallback, ''];
}

export function translateDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
}

export function fillLanguageSelects() {
  document.querySelectorAll('.lang-select').forEach((sel) => {
    sel.innerHTML = Object.entries(LANGUAGES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    sel.value = lang;
    sel.onchange = () => setLanguage(sel.value).then(() => document.querySelectorAll('.lang-select').forEach((s) => (s.value = lang)));
  });
}
