; ============================================================
; Module: Mission Control
; Send messages to AI agent terminal windows — interrupt or BTW.
; Broadcast to all or target one. Auto-runner with stop.
;
; Hotkeys:
;   Ctrl+Shift+I  = Interrupt agent (Esc → paste → Enter)
;   Ctrl+Shift+B  = BTW agent (paste only, no interrupt)
;   Ctrl+Shift+A  = Auto-runner setup
;   Ctrl+Shift+X  = Stop auto-runner
; ============================================================

RegisterTab("Mission", Build_MissionTab, 55)

; ---- Globals ----
global gMC_Agents      := []       ; [{name, titleMatch, exe}]
global gMC_AgentDD     := ""       ; dropdown control
global gMC_MsgEdit     := ""       ; message input
global gMC_Status      := ""       ; status text
global gMC_LogEdit     := ""       ; conversation log
global gMC_NameEdit    := ""       ; agent name input
global gMC_TitleEdit   := ""       ; window title match input
global gMC_ExeDD       := ""       ; process type dropdown
global gMC_IntervalEdit := ""      ; auto-runner interval
global gMC_PromptEdit  := ""       ; auto-runner prompt
global gMC_AutoTarget  := ""       ; auto-runner target dropdown
global gMC_AutoTimer   := 0        ; timer handle (0 = stopped)
global gMC_AutoPrompt  := ""       ; current auto-runner prompt text
global gMC_AutoAgent   := ""       ; current auto-runner target name
global gMC_LogFile     := A_ScriptDir "\config\mission_log.txt"

; Load saved agents on startup
MC_LoadAgents()

