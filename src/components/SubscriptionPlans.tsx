import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Shield } from "lucide-react";

const plans = [
  {
    name: "3D Cross-Alpha",
    price: "$39",
    period: "/month",
    description: "Essential tools for the modern trader.",
    features: [
      "Real-time Spot Trading",
      "Basic Charting Tools",
      "Standard Mining Pool Access",
      "Email Support"
    ],
    icon: <Zap className="h-6 w-6 text-blue-400" />,
    color: "blue"
  },
  {
    name: "4D Hyper-Cross Axiom",
    price: "$89",
    period: "/month",
    description: "Advanced analytics and personal customization.",
    features: [
      "Everything in 3D Cross-Alpha",
      "Derivatives & Futures Trading",
      "Copy Trading Access",
      "Basic White-Labeling (Colors)",
      "Priority Support"
    ],
    icon: <Shield className="h-6 w-6 text-purple-400" />,
    color: "purple",
    popular: true
  },
  {
    name: "5D Hypercross Omega",
    price: "$127",
    period: "/month",
    description: "The ultimate institutional-grade experience.",
    features: [
      "Everything in 4D Hyper-Cross Axiom",
      "Full White-Labeling (Logo, Name, URL)",
      "Launchpad Access",
      "MPC Custody API Access",
      "24/7 Dedicated Account Manager"
    ],
    icon: <Sparkles className="h-6 w-6 text-amber-400" />,
    color: "amber",
    trial: "15-Day Free Trial"
  }
];

export function SubscriptionPlans({ onSelectPlan }: { onSelectPlan: (plan: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (planName: string) => {
    setSelected(planName);
    // In a real app, this would trigger a Stripe checkout or similar
    setTimeout(() => {
      onSelectPlan(planName);
    }, 1000);
  };

  return (
    <div className="py-12 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Choose Your Dimension
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Unlock the full potential of your trading and infrastructure with our tiered access plans.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`relative glass-panel border-t-2 overflow-hidden flex flex-col ${
              plan.popular ? 'neon-border-purple transform md:-translate-y-4' : 'border-white/10'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-[#1500ff] to-[#c300ff] text-white text-xs font-bold uppercase tracking-widest text-center py-1">
                Most Popular
              </div>
            )}
            
            <CardHeader className={`pt-8 pb-4 ${plan.popular ? 'mt-4' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg bg-${plan.color}-500/10`}>
                  {plan.icon}
                </div>
                {plan.trial && (
                  <span className="bg-amber-500/20 text-amber-400 text-xs font-medium px-2.5 py-0.5 rounded border border-amber-500/30">
                    {plan.trial}
                  </span>
                )}
              </div>
              <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
              <CardDescription className="text-white/50 min-h-[40px]">
                {plan.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-white/50">{plan.period}</span>
              </div>
              
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                    <Check className={`h-5 w-5 shrink-0 text-${plan.color}-400`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter className="pt-6">
              <Button 
                onClick={() => handleSelect(plan.name)}
                disabled={selected === plan.name}
                className={`w-full ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-[#1500ff] to-[#c300ff] text-white hover:opacity-90' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {selected === plan.name ? 'Processing...' : 'Select Plan'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
