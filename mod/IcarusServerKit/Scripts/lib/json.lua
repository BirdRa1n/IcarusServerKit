-- Minimal JSON encode/decode for the Icarus Server Kit mod.
local json = {}

local escapes = { ['"'] = '\\"', ['\\'] = '\\\\', ['\b'] = '\\b', ['\f'] = '\\f', ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t' }

local function escape_str(s)
    return '"' .. s:gsub('[%c"\\]', function(c)
        return escapes[c] or string.format('\\u%04x', c:byte())
    end) .. '"'
end

local function is_array(t)
    if next(t) == nil then return getmetatable(t) == json.array_mt end
    local n = 0
    for k in pairs(t) do
        if type(k) ~= 'number' or k <= 0 or k % 1 ~= 0 then return false end
        n = n + 1
    end
    return n == #t
end

json.array_mt = {}
function json.array(t) return setmetatable(t or {}, json.array_mt) end

local function encode(v, out)
    local t = type(v)
    if v == nil or v == json.null then
        out[#out + 1] = 'null'
    elseif t == 'boolean' then
        out[#out + 1] = v and 'true' or 'false'
    elseif t == 'number' then
        if v ~= v or v == math.huge or v == -math.huge then
            out[#out + 1] = 'null'
        elseif math.type and math.type(v) == 'integer' then
            out[#out + 1] = tostring(v)
        else
            out[#out + 1] = string.format('%.14g', v)
        end
    elseif t == 'string' then
        out[#out + 1] = escape_str(v)
    elseif t == 'table' then
        if is_array(v) then
            out[#out + 1] = '['
            for i = 1, #v do
                if i > 1 then out[#out + 1] = ',' end
                encode(v[i], out)
            end
            out[#out + 1] = ']'
        else
            out[#out + 1] = '{'
            local first = true
            for k, val in pairs(v) do
                if not first then out[#out + 1] = ',' end
                first = false
                out[#out + 1] = escape_str(tostring(k))
                out[#out + 1] = ':'
                encode(val, out)
            end
            out[#out + 1] = '}'
        end
    else
        out[#out + 1] = escape_str(tostring(v))
    end
end

function json.encode(v)
    local out = {}
    encode(v, out)
    return table.concat(out)
end

json.null = setmetatable({}, { __tostring = function() return 'null' end })

-- decoder
local function skip(s, i)
    local _, e = s:find('^[ \n\r\t]*', i)
    return e + 1
end

local decode_value

local function decode_string(s, i)
    local out, j = {}, i + 1
    while true do
        local c = s:sub(j, j)
        if c == '' then error('unterminated string') end
        if c == '"' then return table.concat(out), j + 1 end
        if c == '\\' then
            local n = s:sub(j + 1, j + 1)
            local map = { b = '\b', f = '\f', n = '\n', r = '\r', t = '\t', ['"'] = '"', ['\\'] = '\\', ['/'] = '/' }
            if n == 'u' then
                local cp = tonumber(s:sub(j + 2, j + 5), 16)
                j = j + 6
                if cp >= 0xD800 and cp <= 0xDBFF and s:sub(j, j + 1) == '\\u' then
                    local lo = tonumber(s:sub(j + 2, j + 5), 16)
                    cp = 0x10000 + (cp - 0xD800) * 0x400 + (lo - 0xDC00)
                    j = j + 6
                end
                out[#out + 1] = utf8.char(cp)
            else
                out[#out + 1] = map[n] or n
                j = j + 2
            end
        else
            local k = s:find('["\\]', j)
            if not k then error('unterminated string') end
            out[#out + 1] = s:sub(j, k - 1)
            j = k
        end
    end
end

decode_value = function(s, i)
    i = skip(s, i)
    local c = s:sub(i, i)
    if c == '{' then
        local obj = {}
        i = skip(s, i + 1)
        if s:sub(i, i) == '}' then return obj, i + 1 end
        while true do
            local k
            k, i = decode_string(s, skip(s, i))
            i = skip(s, i)
            if s:sub(i, i) ~= ':' then error('expected : at ' .. i) end
            obj[k], i = decode_value(s, i + 1)
            i = skip(s, i)
            local d = s:sub(i, i)
            if d == '}' then return obj, i + 1 end
            if d ~= ',' then error('expected , at ' .. i) end
            i = i + 1
        end
    elseif c == '[' then
        local arr = json.array()
        i = skip(s, i + 1)
        if s:sub(i, i) == ']' then return arr, i + 1 end
        while true do
            arr[#arr + 1], i = decode_value(s, i)
            i = skip(s, i)
            local d = s:sub(i, i)
            if d == ']' then return arr, i + 1 end
            if d ~= ',' then error('expected , at ' .. i) end
            i = i + 1
        end
    elseif c == '"' then
        return decode_string(s, i)
    elseif s:sub(i, i + 3) == 'true' then
        return true, i + 4
    elseif s:sub(i, i + 4) == 'false' then
        return false, i + 5
    elseif s:sub(i, i + 3) == 'null' then
        return nil, i + 4
    else
        local num = s:match('^-?%d+%.?%d*[eE]?[-+]?%d*', i)
        if not num or num == '' then error('unexpected char at ' .. i .. ': ' .. c) end
        return tonumber(num), i + #num
    end
end

function json.decode(s)
    local v = decode_value(s, 1)
    return v
end

return json