Build_MissionTab() {
    global gShell, gMC_AgentDD, gMC_MsgEdit, gMC_Status, gMC_LogEdit
    global gMC_NameEdit, gMC_TitleEdit, gMC_ExeDD
    global gMC_IntervalEdit, gMC_PromptEdit, gMC_AutoTarget

    g := gShell.gui

    ; ---- LEFT COLUMN: Agent Management + Controls ----
    g.SetFont("s10 cDDDDDD Bold", "Segoe UI")
    g.AddText("xm+15 ym+52 w440", "MISSION CONTROL")

    ; -- Add Agent section --
    g.SetFont("s9 c888888", "Segoe UI")
    g.AddText("xm+15 y+16 w440", "--- Register Agent ---")

    g.SetFont("s9 cDDDDDD", "Segoe UI")
    g.AddText("xm+15 y+10 w50", "Name:")
    gMC_NameEdit := g.AddEdit("x+5 yp-2 w120 h22 Background1a1a1a cDDDDDD", "")

    g.AddText("x+10 yp+2 w40", "Title:")
    gMC_TitleEdit := g.AddEdit("x+5 yp-2 w170 h22 Background1a1a1a cDDDDDD", "Claude Code")

    g.SetFont("s9 c888888", "Segoe UI")
    g.AddText("xm+15 y+10 w50", "Type:")
    gMC_ExeDD := g.AddDropDownList("x+5 yp-2 w120 Background1a1a1a cDDDDDD Choose1",
        ["Any", "warp.exe", "powershell.exe", "cmd.exe", "WindowsTerminal.exe"])

    g.SetFont("s9 cDDDDDD", "Segoe UI")
    btnAdd := g.AddButton("x+15 yp w80 h24", "Add Agent")
    btnAdd.OnEvent("Click", (*) => MC_AddAgent())
    btnRem := g.AddButton("x+5 yp w80 h24", "Remove")
    btnRem.OnEvent("Click", (*) => MC_RemoveAgent())

    ; -- Target selector --
    g.SetFont("s9 c888888", "Segoe UI")
    g.AddText("xm+15 y+20 w440", "--- Send Message ---")

    g.SetFont("s9 cDDDDDD", "Segoe UI")
    g.AddText("xm+15 y+10 w50", "Target:")
    gMC_AgentDD := g.AddDropDownList("x+5 yp-2 w200 Background1a1a1a cDDDDDD", ["ALL"])
    gMC_AgentDD.Choose(1)

    ; -- Message input --
    g.AddText("xm+15 y+12 w50", "Msg:")
    gMC_MsgEdit := g.AddEdit("x+5 yp-2 w370 h50 Multi Background1a1a1a cDDDDDD")

    ; -- Action buttons --
    g.SetFont("s10 cDDDDDD", "Segoe UI")
    btnInt := g.AddButton("xm+15 y+8 w130 h32", "INTERRUPT")
    btnInt.OnEvent("Click", (*) => MC_Send("interrupt"))
    btnBTW := g.AddButton("x+8 yp w130 h32", "BTW")
    btnBTW.OnEvent("Click", (*) => MC_Send("btw"))
    btnPaste := g.AddButton("x+8 yp w100 h32", "Paste Clip")
    btnPaste.OnEvent("Click", (*) => MC_PasteClip())

    ; -- Auto-Runner section --
    g.SetFont("s9 c888888", "Segoe UI")
    g.AddText("xm+15 y+20 w440", "--- Auto-Runner ---")

    g.SetFont("s9 cDDDDDD", "Segoe UI")
    g.AddText("xm+15 y+10 w50", "Target:")
    gMC_AutoTarget := g.AddDropDownList("x+5 yp-2 w150 Background1a1a1a cDDDDDD", ["ALL"])
    gMC_AutoTarget.Choose(1)
    g.AddText("x+10 yp+2 w55", "Interval:")
    gMC_IntervalEdit := g.AddEdit("x+5 yp-2 w40 h22 Background1a1a1a cDDDDDD Center", "15")
    g.AddText("x+3 yp+2 w30", "min")

    g.AddText("xm+15 y+10 w50", "Prompt:")
    gMC_PromptEdit := g.AddEdit("x+5 yp-2 w370 h40 Multi Background1a1a1a cDDDDDD",
        "Continue where you left off. Review progress and proceed to the next step.")

    btnStart := g.AddButton("xm+15 y+8 w120 h30", "Start Runner")
    btnStart.OnEvent("Click", (*) => MC_StartAutoRunner())
    btnStop := g.AddButton("x+8 yp w120 h30", "STOP Runner")
    btnStop.OnEvent("Click", (*) => MC_StopAutoRunner())

    ; Status
    g.SetFont("s8 c555555", "Segoe UI")
    gMC_Status := g.AddText("xm+15 y+14 w440 h18", "")

    ; Hotkey hints
    g.AddText("xm+15 y+10 w440", "Ctrl+Shift+I = Interrupt  |  Ctrl+Shift+B = BTW  |  Ctrl+Shift+X = Stop runner")

    ; ---- RIGHT COLUMN: Conversation Log ----
    g.SetFont("s9 cE0E0E0", "Segoe UI")
    g.AddText("x480 ym+48 w100", "Conversation Log")
    gMC_LogEdit := g.AddEdit("x480 y+4 w590 h580 Multi ReadOnly VScroll Background111111 cE0E0E0", "")
    btnClearLog := g.AddButton("x480 y+4 w80 h24", "Clear Log")
    btnClearLog.OnEvent("Click", (*) => MC_ClearLog())

    ; Populate dropdown with saved agents
    MC_RefreshDropdowns()
    MC_LoadLog()
}

; ============================================================
; AGENT MANAGEMENT
; ============================================================

MC_AddAgent() {
    global gMC_Agents, gMC_NameEdit, gMC_TitleEdit, gMC_ExeDD
    name := Trim(gMC_NameEdit.Value)
    titleMatch := Trim(gMC_TitleEdit.Value)
    if (name = "" || titleMatch = "") {
        MC_SetStatus("Enter name and title match")
        return
    }
    exeChoices := ["", "warp.exe", "powershell.exe", "cmd.exe", "WindowsTerminal.exe"]
    exe := exeChoices[gMC_ExeDD.Value]
    gMC_Agents.Push({name: name, titleMatch: titleMatch, exe: exe})
    MC_SaveAgents()
    MC_RefreshDropdowns()
    gMC_NameEdit.Value := ""
    MC_SetStatus("Added agent: " name)
    MC_Log("SYSTEM", "Registered agent: " name " (title='" titleMatch "' exe='" exe "')")
}

