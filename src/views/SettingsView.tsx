import { useState } from 'react';
import type { useDashboardStore } from '@/hooks/useDashboardStore';

export function SettingsView({ store }: { store: ReturnType<typeof useDashboardStore> }) {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleImport = () => {
    if (importText.trim()) {
      const success = store.importData(importText);
      if (success) {
        alert('Data imported successfully!');
        setImportText('');
        setShowImport(false);
      } else {
        alert('Import failed. Please check your JSON.');
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your dashboard</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-card border border-border rounded-lg">
          <h3 className="font-semibold mb-2">AI Provider</h3>
          <p className="text-sm text-muted-foreground mb-4">Choose your AI provider for the agent</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gold text-black rounded-lg">Anthropic (Claude)</button>
            <button className="px-4 py-2 bg-muted rounded-lg">OpenAI (GPT)</button>
            <button className="px-4 py-2 bg-muted rounded-lg">Ollama (Local)</button>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-lg">
          <h3 className="font-semibold mb-2">API Keys</h3>
          <p className="text-sm text-muted-foreground mb-4">Manage your API keys</p>
          <input
            type="password"
            placeholder="Anthropic API Key"
            className="w-full px-4 py-2 bg-muted rounded-lg outline-none"
          />
        </div>

        <div className="p-4 bg-card border border-border rounded-lg">
          <h3 className="font-semibold mb-2">Data</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => store.exportData()}
              className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80"
            >
              Export Data
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80"
            >
              Import Data
            </button>
            <button
              onClick={() => {
                if (confirm('Clear all data? This cannot be undone.')) {
                  localStorage.clear();
                  location.reload();
                }
              }}
              className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30"
            >
              Clear All Data
            </button>
          </div>

          {showImport && (
            <div className="mt-4 space-y-2">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your exported JSON here..."
                className="w-full h-32 px-4 py-2 bg-muted rounded-lg outline-none resize-none font-mono text-xs"
              />
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                Import
              </button>
            </div>
          )}
        </div>

        <div className="p-4 bg-card border border-border rounded-lg">
          <h3 className="font-semibold mb-2">Statistics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Clips</span>
              <span>{store.stats.totalClips}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Notes</span>
              <span>{store.stats.totalNotes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Prompts</span>
              <span>{store.stats.totalPrompts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Tasks</span>
              <span>{store.stats.totalTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Tasks</span>
              <span>{store.stats.pendingTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custom Pages</span>
              <span>{store.stats.totalCustomPages}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
