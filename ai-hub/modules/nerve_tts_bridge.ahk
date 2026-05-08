; ============================================================
; Module: Nerve TTS Bridge
; Sends AI-HUB hotkey commands to the installed Nerve TTS PWA.
; ============================================================

global NERVE_TTS_TITLE := "Nerve TTS Engine"
global NERVE_TTS_URL := "https://cloudflare-workers-autoconfig-nerve-tts-pwa.davidokc28.workers.dev/"
global NERVE_TTS_API := "http://127.0.0.1:3456/api/tts-command"

NerveTTS_EnsureOpen() {
    global NERVE_TTS_TITLE, NERVE_TTS_URL
    if WinExist(NERVE_TTS_TITLE) {
        WinActivate(NERVE_TTS_TITLE)
        return
    }

    shortcut := A_Startup "\Nerve TTS Engine.lnk"
    if FileExist(shortcut)
        Run('"' shortcut '"')
    else
        Run('msedge.exe --app="' NERVE_TTS_URL '"')

    WinWait(NERVE_TTS_TITLE, , 6)
    if WinExist(NERVE_TTS_TITLE)
        WinActivate(NERVE_TTS_TITLE)
}

NerveTTS_Normalize(text) {
    normDir := A_ScriptDir "\BetterTTS\normalizer"
    bridge := normDir "\normalize_bridge.py"
    inFile := A_Temp "\nerve_tts_in.txt"
    outFile := A_Temp "\nerve_tts_out.txt"
    if !FileExist(bridge)
        return text
    try {
        if FileExist(inFile)
            FileDelete(inFile)
        if FileExist(outFile)
            FileDelete(outFile)
        FileAppend(text, inFile, "UTF-8")
        RunWait('python "' bridge '" "' inFile '" "' outFile '"', normDir, "Hide")
        if FileExist(outFile) {
            result := FileRead(outFile, "UTF-8")
            if FileExist(inFile)
                FileDelete(inFile)
            if FileExist(outFile)
                FileDelete(outFile)
            if Trim(result) != ""
                return Trim(result)
        }
    }
    return text
}

NerveTTS_Post(action, text := "") {
    global NERVE_TTS_API
    payload := '{"action":"' action '","text":' NerveTTS_Json(text) '}'
    http := ComObject("WinHttp.WinHttpRequest.5.1")
    try {
        http.Open("POST", NERVE_TTS_API, false)
        http.SetRequestHeader("Content-Type", "application/json")
        http.Send(payload)
        return http.Status >= 200 && http.Status < 300
    } catch Error as e {
        ToolTip("Nerve TTS bridge error")
        SetTimer(() => ToolTip(), -1600)
        return false
    }
}

NerveTTS_SendToWindow(text) {
    saved := A_Clipboard
    A_Clipboard := text
    ClipWait(0.5)
    Sleep(120)
    Send("^a")
    Sleep(80)
    Send("^v")
    Sleep(120)
    Send("^{Enter}")
    Sleep(120)
    A_Clipboard := saved
}

NerveTTS_Json(s) {
    s := StrReplace(s, "\", "\\")
    s := StrReplace(s, '"', '\"')
    s := StrReplace(s, "`r", "\r")
    s := StrReplace(s, "`n", "\n")
    return '"' s '"'
}

CapsLock & c:: {
    SetCapsLockState("AlwaysOff")
    saved := A_Clipboard
    A_Clipboard := ""
    Send("^c")
    if !ClipWait(1) {
        A_Clipboard := saved
        ToolTip("Nerve TTS: select text first")
        SetTimer(() => ToolTip(), -1600)
        return
    }
    text := A_Clipboard
    A_Clipboard := saved
    text := NerveTTS_Normalize(text)
    NerveTTS_EnsureOpen()
    posted := NerveTTS_Post("speak", text)
    NerveTTS_SendToWindow(text)
    if posted
        ToolTip("Nerve TTS: speaking")
    SetTimer(() => ToolTip(), -1600)
}

CapsLock & Space:: {
    SetCapsLockState("AlwaysOff")
    NerveTTS_EnsureOpen()
    NerveTTS_Post("toggle")
    Send("^{Space}")
}

CapsLock & s:: {
    SetCapsLockState("AlwaysOff")
    NerveTTS_EnsureOpen()
    NerveTTS_Post("stop")
    Send("{Esc}")
}
