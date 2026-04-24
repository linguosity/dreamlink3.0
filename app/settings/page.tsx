"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import {
  ReadingLevel,
  AnalysisDepth,
  type SubscriptionPlan,
} from '@/schema/profile';
import { SearchFeatureToggle } from '@/components/SearchFeatureToggle';
import { ImageAesthetic, AESTHETIC_PRESETS, getAvailableAesthetics, type AestheticTier } from '@/schema/imageAesthetic';

// Tier labels for the depth selector. Order matters for the locked-tier
// hierarchy: each level's index doubles as its plan-rank.
const DEPTH_OPTIONS: Array<{
  value: AnalysisDepth;
  label: string;
  blurb: string;
  requiredPlan: SubscriptionPlan;
}> = [
  {
    value: AnalysisDepth.SHALLOW,
    label: "Shallow",
    blurb: "Topic + 1–3 supporting points + summary. ~150–250 words.",
    requiredPlan: "free",
  },
  {
    value: AnalysisDepth.DEEP,
    label: "Deep",
    blurb: "Adds symbol-by-symbol breakdown + life application. ~400–600 words.",
    requiredPlan: "visionary",
  },
  {
    value: AnalysisDepth.PROFOUND,
    label: "Profound",
    blurb: "Adds three interpretive lenses + cross-references + reflection prompts. ~800–1200 words.",
    requiredPlan: "prophet",
  },
];

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  visionary: 1,
  prophet: 2,
};

