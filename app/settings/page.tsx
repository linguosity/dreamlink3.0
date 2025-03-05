"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Fetch user preferences from your database
          const { data: profileData } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', user.id)
            .single();
          
          if (profileData?.preferences) {
            setPreferences({
              ...preferences,
              ...profileData.preferences
            });
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
        .from('profiles')
        .update({ preferences })
        .eq('id', user.id);
        
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save settings. Please try again.');
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