MC_RemoveAgent() {
    global gMC_Agents, gMC_AgentDD
    idx := gMC_AgentDD.Value - 1  ; offset by 1 because first item is "ALL"
    if (idx < 1 || idx > gMC_Agents.Length) {
        MC_SetStatus("Select an agent to remove (not ALL)")
        return
    }
    name := gMC_Agents[idx].name
    gMC_Agents.RemoveAt(idx)
    MC_SaveAgents()
    MC_RefreshDropdowns()
    MC_SetStatus("Removed agent: " name)
    MC_Log("SYSTEM", "Removed agent: " name)
}

MC_RefreshDropdowns() {
    global gMC_Agents, gMC_AgentDD, gMC_AutoTarget
    items := ["ALL"]
    for agent in gMC_Agents
        items.Push(agent.name)
    if IsObject(gMC_AgentDD) {
        gMC_AgentDD.Delete()
        for item in items
            gMC_AgentDD.Add([item])
        gMC_AgentDD.Choose(1)
    }
    if IsObject(gMC_AutoTarget) {
        gMC_AutoTarget.Delete()
        for item in items
            gMC_AutoTarget.Add([item])
        gMC_AutoTarget.Choose(1)
    }
}

MC_SaveAgents() {
    global gMC_Agents
    path := A_ScriptDir "\config\mission_agents.ini"
    try {
        if FileExist(path)
            FileDelete(path)
        for i, agent in gMC_Agents {
            IniWrite(agent.name, path, "Agent" i, "Name")
            IniWrite(agent.titleMatch, path, "Agent" i, "Title")
            IniWrite(agent.exe, path, "Agent" i, "Exe")
        }
        IniWrite(gMC_Agents.Length, path, "Meta", "Count")
    }
}

MC_LoadAgents() {
    global gMC_Agents
    path := A_ScriptDir "\config\mission_agents.ini"
    gMC_Agents := []
    if !FileExist(path)
        return
    try {
        count := IniRead(path, "Meta", "Count", 0)
        Loop count {
            name := IniRead(path, "Agent" A_Index, "Name", "")
            title := IniRead(path, "Agent" A_Index, "Title", "")
            exe := IniRead(path, "Agent" A_Index, "Exe", "")
            if (name != "")
                gMC_Agents.Push({name: name, titleMatch: title, exe: exe})
        }
    }
}

; ============================================================
; FIND WINDOW
; ============================================================

MC_FindWindow(agent) {
    ; Build WinTitle string
    winTitle := agent.titleMatch
    if (agent.exe != "")
        winTitle .= " ahk_exe " agent.exe
    hwnd := WinExist(winTitle)
    return hwnd
}

; ============================================================
; SEND MESSAGE (INTERRUPT or BTW)
; ============================================================

MC_Send(mode) {
    global gMC_Agents, gMC_AgentDD, gMC_MsgEdit
    msg := gMC_MsgEdit.Value
    if (msg = "") {
        MC_SetStatus("Type a message first")
        return
    }
    targetIdx := gMC_AgentDD.Value
    if (targetIdx = 1) {
        ; ALL agents
        sent := 0
        for agent in gMC_Agents {
            if MC_SendToAgent(agent, msg, mode)
                sent++
        }
        MC_SetStatus(mode " sent to " sent "/" gMC_Agents.Length " agents")
        MC_Log("YOU [" mode " → ALL]", msg)
    } else {
        idx := targetIdx - 1
        if (idx >= 1 && idx <= gMC_Agents.Length) {
            agent := gMC_Agents[idx]
            if MC_SendToAgent(agent, msg, mode) {
                MC_SetStatus(mode " sent to " agent.name)
                MC_Log("YOU [" mode " → " agent.name "]", msg)
            } else {
                MC_SetStatus("Window not found for " agent.name)
                MC_Log("SYSTEM", "Window not found: " agent.name)
            }
        }
    }
    gMC_MsgEdit.Value := ""
}

