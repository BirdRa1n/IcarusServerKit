--[[
  Panel commands. Each handler receives the command table and returns a result table
  (merged into { ok = true, id, type }) or raises an error with a readable message.
]]
local json = require("lib.json")
local util = require("isk.util")
local game = require("isk.game")
local settings = require("isk.settings")
local try, cdo, fname = util.try, util.cdo, util.fname

local C = {}

------------------------------------------------------------------------------- info

function C.ping()
    return { message = "pong", map = game.map_name() }
end

--- Reports which game APIs are reachable (useful after game updates).
function C.selftest()
    local gm = game.game_mode()
    return {
        message = "selftest ok",
        result = {
            map = game.map_name(),
            gameMode = gm and gm:GetFullName() or nil,
            players = #game.controllers(),
            teleportManager = util.first("TeleportManagerSubsystem") ~= nil,
            timeOfDay = util.first("TimeOfDaySubsystem") ~= nil,
            weather = util.first("WeatherController") ~= nil,
            aiLibrary = cdo("/Script/Icarus.Default__IcarusAIBlueprintFunctionLibrary") ~= nil,
            itemTemplates = cdo("/Script/Icarus.Default__ItemTemplateLibrary") ~= nil,
            groundAtOrigin = game.ground_z(0, 0),
        },
    }
end

------------------------------------------------------------------------------- movement

function C.teleport(cmd)
    local pc = game.require_player(cmd.player)
    local x, y, z = tonumber(cmd.x), tonumber(cmd.y), tonumber(cmd.z)
    if not x or not y then error("invalid coordinates") end
    if not z then
        z = game.ground_z(x, y, nil, nil, game.pawn(pc))
        if not z then error("could not find the ground height here; enter Z manually") end
        z = z + 200
    end
    game.teleport(pc, x, y, z)
    return { message = string.format("%s -> %.0f, %.0f, %.0f", game.player_name(pc), x, y, z) }
end

function C.teleport_to_player(cmd)
    local pc = game.require_player(cmd.player)
    local target = game.require_player(cmd.target)
    local loc = game.location(target)
    if not loc then error("target has no character") end
    game.teleport(pc, loc.X + 150, loc.Y, loc.Z + 100)
    return { message = game.player_name(pc) .. " -> " .. game.player_name(target) }
end

--- Brings every other player next to `player`.
function C.bring_all(cmd)
    local target = game.require_player(cmd.player)
    local loc = game.location(target)
    if not loc then error("target has no character") end
    local n = 0
    for i, pc in ipairs(game.controllers()) do
        if pc ~= target and game.pawn(pc) then
            local a = i * 1.3
            game.teleport(pc, loc.X + math.cos(a) * 250, loc.Y + math.sin(a) * 250, loc.Z + 100)
            n = n + 1
        end
    end
    return { message = string.format("%d -> %s", n, game.player_name(target)), count = n }
end

------------------------------------------------------------------------------- inventory

