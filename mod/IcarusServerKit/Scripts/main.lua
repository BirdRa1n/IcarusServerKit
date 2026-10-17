--[[
  Icarus Server Kit - UE4SS Lua mod for the Icarus dedicated server.

  Talks to the web panel through plain files in ue4ss/Mods/IcarusServerKit/ipc:
    state.json      written every second (players, positions, world)
    commands.jsonl  appended by the panel, one JSON command per line
    results.jsonl   appended here, one JSON result per command
    events.jsonl    appended here (chat, deaths, diagnostics)
]]

local json = require("json")

local MOD_DIR = "ue4ss/Mods/IcarusServerKit/"
local IPC = MOD_DIR .. "ipc/"
local STATE_INTERVAL_MS = 1000
local POLL_INTERVAL_MS = 250

local VERSION = "1.0.0"

-- EDynamicItemProperties (from the server's reflection dump)
local DYN = {
    AssociatedItemInventoryId = 0, AssociatedItemInventorySlot = 1, DynamicState = 2,
    GunCurrentMagSize = 3, CurrentAmmoType = 4, BuildingVariation = 5, Durability = 6,
    ItemableStack = 7, MillijoulesRemaining = 8, TransmutableUnits = 9,
    Fillable_StoredUnits = 10, Fillable_Type = 11, Decayable_CurrentSpoilTime = 12,
    InventoryContainer_LinkedInventoryId = 13,
}
local DYN_NAME = {}
for k, v in pairs(DYN) do DYN_NAME[v] = k end

-- Player inventories shown in the panel, in display order.
local PLAYER_INVENTORIES = { "Quickbar", "Backpack", "Equipment", "Suit", "General" }

-------------------------------------------------------------------------------
-- helpers
-------------------------------------------------------------------------------
local function log(msg)
    print("[IcarusServerKit] " .. tostring(msg) .. "\n")
end

local function now_ms()
    return math.floor(os.time() * 1000)
end

local function append_line(file, obj)
    local f = io.open(IPC .. file, "a")
    if f then
        f:write(json.encode(obj), "\n")
        f:close()
    end
end

local function write_atomic(file, text)
    local tmp = IPC .. file .. ".tmp"
    local f = io.open(tmp, "w")
    if not f then return end
    f:write(text)
    f:close()
    os.remove(IPC .. file)
    os.rename(tmp, IPC .. file)
end

local function event(kind, text, extra)
    local e = extra or {}
    e.kind = kind
    e.text = text
    e.t = now_ms()
    append_line("events.jsonl", e)
end

local function valid(o)
    return o ~= nil and o.IsValid ~= nil and o:IsValid()
end

local function str(v)
    if v == nil then return nil end
    local t = type(v)
    if t == "string" then return v end
    if t == "userdata" and v.ToString then return v:ToString() end
    return tostring(v)
end

local function fname(s)
    if EFindName and EFindName.FNAME_Add then
        return FName(s, EFindName.FNAME_Add)
    end
    return FName(s)
end

local function try(fn, ...)
    local ok, a, b, c = pcall(fn, ...)
    if ok then return a, b, c end
    return nil
end

-------------------------------------------------------------------------------
-- game access
-------------------------------------------------------------------------------
local function game_mode()
    local gm = FindFirstOf("IcarusGameModeBase")
    if valid(gm) then return gm end
    return nil
end

local function cdo(path)
    local o = StaticFindObject(path)
    if valid(o) then return o end
    return nil
end

local function current_map()
    local gm = game_mode()
    if not gm then return nil end
    local full = gm:GetFullName() -- "Class /Game/Maps/Terrain_016_OLY/Terrain_016.Terrain_016:PersistentLevel.X"
    return full:match("/Game/Maps/[^%.]+/([^/%.]+)%.") or full:match("/Game/Maps/([^/%.]+)%.")
end

local function controllers()
    local out = {}
    local all = FindAllOf("IcarusPlayerController") or {}
    for _, pc in ipairs(all) do
        if valid(pc) and valid(pc.PlayerState) then
            out[#out + 1] = pc
        end
    end
    return out
end

local function player_id(pc)
    local ps = pc.PlayerState
    local pid = try(function() return str(ps.PlayerCharacterID.PlayerID) end)
    local slot = try(function() return ps.PlayerCharacterID.ChrSlot end)
    if pid and pid ~= "" then
        return pid .. ":" .. tostring(slot or 0), pid, slot
    end
    return pc:GetFullName(), nil, nil
end

local function player_name(pc)
    local ps = pc.PlayerState
    return try(function() return str(ps.PlayerNamePrivate) end)
        or try(function() return str(ps:GetPlayerName()) end)
        or "?"
end

local function pawn_of(pc)
    local p = try(function() return pc.Pawn end)
    if valid(p) then return p end
    p = try(function() return pc:K2_GetPawn() end)
    if valid(p) then return p end
    return nil
end

local function find_player(id)
    for _, pc in ipairs(controllers()) do
        local pid, steam = player_id(pc)
        if pid == id or steam == id or player_name(pc) == id then
            return pc
        end
    end
    return nil
end

local function proxy_of(pc)
    local p = try(function() return pc:GetNetworkProxyComponent() end)
    if valid(p) then return p end
    p = FindFirstOf("NetworkProxyComponent")
    -- only accept a proxy owned by this controller
    if valid(p) and try(function() return p:GetOwner() end) == pc then return p end
    return nil
end

local function inventory_component(pc)
    local pawn = pawn_of(pc)
    if not pawn then return nil end
    local ic = try(function() return pawn.InventoryComponent end)
    if valid(ic) then return ic end
    return nil
end

local function get_inventory(ic, id)
    local inv = try(function() return ic:GetInventory({ Value = fname(id) }) end)
    if valid(inv) then return inv end
    return nil
end

local function read_slots(inv)
    local items = {}
    local arr = try(function() return inv.Slots.Slots end)
    if not arr then return items, 0 end
    local n = 0
    arr:ForEach(function(i, elem)
        n = n + 1
        local slot = elem:get()
        local row = try(function() return str(slot.ItemData.ItemStaticData.RowName) end)
        if row and row ~= "None" and row ~= "" then
            local it = { slot = try(function() return slot.Index end) or (i - 1), item = row, count = 1, dyn = {} }
            try(function()
                slot.ItemData.ItemDynamicData:ForEach(function(_, d)
                    local dd = d:get()
                    local key = DYN_NAME[dd.PropertyType] or tostring(dd.PropertyType)
                    it.dyn[key] = dd.Value
                    if dd.PropertyType == DYN.ItemableStack then it.count = dd.Value end
                end)
            end)
            items[#items + 1] = it
        end
    end)
    return items, n
end

local function count_item(ic, static_row)
    local total = 0
    for _, id in ipairs(PLAYER_INVENTORIES) do
        local inv = get_inventory(ic, id)
        if inv then
            local items = read_slots(inv)
            for _, it in ipairs(items) do
                if it.item == static_row then total = total + it.count end
            end
        end
    end
    return total
end

local function vec(v)
    return { x = v.X, y = v.Y, z = v.Z }
end

-------------------------------------------------------------------------------
-- state snapshot
-------------------------------------------------------------------------------
local start_time = os.time()

local function snapshot()
    local players = json.array()
    for _, pc in ipairs(controllers()) do
        local id, steam, slot = player_id(pc)
        local p = { id = id, steamId = steam, slot = slot, name = player_name(pc) }
        local pawn = pawn_of(pc)
        if pawn then
            local loc = try(function() return pawn:K2_GetActorLocation() end)
            if loc then p.pos = vec(loc) end
            p.yaw = try(function() return pawn:K2_GetActorRotation().Yaw end)
            try(function()
                local st = pawn.ActorState
                p.health = st.Health
                p.maxHealth = st.MaxHealth
                p.alive = st.CurrentAliveState
            end)
        end
        p.ping = try(function() return pc.PlayerState.Ping * 4 end)
        players[#players + 1] = p
    end
    return {
        version = VERSION,
        map = current_map(),
        uptime = os.time() - start_time,
        time = now_ms(),
        players = players,
    }
end

-------------------------------------------------------------------------------
-- commands
-------------------------------------------------------------------------------
local Commands = {}

local function need_player(cmd)
    local pc = find_player(cmd.player or "")
    if not pc then error("jogador não encontrado: " .. tostring(cmd.player)) end
    return pc
end

local function trace_ground(x, y, z_hint)
    local ksl = cdo("/Script/Engine.Default__KismetSystemLibrary")
    local gm = game_mode()
    if not ksl or not gm then return nil end
    local hit = {}
    local ok = try(function()
        return ksl:LineTraceSingle(gm, { X = x, Y = y, Z = 200000 }, { X = x, Y = y, Z = -200000 },
            0, true, {}, 0, hit, true, { R = 0, G = 0, B = 0, A = 0 }, { R = 0, G = 0, B = 0, A = 0 }, 0)
    end)
    if ok then
        local z = try(function() return hit.Location.Z end) or try(function() return hit.ImpactPoint.Z end)
        if z then return z end
    end
    return z_hint
end

local function do_teleport(pc, x, y, z)
    local pawn = pawn_of(pc)
    if not pawn then error("jogador sem personagem (morto ou carregando)") end
    local tm = FindFirstOf("TeleportManagerSubsystem")
    if valid(tm) then
        local ok = try(function()
            tm:TeleportPlayer_Transform(pawn, {
                Rotation = { X = 0, Y = 0, Z = 0, W = 1 },
                Translation = { X = x, Y = y, Z = z },
                Scale3D = { X = 1, Y = 1, Z = 1 },
            })
            return true
        end)
        if ok then return "TeleportManager" end
    end
    local rot = try(function() return pawn:K2_GetActorRotation() end) or { Pitch = 0, Yaw = 0, Roll = 0 }
    pawn:K2_TeleportTo({ X = x, Y = y, Z = z }, rot)
    return "K2_TeleportTo"
end

Commands.ping = function()
    return { message = "pong", map = current_map() }
end

Commands.teleport = function(cmd)
    local pc = need_player(cmd)
    local x, y, z = tonumber(cmd.x), tonumber(cmd.y), tonumber(cmd.z)
    if not x or not y then error("coordenadas inválidas") end
    if not z then
        z = trace_ground(x, y, nil)
        if not z then error("não foi possível calcular a altura do terreno; informe Z") end
        z = z + 200
    end
    local how = do_teleport(pc, x, y, z)
    return { message = string.format("%s teleportado para %.0f, %.0f, %.0f (%s)", player_name(pc), x, y, z, how) }
end

Commands.teleport_to_player = function(cmd)
    local pc = need_player(cmd)
    local target = find_player(cmd.target or "")
    if not target then error("jogador alvo não encontrado") end
    local tp = pawn_of(target)
    if not tp then error("alvo sem personagem") end
    local loc = tp:K2_GetActorLocation()
    local how = do_teleport(pc, loc.X + 150, loc.Y, loc.Z + 100)
    return { message = string.format("%s teleportado até %s (%s)", player_name(pc), player_name(target), how) }
end

Commands.get_inventory = function(cmd)
    local pc = need_player(cmd)
    local ic = inventory_component(pc)
    if not ic then error("inventário indisponível (jogador morto ou carregando?)") end
    local out = json.array()
    for _, id in ipairs(PLAYER_INVENTORIES) do
        local inv = get_inventory(ic, id)
        if inv then
            local items, nslots = read_slots(inv)
            out[#out + 1] = { id = id, slots = nslots, items = json.array(items) }
        end
    end
    return { inventories = out }
end

-- FItemData from the game's own D_ItemTemplate row, with the stack size applied.
local function template_item_data(template, count)
    local lib = cdo("/Script/Icarus.Default__ItemTemplateLibrary")
    if not lib or type(template) ~= "string" then return nil end
    local out, valid_out = {}, {}
    local ok = pcall(function()
        lib:GetItemTemplateStruct({ RowName = fname(template), DataTableName = fname("D_ItemTemplate") }, out, valid_out)
    end)
    local row = ok and try(function() return str(out.ItemStaticData.RowName) end)
    if not row or row == "None" or row == "" then return nil end
    local dd = json.array()
    for _, d in ipairs(out.ItemDynamicData or {}) do
        if d.PropertyType ~= DYN.ItemableStack then
            dd[#dd + 1] = { PropertyType = d.PropertyType, Value = d.Value }
        end
    end
    if count > 1 then dd[#dd + 1] = { PropertyType = DYN.ItemableStack, Value = count } end
    return {
        ItemStaticData = { RowName = fname(row), DataTableName = fname("D_ItemsStatic") },
        ItemDynamicData = dd,
        ItemOwnerLookupId = -1,
    }, row
end

local function build_item_data(static_row, count, dyn)
    local dd = json.array()
    local has_stack = false
    for _, d in ipairs(dyn or {}) do
        local t = DYN[d.type] or tonumber(d.type)
        if t and t ~= DYN.ItemableStack then
            dd[#dd + 1] = { PropertyType = t, Value = math.floor(tonumber(d.value) or 0) }
        end
    end
    if count and count > 1 then
        dd[#dd + 1] = { PropertyType = DYN.ItemableStack, Value = count }
        has_stack = true
    end
    return {
        ItemStaticData = { RowName = fname(static_row), DataTableName = fname("D_ItemsStatic") },
        ItemDynamicData = dd,
        ItemOwnerLookupId = -1,
    }, has_stack
end

Commands.give_item = function(cmd)
    local pc = need_player(cmd)
    local static_row = cmd.static or cmd.item
    if type(static_row) ~= "string" or static_row == "" then error("item inválido") end
    local _, tpl_static = template_item_data(cmd.item, 1)
    if tpl_static then static_row = tpl_static end
    local count = math.max(1, math.floor(tonumber(cmd.count) or 1))
    local max_stack = math.max(1, math.floor(tonumber(cmd.maxStack) or 1))
    if count > 100000 then error("quantidade muito alta") end

    local ic = inventory_component(pc)
    local before = ic and count_item(ic, static_row) or nil
    local method = cmd.method or "controller"

    local remaining = count
    while remaining > 0 do
        local n = math.min(remaining, max_stack)
        local data = template_item_data(cmd.item, n) or build_item_data(static_row, n, cmd.dyn)
        if method == "controller" then
            pc:OnServer_AddItem(data)
        else
            local inv = ic and (get_inventory(ic, "Backpack") or get_inventory(ic, "Quickbar"))
            if not inv then error("inventário indisponível") end
            inv:AutomaticallyPlaceItem(data, {}, true, true)
        end
        remaining = remaining - n
    end

    local after = ic and count_item(ic, static_row) or nil
    local msg = string.format("%dx %s entregue a %s", count, static_row, player_name(pc))
    if before and after then
        if after - before <= 0 and method == "controller" then
            -- the controller path did not place anything; retry through the inventory
            cmd.method = "inventory"
            return Commands.give_item(cmd)
        end
        msg = msg .. string.format(" (inventário: %d → %d%s)", before, after,
            after - before < count and ", excedente pode ter caído no chão" or "")
    end
    return { message = msg, method = method, before = before, after = after }
end

Commands.remove_item = function(cmd)
    local pc = need_player(cmd)
    local ic = inventory_component(pc)
    if not ic then error("inventário indisponível") end
    local inv = get_inventory(ic, cmd.inventory or "Backpack")
    if not inv then error("inventário não encontrado: " .. tostring(cmd.inventory)) end
    local slot = math.floor(tonumber(cmd.slot) or -1)
    local amount = math.floor(tonumber(cmd.amount) or 1)
    inv:RemoveItem(slot, amount, true)
    return { message = string.format("removido %d do slot %d (%s) de %s", amount, slot, cmd.inventory, player_name(pc)) }
end

Commands.clear_inventory = function(cmd)
    local pc = need_player(cmd)
    local ic = inventory_component(pc)
    if not ic then error("inventário indisponível") end
    local cleared = {}
    local which = cmd.inventory and { cmd.inventory } or { "Quickbar", "Backpack" }
    for _, id in ipairs(which) do
        local inv = get_inventory(ic, id)
        if inv then
            inv:RemoveAllItems()
            cleared[#cleared + 1] = id
        end
    end
    return { message = "inventário limpo (" .. table.concat(cleared, ", ") .. ") de " .. player_name(pc) }
end

local STAT_FUNCS = {
    health = "Cheat_SetHealth", food = "Cheat_SetFood", water = "Cheat_SetWater",
    oxygen = "Cheat_SetOxygen", stamina = "Cheat_SetStamina",
}

Commands.set_stat = function(cmd)
    local pc = need_player(cmd)
    local fn = STAT_FUNCS[cmd.stat]
    if not fn then error("status inválido") end
    local proxy = proxy_of(pc)
    if not proxy then error("NetworkProxyComponent não encontrado") end
    local value = math.floor(tonumber(cmd.value) or 100)
    proxy[fn](proxy, value, cmd.percent ~= false)
    return { message = string.format("%s de %s = %d%s", cmd.stat, player_name(pc), value, cmd.percent ~= false and "%" or "") }
end

Commands.heal = function(cmd)
    local pc = need_player(cmd)
    local proxy = proxy_of(pc)
    local done = {}
    if proxy then
        for _, fn in ipairs({ "Cheat_SetHealth", "Cheat_SetFood", "Cheat_SetWater", "Cheat_SetOxygen", "Cheat_SetStamina" }) do
            if try(function() proxy[fn](proxy, 100, true); return true end) then done[#done + 1] = fn end
        end
    end
    if #done == 0 then
        local pawn = pawn_of(pc)
        if pawn then
            pawn.ActorState.Health = pawn.ActorState.MaxHealth
            done[#done + 1] = "Health"
        end
    end
    return { message = player_name(pc) .. " curado (" .. #done .. " status)" }
end

Commands.add_xp = function(cmd)
    local pc = need_player(cmd)
    local proxy = proxy_of(pc)
    if not proxy then error("NetworkProxyComponent não encontrado") end
    local v = math.floor(tonumber(cmd.value) or 0)
    proxy:Cheat_AddExperience(v)
    return { message = string.format("+%d XP para %s", v, player_name(pc)) }
end

Commands.kill = function(cmd)
    local pc = need_player(cmd)
    local proxy = proxy_of(pc)
    if not proxy then error("NetworkProxyComponent não encontrado") end
    proxy:Cheat_SetHealth(0, false)
    return { message = player_name(pc) .. " foi morto" }
end

Commands.kick = function(cmd)
    local pc = need_player(cmd)
    local name = player_name(pc)
    local _, steam = player_id(pc)
    local reason = cmd.reason or "Expulso pelo administrador"
    local gm = game_mode()
    local ok = gm and try(function()
        gm:KickPlayer(nil, steam or name, FText(reason))
        return true
    end)
    if not ok then
        pc:ClientReturnToMainMenuWithTextReason(FText(reason))
    end
    if cmd.ban and gm then
        try(function() gm:BanPlayer(nil, steam or name, FText(reason)) end)
    end
    return { message = string.format("%s %s: %s", name, cmd.ban and "banido" or "expulso", reason) }
end

Commands.broadcast = function(cmd)
    local gm = game_mode()
    if not gm then error("GameMode não encontrado") end
    local msg = tostring(cmd.message or "")
    if msg == "" then error("mensagem vazia") end
    gm:SendServerMessage(msg)
    return { message = "mensagem enviada" }
end

Commands.set_time_dilation = function(cmd)
    local pcs = controllers()
    local proxy = pcs[1] and proxy_of(pcs[1])
    local v = tonumber(cmd.value) or 1
    if proxy then
        proxy:Cheat_SetServerTimeDilation(v)
    else
        local gm = game_mode()
        local ksl = cdo("/Script/Engine.Default__GameplayStatics")
        ksl:SetGlobalTimeDilation(gm, v)
    end
    return { message = "velocidade do tempo = " .. v }
end

Commands.console = function(cmd)
    local ksl = cdo("/Script/Engine.Default__KismetSystemLibrary")
    local gm = game_mode()
    if not ksl or not gm then error("mundo não carregado") end
    ksl:ExecuteConsoleCommand(gm, tostring(cmd.command or ""), nil)
    return { message = "executado: " .. tostring(cmd.command) }
end

Commands.selftest = function()
    local r = { map = current_map() }
    r.gameMode = game_mode() and game_mode():GetFullName() or nil
    r.teleportManager = valid(FindFirstOf("TeleportManagerSubsystem"))
    r.kismet = cdo("/Script/Engine.Default__KismetSystemLibrary") ~= nil
    r.groundAtOrigin = trace_ground(0, 0, nil)
    r.controllers = #controllers()
    -- probe how UE4SS fills struct out-params (used by the ground trace)
    local lib = cdo("/Script/Icarus.Default__ItemTemplateLibrary")
    if lib then
        local out, valid_out = {}, {}
        local ok, e = pcall(function()
            lib:GetItemTemplateStruct({ RowName = fname("Wood"), DataTableName = fname("D_ItemTemplate") }, out, valid_out)
        end)
        r.outParamCall = ok and "ok" or tostring(e)
        local keys = {}
        for k, v in pairs(out) do keys[#keys + 1] = tostring(k) .. "=" .. type(v) end
        r.outParamKeys = table.concat(keys, ",")
        r.outParamRow = try(function() return str(out.ItemStaticData.RowName) end)
    end
    local ksl = cdo("/Script/Engine.Default__KismetSystemLibrary")
    if ksl then
        local hit = {}
        local ok, ret = pcall(function()
            return ksl:LineTraceSingle(game_mode(), { X = 0, Y = 0, Z = 200000 }, { X = 0, Y = 0, Z = -200000 },
                0, true, {}, 0, hit, true, { R = 0, G = 0, B = 0, A = 0 }, { R = 0, G = 0, B = 0, A = 0 }, 0)
        end)
        r.traceCall = ok and tostring(ret) or tostring(ret)
        local keys = {}
        for k, v in pairs(hit) do keys[#keys + 1] = tostring(k) .. "=" .. type(v) end
        r.traceHitKeys = table.concat(keys, ",")
    end
    return { message = "selftest ok", result = r }
end

local function run_command(cmd)
    local fn = Commands[cmd.type]
    local res
    if not fn then
        res = { ok = false, error = "comando desconhecido: " .. tostring(cmd.type) }
    else
        local ok, r = pcall(fn, cmd)
        if ok then
            res = r or {}
            res.ok = true
        else
            -- drop the "...\main.lua:123: " prefix Lua adds to error()
            res = { ok = false, error = (tostring(r):gsub("^.-%.lua:%d+: ", "")) }
        end
    end
    res.id = cmd.id
    res.type = cmd.type
    append_line("results.jsonl", res)
    if not res.ok then log("command " .. tostring(cmd.type) .. " failed: " .. tostring(res.error)) end
end

-------------------------------------------------------------------------------
-- command queue (append-only file, read from the last offset)
-------------------------------------------------------------------------------
local cmd_offset = 0

local function file_size(path)
    local f = io.open(path, "rb")
    if not f then return nil end
    local s = f:seek("end")
    f:close()
    return s
end

local function poll_commands()
    local path = IPC .. "commands.jsonl"
    local size = file_size(path)
    if not size then return end
    if size < cmd_offset then cmd_offset = 0 end -- panel rotated the file
    if size == cmd_offset then return end
    local f = io.open(path, "rb")
    if not f then return end
    f:seek("set", cmd_offset)
    local chunk = f:read(size - cmd_offset)
    f:close()
    local last_nl = chunk:match(".*()\n")
    if not last_nl then return end
    cmd_offset = cmd_offset + last_nl
    for line in chunk:sub(1, last_nl):gmatch("[^\n]+") do
        local ok, cmd = pcall(json.decode, line)
        if ok and type(cmd) == "table" then
            run_command(cmd)
        else
            log("bad command line: " .. line)
        end
    end
end

-------------------------------------------------------------------------------
-- hooks
-------------------------------------------------------------------------------
local function register_hooks()
    local ok, err = pcall(RegisterHook, "/Script/Icarus.IcarusPlayerController:ServerSendChatMessage", function(ctx, msg)
        local pc = ctx:get()
        local name = valid(pc) and player_name(pc) or "?"
        local text = str(msg:get())
        event("chat", name .. ": " .. tostring(text), { player = name, message = text })
    end)
    if not ok then log("chat hook failed: " .. tostring(err)) end
end

-------------------------------------------------------------------------------
-- main loop
-------------------------------------------------------------------------------
os.execute('mkdir "' .. IPC:gsub("/", "\\") .. '" >nul 2>nul')

-- ignore commands that were queued before the server started
cmd_offset = file_size(IPC .. "commands.jsonl") or 0
-- start a fresh results/events file
write_atomic("results.jsonl", "")
write_atomic("events.jsonl", "")

local hooks_done = false
local last_state = 0
local busy = false

LoopAsync(POLL_INTERVAL_MS, function()
    if busy then return false end
    busy = true
    ExecuteInGameThread(function()
        local ok, err = pcall(function()
            if not hooks_done then
                hooks_done = true
                register_hooks()
            end
            poll_commands()
            local t = now_ms()
            if t - last_state >= STATE_INTERVAL_MS then
                last_state = t
                write_atomic("state.json", json.encode(snapshot()))
            end
        end)
        if not ok then log("tick error: " .. tostring(err)) end
        busy = false
    end)
    return false
end)

event("system", "Icarus Server Kit " .. VERSION .. " iniciado")
log("loaded v" .. VERSION .. ", IPC at " .. IPC)
