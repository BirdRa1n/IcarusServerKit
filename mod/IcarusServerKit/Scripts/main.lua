--[[
  Icarus Server Kit - UE4SS Lua mod for the Icarus dedicated server.

  Every 250 ms (on the game thread) it runs panel commands; every second it evaluates the
  server rules and publishes the server state for the web panel. See isk/ipc.lua for the
  file protocol and isk/settings.lua for the rule settings.
]]
local json = require("lib.json")
local util = require("isk.util")
local ipc = require("isk.ipc")
local game = require("isk.game")
local settings = require("isk.settings")
local commands = require("isk.commands")
local rules = require("isk.rules")

local VERSION = "2.0.0"
local TICK_MS = 250
local STATE_EVERY_S = 1
local SETTINGS_EVERY_S = 3

local started = util.now()
local last_state, last_settings = 0, 0
local rule_status = {}

--- Online players with their ids, collected once per tick.
local function collect_players()
    local list = {}
    for _, pc in ipairs(game.controllers()) do
        local id, steam, slot = game.player_id(pc)
        list[#list + 1] = { pc = pc, id = id, steam = steam, slot = slot, name = game.player_name(pc) }
    end
    return list
end

local function snapshot(players)
    local out = json.array()
    for _, p in ipairs(players) do
        local entry = { id = p.id, steamId = p.steam, slot = p.slot, name = p.name }
        local pawn = game.pawn(p.pc)
        if pawn then
            local loc = util.try(function() return pawn:K2_GetActorLocation() end)
            if loc then entry.pos = { x = loc.X, y = loc.Y, z = loc.Z } end
            entry.yaw = util.try(function() return pawn:K2_GetActorRotation().Yaw end)
        end
        local st = game.actor_state(p.pc)
        if st then
            entry.stats = game.stats(st)
            entry.alive = util.try(function() return st.CurrentAliveState end)
        end
        entry.ping = util.try(function() return p.pc.PlayerState.Ping * 4 end)
        entry.idle = rule_status.idle and rule_status.idle[p.id] or nil
        entry.exempt = settings.is_exempt(p.steam) or settings.is_exempt(p.id)
        out[#out + 1] = entry
    end
    return {
        version = VERSION,
        map = game.map_name(),
        hour = game.time_of_day(),
        uptime = util.now() - started,
        time = util.now() * 1000,
        players = out,
        rules = { minPlayers = rule_status.minPlayers },
    }
end

local function tick()
    ipc.poll_commands(function(cmd)
        ipc.result(commands.run(cmd))
    end)

    local now = util.now()
    if now - last_settings >= SETTINGS_EVERY_S then
        last_settings = now
        if settings.reload() then util.log("settings loaded") end
    end
    if now - last_state >= STATE_EVERY_S then
        last_state = now
        local players = collect_players()
        local ok, status = pcall(rules.tick, players)
        if ok then rule_status = status else util.log("rules error: " .. util.clean_error(status)) end
        ipc.write_state(snapshot(players))
    end
end

local function register_hooks()
    local ok, err = pcall(RegisterHook, "/Script/Icarus.IcarusPlayerController:ServerSendChatMessage", function(ctx, msg)
        local pc = ctx:get()
        if not util.valid(pc) then return end
        local id = game.player_id(pc)
        local name = game.player_name(pc)
        local text = util.str(msg:get())
        rules.touch(id)
        ipc.event("chat", name .. ": " .. tostring(text), { player = name, message = text })
    end)
    if not ok then util.log("chat hook failed: " .. tostring(err)) end
end

------------------------------------------------------------------------------- start

ipc.init()
settings.reload()
math.randomseed(os.time())

local hooks_done, busy = false, false
LoopAsync(TICK_MS, function()
    if busy then return false end
    busy = true
    ExecuteInGameThread(function()
        if not hooks_done then
            hooks_done = true
            register_hooks()
        end
        local ok, err = pcall(tick)
        if not ok then util.log("tick error: " .. util.clean_error(err)) end
        busy = false
    end)
    return false
end)

ipc.event("system", "Icarus Server Kit " .. VERSION .. " started")
util.log("loaded v" .. VERSION)
