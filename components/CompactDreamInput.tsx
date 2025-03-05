"use client";

import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send, ExpandIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { useRouter } from "next/navigation";

interface CompactDreamInputProps {
  userId: string;
}

export default function CompactDreamInput({ userId }: CompactDreamInputProps) {
  const [dream, setDream] = useState("");
  const [expandedDream, setExpandedDream] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Handler for submitting from compact input
  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!dream.trim()) return;
    
    await submitDream(dream);
    setDream("");
  };

  // Handler for submitting from expanded textarea
  const handleExpandedSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!expandedDream.trim()) return;
    
    await submitDream(expandedDream);
    setExpandedDream("");
    setDialogOpen(false);
  };

  // Common submission logic
  const submitDream = async (dreamText: string) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/dream-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dream_text: dreamText,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit dream");
      }
      
      const result = await response.json();
      
      // Store the loading dream ID in localStorage
      if (result.id) {
        localStorage.setItem('loadingDreamId', result.id);
        console.log('Set loading dream ID:', result.id);
      }

      // Refresh the page to show the new entry with loading state
      router.refresh();
    } catch (error) {
      console.error("Error submitting dream:", error);
      alert("Failed to submit your dream. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium text-center">Record Your Dream</h2>
      
      {/* Compact input form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-2xl mx-auto">
        <Input
          placeholder="I dreamed that..."
          value={dream}
          onChange={(e) => setDream(e.target.value)}
          className="flex-1"
          maxLength={500}
          disabled={isSubmitting}
        />
        
        <Button
          type="submit"
          size="icon"
          disabled={!dream.trim() || isSubmitting}
          title="Submit dream"
        >
          <Send className="h-4 w-4" />
        </Button>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              title="Expand for more details"
            >
              <ExpandIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Record Your Dream</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleExpandedSubmit} className="space-y-4 py-4">
              <Textarea
                placeholder="Describe your dream in detail... What happened? How did you feel? Include any symbols or recurring themes that stood out to you."
                value={expandedDream}
                onChange={(e) => setExpandedDream(e.target.value)}
                className="min-h-[200px]"
                maxLength={8000}
                disabled={isSubmitting}
              />
              
              <div className="text-xs text-muted-foreground text-right">
                {expandedDream.length}/8000 characters
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={!expandedDream.trim() || isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Dream for Analysis"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </form>
      
      <p className="text-xs text-center text-muted-foreground max-w-md mx-auto">
        Record your dream for AI-powered analysis with biblical insights
      </p>
    </div>
  );
}