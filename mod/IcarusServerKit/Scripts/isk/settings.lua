--[[
  Server rules and lists, stored in ue4ss/Mods/IcarusServerKit/settings.json.
  The panel edits that file; the mod reloads it when its content changes.
]]
local json = require("lib.json")
local util = require("isk.util")

local M = {}
local PATH = util.MOD_DIR .. "settings.json"
local last_text = nil

M.DEFAULTS = {
    rules = {
        -- kick players that do not move or chat for `minutes`
        idle = { enabled = false, minutes = 20, warnMinutes = 3 },
        -- when fewer than `players` are online, kick everyone after `minutes`
        minPlayers = { enabled = false, players = 2, minutes = 10, warnEveryMinutes = 2 },
    },
    exempt = json.array(), -- player ids (Steam ID) never kicked by the rules
    bans = json.array(), -- { id, name, reason, at }
    messages = {
        idleWarning = "{name}, you seem to be away. You will be kicked for inactivity in {minutes} min.",
        idleKick = "Kicked for inactivity.",
        soloWarning = "At least {players} players are required to play here. Everyone will be kicked in {minutes} min.",
        soloKick = "Not enough players online.",
        banKick = "You are banned from this server.",
    },
}

M.current = nil

local function merge(defaults, user)
    if type(defaults) ~= "table" or type(user) ~= "table" then
        if user == nil then return defaults end
        return user
    end
    -- arrays (lists of ids / bans) are taken as-is
    if defaults[1] ~= nil or (next(defaults) == nil and user[1] ~= nil) then return user end
    local out = {}
    for k, v in pairs(defaults) do out[k] = merge(v, user[k]) end
    for k, v in pairs(user) do
        if out[k] == nil then out[k] = v end
    end
    return out
end

--- Loads settings.json (creating it with defaults). Returns true when the content changed.
function M.reload()
    local f = io.open(PATH, "rb")
    local text = f and f:read("a") or nil
    if f then f:close() end
    if text == last_text and M.current then return false end
    last_text = text
    local user = {}
    if text and text ~= "" then
        local ok, parsed = pcall(json.decode, (text:gsub("^\239\187\191", "")))
        if ok and type(parsed) == "table" then
            user = parsed
        else
            util.log("settings.json is invalid, using defaults")
        end
    end
    M.current = merge(M.DEFAULTS, user)
    if not text then
        last_text = json.encode(M.current)
        local out = io.open(PATH, "wb")
        if out then
            out:write(last_text)
            out:close()
        end
    end
    return true
end

function M.get()
    if not M.current then M.reload() end
    return M.current
end

function M.is_exempt(id)
    for _, v in ipairs(M.get().exempt or {}) do
        if v == id then return true end
    end
    return false
end

function M.ban_of(id)
    for _, b in ipairs(M.get().bans or {}) do
        if type(b) == "table" and b.id == id then return b end
    end
    return nil
end

return M
