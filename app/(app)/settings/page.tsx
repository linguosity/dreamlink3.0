"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ReadingLevel,
  AnalysisDepth,
  type SubscriptionPlan,
} from "@/schema/profile";
import {
  ImageAesthetic,
  type AestheticTier,
} from "@/schema/imageAesthetic";
import {
  ProfileCard,
  SidebarNav,
  UpgradeCTA,
  type SettingsSectionId,
} from "./_components/sidebar";
import { AccountSection } from "./_components/sections/account-section";
import {
  PreferencesSection,
  type Preferences,
} from "./_components/sections/preferences-section";
import {
  AnalysisSection,
  type TestModeState,
} from "./_components/sections/analysis-section";
import { ImageStyleSection } from "./_components/sections/image-style-section";
import { PlanSection } from "./_components/sections/plan-section";

const DEFAULT_PREFERENCES: Preferences = {
  emailNotifications: true,
  dreamReminders: true,
  reminderTime: "21:00",
  biblicalReferences: true,
  language: "en",
};

const DEFAULT_TEST_MODE: TestModeState = {
  enabled: false,
  depths: [],
  readingLevels: [],
  aesthetics: [],
};

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [section, setSection] = useState<SettingsSectionId>("preferences");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dreamCount, setDreamCount] = useState(0);

  // Profile-driven state
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>(
    ReadingLevel.CELESTIAL_INSIGHT,
  );
  const [bibleVersion, setBibleVersion] = useState("KJV");
  const [imageAesthetic, setImageAesthetic] = useState<ImageAesthetic>(
    ImageAesthetic.PHOTOREALISTIC_VISION,
  );
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>(
    AnalysisDepth.SHALLOW,
  );
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [testMode, setTestMode] = useState<TestModeState>(DEFAULT_TEST_MODE);
  const [showTestModeConfirm, setShowTestModeConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (!user) return;

        const [profileRes, subRes, dreamCountRes] = await Promise.all([
          supabase
            .from("profile")
            .select(
              "reading_level, bible_version, image_aesthetic, preferences, is_admin, analysis_depth, test_mode_enabled, test_mode_depths, test_mode_reading_levels, test_mode_aesthetics",
            )
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("subscriptions")
            .select("plan, status")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("dream_entries")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        const profile: any = profileRes.data;
        const sub: any = subRes.data;

        if (profile) {
          if (profile.reading_level) setReadingLevel(profile.reading_level);
          if (profile.bible_version) setBibleVersion(profile.bible_version);
          if (profile.image_aesthetic) setImageAesthetic(profile.image_aesthetic);
          if (profile.preferences) {
            setPreferences((prev) => ({ ...prev, ...profile.preferences }));
          }
          if (profile.is_admin) setIsAdmin(true);
          if (profile.analysis_depth) setAnalysisDepth(profile.analysis_depth);
          setTestMode({
            enabled: !!profile.test_mode_enabled,
            depths: profile.test_mode_depths ?? [],
            readingLevels: profile.test_mode_reading_levels ?? [],
            aesthetics: profile.test_mode_aesthetics ?? [],
          });
        }

        const resolvedPlan: SubscriptionPlan =
          sub?.plan === "visionary" || sub?.plan === "prophet"
            ? sub.plan
            : "free";
        setPlan(resolvedPlan);
        setDreamCount(dreamCountRes.count ?? 0);
      } catch (error) {
        console.error("Error fetching settings data:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  const userTier: AestheticTier = plan;

  const matrixSize = useMemo(() => {
    if (!testMode.enabled) return 1;
    const d = testMode.depths.length || 1;
    const r = testMode.readingLevels.length || 1;
    const a = testMode.aesthetics.length || 1;
    return d * r * a;
  }, [testMode]);

  const handleSavePreferences = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profile")
        .update({ preferences })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Preferences saved");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReading = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profile")
        .update({ reading_level: readingLevel, bible_version: bibleVersion })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Reading settings saved");
    } catch (err) {
      console.error("Error saving reading settings:", err);
      toast.error("Failed to save reading settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDepth = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profile")
        .update({ analysis_depth: analysisDepth })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Analysis depth saved");
    } catch (err) {
      console.error("Error saving analysis depth:", err);
      toast.error("Failed to save analysis depth");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImageStyle = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profile")
        .update({ image_aesthetic: imageAesthetic })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Image style saved");
    } catch (error) {
      console.error("Error saving image style:", error);
      toast.error("Failed to save image style");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTestMode = async () => {
    if (!user) return;
    setSaving(true);
    setShowTestModeConfirm(false);
    try {
      const { error } = await supabase
        .from("profile")
        .update({
          test_mode_enabled: testMode.enabled,
          test_mode_depths: testMode.depths,
          test_mode_reading_levels: testMode.readingLevels,
          test_mode_aesthetics: testMode.aesthetics,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success(
        testMode.enabled
          ? `Test mode enabled — ${matrixSize} card${matrixSize === 1 ? "" : "s"} per submission`
          : "Test mode disabled",
      );
    } catch (err) {
      console.error("Error saving test mode:", err);
      toast.error("Failed to save test mode");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTestModeClick = () => {
    if (!isAdmin) return;
    if (!testMode.enabled || matrixSize <= 1) {
      void handleSaveTestMode();
      return;
    }
    setShowTestModeConfirm(true);
  };

  if (loading) {
    return (
      <div className="container px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-0 max-w-[1280px] mx-auto">
          <div className="h-[400px] bg-muted/50 rounded animate-pulse" />
          <div className="h-[600px] bg-muted/50 rounded animate-pulse ml-0 md:ml-6" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
          <p className="mb-6">You need to be signed in to view your settings.</p>
          <Link href="/sign-in">
            <Button>Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = user.email?.split("@")[0] ?? "Dreamer";

  const sectionContent = (() => {
    switch (section) {
      case "account":
        return <AccountSection email={user.email ?? ""} />;
      case "preferences":
        return (
          <PreferencesSection
            prefs={preferences}
            onPrefsChange={setPreferences}
            onSave={handleSavePreferences}
            saving={saving}
          />
        );
      case "analysis":
        return (
          <AnalysisSection
            plan={plan}
            isAdmin={isAdmin}
            readingLevel={readingLevel}
            bibleVersion={bibleVersion}
            analysisDepth={analysisDepth}
            testMode={testMode}
            showTestModeConfirm={showTestModeConfirm}
            onReadingLevelChange={setReadingLevel}
            onBibleVersionChange={setBibleVersion}
            onAnalysisDepthChange={setAnalysisDepth}
            onTestModeChange={setTestMode}
            onSaveReading={handleSaveReading}
            onSaveDepth={handleSaveDepth}
            onSaveTestModeClick={handleSaveTestModeClick}
            onConfirmTestModeSave={handleSaveTestMode}
            onCancelTestModeConfirm={() => setShowTestModeConfirm(false)}
            saving={saving}
          />
        );
      case "image":
        return (
          <ImageStyleSection
            aesthetic={imageAesthetic}
            onAestheticChange={setImageAesthetic}
            userTier={userTier}
            onSave={handleSaveImageStyle}
            saving={saving}
          />
        );
      case "plan":
        return <PlanSection plan={plan} />;
    }
  })();

  return (
    <div className="container px-4 sm:px-6 py-6 sm:py-10">
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 max-w-[1280px] mx-auto">
        {/* Left rail */}
        <aside className="flex flex-col gap-4 md:sticky md:top-20 md:self-start md:max-h-[calc(100vh-6rem)] md:overflow-y-auto pb-2">
          <ProfileCard
            email={user.email ?? ""}
            displayName={displayName}
            plan={plan}
            dreamCount={dreamCount}
          />
          <div>
            <div className="font-mono text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground px-3 mb-1.5">
              Settings
            </div>
            <SidebarNav current={section} onSelect={setSection} />
          </div>
          <UpgradeCTA plan={plan} />
        </aside>

        {/* Main content */}
        <main className="min-w-0">{sectionContent}</main>
      </div>
    </div>
  );
}
