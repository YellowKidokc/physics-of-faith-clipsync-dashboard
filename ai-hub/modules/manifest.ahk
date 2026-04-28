; ============================================================
; MODULE MANIFEST
; Add new modules here. Each module can:
;  - RegisterTab(name, buildFn, order)
;  - Add hotkeys/hotstrings
;  - Add helper functions/classes
; ============================================================

; Utilities: quick toggles (Always On Top, Remember Position) and mini scripts
#include utilities_tab.ahk

; Smooth wheel scrolling for ListViews/tables and other child controls
#include smooth_scroll.ahk

; Auto-Clicker: multi-slot coordinate clicker with sequential mode
#include autoclicker.ahk

; Hotkey Menu: Ctrl+Shift+Z prompt menu (select text → AI process)
#include hotkey_menu.ahk

; Research Links: URL repository with categories, search, click-to-open
#include research_links.ahk

; Overnight Operations: Ollama YAML enrichment, batch analytics, knowledge graphs
#include overnight_ops.ahk

; ClipSync Bridge: DISABLED — archived 2026-04-27, using Cloudflare PWA directly
; #include ..\clipsync-bridge\clipsync_bridge.ahk

; Mission Control: Send messages to AI agents, interrupt/BTW, auto-runner
#include mission_control.ahk

; BetterTTS: TTS status and controls tab (process runs separately)
#include bettertts_tab.ahk

; Auto-Backup: copies config + data to backup directory on every startup
#include autobackup.ahk

; Config Sync: import from sync dir on startup, export on close + periodic
#include config_sync.ahk

; Clipboard Fast Paste: Ctrl+Shift+1-0 (slots 1-10), Ctrl+Shift+F1-F10 (slots 11-20)
#include clipboard_fastpaste.ahk

; NOTE: Clipboard Manager — use ClipSync PWA at clipsync-eo0.pages.dev