const READING_LEVEL_OPTIONS = [
  { value: ReadingLevel.RADIANT_CLARITY, label: "Radiant Clarity (Simple)" },
  { value: ReadingLevel.CELESTIAL_INSIGHT, label: "Celestial Insight (Standard)" },
  { value: ReadingLevel.PROPHETIC_WISDOM, label: "Prophetic Wisdom (Advanced)" },
  { value: ReadingLevel.DIVINE_REVELATION, label: "Divine Revelation (Scholarly)" },
];

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    darkMode: false,
    dreamReminders: true,
    reminderTime: "21:00",
    biblicalReferences: true,
    language: "en"
  });
  const [readingLevel, setReadingLevel] = useState<string>(ReadingLevel.CELESTIAL_INSIGHT);
  const [bibleVersion, setBibleVersion] = useState<string>("KJV");
  const [imageAesthetic, setImageAesthetic] = useState<string>(ImageAesthetic.PHOTOREALISTIC_VISION);
  const [userTier, setUserTier] = useState<AestheticTier>("free");
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>(AnalysisDepth.SHALLOW);
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [testModeDepths, setTestModeDepths] = useState<AnalysisDepth[]>([]);
  const [testModeReadingLevels, setTestModeReadingLevels] = useState<ReadingLevel[]>([]);
  const [testModeAesthetics, setTestModeAesthetics] = useState<ImageAesthetic[]>([]);
  const [showTestModeConfirm, setShowTestModeConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const [profileRes, subRes] = await Promise.all([
            supabase
              .from('profile')
              .select(
                'reading_level, bible_version, image_aesthetic, preferences, is_admin, analysis_depth, test_mode_enabled, test_mode_depths, test_mode_reading_levels, test_mode_aesthetics'
              )
              .eq('user_id', user.id)
              .single(),
            supabase
              .from('subscriptions')
              .select('plan, status')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          const profile: any = profileRes.data;
          const sub: any = subRes.data;

          if (profile) {
            if (profile.reading_level) setReadingLevel(profile.reading_level);
            if (profile.bible_version) setBibleVersion(profile.bible_version);
            if (profile.image_aesthetic) setImageAesthetic(profile.image_aesthetic);
            if (profile.preferences) {
              setPreferences(prev => ({ ...prev, ...profile.preferences }));
            }
            if (profile.is_admin) setIsAdmin(true);
            if (profile.analysis_depth) setAnalysisDepth(profile.analysis_depth);
            if (profile.test_mode_enabled) setTestModeEnabled(true);
            if (profile.test_mode_depths) setTestModeDepths(profile.test_mode_depths);
            if (profile.test_mode_reading_levels) setTestModeReadingLevels(profile.test_mode_reading_levels);
            if (profile.test_mode_aesthetics) setTestModeAesthetics(profile.test_mode_aesthetics);
          }

          const resolvedPlan: SubscriptionPlan =
            sub?.plan === 'visionary' || sub?.plan === 'prophet' ? sub.plan : 'free';
          setPlan(resolvedPlan);
          // userTier maps plan → aesthetic gating (already plumbed for the
          // image-style picker below).
          setUserTier(resolvedPlan as AestheticTier);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [supabase]);

  const handleSavePreferences = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('profile')
        .update({ preferences })
        .eq('user_id', user.id);
        
      toast.success('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    }
  };
  
  const saveReadingSettings = async () => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profile')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (existingProfile) {
        // Update existing profile
        await supabase
          .from('profile')
          .update({
            reading_level: readingLevel,
            bible_version: bibleVersion
          })
          .eq('user_id', user.id);
      } else {
        // Create new profile
        await supabase
          .from('profile')
          .insert({
            user_id: user.id,
            reading_level: readingLevel,
            bible_version: bibleVersion
          });
      }
      
      toast.success('Reading settings saved successfully');
    } catch (error) {
      console.error('Error saving reading settings:', error);
      toast.error('Failed to save reading settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Plan ceiling for the depth selector. Admins bypass the lock entirely.
  const isDepthLocked = (option: typeof DEPTH_OPTIONS[number]) =>
    !isAdmin && PLAN_RANK[option.requiredPlan] > PLAN_RANK[plan];

  const saveAnalysisDepth = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profile')
        .update({ analysis_depth: analysisDepth })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Analysis depth saved');
    } catch (err) {
      console.error('Error saving analysis depth:', err);
      toast.error('Failed to save analysis depth');
    } finally {
      setIsSaving(false);
    }
  };

  // Cartesian product size — shown in the confirm dialog so the admin sees
  // up-front how many cards each future submission will produce.
  const testModeMatrixSize = useMemo(() => {
    if (!testModeEnabled) return 1;
    const d = testModeDepths.length || 1;
    const r = testModeReadingLevels.length || 1;
    const a = testModeAesthetics.length || 1;
    return d * r * a;
  }, [testModeEnabled, testModeDepths, testModeReadingLevels, testModeAesthetics]);

  const handleTestModeSaveClick = () => {
    if (!isAdmin) return;
    // If turning OFF or matrix is trivially 1, save immediately. Otherwise
    // surface the count so the admin understands what they're committing to.
    if (!testModeEnabled || testModeMatrixSize <= 1) {
      void saveTestMode();
      return;
    }
    setShowTestModeConfirm(true);
  };

  const saveTestMode = async () => {
    if (!user) return;
    setIsSaving(true);
    setShowTestModeConfirm(false);
    try {
      const { error } = await supabase
        .from('profile')
        .update({
          test_mode_enabled: testModeEnabled,
          test_mode_depths: testModeDepths,
          test_mode_reading_levels: testModeReadingLevels,
          test_mode_aesthetics: testModeAesthetics,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success(
        testModeEnabled
          ? `Test mode enabled — ${testModeMatrixSize} card${testModeMatrixSize === 1 ? '' : 's'} per submission`
          : 'Test mode disabled',
      );
    } catch (err) {
      console.error('Error saving test mode:', err);
      toast.error('Failed to save test mode');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSetMember = <T extends string>(
    set: T[],
    value: T,
    setter: (next: T[]) => void,
  ) => {
    setter(set.includes(value) ? set.filter((v) => v !== value) : [...set, value]);
  };

  const saveImageStyle = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profile')
        .update({ image_aesthetic: imageAesthetic })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Image style saved successfully');
    } catch (error) {
      console.error('Error saving image style:', error);
      toast.error('Failed to save image style');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-10">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-8 w-40 bg-muted rounded animate-pulse"></div>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="mb-6">You need to be signed in to view your settings.</p>
          <Link href="/sign-in">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={user.email || ""} disabled />
              <p className="text-xs text-muted-foreground">To change your email, please contact support.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex space-x-2">
                <Input id="password" type="password" value="••••••••" disabled />
                <Link href="/forgot-password">
                  <Button variant="outline" size="sm">Reset Password</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your DreamRiver experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Feature Toggle */}
            <div className="pb-2 border-b">
              <h3 className="text-sm font-medium mb-2">Search Features</h3>
              <SearchFeatureToggle />
              <p className="text-xs text-muted-foreground mt-2">
                Enable multi-keyword search to filter dreams by multiple terms at once
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="emailNotifications" 
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => 
                  setPreferences({...preferences, emailNotifications: checked as boolean})
                }
              />
              <Label htmlFor="emailNotifications">Receive email notifications</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="dreamReminders" 
                checked={preferences.dreamReminders}
                onCheckedChange={(checked) => 
                  setPreferences({...preferences, dreamReminders: checked as boolean})
                }
              />
              <Label htmlFor="dreamReminders">Send daily dream journal reminders</Label>
            </div>
            
            {preferences.dreamReminders && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="reminderTime">Reminder Time</Label>
                <Input 
                  id="reminderTime" 
                  type="time" 
                  value={preferences.reminderTime}
                  onChange={(e) => 
                    setPreferences({...preferences, reminderTime: e.target.value})
                  }
                />
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="biblicalReferences" 
                checked={preferences.biblicalReferences}
                onCheckedChange={(checked) => 
                  setPreferences({...preferences, biblicalReferences: checked as boolean})
                }
              />
              <Label htmlFor="biblicalReferences">Include biblical references in dream analysis</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select 
                value={preferences.language}
                onValueChange={(value) => 
                  setPreferences({...preferences, language: value})
                }
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleSavePreferences}>Save Settings</Button>
          </CardContent>
        </Card>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Dream Analysis Settings</CardTitle>
            <CardDescription>Customize your dream interpretation experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reading-level">Reading Level</Label>
              <Select
                disabled={loading}
                value={readingLevel}
                onValueChange={setReadingLevel}
              >
                <SelectTrigger id="reading-level">
                  <SelectValue placeholder="Select reading level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ReadingLevel.RADIANT_CLARITY}>
                    Simple (Radiant Clarity)
                  </SelectItem>
                  <SelectItem value={ReadingLevel.CELESTIAL_INSIGHT}>
                    Standard (Celestial Insight)
                  </SelectItem>
                  <SelectItem value={ReadingLevel.PROPHETIC_WISDOM}>
                    Advanced (Prophetic Wisdom)
                  </SelectItem>
                  <SelectItem value={ReadingLevel.DIVINE_REVELATION}>
                    Scholarly (Divine Revelation)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Choose the complexity level for dream interpretations. Simple uses everyday language, Standard adds theological depth, Advanced includes scholarly references, and Scholarly offers in-depth theological analysis.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bible-version">Bible Version</Label>
              <Select
                disabled={loading}
                value={bibleVersion}
                onValueChange={setBibleVersion}
              >
                <SelectTrigger id="bible-version">
                  <SelectValue placeholder="Select Bible version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KJV">King James Version (KJV)</SelectItem>
                  <SelectItem value="NIV">New International Version (NIV)</SelectItem>
                  <SelectItem value="ESV">English Standard Version (ESV)</SelectItem>
                  <SelectItem value="NKJV">New King James Version (NKJV)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Biblical references in your dream analysis will use this translation.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={saveReadingSettings} disabled={loading || isSaving}>
              {isSaving ? "Saving..." : "Save Reading Settings"}
            </Button>
          </CardFooter>
        </Card>

        {/* Analysis Depth — visible to all users; tiers above the user's plan are locked. */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Analysis Depth</CardTitle>
            <CardDescription>
              How much your dream interpretations should explore. Reading level
              controls language complexity; depth controls how far the analysis
              goes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEPTH_OPTIONS.map((option) => {
              const locked = isDepthLocked(option);
              const selected = analysisDepth === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !locked && setAnalysisDepth(option.value)}
                  disabled={locked}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selected && !locked
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : locked
                      ? "border-border/50 opacity-60 cursor-not-allowed"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                  aria-pressed={selected}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {option.label}
                      {locked && <Lock className="h-3 w-3 text-muted-foreground" aria-label="Locked tier" />}
                    </div>
                    {option.requiredPlan !== "free" && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {option.requiredPlan}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{option.blurb}</div>
                </button>
              );
            })}
            {!isAdmin && plan !== "prophet" && (
              <p className="text-xs text-muted-foreground">
                <Link href="/pricing" className="text-primary hover:underline">
                  Upgrade your plan
                </Link>{" "}
                to unlock deeper analyses.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={saveAnalysisDepth} disabled={loading || isSaving}>
              {isSaving ? "Saving..." : "Save Depth"}
            </Button>
          </CardFooter>
        </Card>

        {/* Admin-only: Test Mode — fan one submission across multiple settings to compare side-by-side. */}
        {isAdmin && (
          <Card className="mb-8 border-amber-200 dark:border-amber-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Test Mode
                <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  Admin
                </span>
              </CardTitle>
              <CardDescription>
                When enabled, each dream submission fans out across the
                selected combinations and produces one card per combo. Leave a
                dimension empty to keep it fixed at your saved setting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="test-mode-enabled"
                  checked={testModeEnabled}
                  onCheckedChange={(checked) => setTestModeEnabled(checked === true)}
                />
                <Label htmlFor="test-mode-enabled" className="cursor-pointer">
                  Enable test-mode comparisons
                </Label>
              </div>

              {testModeEnabled && (
                <div className="space-y-5 pl-6">
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">
                      Compare across depths
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {DEPTH_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={testModeDepths.includes(opt.value)}
                            onCheckedChange={() =>
                              toggleSetMember(testModeDepths, opt.value, setTestModeDepths)
                            }
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">
                      Compare across reading levels
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {READING_LEVEL_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={testModeReadingLevels.includes(opt.value)}
                            onCheckedChange={() =>
                              toggleSetMember(testModeReadingLevels, opt.value, setTestModeReadingLevels)
                            }
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">
                      Compare across image aesthetics
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.values(AESTHETIC_PRESETS).map((preset) => (
                        <label
                          key={preset.id}
                          className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={testModeAesthetics.includes(preset.id)}
                            onCheckedChange={() =>
                              toggleSetMember(testModeAesthetics, preset.id, setTestModeAesthetics)
                            }
                          />
                          {preset.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <p className="text-xs text-muted-foreground">
                    Matrix size: <strong>{testModeMatrixSize}</strong> card
                    {testModeMatrixSize === 1 ? "" : "s"} per submission. One image is generated per unique aesthetic.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleTestModeSaveClick} disabled={loading || isSaving}>
                {isSaving ? "Saving..." : "Save Test Mode"}
              </Button>
            </CardFooter>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Dream Image Style</CardTitle>
            <CardDescription>Choose the visual aesthetic for AI-generated dream images</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(AESTHETIC_PRESETS).map((preset) => {
                const isAvailable = getAvailableAesthetics(userTier).some(a => a.id === preset.id);
                const isSelected = imageAesthetic === preset.id;
                const tierLabel = preset.tier === "free" ? "" : preset.tier === "visionary" ? "Visionary" : "Prophet";

                return (
                  <button
                    key={preset.id}
                    onClick={() => isAvailable && setImageAesthetic(preset.id)}
                    disabled={!isAvailable}
                    className={`relative text-left p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : isAvailable
                        ? "border-border hover:border-primary/50 hover:bg-muted/50"
                        : "border-border/50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    {tierLabel && (
                      <span className={`absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        isAvailable
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {tierLabel}
                      </span>
                    )}
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{preset.description}</div>
                  </button>
                );
              })}
            </div>
            {userTier === "free" && (
              <p className="text-xs text-muted-foreground">
                <Link href="/pricing" className="text-primary hover:underline">Upgrade your plan</Link> to unlock more image styles.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={saveImageStyle} disabled={loading || isSaving}>
              {isSaving ? "Saving..." : "Save Image Style"}
            </Button>
          </CardFooter>
        </Card>

        {/*
          Account deletion UI is intentionally omitted until the backend
          deletion flow exists (confirmation modal, /api/auth/delete-account
          route with cascade delete of profile + dreams + auth.users row).
          Shipping a non-functional "Delete Account" button would both mislead
          users and conflict with the privacy-policy promise to purge data
          within 30 days. Users can request deletion via the contact page in
          the meantime.
        */}
      </div>

      <AlertDialog open={showTestModeConfirm} onOpenChange={setShowTestModeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm test-mode matrix</AlertDialogTitle>
            <AlertDialogDescription>
              With these settings, each dream submission will produce{" "}
              <strong>{testModeMatrixSize} card{testModeMatrixSize === 1 ? "" : "s"}</strong>{" "}
              ({testModeDepths.length || 1} depth × {testModeReadingLevels.length || 1} reading-level × {testModeAesthetics.length || 1} aesthetic).
              <br />
              <br />
              One image is generated per unique aesthetic. OpenAI calls run in
              parallel, but every submission still costs N analyses' worth of
              tokens. Save?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveTestMode}>
              Save settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}