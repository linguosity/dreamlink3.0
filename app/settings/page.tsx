"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ReadingLevel } from '@/schema/profile';
import { SearchFeatureToggle } from '@/components/SearchFeatureToggle';
import { ImageAesthetic, AESTHETIC_PRESETS, getAvailableAesthetics, type AestheticTier } from '@/schema/imageAesthetic';

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
  const [imageAesthetic, setImageAesthetic] = useState<string>(ImageAesthetic.SACRED_OIL_PAINTING);
  const [userTier, setUserTier] = useState<AestheticTier>("free");
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // Single query to fetch all profile columns we need
          const { data: profile } = await supabase
            .from('profile')
            .select('reading_level, bible_version, image_aesthetic, preferences')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            if (profile.reading_level) setReadingLevel(profile.reading_level);
            if (profile.bible_version) setBibleVersion(profile.bible_version);
            if (profile.image_aesthetic) setImageAesthetic(profile.image_aesthetic);
            if (profile.preferences) {
              setPreferences(prev => ({ ...prev, ...profile.preferences }));
            }
          }
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
            <CardDescription>Customize your Dreamlink experience</CardDescription>
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

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">Delete Account</Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will permanently delete your account and all your data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}