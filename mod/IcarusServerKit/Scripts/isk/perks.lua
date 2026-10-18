--[[
  Per-player "unlimited" perks (settings.perks[<steam id>]):
    health, stamina, food, water, oxygen  -> refilled to the maximum whenever they drop
    immune                                -> harmful conditions (broken bones, infections...) are removed

  Stats are checked every second; conditions every IMMUNE_EVERY_S seconds (cheaper).
]]
local util = require("isk.util")
local game = require("isk.game")
local settings = require("isk.settings")

local M = {}

local STATS = { "health", "stamina", "food", "water", "oxygen" }
local IMMUNE_EVERY_S = 2
local REFILL_BELOW = 0.98 -- refill when below 98% so small regen noise does not spam the setters

local last_immune = 0

--- Perk flags for a player (by Steam ID, falling back to the panel id).
function M.of(steam, id)
    local perks = settings.get().perks or {}
    return (steam and perks[steam]) or perks[id]
end

function M.tick(players)
    local now = util.now()
    local check_immune = now - last_immune >= IMMUNE_EVERY_S
    if check_immune then last_immune = now end

    for _, p in ipairs(players) do
        local perks = M.of(p.steam, p.id)
        if type(perks) == "table" then
            local st = game.actor_state(p.pc)
            if st then
                for _, key in ipairs(STATS) do
                    if perks[key] then
                        local s = game.STATS[key]
                        local v = util.try(function() return st[s.value] end)
                        local mx = util.try(function() return st[s.max] end)
                        if type(v) == "number" and type(mx) == "number" and mx > 0 and v < mx * REFILL_BELOW then
                            -- a dead character is not revived by refilling health
                            if key ~= "health" or v > 0 then
                                util.try(function() st[s.set](st, mx) end)
                            end
                        end
                    end
                end
                if perks.immune and check_immune then util.try(game.cure, p.pc) end
            end
        end
    end
end

return M
