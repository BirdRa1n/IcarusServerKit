--[[
  Access to the running game: players, characters, inventories, world helpers.
  Class and function names come from the dedicated server's reflection dump
  (see dev/CXXHeaderDump/Icarus.hpp in the repository).
]]
local util = require("isk.util")
local valid, try, str, fname, cdo = util.valid, util.try, util.str, util.fname, util.cdo

local M = {}

-- EDynamicItemProperties
M.DYN = {
    AssociatedItemInventoryId = 0, AssociatedItemInventorySlot = 1, DynamicState = 2,
    GunCurrentMagSize = 3, CurrentAmmoType = 4, BuildingVariation = 5, Durability = 6,
    ItemableStack = 7, MillijoulesRemaining = 8, TransmutableUnits = 9,
    Fillable_StoredUnits = 10, Fillable_Type = 11, Decayable_CurrentSpoilTime = 12,
    InventoryContainer_LinkedInventoryId = 13,
}
local DYN_NAME = {}
for k, v in pairs(M.DYN) do DYN_NAME[v] = k end

-- Player inventories (FInventoryIDEnum values), in display order.
M.PLAYER_INVENTORIES = { "Quickbar", "Backpack", "Equipment", "Suit", "General" }

-- Character stats: setter on the actor state and the field holding the maximum.
M.STATS = {
    health = { set = "SetHealth", value = "Health", max = "MaxHealth" },
    stamina = { set = "SetStamina", value = "Stamina", max = "MaxStamina" },
    food = { set = "SetFood", value = "FoodLevel", max = "MaxFood" },
    water = { set = "SetWater", value = "WaterLevel", max = "MaxWater" },
    oxygen = { set = "SetOxygen", value = "OxygenLevel", max = "MaxOxygen" },
}

------------------------------------------------------------------------------- world

function M.game_mode()
    return util.first("IcarusGameModeBase")
end

--- Short name of the loaded map, e.g. "Terrain_016".
function M.map_name()
    local gm = M.game_mode()
    if not gm then return nil end
    local full = gm:GetFullName()
    return full:match("/Game/Maps/[^%.]+/([^/%.]+)%.") or full:match("/Game/Maps/([^/%.]+)%.")
end

function M.broadcast(message)
    local gm = M.game_mode()
    if not gm then error("game mode not found") end
    gm:SendServerMessage(message)
end

--- Ground height at (x, y), tracing from z_top down to z_bottom. Returns nil when nothing was hit.
function M.ground_z(x, y, z_top, z_bottom, context)
    local ksl = cdo("/Script/Engine.Default__KismetSystemLibrary")
    context = context or M.game_mode()
    if not ksl or not context then return nil end
    local hit = {}
    local hit_any = try(function()
        return ksl:LineTraceSingle(context, { X = x, Y = y, Z = z_top or 200000 }, { X = x, Y = y, Z = z_bottom or -200000 },
            0, true, {}, 0, hit, true, { R = 0, G = 0, B = 0, A = 0 }, { R = 0, G = 0, B = 0, A = 0 }, 0)
    end)
    if not hit_any then return nil end
    return try(function() return hit.Location.Z end) or try(function() return hit.ImpactPoint.Z end)
end

function M.time_of_day()
    local tod = util.first("TimeOfDaySubsystem")
    if not tod then return nil end
    local hour = try(function() return tod:GetTimeOfDayHour() end)
    if type(hour) ~= "number" then return nil end
    return hour
end

------------------------------------------------------------------------------- players