MC_SendToAgent(agent, msg, mode) {
    hwnd := MC_FindWindow(agent)
    if !hwnd
        return false

    ; Save current window to restore later
    prevHwnd := WinExist("A")

    try {
        WinActivate("ahk_id " hwnd)
        WinWaitActive("ahk_id " hwnd, , 2)

        if (mode = "interrupt") {
            ; Esc to stop current work, then send message
            Send("{Escape}")
            Sleep(300)
            ; Clear any existing input
            Send("^a")
            Sleep(50)
        }

        ; Paste the message (using clipboard for reliability)
        prevClip := A_Clipboard
        A_Clipboard := msg
        Sleep(50)
        Send("^v")
        Sleep(100)
        A_Clipboard := prevClip

        if (mode = "interrupt") {
            ; Auto-submit
            Sleep(100)
            Send("{Enter}")
        }
        ; BTW mode: text is pasted but NOT submitted — agent sees it when ready

        ; Restore previous window
        Sleep(200)
        if prevHwnd
            try WinActivate("ahk_id " prevHwnd)
    } catch Error as e {
        return false
    }
    return true
}

MC_PasteClip() {
    global gMC_MsgEdit
    gMC_MsgEdit.Value := A_Clipboard
    MC_SetStatus("Pasted " StrLen(A_Clipboard) " chars")
}

; ============================================================
; AUTO-RUNNER
; ============================================================

MC_StartAutoRunner() {
    global gMC_Agents, gMC_AutoTarget, gMC_IntervalEdit, gMC_PromptEdit
    global gMC_AutoTimer, gMC_AutoPrompt, gMC_AutoAgent

    if (gMC_AutoTimer != 0) {
        MC_SetStatus("Runner already active — stop it first")
        return
    }

    prompt := gMC_PromptEdit.Value
    if (prompt = "") {
        MC_SetStatus("Enter a prompt for the auto-runner")
        return
    }

    interval := 0
    try interval := Integer(gMC_IntervalEdit.Value)
    if (interval < 1) {
        MC_SetStatus("Interval must be at least 1 minute")
        return
    }

    targetIdx := gMC_AutoTarget.Value
    if (targetIdx = 1) {
        gMC_AutoAgent := "ALL"
    } else {
        idx := targetIdx - 1
        if (idx >= 1 && idx <= gMC_Agents.Length)
            gMC_AutoAgent := gMC_Agents[idx].name
        else {
            MC_SetStatus("Invalid target")
            return
        }
    }

    gMC_AutoPrompt := prompt
    ms := interval * 60 * 1000
    gMC_AutoTimer := ms

    ; Run immediately, then on interval
    MC_AutoRunnerTick()
    SetTimer(MC_AutoRunnerTick, ms)

    MC_SetStatus("Runner started: every " interval "min → " gMC_AutoAgent)
    MC_Log("SYSTEM", "Auto-runner started: every " interval "min → " gMC_AutoAgent " | Prompt: " prompt)
}

MC_StopAutoRunner() {
    global gMC_AutoTimer
    if (gMC_AutoTimer = 0) {
        MC_SetStatus("No runner active")
        return
    }
    SetTimer(MC_AutoRunnerTick, 0)
    gMC_AutoTimer := 0
    MC_SetStatus("Runner stopped")
    MC_Log("SYSTEM", "Auto-runner stopped")
}

MC_AutoRunnerTick() {
    global gMC_Agents, gMC_AutoPrompt, gMC_AutoAgent
    if (gMC_AutoAgent = "ALL") {
        for agent in gMC_Agents
            MC_SendToAgent(agent, gMC_AutoPrompt, "interrupt")
        MC_Log("RUNNER → ALL", gMC_AutoPrompt)
    } else {
        for agent in gMC_Agents {
            if (agent.name = gMC_AutoAgent) {
                MC_SendToAgent(agent, gMC_AutoPrompt, "interrupt")
                MC_Log("RUNNER → " agent.name, gMC_AutoPrompt)
                break
            }
        }
    }
}

; ============================================================
; CONVERSATION LOG
; ============================================================

