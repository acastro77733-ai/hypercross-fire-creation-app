import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Shield, Zap, Crown, CreditCard } from "lucide-react";

const plans = [
  {
    id: "level-1",
    name: "Level 1",
    price: "$29",
    period: "/month",
    trialDays: 3,
    description: "Limited access for quick starts and smaller teams.",
    features: [
      "Overview dashboard and node controls",
      "Stability monitor and spot trading",
      "Basic platform settings",
      "Email support"
    ],
    icon: <Zap className="h-6 w-6 text-blue-400" />,
    accent: "border-blue-400/50",
  },
  {
    id: "level-2",
    name: "Level 2",
    price: "$79",
    period: "/month",
    trialDays: 5,
    description: "Higher access for growth teams that need advanced modules.",
    features: [
      "Everything in Level 1",
      "Asset issuance, RWA, and NFT marketplace",
      "Derivatives, copy trading, and launchpad",
      "Expanded white-label controls",
      "Priority Support"
    ],
    icon: <Shield className="h-6 w-6 text-emerald-400" />,
    accent: "border-emerald-400/50",
    popular: true
  },
  {
    id: "level-3",
    name: "Level 3",
    price: "$129",
    period: "/month",
    trialDays: 7,
    description: "Complete white-label and full institutional module access.",
    features: [
      "Everything in Level 2",
      "Full white-labeling (branding and controls)",
      "Mining pools and custody modules",
      "Institution-ready operations",
      "24/7 Dedicated Account Manager"
    ],
    icon: <Crown className="h-6 w-6 text-amber-400" />,
    accent: "border-amber-400/50",
  }
] as const;

type PlanDefinition = (typeof plans)[number];
type Provider = "stripe" | "paypal";

export function SubscriptionPlans({
  onSelectPlan,
}: {
  onSelectPlan: (plan: {
    tierId: "level-1" | "level-2" | "level-3";
    tierName: string;
    trialDays: number;
    provider: Provider;
  }) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (plan: PlanDefinition, provider: Provider) => {
    setSelected(`${plan.id}-${provider}`);
    setError(null);

    try {
      const response = await fetch("/api/payments/start-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          planId: plan.id,
          planName: plan.name,
          trialDays: plan.trialDays,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Could not start checkout");
      }

      // In demo mode, the backend may return no URL and direct activation is allowed.
      if (payload.checkoutUrl) {
        window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
      }

      onSelectPlan({
        tierId: plan.id,
        tierName: plan.name,
        trialDays: plan.trialDays,
        provider,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Payment setup failed. Please try again.");
      setSelected(null);
    }
  };

  return (
    <div className="py-12 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Choose Your Access Level
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Start with a free trial, then keep the level that matches your operation.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card 
            key={plan.id}
            className={`relative glass-panel border-t-2 overflow-hidden flex flex-col ${
              plan.popular ? 'transform md:-translate-y-4' : 'border-white/10'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold uppercase tracking-widest text-center py-1">
                Most Popular
              </div>
            )}
            
            <CardHeader className={`pt-8 pb-4 border-b ${plan.accent} ${plan.popular ? 'mt-4' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-white/5">
                  {plan.icon}
                </div>
                <span className="bg-white/10 text-white text-xs font-medium px-2.5 py-0.5 rounded border border-white/20">
                  {plan.trialDays}-Day Trial
                </span>
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
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-white/70">
                    <Check className="h-5 w-5 shrink-0 text-white" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-xs text-white/60">
                Trial starts immediately after checkout and can be canceled any time before renewal.
              </p>
            </CardContent>
            
            <CardFooter className="pt-6 grid grid-cols-1 gap-3">
              <Button
                onClick={() => startCheckout(plan, "stripe")}
                disabled={selected === `${plan.id}-stripe` || selected === `${plan.id}-paypal`}
                className="w-full bg-white/10 text-white hover:bg-white/20"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {selected === `${plan.id}-stripe` ? 'Processing...' : 'Start with Stripe'}
              </Button>

              <Button
                onClick={() => startCheckout(plan, "paypal")}
                disabled={selected === `${plan.id}-stripe` || selected === `${plan.id}-paypal`}
                className="w-full bg-[#ffc439] text-black hover:bg-[#ffb800]"
              >
                {selected === `${plan.id}-paypal` ? 'Processing...' : 'Start with PayPal'}
              </Button>

              {plan.popular && (
                  <span className="bg-amber-500/20 text-amber-400 text-xs font-medium px-2.5 py-0.5 rounded border border-amber-500/30">
                    Recommended for scaling teams
                  </span>
                )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