function M.controllers()
    local out = {}
    for _, pc in ipairs(FindAllOf("IcarusPlayerController") or {}) do
        if valid(pc) and valid(pc.PlayerState) then out[#out + 1] = pc end
    end
    return out
end

--- Returns "steamid:slot", steamid, slot.
function M.player_id(pc)
    local ps = pc.PlayerState
    local pid = try(function() return str(ps.PlayerCharacterID.PlayerID) end)
    local slot = try(function() return ps.PlayerCharacterID.ChrSlot end)
    if pid and pid ~= "" then
        return pid .. ":" .. tostring(slot or 0), pid, slot
    end
    return pc:GetFullName(), nil, nil
end

function M.player_name(pc)
    local ps = pc.PlayerState
    return try(function() return str(ps.PlayerNamePrivate) end)
        or try(function() return str(ps:GetPlayerName()) end)
        or "?"
end

function M.pawn(pc)
    local p = try(function() return pc.Pawn end)
    if valid(p) then return p end
    p = try(function() return pc:K2_GetPawn() end)
    if valid(p) then return p end
    return nil
end

--- Finds a player by panel id, Steam ID or exact name.
function M.find_player(id)
    if not id or id == "" then return nil end
    for _, pc in ipairs(M.controllers()) do
        local pid, steam = M.player_id(pc)
        if pid == id or steam == id or M.player_name(pc) == id then return pc end
    end
    return nil
end

function M.require_player(id)
    local pc = M.find_player(id)
    if not pc then error("player not found: " .. tostring(id)) end
    return pc
end

--- The character's UCharacterState / USurvivalCharacterState.
function M.actor_state(pc)
    local pawn = M.pawn(pc)
    if not pawn then return nil end
    local st = try(function() return pawn.ActorState end)
    if valid(st) then return st end
    return nil
end

function M.require_state(pc)
    local st = M.actor_state(pc)
    if not st then error("player has no character (dead or loading?)") end
    return st
end

--- Current/max values of every stat the character has.
function M.stats(st)
    local out = {}
    for key, s in pairs(M.STATS) do
        local v = try(function() return st[s.value] end)
        local mx = try(function() return st[s.max] end)
        if type(v) == "number" and type(mx) == "number" and mx > 0 then
            out[key] = { v, mx }
        end
    end
    out.level = try(function() return st.Level end)
    out.xp = try(function() return st.TotalExperience end)
    return out
end

--- Sets a stat to `percent` of its maximum. Returns the new value.
function M.set_stat(st, key, percent)
    local s = M.STATS[key]
    if not s then error("unknown stat: " .. tostring(key)) end
    local mx = try(function() return st[s.max] end)
    if type(mx) ~= "number" or mx <= 0 then error(key .. " is not available for this character") end
    local value = math.floor(mx * util.clamp(percent, 0, 100) / 100 + 0.5)
    st[s.set](st, value)
    return value, mx
end

------------------------------------------------------------------------------- conditions

-- EModifierType values that are harmful: Debuff (broken leg, wounds, infections, poisoning,
-- hypothermia...), Aura_Negative and Radiation. Buffs from food, medicine and items are kept.
local HARMFUL = { [1] = true, [4] = true, [5] = true }
local modifier_class = nil

--- UModifierStateComponents attached to an actor.
function M.modifiers(actor)
    if not modifier_class then
        modifier_class = StaticFindObject("/Script/Icarus.ModifierStateComponent")
    end
    local list = {}
    local comps = valid(modifier_class) and try(function() return actor:K2_GetComponentsByClass(modifier_class) end)
    if comps then
        comps:ForEach(function(_, c)
            local comp = c:get()
            if valid(comp) then list[#list + 1] = comp end
        end)
        return list
    end
    -- fallback: scan every modifier and keep the ones owned by the actor
    for _, comp in ipairs(FindAllOf("ModifierStateComponent") or {}) do
        if valid(comp) and try(function() return comp:GetOwner() end) == actor then list[#list + 1] = comp end
    end
    return list
end

--- Ends every harmful condition on the player's character. Returns the removed modifier names.
function M.cure(pc)
    local pawn = M.pawn(pc)
    if not pawn then return {} end
    local removed = {}
    for _, comp in ipairs(M.modifiers(pawn)) do
        local kind = try(function() return comp.CachedModifierStateData.Type end)
        if HARMFUL[kind] then
            -- a near-zero lifetime lets the game expire it through its normal path (effects, UI, save)
            if try(function() comp:SetModifierLifeTime(0.05); return true end) then
                removed[#removed + 1] = try(function() return str(comp.DataRowHandleNew.RowName) end) or "?"
            end
        end
    end
    return removed
end

--- Kicks a player: the client is told why and sent back to the main menu,
--- which disconnects it through the game's normal (saving) path.
function M.kick(pc, reason)
    local text = FText(reason or "Kicked")
    try(function() pc:ClientWasKicked(text) end)
    pc:ClientReturnToMainMenuWithTextReason(text)
end

------------------------------------------------------------------------------- teleport

function M.teleport(pc, x, y, z)
    local pawn = M.pawn(pc)
    if not pawn then error("player has no character (dead or loading?)") end
    local tm = util.first("TeleportManagerSubsystem")
    if tm and try(function()
        tm:TeleportPlayer_Transform(pawn, {
            Rotation = { X = 0, Y = 0, Z = 0, W = 1 },
            Translation = { X = x, Y = y, Z = z },
            Scale3D = { X = 1, Y = 1, Z = 1 },
        })
        return true
    end) then
        return
    end
    local rot = try(function() return pawn:K2_GetActorRotation() end) or { Pitch = 0, Yaw = 0, Roll = 0 }
    pawn:K2_TeleportTo({ X = x, Y = y, Z = z }, rot)
end

function M.location(pc)
    local pawn = M.pawn(pc)
    if not pawn then return nil end
    return try(function() return pawn:K2_GetActorLocation() end)
end

------------------------------------------------------------------------------- inventory

function M.inventory_component(pc)
    local pawn = M.pawn(pc)
    if not pawn then return nil end
    local ic = try(function() return pawn.InventoryComponent end)
    if valid(ic) then return ic end
    return nil
end

function M.require_inventory(pc)
    local ic = M.inventory_component(pc)
    if not ic then error("inventory unavailable (player dead or loading?)") end
    return ic
end

function M.inventory(ic, id)
    local inv = try(function() return ic:GetInventory({ Value = fname(id) }) end)
    if valid(inv) then return inv end
    return nil
end

--- Items in an inventory: { slot, item (static row), count, dyn = { name = value } }, slot count.
function M.read_slots(inv)
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
                    it.dyn[DYN_NAME[dd.PropertyType] or tostring(dd.PropertyType)] = dd.Value
                    if dd.PropertyType == M.DYN.ItemableStack then it.count = dd.Value end
                end)
            end)
            items[#items + 1] = it
        end
    end)
    return items, n
end

--- Total units of `static_row` across the player's inventories.
function M.count_item(ic, static_row)
    local total = 0
    for _, id in ipairs(M.PLAYER_INVENTORIES) do
        local inv = M.inventory(ic, id)
        if inv then
            for _, it in ipairs(M.read_slots(inv)) do
                if it.item == static_row then total = total + it.count end
            end
        end
    end
    return total
end

--- FItemData for a D_ItemTemplate row (falls back to a bare static row), with the stack size applied.
--- Returns item data and the static row name.
function M.item_data(template, static_row, count)
    local lib = cdo("/Script/Icarus.Default__ItemTemplateLibrary")
    local dyn = {}
    if lib and type(template) == "string" then
        local out = {}
        local ok = pcall(function()
            lib:GetItemTemplateStruct({ RowName = fname(template), DataTableName = fname("D_ItemTemplate") }, out, {})
        end)
        local row = ok and try(function() return str(out.ItemStaticData.RowName) end)
        if row and row ~= "None" and row ~= "" then
            static_row = row
            for _, d in ipairs(out.ItemDynamicData or {}) do
                if d.PropertyType ~= M.DYN.ItemableStack then
                    dyn[#dyn + 1] = { PropertyType = d.PropertyType, Value = d.Value }
                end
            end
        end
    end
    if count > 1 then dyn[#dyn + 1] = { PropertyType = M.DYN.ItemableStack, Value = count } end
    return {
        ItemStaticData = { RowName = fname(static_row), DataTableName = fname("D_ItemsStatic") },
        ItemDynamicData = dyn,
        ItemOwnerLookupId = -1,
    }, static_row
end

return M
