// app/landing/page.tsx
//
// High-converting landing page for DreamLink
// Converts visitors into users with compelling copy and clear CTAs

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  BookOpen, 
  Brain, 
  Heart, 
  Shield, 
  Star, 
  Zap,
  CheckCircle,
  MessageCircle,
  Moon,
  Sparkles
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="container mx-auto px-4 py-16 sm:py-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Dream Interpretation
            </Badge>
            
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                What If Your Dreams Are
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">
                Messages from God?
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              DreamLink is an AI-powered dream journal that interprets your dreams with Biblical insight — 
              so you can receive clarity, comfort, and spiritual direction in minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/sign-up">
                <Button size="lg" className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Moon className="w-5 h-5 mr-2" />
                  Start Interpreting Dreams
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
                  Sign In
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Free 7-day trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 bg-gray-50 dark:bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
              You wake up with vivid dreams... and wonder:
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="p-6 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">"Was that random?"</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Or was God trying to tell me something important?
                </p>
              </Card>
              
              <Card className="p-6 text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                <h3 className="font-semibold mb-2">"What does it mean?"</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Decoding dreams can feel confusing and overwhelming.
                </p>
              </Card>
              
              <Card className="p-6 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-green-600" />
                <h3 className="font-semibold mb-2">"How does it connect?"</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  You're not sure how to connect it to Scripture.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                DreamLink makes dream interpretation spiritually aligned and accessible
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Just describe your dream — our AI interprets it using Biblical references, 
                Christian symbolism, and prayer-based insight.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 items-center mb-16">
              <div>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">Your own private dream journal</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Secure, personal space to record and reflect on your dreams
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">AI-generated spiritual interpretations</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Powered by advanced AI trained on Biblical symbolism
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">Relevant Bible verses tied to your dreams</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Scripture connections that bring deeper meaning
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">Track patterns, warnings, and confirmations</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Discover recurring themes and divine messages over time
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                {/* Placeholder for app screenshot */}
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 text-center">
                  <Moon className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    [App Screenshot Placeholder]
                    <br />
                    Dream journal interface with AI interpretation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-16 bg-gray-50 dark:bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
              Perfect for:
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 text-center">
                <Heart className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h3 className="font-semibold mb-2">Believers</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Who sense God is speaking through dreams
                </p>
              </Card>
              
              <Card className="p-6 text-center">
                <Zap className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                <h3 className="font-semibold mb-2">Prophetic Christians</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  & intercessors seeking divine insight
                </p>
              </Card>
              
              <Card className="p-6 text-center">
                <Shield className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                <h3 className="font-semibold mb-2">Vivid Dreamers</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Who want divine clarity and understanding
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Card className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-none">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-lg italic mb-4 text-gray-700 dark:text-gray-300">
                "I cried reading the interpretation. It confirmed exactly what I'd been praying about. 
                The Scripture was spot-on."
              </blockquote>
              <div className="flex items-center justify-center space-x-4">
                {/* Placeholder for user photo */}
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">JB</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Janelle B.</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Verified User</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              🕊️ Start interpreting your dreams today
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Free 7-day trial – then just $9/mo
            </p>
            
            <Link href="/sign-up">
              <Button size="lg" variant="secondary" className="px-8 py-4 text-lg font-semibold">
                Try DreamLink Free
              </Button>
            </Link>
            
            <p className="text-blue-100 text-sm mt-4">
              No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">DreamLink</h3>
              <p className="text-gray-400 text-sm">
                AI-powered dream interpretation with Biblical wisdom and spiritual insight.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/sign-up" className="hover:text-white">Free Trial</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} DreamLink. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}