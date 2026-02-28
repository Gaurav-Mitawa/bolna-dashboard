/**
 * Landing Page — Cluster X Voice AI Platform
 * Modern, premium design with animations
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Phone, ArrowRight, Clock, Globe, Building2, GraduationCap, Truck, Heart, ShoppingCart, Briefcase, PhoneCall, Calendar, Database, Check, BarChart3, Sparkles, Play } from "lucide-react";
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
import { apiClientV1 } from "@/api/shared/baseClient";

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

      await apiClientV1.post("/demo/call", {
        phone_number: fullNumber
      });

      toast({
        title: "Demo Call Initiated!",
        description: "You'll receive a call from our AI agent shortly.",
      });
      setPhoneNumber("");

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || "Something went wrong. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calendly link
  const CALENDLY_URL = "https://calendly.com/gauravsmitawa-4svx/30min";

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://customer-assets.emergentagent.com/job_a64826e5-d955-406b-ac0d-1d7f5ea77579/artifacts/0w18fj4n_Transperent.png"
              alt="Cluster X"
              className="h-[52px] w-auto"
            />
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-gray-900 hidden sm:flex"
              onClick={() => window.open(CALENDLY_URL, "_blank")}
              data-testid="nav-book-demo-btn"
            >
              Book A Demo
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setLocation("/login")}
              data-testid="nav-login-btn"
            >
              Login
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-6"
              onClick={() => setLocation("/login")}
              data-testid="nav-get-started-btn"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-6 relative">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-orange-100/50 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-primary/5 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Voice Agents</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight">
            Voice Agents That
            <span className="relative">
              <span className="text-primary"> Scale </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                <path d="M2 8C50 2 150 2 198 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-primary/30" />
              </svg>
            </span>
            <br />Your Business
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Experience the power of AI voice agents. Enter your phone number to receive a demo call from our intelligent assistant.
          </p>

          {/* Phone Input - Enhanced */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="flex flex-col sm:flex-row gap-3 p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-xl shadow-gray-100/50">
              <div className="flex gap-2 flex-1">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger
                    className="w-[110px] bg-gray-50 border-0 focus:ring-2 focus:ring-primary/20 rounded-xl"
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
                  className="flex-1 bg-gray-50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20 text-lg rounded-xl h-12"
                  data-testid="phone-number-input"
                />
              </div>
              <Button
                onClick={handleDemoCall}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-white px-8 rounded-xl h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
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
            <p className="text-sm text-gray-500 mt-4 flex items-center justify-center gap-4">
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                Free demo
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                No credit card
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                Instant callback
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section - Enhanced */}
      <section className="py-16 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
              {STATS.map((stat, index) => (
                <div
                  key={index}
                  className={`text-center ${index !== STATS.length - 1 ? 'md:border-r md:border-gray-700' : ''}`}
                  data-testid={`stat-${index}`}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 mb-4">
                    <stat.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
                  <p className="text-gray-400 text-lg">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section - Enhanced */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
              Industries
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Trusted Across Industries
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Leading enterprises across multiple sectors rely on our AI voice solutions
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {INDUSTRIES.map((industry, index) => (
              <div
                key={index}
                className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                data-testid={`industry-${industry.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                  <industry.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 text-lg">{industry.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{industry.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to scale your voice operations
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="group bg-white rounded-3xl border border-gray-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden"
                data-testid={`feature-${index}`}
              >
                {feature.image && (
                  <div className="w-full h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 relative">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
                  </div>
                )}
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Enhanced */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
              Pricing
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to scale your voice operations
            </p>
          </div>

          <div className="bg-white rounded-[2rem] border-2 border-gray-100 p-8 md:p-12 shadow-2xl shadow-gray-100/50 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10">
              <div className="text-center mb-10">
                <div className="inline-flex items-baseline gap-1 mb-2">
                  <span className="text-2xl text-gray-500">₹</span>
                  <span className="text-6xl md:text-7xl font-bold text-gray-900">3,499</span>
                  <span className="text-xl text-gray-500">/month</span>
                </div>
                <p className="text-gray-600">Platform subscription</p>

                <div className="mt-6 pt-6 border-t border-gray-100 inline-block">
                  <div className="inline-flex items-baseline gap-1 bg-primary/5 px-6 py-3 rounded-2xl">
                    <span className="text-lg text-gray-500">+</span>
                    <span className="text-3xl font-bold text-primary">$0.08</span>
                    <span className="text-lg text-gray-500">/minute</span>
                  </div>
                  <p className="text-gray-600 mt-2">Voice agent cost per connected call</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-10">
                {PRICING_FEATURES.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-12 rounded-full h-14 text-lg font-medium shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300"
                  onClick={() => setLocation("/login")}
                  data-testid="pricing-get-started-btn"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-gray-500 mt-4">7-day free trial • No credit card required</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Enhanced */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-primary to-orange-500 rounded-[2rem] p-10 md:p-16 text-center relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to Transform Your<br />Voice Operations?
              </h2>
              <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                Join hundreds of businesses using Cluster X to automate and scale their customer conversations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-gray-100 px-8 rounded-full h-14 text-lg font-medium shadow-xl"
                  onClick={() => window.open(CALENDLY_URL, "_blank")}
                  data-testid="cta-book-demo-btn"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book A Demo
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/30 text-white hover:bg-white/10 px-8 rounded-full h-14 text-lg font-medium"
                  onClick={() => setLocation("/login")}
                  data-testid="cta-get-started-btn"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer className="py-8 px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="https://customer-assets.emergentagent.com/job_a64826e5-d955-406b-ac0d-1d7f5ea77579/artifacts/0w18fj4n_Transperent.png"
              alt="Cluster X"
              className="h-[38px] w-auto"
            />
            <span className="text-gray-500">© 2025 Cluster X. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-gray-500 hover:text-primary transition-colors text-sm font-medium">Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-primary transition-colors text-sm font-medium">Terms of Service</a>
            <a href="#" className="text-gray-500 hover:text-primary transition-colors text-sm font-medium">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
