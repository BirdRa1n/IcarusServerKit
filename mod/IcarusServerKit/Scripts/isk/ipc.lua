--[[
  File-based IPC with the web panel (Lua in UE4SS has no sockets).

    ipc/state.json      written here every second (atomic replace)
    ipc/commands.jsonl  appended by the panel; read from the last offset
    ipc/results.jsonl   appended here, one result per command
    ipc/events.jsonl    appended here (chat, rule actions, system messages)
]]
local json = require("lib.json")
local util = require("isk.util")

local M = {}
local DIR = util.MOD_DIR .. "ipc/"
local cmd_offset = 0

local function size_of(path)
    local f = io.open(path, "rb")
    if not f then return nil end
    local s = f:seek("end")
    f:close()
    return s
end

local function append(file, obj)
    local f = io.open(DIR .. file, "a")
    if f then
        f:write(json.encode(obj), "\n")
        f:close()
    end
end

function M.write_atomic(path, text)
    local tmp = path .. ".tmp"
    local f = io.open(tmp, "w")
    if not f then return false end
    f:write(text)
    f:close()
    os.remove(path)
    return os.rename(tmp, path)
end

function M.init()
    os.execute('mkdir "' .. DIR:gsub("/", "\\") .. '" >nul 2>nul')
    -- commands queued while the server was down are ignored
    cmd_offset = size_of(DIR .. "commands.jsonl") or 0
    M.write_atomic(DIR .. "results.jsonl", "")
    M.write_atomic(DIR .. "events.jsonl", "")
end

function M.write_state(state)
    M.write_atomic(DIR .. "state.json", json.encode(state))
end

function M.result(res)
    append("results.jsonl", res)
end

function M.event(kind, text, extra)
    local e = extra or {}
    e.kind = kind
    e.text = text
    e.t = util.now() * 1000
    append("events.jsonl", e)
end

--- Calls handler(cmd) for every complete command line appended since the last poll.
function M.poll_commands(handler)
    local path = DIR .. "commands.jsonl"
    local size = size_of(path)
    if not size then return end
    if size < cmd_offset then cmd_offset = 0 end -- the panel truncated the file
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
            handler(cmd)
        else
            util.log("bad command line: " .. line)
        end
    end
end

return M
