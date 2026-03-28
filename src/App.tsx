import React, { Suspense, lazy, useEffect, useState } from "react";
import { 
  Activity, 
  Box,
  LayoutDashboard, 
  Settings, 
  Wallet,
  Zap,
  ShieldCheck,
  Coins,
  Building2,
  Image as ImageIcon,
  LineChart as LineChartIcon,
  TrendingUp,
  Users,
  Rocket,
  Pickaxe,
  Shield,
  LogOut
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { auth, db } from "./firebase";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  OAuthProvider,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface KaleidoData {
  nodeState: string;
  chaosLevel: string;
  damping: string;
  syncStatus: string;
  recentBlocks: Array<{
    id: string;
    timestamp: string;
    transactions: number;
    status: string;
  }>;
  chartData: Array<{
    time: string;
    stability: number;
    chaos: number;
  }>;
}

interface WhiteLabelConfig {
  appName: string;
  primaryColor: string;
  logoUrl?: string;
  tokenName?: string;
  kaleidoRestUrl?: string;
  kaleidoAuthHeader?: string;
}

interface SubscriptionActivation {
  tierId: "level-1" | "level-2" | "level-3";
  tierName: string;
  trialDays: number;
  provider: "stripe" | "paypal";
}

interface PreviewUser {
  uid: string;
  email: string;
  isPreview: true;
}

function describeAuthError(error: any) {
  const code = error?.code || "";

  if (code.includes("operation-not-allowed")) {
    return "This sign-in provider is not enabled in Firebase yet. Use Preview Mode for now or enable the provider in Firebase Auth.";
  }

  if (code.includes("unauthorized-domain")) {
    return "This site domain is not authorized in Firebase Auth. Add the current domain in the Firebase console and try again.";
  }

  if (code.includes("account-exists-with-different-credential")) {
    return "An account already exists with a different sign-in method. Try the other provider for this email.";
  }

  if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) {
    return "The sign-in window was closed before completion. Try again or use Preview Mode.";
  }

  return "Login failed. Try again, switch providers, or use Preview Mode.";
}

const LazyOverviewDashboard = lazy(() => import("./components/OverviewDashboard"));
const LazySettingsPanel = lazy(() =>
  import("./components/SettingsPanel").then((module) => ({ default: module.SettingsPanel }))
);
const LazySubscriptionPlans = lazy(() =>
  import("./components/SubscriptionPlans").then((module) => ({ default: module.SubscriptionPlans }))
);
const LazyAssetIssuance = lazy(() =>
  import("./components/AssetModules").then((module) => ({ default: module.AssetIssuance }))
);
const LazyRWAInfrastructure = lazy(() =>
  import("./components/AssetModules").then((module) => ({ default: module.RWAInfrastructure }))
);
const LazyNFTMarketplace = lazy(() =>
  import("./components/AssetModules").then((module) => ({ default: module.NFTMarketplace }))
);
const LazyTradingEngine = lazy(() =>
  import("./components/TradingModules").then((module) => ({ default: module.TradingEngine }))
);
const LazyDerivatives = lazy(() =>
  import("./components/TradingModules").then((module) => ({ default: module.Derivatives }))
);
const LazyCopyTrading = lazy(() =>
  import("./components/TradingModules").then((module) => ({ default: module.CopyTrading }))
);
const LazyLaunchpad = lazy(() =>
  import("./components/TradingModules").then((module) => ({ default: module.Launchpad }))
);
const LazyMiningPools = lazy(() =>
  import("./components/InfrastructureModules").then((module) => ({ default: module.MiningPools }))
);
const LazyCustodyStorage = lazy(() =>
  import("./components/InfrastructureModules").then((module) => ({ default: module.CustodyStorage }))
);

