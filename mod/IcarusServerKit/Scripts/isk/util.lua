-- Small helpers shared by every module.
local M = {}

M.MOD_DIR = "ue4ss/Mods/IcarusServerKit/"

function M.log(msg)
    print("[IcarusServerKit] " .. tostring(msg) .. "\n")
end

--- Wall-clock seconds.
function M.now()
    return os.time()
end

--- Runs `fn` and returns its results, or nil when it raises.
function M.try(fn, ...)
    local ok, a, b, c = pcall(fn, ...)
    if ok then return a, b, c end
    return nil
end

--- True for a live UObject wrapper.
function M.valid(o)
    if o == nil then return false end
    local ok, res = pcall(function() return o:IsValid() end)
    return ok and res == true
end

--- FString / FName / FText / plain value -> Lua string.
function M.str(v)
    if v == nil then return nil end
    if type(v) == "string" then return v end
    local ok, s = pcall(function() return v:ToString() end)
    if ok then return s end
    return tostring(v)
end

function M.fname(s)
    if EFindName and EFindName.FNAME_Add then
        return FName(s, EFindName.FNAME_Add)
    end
    return FName(s)
end

--- Class default object (for calling static functions), e.g. "/Script/Engine.Default__KismetSystemLibrary".
function M.cdo(path)
    local o = StaticFindObject(path)
    if M.valid(o) then return o end
    return nil
end

--- First live instance of a class (by short class name).
function M.first(class_name)
    local o = FindFirstOf(class_name)
    if M.valid(o) then return o end
    return nil
end

--- Drops the "...\file.lua:123: " prefix Lua adds to error() messages.
function M.clean_error(e)
    return (tostring(e):gsub("^.-%.lua:%d+: ", ""))
end

--- Replaces {key} placeholders in a message template.
function M.format(template, vars)
    return (tostring(template or ""):gsub("{(%w+)}", function(k)
        local v = vars[k]
        if v == nil then return "{" .. k .. "}" end
        return tostring(v)
    end))
end

function M.clamp(v, lo, hi)
    if v < lo then return lo end
    if v > hi then return hi end
    return v
end

return M
