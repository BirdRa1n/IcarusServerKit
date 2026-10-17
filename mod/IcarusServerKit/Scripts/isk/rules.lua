--[[
  Automatic server rules, evaluated once per second:

  - bans:        banned players are kicked as soon as they appear
  - idle:        players that neither move nor chat for `minutes` are warned, then kicked
  - minPlayers:  while fewer than `players` are online, a countdown runs; everyone is warned
                 every `warnEveryMinutes` and kicked when it reaches zero, so nobody keeps
                 progressing alone. The countdown resets as soon as enough players are online.

  Players listed in settings.exempt are never kicked by idle/minPlayers.
]]
local util = require("isk.util")
local game = require("isk.game")
local settings = require("isk.settings")
local ipc = require("isk.ipc")

local M = {}

local IDLE_MOVE_UNITS = 150 -- moving less than this (1.5 m) does not count as activity
local IDLE_TURN_DEGREES = 15

local activity = {} -- id -> { x, y, z, yaw, last, warned }
local solo = { since = nil, next_warn = 0 }

--- Marks a player as active (called on chat).
function M.touch(id)
    local a = activity[id]
    if a then
        a.last = util.now()
        a.warned = false
    end
end

local function update_activity(id, pawn, now)
    local loc = util.try(function() return pawn:K2_GetActorLocation() end)
    local yaw = util.try(function() return pawn:K2_GetActorRotation().Yaw end) or 0
    local a = activity[id]
    if not loc then return a end
    if not a then
        a = { x = loc.X, y = loc.Y, z = loc.Z, yaw = yaw, last = now, warned = false }
        activity[id] = a
        return a
    end
    local dx, dy, dz = loc.X - a.x, loc.Y - a.y, loc.Z - a.z
    local turn = math.abs(((yaw - a.yaw) + 180) % 360 - 180)
    if dx * dx + dy * dy + dz * dz > IDLE_MOVE_UNITS * IDLE_MOVE_UNITS or turn > IDLE_TURN_DEGREES then
        a.x, a.y, a.z, a.yaw = loc.X, loc.Y, loc.Z, yaw
        a.last = now
        a.warned = false
    end
    return a
end

local recently_kicked = {} -- id -> time, so a client that is still leaving is not kicked again every second

local function kick(pc, reason, rule)
    local id = game.player_id(pc)
    local now = util.now()
    if recently_kicked[id] and now - recently_kicked[id] < 15 then return end
    recently_kicked[id] = now
    local name = game.player_name(pc)
    if util.try(function() game.kick(pc, reason); return true end) then
        ipc.event("rule", name .. ": " .. reason, { rule = rule, player = name })
    end
end

--- Evaluates the rules. Returns a status table for the panel.
function M.tick(players)
    local cfg = settings.get()
    local rules, msg = cfg.rules, cfg.messages
    local now = util.now()
    local status = { idle = {}, minPlayers = nil }
    local present = {}

    for _, p in ipairs(players) do
        local pc, id, steam = p.pc, p.id, p.steam
        present[id] = true

        local ban = settings.ban_of(steam or id) or settings.ban_of(id)
        if ban then
            kick(pc, ban.reason and ban.reason ~= "" and ban.reason or msg.banKick, "ban")
        else
            local pawn = game.pawn(pc)
            local a = pawn and update_activity(id, pawn, now)
            if a then
                local idle = now - a.last
                status.idle[id] = idle
                local exempt = settings.is_exempt(steam) or settings.is_exempt(id)
                if rules.idle.enabled and not exempt then
                    local limit = math.max(1, rules.idle.minutes) * 60
                    local warn_at = limit - math.max(0, rules.idle.warnMinutes) * 60
                    if idle >= limit then
                        kick(pc, msg.idleKick, "idle")
                        activity[id] = nil
                    elseif idle >= warn_at and not a.warned then
                        a.warned = true
                        util.try(game.broadcast, util.format(msg.idleWarning, {
                            name = p.name, minutes = math.ceil((limit - idle) / 60),
                        }))
                    end
                end
            end
        end
    end
    for id in pairs(activity) do
        if not present[id] then activity[id] = nil end
    end

    -- minimum players
    local mp = rules.minPlayers
    local online = #players
    if mp.enabled and online > 0 and online < mp.players then
        if not solo.since then
            solo.since = now
            solo.next_warn = now
        end
        local remaining = math.max(1, mp.minutes) * 60 - (now - solo.since)
        status.minPlayers = { remaining = math.max(0, remaining), required = mp.players }
        if remaining <= 0 then
            for _, p in ipairs(players) do
                if not (settings.is_exempt(p.steam) or settings.is_exempt(p.id)) then
                    kick(p.pc, msg.soloKick, "minPlayers")
                end
            end
            solo.since = nil
        elseif now >= solo.next_warn then
            solo.next_warn = now + math.max(1, mp.warnEveryMinutes) * 60
            util.try(game.broadcast, util.format(msg.soloWarning, {
                players = mp.players, minutes = math.ceil(remaining / 60),
            }))
        end
    else
        solo.since = nil
    end
    return status
end

return M
