/**
 * Landing Page — Cluster X Voice AI Platform
 * Minimalistic design inspired by ringg.ai
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Phone, ArrowRight, Users, Clock, Globe, Headphones, BarChart3, Zap, Building2, GraduationCap, Truck, Heart, ShoppingCart, Briefcase, PhoneCall, PhoneIncoming, Calendar, Database, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Country codes for phone input
const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
];

// Industries data
const INDUSTRIES = [
  { name: "BFSI", icon: Building2, description: "Banking, Financial Services & Insurance" },
  { name: "Healthcare", icon: Heart, description: "Hospitals, Clinics & Pharma" },
  { name: "Logistics", icon: Truck, description: "Supply Chain & Delivery" },
  { name: "Education", icon: GraduationCap, description: "EdTech & Institutions" },
  { name: "E-commerce", icon: ShoppingCart, description: "Retail & Online Stores" },
  { name: "HR & Recruitment", icon: Briefcase, description: "Staffing & Talent Acquisition" },
];

// Stats data
const STATS = [
  { value: "10,000+", label: "Concurrent Calls", icon: Phone },
  { value: "99.9%", label: "Uptime", icon: Clock },
  { value: "20+", label: "Languages", icon: Globe },
];

// Features data
const FEATURES = [
  { 
    title: "CRM", 
    description: "Manage your leads and customer relationships with our integrated CRM system",
    icon: Database,
    image: "https://customer-assets.emergentagent.com/job_a64826e5-d955-406b-ac0d-1d7f5ea77579/artifacts/jt453786_Screenshot%202026-02-27%20at%208.41.18%E2%80%AFPM.png"
  },
  { 
    title: "Inbound & Outbound Campaigns", 
    description: "Run powerful call campaigns with AI-powered analytics and insights",
    icon: PhoneCall,
    image: "https://customer-assets.emergentagent.com/job_a64826e5-d955-406b-ac0d-1d7f5ea77579/artifacts/fi58st0w_Screenshot%202026-02-27%20at%208.40.23%E2%80%AFPM.png"
  },
  { 
    title: "Booking System", 
    description: "Let your AI agents book appointments and manage calendars automatically",
    icon: Calendar 
  },
  { 
    title: "Smart AI Dashboard", 
    description: "Track every call, conversion, and insight with real-time analytics",
    icon: BarChart3 
  },
];

// Pricing features
const PRICING_FEATURES = [
  "Booking System",
  "CRM",
  "Smart AI Dashboard",
  "Inbound Call Campaigns",
  "Outbound Call Campaigns",
  "Multi-language Support",
  "24/7 AI Agents",
  "Real-time Analytics",
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoCall = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fullNumber = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;
      const response = await fetch("/api/demo/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: fullNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Demo Call Initiated!",
          description: "You'll receive a call from our AI agent shortly.",
        });
        setPhoneNumber("");
      } else {
        throw new Error(data.error || "Failed to initiate call");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">
              CX
            </div>
            <span className="text-xl font-semibold text-gray-900">Cluster X</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setLocation("/login")}
              data-testid="nav-login-btn"
            >
              Login
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => setLocation("/login")}
              data-testid="nav-get-started-btn"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Voice Agents That
            <span className="text-primary"> Scale </span>
            Your Business
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Experience the power of AI voice agents. Enter your phone number to receive a demo call from our intelligent assistant.
          </p>

          {/* Phone Input */}
          <div className="max-w-lg mx-auto">
            <div className="flex gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-200">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger 
                  className="w-[120px] bg-white border-0 focus:ring-0" 
                  data-testid="country-code-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 bg-white border-0 focus-visible:ring-0 text-lg"
                data-testid="phone-number-input"
              />
              <Button 
                onClick={handleDemoCall}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-white px-6 rounded-xl"
                data-testid="demo-call-btn"
              >
                {isLoading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Get Demo Call
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Free demo • No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-12 md:gap-24">
            {STATS.map((stat, index) => (
              <div key={index} className="text-center" data-testid={`stat-${index}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <stat.icon className="w-6 h-6 text-primary" />
                  <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                </div>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Industries We Serve
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Trusted by leading enterprises across multiple sectors
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {INDUSTRIES.map((industry, index) => (
              <div 
                key={index}
                className="group p-6 bg-white rounded-2xl border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
                data-testid={`industry-${industry.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <industry.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{industry.name}</h3>
                <p className="text-sm text-gray-500">{industry.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Features That Matter
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to scale your voice operations
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => (
              <div 
                key={index}
                className="p-6 bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300"
                data-testid={`feature-${index}`}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Voice Operations?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join hundreds of businesses using Cluster X to automate and scale their customer conversations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8"
              onClick={() => setLocation("/login")}
              data-testid="cta-get-started-btn"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              data-testid="cta-try-demo-btn"
            >
              <Phone className="w-4 h-4 mr-2" />
              Try Demo Call
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              CX
            </div>
            <span className="text-gray-600">© 2025 Cluster X. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-gray-500 hover:text-gray-700 text-sm">Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-gray-700 text-sm">Terms of Service</a>
            <a href="#" className="text-gray-500 hover:text-gray-700 text-sm">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