MC_Log(sender, msg) {
    global gMC_LogEdit, gMC_LogFile
    timestamp := FormatTime(, "HH:mm:ss")
    entry := "[" timestamp "] " sender ": " msg "`r`n"

    ; Append to GUI
    if IsObject(gMC_LogEdit) {
        current := gMC_LogEdit.Value
        gMC_LogEdit.Value := current entry
        ; Scroll to bottom
        SendMessage(0x00B6, 0, -1, gMC_LogEdit.Hwnd)  ; EM_LINESCROLL
    }

    ; Append to file for persistence
    try FileAppend(entry, gMC_LogFile, "UTF-8")
}

MC_LoadLog() {
    global gMC_LogEdit, gMC_LogFile
    if !FileExist(gMC_LogFile)
        return
    try {
        content := FileRead(gMC_LogFile, "UTF-8")
        if IsObject(gMC_LogEdit)
            gMC_LogEdit.Value := content
    }
}

MC_ClearLog() {
    global gMC_LogEdit, gMC_LogFile
    if IsObject(gMC_LogEdit)
        gMC_LogEdit.Value := ""
    try {
        if FileExist(gMC_LogFile)
            FileDelete(gMC_LogFile)
    }
    MC_SetStatus("Log cleared")
}

MC_SetStatus(msg) {
    global gMC_Status
    if IsObject(gMC_Status)
        gMC_Status.Text := msg
}

; ============================================================
; GLOBAL HOTKEYS
; ============================================================

^+i:: {
    ; Ctrl+Shift+I — Quick interrupt via input box
    global gMC_Agents, gMC_AgentDD
    if (gMC_Agents.Length = 0) {
        ToolTip("No agents registered — add them in Mission Control tab")
        SetTimer(() => ToolTip(), -2000)
        return
    }
    ; Build agent list for quick pick
    names := "ALL"
    for agent in gMC_Agents
        names .= "|" agent.name
    ib := InputBox("Target agent:`n" names "`n`nType agent name (or ALL):", "INTERRUPT", "w350 h200", "ALL")
    if (ib.Result = "Cancel")
        return
    target := Trim(ib.Value)
    ib2 := InputBox("Message to INTERRUPT with:", "INTERRUPT → " target, "w400 h150")
    if (ib2.Result = "Cancel")
        return
    MC_HotkeySend(target, ib2.Value, "interrupt")
}

^+b:: {
    ; Ctrl+Shift+B — Quick BTW via input box
    global gMC_Agents
    if (gMC_Agents.Length = 0) {
        ToolTip("No agents registered — add them in Mission Control tab")
        SetTimer(() => ToolTip(), -2000)
        return
    }
    names := "ALL"
    for agent in gMC_Agents
        names .= "|" agent.name
    ib := InputBox("Target agent:`n" names "`n`nType agent name (or ALL):", "BTW", "w350 h200", "ALL")
    if (ib.Result = "Cancel")
        return
    target := Trim(ib.Value)
    ib2 := InputBox("BTW message (won't interrupt):", "BTW → " target, "w400 h150")
    if (ib2.Result = "Cancel")
        return
    MC_HotkeySend(target, ib2.Value, "btw")
}

^+x:: {
    ; Ctrl+Shift+X — Stop auto-runner
    MC_StopAutoRunner()
    ToolTip("Auto-runner stopped")
    SetTimer(() => ToolTip(), -2000)
}

MC_HotkeySend(target, msg, mode) {
    global gMC_Agents
    if (target = "ALL" || target = "all") {
        sent := 0
        for agent in gMC_Agents {
            if MC_SendToAgent(agent, msg, mode)
                sent++
        }
        MC_Log("YOU [" mode " → ALL]", msg)
        ToolTip(mode " sent to " sent " agents")
    } else {
        for agent in gMC_Agents {
            if (agent.name = target) {
                if MC_SendToAgent(agent, msg, mode) {
                    MC_Log("YOU [" mode " → " agent.name "]", msg)
                    ToolTip(mode " sent to " agent.name)
                } else {
                    ToolTip("Window not found: " agent.name)
                }
                SetTimer(() => ToolTip(), -2000)
                return
            }
        }
        ToolTip("Agent not found: " target)
    }
    SetTimer(() => ToolTip(), -2000)
}
