"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DreamPrompt {
  id: string;
  version: number;
  is_active: boolean;
  system_message: string;
  main_instructions: string;
  format_instructions: string;
  forbidden_phrases: string[];
  reading_level_radiant_clarity: string;
  reading_level_celestial_insight: string;
  reading_level_prophetic_wisdom: string;
  reading_level_divine_revelation: string;
  created_at: string;
  notes: string | null;
}

interface VersionSummary {
  id: string;
  version: number;
  notes: string | null;
  created_at: string;
  is_active: boolean;
}

export default function PromptsPage() {
  const [prompt, setPrompt] = useState<DreamPrompt | null>(null);
  const [history, setHistory] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);
  const [saveNotes, setSaveNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [newPhrase, setNewPhrase] = useState("");

  const fetchPrompt = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/prompts");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPrompt(data.active);
      setHistory(data.history);
    } catch {
      setErrorMessage("Failed to load prompt data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage("");
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage("");
    setTimeout(() => setErrorMessage(""), 6000);
  };

  const handleSave = async () => {
    if (!prompt) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_message: prompt.system_message,
          main_instructions: prompt.main_instructions,
          format_instructions: prompt.format_instructions,
          forbidden_phrases: prompt.forbidden_phrases,
          reading_level_radiant_clarity: prompt.reading_level_radiant_clarity,
          reading_level_celestial_insight: prompt.reading_level_celestial_insight,
          reading_level_prophetic_wisdom: prompt.reading_level_prophetic_wisdom,
          reading_level_divine_revelation: prompt.reading_level_divine_revelation,
          notes: saveNotes || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      setPrompt(data.prompt);
      setSaveNotes("");
      showSuccess(`Saved as version ${data.prompt.version}`);
      // Refresh history
      fetchPrompt();
    } catch {
      showError("Failed to save prompt");
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async (versionId: string, version: number) => {
    if (!confirm(`Revert to version ${version}? This will make it the active prompt.`)) return;
    setReverting(versionId);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_id: versionId }),
      });

      if (!res.ok) throw new Error("Failed to revert");

      showSuccess(`Reverted to version ${version}`);
      fetchPrompt();
    } catch {
      showError("Failed to revert prompt");
    } finally {
      setReverting(null);
    }
  };

  const updateField = (field: keyof DreamPrompt, value: string | string[]) => {
    if (!prompt) return;
    setPrompt({ ...prompt, [field]: value });
  };

  const addForbiddenPhrase = () => {
    if (!prompt || !newPhrase.trim()) return;
    updateField("forbidden_phrases", [...prompt.forbidden_phrases, newPhrase.trim()]);
    setNewPhrase("");
  };

  const removeForbiddenPhrase = (index: number) => {
    if (!prompt) return;
    const updated = prompt.forbidden_phrases.filter((_, i) => i !== index);
    updateField("forbidden_phrases", updated);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Editor</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Editor</h1>
          <p className="text-muted-foreground mt-1">
            No active prompt found. Run the database migration to seed the initial prompt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Editor</h1>
          <p className="text-muted-foreground mt-1">
            Edit the dream analysis prompt used by OpenAI &middot; Version {prompt.version}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Active: v{prompt.version}
        </Badge>
      </div>

      {/* Status messages */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-200">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      <Tabs defaultValue="editor" className="space-y-6">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="reading-levels">Reading Levels</TabsTrigger>
          <TabsTrigger value="history">Version History</TabsTrigger>
        </TabsList>

        {/* ===== EDITOR TAB ===== */}
        <TabsContent value="editor" className="space-y-6">
          {/* System Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Message</CardTitle>
              <p className="text-xs text-muted-foreground">
                The system-level instruction sent to OpenAI. Sets the AI&apos;s role and persona.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={prompt.system_message}
                onChange={(e) => updateField("system_message", e.target.value)}
                rows={3}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Main Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Main Instructions</CardTitle>
              <p className="text-xs text-muted-foreground">
                Core analysis instructions — what the AI should do with the dream. The dream text and topic are injected automatically.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={prompt.main_instructions}
                onChange={(e) => updateField("main_instructions", e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Format Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Format Instructions</CardTitle>
              <p className="text-xs text-muted-foreground">
                How the analysis should be structured — topic sentence, supporting points, conclusion, etc.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={prompt.format_instructions}
                onChange={(e) => updateField("format_instructions", e.target.value)}
                rows={14}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Forbidden Phrases */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Forbidden Phrases</CardTitle>
              <p className="text-xs text-muted-foreground">
                The AI will be told to never start with these phrases.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {prompt.forbidden_phrases.map((phrase, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    onClick={() => removeForbiddenPhrase(i)}
                    title="Click to remove"
                  >
                    &ldquo;{phrase}&rdquo; &times;
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  placeholder="Add a forbidden phrase..."
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addForbiddenPhrase();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addForbiddenPhrase}
                  disabled={!newPhrase.trim()}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="save-notes" className="text-sm">
                    Version Notes (optional)
                  </Label>
                  <Input
                    id="save-notes"
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    placeholder="Describe what you changed..."
                    className="mt-1.5 text-sm"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving ? "Saving..." : `Save as Version ${prompt.version + 1}`}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Saving creates a new version. The current version is preserved in history.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== READING LEVELS TAB ===== */}
        <TabsContent value="reading-levels" className="space-y-6">
          {[
            {
              key: "reading_level_radiant_clarity" as const,
              label: "Radiant Clarity",
              grade: "3rd Grade",
              desc: "Simple, everyday language for young or new readers",
            },
            {
              key: "reading_level_celestial_insight" as const,
              label: "Celestial Insight",
              grade: "8th Grade",
              desc: "Balanced clarity with some spiritual terminology (default)",
            },
            {
              key: "reading_level_prophetic_wisdom" as const,
              label: "Prophetic Wisdom",
              grade: "12th Grade",
              desc: "Advanced vocabulary with deeper theological insights",
            },
            {
              key: "reading_level_divine_revelation" as const,
              label: "Divine Revelation",
              grade: "Seminary",
              desc: "Scholarly exegetical analysis for biblically-educated readers",
            },
          ].map(({ key, label, grade, desc }) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{label}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {grade}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={prompt[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          ))}

          {/* Save Controls (duplicated for convenience) */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="save-notes-rl" className="text-sm">
                    Version Notes (optional)
                  </Label>
                  <Input
                    id="save-notes-rl"
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    placeholder="Describe what you changed..."
                    className="mt-1.5 text-sm"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving ? "Saving..." : `Save as Version ${prompt.version + 1}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== VERSION HISTORY TAB ===== */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version History</CardTitle>
              <p className="text-xs text-muted-foreground">
                Click &ldquo;Revert&rdquo; to make any previous version the active prompt.
              </p>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions yet</p>
              ) : (
                <div className="space-y-3">
                  {history.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Version {v.version}
                          </span>
                          {v.is_active && (
                            <Badge className="text-xs">Active</Badge>
                          )}
                        </div>
                        {v.notes && (
                          <p className="text-xs text-muted-foreground">
                            {v.notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {!v.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevert(v.id, v.version)}
                          disabled={reverting === v.id}
                        >
                          {reverting === v.id ? "Reverting..." : "Revert"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
