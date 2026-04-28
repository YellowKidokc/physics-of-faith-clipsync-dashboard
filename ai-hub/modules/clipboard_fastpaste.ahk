; ============================================================
; MODULE: Clipboard Fast Paste
; Reads from ClipSync server cache, pastes via hotkeys.
;
; Hotkeys:
;   Ctrl+Shift+V      = Open clipboard HTML
;   Ctrl+Shift+1-0    = Fast paste slots 1-10
;   Ctrl+Shift+F1-F10 = Fast paste slots 11-20
; ============================================================

#Requires AutoHotkey v2.0+

global CFP_URL := "http://localhost:3456"
global CFP_CACHE := []

; ---- Refresh cache from server ----
CFP_Refresh() {
    global CFP_URL, CFP_CACHE
    try {
        whr := ComObject("WinHttp.WinHttpRequest.5.1")
        whr.Open("GET", CFP_URL "/api/clips?limit=20", true)
        whr.Send()
        whr.WaitForResponse(3)
        if whr.Status = 200
            CFP_CACHE := CFP_ParseClips(whr.ResponseText)
    } catch {
    }
}

CFP_ParseClips(jsonStr) {
    results := []
    pos := 1
    while pos := InStr(jsonStr, '"content":', , pos) {
        valStart := InStr(jsonStr, '"', , pos + 10)
        if valStart = 0
            break
        valStart++
        valEnd := valStart
        Loop {
            valEnd := InStr(jsonStr, '"', , valEnd)
            if valEnd = 0
                break
            bs := 0
            check := valEnd - 1
            while check >= valStart && SubStr(jsonStr, check, 1) = "\" {
                bs++
                check--
            }
            if Mod(bs, 2) = 0
                break
            valEnd++
        }
        if valEnd > valStart {
            val := SubStr(jsonStr, valStart, valEnd - valStart)
            val := StrReplace(val, "\n", "`n")
            val := StrReplace(val, "\r", "`r")
            val := StrReplace(val, "\t", "`t")
            val := StrReplace(val, "\`"", "`"")
            val := StrReplace(val, "\\", "\")
            results.Push(val)
        }
        pos := valEnd + 1
    }
    return results
}

CFP_Paste(slot) {
    global CFP_CACHE
    if CFP_CACHE.Length = 0 {
        CFP_Refresh()
        if CFP_CACHE.Length = 0 {
            ToolTip("Clipboard empty or server offline")
            SetTimer(() => ToolTip(), -1500)
            return
        }
    }
    if slot < 1 || slot > CFP_CACHE.Length {
        ToolTip("Slot " slot " empty (" CFP_CACHE.Length " clips)")
        SetTimer(() => ToolTip(), -1500)
        return
    }
    A_Clipboard := CFP_CACHE[slot]
    ClipWait(0.5)
    Send("^v")
    ToolTip("📋 Paste slot " slot)
    SetTimer(() => ToolTip(), -1000)
}

; ---- Initial load + periodic refresh (every 10s, not 5) ----
CFP_Refresh()
SetTimer(CFP_Refresh, 10000)

; ============================================================
; HOTKEYS: Ctrl+Shift+1-0 = slots 1-10
; ============================================================
^+1:: CFP_Paste(1)
^+2:: CFP_Paste(2)
^+3:: CFP_Paste(3)
^+4:: CFP_Paste(4)
^+5:: CFP_Paste(5)
^+6:: CFP_Paste(6)
^+7:: CFP_Paste(7)
^+8:: CFP_Paste(8)
^+9:: CFP_Paste(9)
^+0:: CFP_Paste(10)

; ============================================================
; HOTKEYS: Ctrl+Shift+F1-F10 = slots 11-20
; ============================================================
^+F1::  CFP_Paste(11)
^+F2::  CFP_Paste(12)
^+F3::  CFP_Paste(13)
^+F4::  CFP_Paste(14)
^+F5::  CFP_Paste(15)
^+F6::  CFP_Paste(16)
^+F7::  CFP_Paste(17)
^+F8::  CFP_Paste(18)
^+F9::  CFP_Paste(19)
^+F10:: CFP_Paste(20)