function C.get_inventory(cmd)
    local ic = game.require_inventory(game.require_player(cmd.player))
    local out = json.array()
    for _, id in ipairs(game.PLAYER_INVENTORIES) do
        local inv = game.inventory(ic, id)
        if inv then
            local items, slots = game.read_slots(inv)
            out[#out + 1] = { id = id, slots = slots, items = json.array(items) }
        end
    end
    return { inventories = out }
end

--- Raises existing stacks of `static_row` by up to `need` units. Returns units added.
local function top_up(ic, static_row, need, max_stack)
    local added = 0
    for _, id in ipairs({ "Quickbar", "Backpack" }) do
        local inv = game.inventory(ic, id)
        if inv then
            for _, it in ipairs(game.read_slots(inv)) do
                if added >= need then return added end
                if it.item == static_row and it.count < max_stack then
                    local add = math.min(need - added, max_stack - it.count)
                    if try(function() inv:SetItemDynamicProperty(it.slot, game.DYN.ItemableStack, it.count + add); return true end) then
                        added = added + add
                    end
                end
            end
        end
    end
    return added
end

--[[
  The game's add-item paths may ignore the requested stack size and create one unit, so each
  step is measured against the real inventory and the shortfall is made up: inventory placement,
  then raising stack sizes, then single units as a last resort.
]]
function C.give_item(cmd)
    local pc = game.require_player(cmd.player)
    local ic = game.require_inventory(pc)
    local count = math.floor(tonumber(cmd.count) or 1)
    local max_stack = math.max(1, math.floor(tonumber(cmd.maxStack) or 1))
    if count < 1 or count > 100000 then error("invalid quantity") end
    if type(cmd.item) ~= "string" or cmd.item == "" then error("invalid item") end
    local _, static_row = game.item_data(cmd.item, cmd.static or cmd.item, 1)

    local function total() return game.count_item(ic, static_row) end
    local function place(n)
        local inv = game.inventory(ic, "Backpack") or game.inventory(ic, "Quickbar")
        if inv and try(function() inv:AutomaticallyPlaceItem((game.item_data(cmd.item, static_row, n)), {}, true, true); return true end) then
            return
        end
        try(function() pc:OnServer_AddItem((game.item_data(cmd.item, static_row, n))) end)
    end

    local start = total()
    local remaining = count
    for _ = 1, 200 do
        if remaining <= 0 then break end
        local n = math.min(remaining, max_stack)
        local before = total()
        place(n)
        local got = total() - before
        if got <= 0 then
            try(function() pc:OnServer_AddItem((game.item_data(cmd.item, static_row, 1))) end)
            got = total() - before
        end
        if got <= 0 then break end
        if got < n then
            top_up(ic, static_row, n - got, max_stack)
            got = total() - before
        end
        if got < n then
            for _ = 1, math.min(n - got, 1000) do
                try(function() pc:OnServer_AddItem((game.item_data(cmd.item, static_row, 1))) end)
            end
            got = total() - before
        end
        remaining = remaining - got
    end

    local given = total() - start
    if given <= 0 then error("the game did not add the item (inventory full?)") end
    return {
        message = string.format("%dx %s -> %s", given, static_row, game.player_name(pc)),
        given = given,
        requested = count,
    }
end

function C.remove_item(cmd)
    local pc = game.require_player(cmd.player)
    local inv = game.inventory(game.require_inventory(pc), cmd.inventory or "Backpack")
    if not inv then error("inventory not found: " .. tostring(cmd.inventory)) end
    local slot = math.floor(tonumber(cmd.slot) or -1)
    local amount = math.max(1, math.floor(tonumber(cmd.amount) or 1))
    inv:RemoveItem(slot, amount, true)
    return { message = string.format("-%d (%s #%d) %s", amount, cmd.inventory, slot, game.player_name(pc)) }
end

function C.clear_inventory(cmd)
    local pc = game.require_player(cmd.player)
    local ic = game.require_inventory(pc)
    local cleared = {}
    for _, id in ipairs(cmd.inventory and { cmd.inventory } or { "Quickbar", "Backpack" }) do
        local inv = game.inventory(ic, id)
        if inv then
            inv:RemoveAllItems()
            cleared[#cleared + 1] = id
        end
    end
    return { message = game.player_name(pc) .. ": " .. table.concat(cleared, ", ") }
end

------------------------------------------------------------------------------- character

--- Restores health, stamina, food, water and oxygen and ends harmful conditions (broken bones,
--- wounds, infections, poisoning...).
function C.heal(cmd)
    local pc = game.require_player(cmd.player)
    local st = game.require_state(pc)
    local done = {}
    for _, key in ipairs({ "health", "stamina", "food", "water", "oxygen" }) do
        if try(function() return game.set_stat(st, key, 100) end) then done[#done + 1] = key end
    end
    -- conditions are best effort: a failure there must not undo the stat refill
    local ok, cured = pcall(game.cure, pc)
    if not ok then
        util.log("cure failed: " .. util.clean_error(cured))
        cured = {}
    end
    if #done == 0 and #cured == 0 then error("could not change any stat") end
    local msg = game.player_name(pc) .. ": " .. table.concat(done, ", ")
    if #cured > 0 then msg = msg .. " | " .. table.concat(cured, ", ") end
    return { message = msg, cured = cured }
end

--- Ends harmful conditions only.
function C.cure(cmd)
    local pc = game.require_player(cmd.player)
    local cured = game.cure(pc)
    return { message = game.player_name(pc) .. ": " .. (#cured > 0 and table.concat(cured, ", ") or "-"), cured = cured }
end

--- Lists the conditions on a player's character (for diagnostics).
function C.get_conditions(cmd)
    local pc = game.require_player(cmd.player)
    local pawn = game.pawn(pc)
    if not pawn then error("player has no character") end
    local list = json.array()
    for _, comp in ipairs(game.modifiers(pawn)) do
        list[#list + 1] = {
            id = try(function() return util.str(comp.DataRowHandleNew.RowName) end),
            type = try(function() return comp.CachedModifierStateData.Type end),
            remaining = try(function() return comp.RemainingTime end),
        }
    end
    return { conditions = list }
end

function C.set_stat(cmd)
    local pc = game.require_player(cmd.player)
    local value, max = game.set_stat(game.require_state(pc), cmd.stat, tonumber(cmd.value) or 100)
    return { message = string.format("%s %s = %d/%d", game.player_name(pc), cmd.stat, value, max) }
end

function C.add_xp(cmd)
    local pc = game.require_player(cmd.player)
    local st = game.require_state(pc)
    local v = math.floor(tonumber(cmd.value) or 0)
    if v <= 0 then error("invalid amount") end
    local before = try(function() return st.TotalExperience end)
    st:AddExperience(v)
    local after = try(function() return st.TotalExperience end)
    return { message = string.format("+%d XP %s", v, game.player_name(pc)), before = before, after = after }
end

function C.kill(cmd)
    local pc = game.require_player(cmd.player)
    game.require_state(pc):SetHealth(0)
    return { message = game.player_name(pc) }
end

function C.kick(cmd)
    local pc = game.require_player(cmd.player)
    local name = game.player_name(pc)
    local reason = type(cmd.reason) == "string" and cmd.reason ~= "" and cmd.reason
        or (cmd.ban and settings.get().messages.banKick)
        or "Kicked by an administrator."
    game.kick(pc, reason)
    return { message = name }
end

------------------------------------------------------------------------------- world

function C.broadcast(cmd)
    local msg = tostring(cmd.message or "")
    if msg == "" then error("empty message") end
    game.broadcast(msg)
    return { message = msg }
end

function C.set_time(cmd)
    local hour = math.floor(tonumber(cmd.hour) or -1)
    if hour < 0 or hour > 23 then error("hour must be 0-23") end
    local tod = util.first("TimeOfDaySubsystem")
    if not tod then error("time of day is not available on this map") end
    tod:SetTimeOfDayHour(hour)
    return { message = string.format("%02d:00", hour) }
end

function C.stop_weather()
    local n = 0
    for _, w in ipairs(FindAllOf("WeatherController") or {}) do
        if util.valid(w) and try(function() w:ForceStopAllWeatherEvents(); return true end) then n = n + 1 end
    end
    if n == 0 then error("weather controller not found") end
    return { message = "weather cleared" }
end

function C.save_world()
    local gm = game.game_mode()
    if not gm then error("game mode not found") end
    gm:ForceImmediateProspectSave()
    return { message = "saved" }
end

--- Spawns `count` creatures at random points 15-40 m around a player.
function C.spawn_creature(cmd)
    local pc = game.require_player(cmd.player)
    local pawn = game.pawn(pc)
    local loc = game.location(pc)
    if not pawn or not loc then error("player has no character") end
    local creature = tostring(cmd.creature or "")
    if creature == "" then error("invalid creature") end
    local count = util.clamp(math.floor(tonumber(cmd.count) or 1), 1, 30)
    local level = util.clamp(math.floor(tonumber(cmd.level) or 1), 1, 200)
    local rmin = util.clamp(tonumber(cmd.minDistance) or 1500, 300, 20000)
    local rmax = math.max(rmin, util.clamp(tonumber(cmd.maxDistance) or 4000, 300, 30000))
    local lib = cdo("/Script/Icarus.Default__IcarusAIBlueprintFunctionLibrary")
    if not lib then error("AI library not found") end

    local spawned = 0
    for _ = 1, count do
        local a = math.random() * math.pi * 2
        local r = rmin + math.random() * (rmax - rmin)
        local x, y = loc.X + math.cos(a) * r, loc.Y + math.sin(a) * r
        local z = game.ground_z(x, y, loc.Z + 5000, loc.Z - 8000, pawn) or loc.Z
        local actor = try(function()
            return lib:SpawnNewAI(pawn,
                { RowName = fname(creature), DataTableName = fname("D_AISetup") },
                { RowName = fname("None"), DataTableName = fname("D_EpicCreatures") },
                { Rotation = { X = 0, Y = 0, Z = 0, W = 1 }, Translation = { X = x, Y = y, Z = z + 150 }, Scale3D = { X = 1, Y = 1, Z = 1 } },
                level, 2, nil, nil, -1)
        end)
        if actor == nil or util.valid(actor) then spawned = spawned + 1 end
    end
    if spawned == 0 then error("the game did not spawn " .. creature) end
    return { message = string.format("%dx %s -> %s", spawned, creature, game.player_name(pc)), spawned = spawned }
end

function C.console(cmd)
    local ksl = cdo("/Script/Engine.Default__KismetSystemLibrary")
    local gm = game.game_mode()
    if not ksl or not gm then error("world not loaded") end
    ksl:ExecuteConsoleCommand(gm, tostring(cmd.command or ""), nil)
    return { message = tostring(cmd.command) }
end

------------------------------------------------------------------------------- dispatch

local M = {}

--- Runs one command and returns its result table (never raises).
function M.run(cmd)
    local fn = C[cmd.type]
    local res
    if not fn then
        res = { ok = false, error = "unknown command: " .. tostring(cmd.type) }
    else
        local ok, r = pcall(fn, cmd)
        if ok then
            res = r or {}
            res.ok = true
        else
            res = { ok = false, error = util.clean_error(r) }
            util.log("command " .. tostring(cmd.type) .. " failed: " .. res.error)
        end
    end
    res.id = cmd.id
    res.type = cmd.type
    return res
end

return M