export default function App() {
  const [data, setData] = useState<KaleidoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [config, setConfig] = useState<WhiteLabelConfig | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionLevel, setSubscriptionLevel] = useState<"level-1" | "level-2" | "level-3" | null>(null);
  const [loginHint, setLoginHint] = useState<string | null>(null);
  const isOverviewTab = activeTab === "overview" || activeTab === "nodes" || activeTab === "stability";
  const effectiveUser: any = user ?? (previewMode ? ({ uid: "preview-user", email: "Preview Mode", isPreview: true } satisfies PreviewUser) : null);
  const isPreviewUser = Boolean(effectiveUser?.isPreview);

  const hasAccess = (required: "level-1" | "level-2" | "level-3") => {
    if (!subscriptionLevel) {
      return false;
    }

    const levels = ["level-1", "level-2", "level-3"];
    return levels.indexOf(subscriptionLevel) >= levels.indexOf(required);
  };

  const ensureTabAccess = (tab: string) => {
    const level1Tabs = ["overview", "nodes", "stability", "spot", "settings"];
    const level2Tabs = ["issuance", "rwa", "nft", "derivatives", "copytrading", "launchpad"];
    const level3Tabs = ["mining", "custody"];

    if (level1Tabs.includes(tab) && hasAccess("level-1")) {
      return true;
    }

    if (level2Tabs.includes(tab) && hasAccess("level-2")) {
      return true;
    }

    if (level3Tabs.includes(tab) && hasAccess("level-3")) {
      return true;
    }

    return false;
  };

  useEffect(() => {
    const fetchConfig = async (uid: string) => {
      try {
        const docRef = doc(db, "whiteLabelConfigs", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as WhiteLabelConfig);
          return;
        }
      } catch (error) {
        console.error("Failed to load config", error);
      }

      setConfig({
        appName: "Hyper-Cross Trading Platform",
        primaryColor: "#3b82f6"
      });
    };

    const fetchSubscription = async (uid: string) => {
      try {
        const subRef = doc(db, "subscriptions", uid);
        const subSnap = await getDoc(subRef);
        if (subSnap.exists()) {
          const subData = subSnap.data();
          const tier = subData.tier || subData.tierName || "Level 1";
          const level = subData.level || "level-1";
          setSubscriptionTier(tier);
          setSubscriptionLevel(level);
          setShowSubscriptions(false);
          return;
        }

        setShowSubscriptions(true);
      } catch (error) {
        console.error("Failed to load subscription", error);
        setSubscriptionTier("Level 1");
        setSubscriptionLevel("level-1");
        setShowSubscriptions(false);
      }
    };

    let isMounted = true;

    const resolveRedirect = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error: any) {
        const code = error?.code || "";
        if (isMounted) {
          console.error("Redirect sign-in failed", error);
          const hint = describeAuthError(error) + ` (code: ${code})`;
          setLoginHint(hint);

          // If the provider is not configured, auto-enter preview so the user
          // isn't stuck on a broken login screen.
          if (code.includes("operation-not-allowed") || code.includes("unauthorized-domain")) {
            setTimeout(() => {
              if (isMounted) enterPreviewMode();
            }, 2000);
          }
        }
      }
    };

    resolveRedirect();

    // Check for referral ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');

    if (refId) {
      fetchConfig(refId);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) {
        return;
      }

      setUser(currentUser);

      if (currentUser) {
        setPreviewMode(false);
        setLoginHint(null);

        if (!refId) {
          await fetchConfig(currentUser.uid);
        }

        await fetchSubscription(currentUser.uid);
      } else if (!previewMode) {
        if (!refId) {
          setConfig(null);
        }
        setSubscriptionTier(null);
        setSubscriptionLevel(null);
        setShowSubscriptions(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [previewMode]);

  const enterPreviewMode = () => {
    setPreviewMode(true);
    setShowSubscriptions(false);
    setSubscriptionTier("Preview Access");
    setSubscriptionLevel("level-3");
    setActiveTab("overview");
    setLoginHint(null);

    if (!config) {
      setConfig({
        appName: "Hyper-Cross Trading Platform",
        primaryColor: "#3b82f6"
      });
    }
  };

  const handleSignOut = async () => {
    setPreviewMode(false);
    setShowSubscriptions(false);
    setSubscriptionTier(null);
    setSubscriptionLevel(null);

    if (auth.currentUser) {
      await signOut(auth);
      return;
    }

    setUser(null);
  };

  useEffect(() => {
    if (!effectiveUser) return;

    const fetchData = async () => {
      try {
        const headers: Record<string, string> = {};
        if (config?.kaleidoRestUrl) headers['x-kaleido-url'] = config.kaleidoRestUrl;
        if (config?.kaleidoAuthHeader) headers['x-kaleido-auth'] = config.kaleidoAuthHeader;

        const response = await fetch("/api/kaleido", { headers });
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [effectiveUser, config]);

  if (!effectiveUser) {
    return <LoginScreen data={data} config={config} loginHint={loginHint} onEnterPreview={enterPreviewMode} />;
  }

  if (showSubscriptions && !isPreviewUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-foreground flex flex-col">
        <div className="flex justify-end p-4">
          <Button variant="ghost" onClick={handleSignOut} className="text-white/50 hover:text-white">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
        <Suspense fallback={<PanelSkeleton />}>
          <LazySubscriptionPlans
            onSelectPlan={async (activation: SubscriptionActivation) => {
              setSubscriptionTier(activation.tierName);
              setSubscriptionLevel(activation.tierId);
              setShowSubscriptions(false);

              if (effectiveUser?.uid && !isPreviewUser) {
                const trialEndsAt = new Date(Date.now() + activation.trialDays * 24 * 60 * 60 * 1000);
                await setDoc(doc(db, "subscriptions", effectiveUser.uid), {
                  tier: activation.tierName,
                  level: activation.tierId,
                  provider: activation.provider,
                  status: "trial",
                  trialDays: activation.trialDays,
                  trialEndsAt,
                  updatedAt: serverTimestamp(),
                  createdAt: serverTimestamp(),
                });
              }
            }}
          />
        </Suspense>
      </div>
    );
  }

  const appName = config?.appName || "Hyper-Cross Trading Platform";
  const primaryColor = config?.primaryColor || "#3b82f6";
  const logoUrl = config?.logoUrl || "";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent text-foreground" style={{ '--primary-color': primaryColor } as React.CSSProperties}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 glass-panel flex flex-col z-10">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-8 w-8 rounded-full object-cover shadow-[0_0_15px_var(--primary-color)]" />
          ) : (
            <div 
              className="h-8 w-8 rounded-full flex items-center justify-center shadow-[0_0_15px_var(--primary-color)]"
              style={{ backgroundColor: primaryColor }}
            >
              <Zap className="h-4 w-4 text-white" />
            </div>
          )}
          <h1 className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 truncate">
            {appName}
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">Core</div>
          <NavItem icon={<LayoutDashboard size={18} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={<Box size={18} />} label="Nodes" active={activeTab === 'nodes'} onClick={() => setActiveTab('nodes')} />
          <NavItem icon={<Activity size={18} />} label="Stability Monitor" active={activeTab === 'stability'} onClick={() => setActiveTab('stability')} />

          <div className="px-4 py-2 mt-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Assets & Issuance</div>
          {hasAccess("level-2") && <NavItem icon={<Coins size={18} />} label="Asset Issuance" active={activeTab === 'issuance'} onClick={() => setActiveTab('issuance')} />}
          {hasAccess("level-2") && <NavItem icon={<Building2 size={18} />} label="RWA Infrastructure" active={activeTab === 'rwa'} onClick={() => setActiveTab('rwa')} />}
          {hasAccess("level-2") && <NavItem icon={<ImageIcon size={18} />} label="NFT Marketplace" active={activeTab === 'nft'} onClick={() => setActiveTab('nft')} />}

          <div className="px-4 py-2 mt-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Markets & Trading</div>
          <NavItem icon={<LineChartIcon size={18} />} label="Spot & Sports Trading" active={activeTab === 'spot'} onClick={() => setActiveTab('spot')} />
          {hasAccess("level-2") && <NavItem icon={<TrendingUp size={18} />} label="Derivatives" active={activeTab === 'derivatives'} onClick={() => setActiveTab('derivatives')} />}
          {hasAccess("level-2") && <NavItem icon={<Users size={18} />} label="Copy Trading" active={activeTab === 'copytrading'} onClick={() => setActiveTab('copytrading')} />}
          {hasAccess("level-2") && <NavItem icon={<Rocket size={18} />} label="Launchpad" active={activeTab === 'launchpad'} onClick={() => setActiveTab('launchpad')} />}

          <div className="px-4 py-2 mt-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Infrastructure</div>
          {hasAccess("level-3") && <NavItem icon={<Pickaxe size={18} />} label="Mining Pools" active={activeTab === 'mining'} onClick={() => setActiveTab('mining')} />}
          {hasAccess("level-3") && <NavItem icon={<Shield size={18} />} label="Custody & Storage" active={activeTab === 'custody'} onClick={() => setActiveTab('custody')} />}

          <div className="px-4 py-2 mt-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">System</div>
          <NavItem icon={<Settings size={18} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        <div className="p-4 border-t border-white/10 text-xs text-white/40 text-center">
          {isPreviewUser ? "Preview Mode" : (effectiveUser.email || "Signed in")}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        {/* Header */}
        <header className="h-20 flex-shrink-0 border-b border-white/10 glass-panel flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
            </div>
            <span className="text-sm font-medium text-white/80 tracking-wide uppercase">Network Health: Optimal</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={handleSignOut}>
              Sign Out
            </Button>
            <Button 
              className="glass-panel text-white transition-all duration-300"
              style={{ borderColor: primaryColor, boxShadow: `0 0 10px ${primaryColor}40` }}
            >
              <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <Suspense fallback={<PanelSkeleton />}>
            {activeTab === "settings" && (
              <LazySettingsPanel config={config} onConfigSaved={(newConfig) => setConfig(newConfig)} />
            )}
            {activeTab === "issuance" && hasAccess("level-2") && (
              <LazyAssetIssuance primaryColor={primaryColor} userUid={effectiveUser.uid} config={config} />
            )}
            {activeTab === "rwa" && hasAccess("level-2") && (
              <LazyRWAInfrastructure primaryColor={primaryColor} userUid={effectiveUser.uid} config={config} />
            )}
            {activeTab === "nft" && hasAccess("level-2") && (
              <LazyNFTMarketplace primaryColor={primaryColor} userUid={effectiveUser.uid} config={config} />
            )}
            {activeTab === "spot" && <LazyTradingEngine primaryColor={primaryColor} />}
            {activeTab === "derivatives" && hasAccess("level-2") && (
              <LazyDerivatives primaryColor={primaryColor} userUid={effectiveUser.uid} />
            )}
            {activeTab === "copytrading" && hasAccess("level-2") && (
              <LazyCopyTrading primaryColor={primaryColor} userUid={effectiveUser.uid} />
            )}
            {activeTab === "launchpad" && hasAccess("level-2") && (
              <LazyLaunchpad primaryColor={primaryColor} userUid={effectiveUser.uid} />
            )}
            {activeTab === "mining" && hasAccess("level-3") && (
              <LazyMiningPools primaryColor={primaryColor} userUid={effectiveUser.uid} />
            )}
            {activeTab === "custody" && hasAccess("level-3") && (
              <LazyCustodyStorage primaryColor={primaryColor} userUid={effectiveUser.uid} />
            )}
            {isOverviewTab && (
              <LazyOverviewDashboard data={data} loading={loading} primaryColor={primaryColor} />
            )}
            {!ensureTabAccess(activeTab) && (
              <Card className="glass-panel border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Upgrade Required</CardTitle>
                  <CardDescription className="text-white/60">
                    This module is not included in your current level. Upgrade your plan to unlock it.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function LoginScreen({
  config,
  loginHint,
  onEnterPreview,
}: {
  data: any,
  config: any,
  loginHint: string | null,
  onEnterPreview: () => void,
}) {
  const [authError, setAuthError] = useState<string | null>(null);
  const appName = config?.appName || 'Hyper-Cross Trading Platform';
  const primaryColor = config?.primaryColor || '#3b82f6';

  const handleSocialLogin = async (provider: GoogleAuthProvider | OAuthProvider) => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      const code = error?.code || "";

      // Do NOT attempt redirect when the provider itself is not enabled —
      // redirect will also fail and leaves the user stuck on reload.
      const providerNotEnabled =
        code.includes("operation-not-allowed") ||
        code.includes("unauthorized-domain");

      if (providerNotEnabled) {
        // Auto-enter preview mode so user isn't blocked
        setAuthError(describeAuthError(error) + ` (code: ${code})`);
        setTimeout(() => onEnterPreview(), 2000);
        return;
      }

      const shouldRedirect =
        code.includes("popup") ||
        code.includes("cancelled") ||
        code.includes("blocked") ||
        /iPhone|iPad|Android/i.test(navigator.userAgent);

      if (shouldRedirect) {
        try {
          setAuthError("Continuing with browser sign-in…");
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError: any) {
          console.error("Redirect login failed", redirectError);
          setAuthError(describeAuthError(redirectError));
          return;
        }
      }

      console.error("Login failed", error);
      setAuthError(describeAuthError(error) + ` (code: ${code})`);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await handleSocialLogin(provider);
  };

  const handleAppleLogin = async () => {
    const provider = new OAuthProvider('apple.com');
    await handleSocialLogin(provider);
  };

  const handlePreviewLogin = async () => {
    setAuthError(null);

    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign-in failed", error);
      onEnterPreview();
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-transparent text-foreground">
      {/* Left Branding Panel (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30">
          <div
            className="absolute left-[-10%] top-[12%] h-[220px] w-[520px] rotate-[-12deg] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${primaryColor}55 0%, transparent 68%)` }}
          />
          <div className="absolute inset-x-0 top-[18%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute inset-x-0 top-[36%] h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="absolute inset-x-0 top-[54%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="absolute inset-x-0 top-[72%] h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <div
            className="absolute bottom-[18%] left-[8%] h-[2px] w-[70%] origin-left rotate-[6deg] rounded-full"
            style={{ background: `linear-gradient(90deg, transparent 0%, ${primaryColor} 45%, #ffffff66 100%)` }}
          />
          <div
            className="absolute bottom-[30%] left-[18%] h-[2px] w-[56%] origin-left rotate-[-9deg] rounded-full bg-gradient-to-r from-transparent via-[#ff2600] to-transparent"
          />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt={appName} className="h-10 w-10 rounded-full object-cover shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
            ) : (
              <div className="h-10 w-10 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]" style={{ backgroundColor: primaryColor }}>
                <Zap className="h-5 w-5 text-white" />
              </div>
            )}
            <h1 className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              {appName}
            </h1>
          </div>
          <h2 className="text-5xl font-bold tracking-tighter text-white mb-6 leading-tight">
            Hyper-Cross Trading <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, #ffffff)` }}>
              Made Simple
            </span>
          </h2>
          <p className="text-white/60 text-lg max-w-md">
            Trade derivatives, join launchpads, and manage assets in under 60 seconds. Powered by MPC Custody.
          </p>
        </div>

        <div className="relative z-10 glass-panel p-6 rounded-xl max-w-md" style={{ borderColor: `${primaryColor}40` }}>
          <div className="flex items-center gap-4 mb-4">
            <ShieldCheck className="h-8 w-8" style={{ color: primaryColor }} />
            <div>
              <h3 className="text-white font-medium">MPC Custody Powered by Kaleido KMS</h3>
              <p className="text-white/50 text-sm">No seed phrases required. Institutional Security.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <Card className="w-full max-w-md glass-panel border-t-2 relative overflow-hidden" style={{ borderTopColor: primaryColor }}>
          <CardHeader className="pt-10 pb-6 text-center">
            <CardTitle className="text-2xl font-bold text-white">
              Welcome to {appName}
            </CardTitle>
            <CardDescription className="text-white/50">
              Sign in to access your secure MPC wallet
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button 
              onClick={handleAppleLogin}
              className="w-full bg-white text-black hover:bg-white/90 h-12 text-lg font-medium flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="h-5 w-5"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
              Continue with Apple / FaceID
            </Button>
            
            <Button 
              onClick={handleGoogleLogin}
              className="w-full bg-white/10 text-white hover:bg-white/20 border border-white/10 h-12 text-lg font-medium flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512" className="h-5 w-5 fill-current"><path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/></svg>
              Continue with Google
            </Button>

            {authError && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {authError}
              </div>
            )}

            {loginHint && !authError && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                {loginHint}
              </div>
            )}

            <Button
              onClick={handlePreviewLogin}
              variant="outline"
              className="w-full border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-400 font-semibold"
            >
              Continue in Preview Mode
            </Button>
            <p className="text-center text-xs text-white/40">
              Preview Mode gives full dashboard access without social login — useful while Firebase auth providers are being configured.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-xl bg-white/5" />
        <Skeleton className="h-28 rounded-xl bg-white/5" />
        <Skeleton className="h-28 rounded-xl bg-white/5" />
        <Skeleton className="h-28 rounded-xl bg-white/5" />
      </div>
      <Skeleton className="h-[320px] rounded-xl bg-white/5" />
      <Skeleton className="h-[280px] rounded-xl bg-white/5" />
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
        ${active 
          ? 'bg-white/10 text-white shadow-[inset_2px_0_0_var(--primary-color)]' 
          : 'text-white/60 hover:bg-white/5 hover:text-white'}
      `}
    >
      <span className={active ? 'drop-shadow-[0_0_8px_var(--primary-color)]' : ''} style={active ? { color: 'var(--primary-color)' } : {}}>
        {icon}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

