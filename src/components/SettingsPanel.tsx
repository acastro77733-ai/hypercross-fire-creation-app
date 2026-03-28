import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle2, CircleHelp } from "lucide-react";
import { db, auth } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function FieldGuide({
  field,
  active,
  onToggle,
  text,
}: {
  field: string;
  active: string | null;
  onToggle: (field: string) => void;
  text: string;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onToggle(field)}
        className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
        aria-label={`Show help for ${field}`}
      >
        <CircleHelp className="h-4 w-4" />
        Info
      </button>
      {active === field && (
        <div className="mt-2 rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs text-white/70">
          {text}
        </div>
      )}
    </>
  );
}

export function SettingsPanel({ config, onConfigSaved }: { config: any, onConfigSaved: (config: any) => void }) {
  const [appName, setAppName] = useState(config?.appName || 'Hyper-Cross Trading Platform');
  const [primaryColor, setPrimaryColor] = useState(config?.primaryColor || '#3b82f6');
  const [logoUrl, setLogoUrl] = useState(config?.logoUrl || '');
  const [tokenName, setTokenName] = useState(config?.tokenName || 'HYPER');
  const [kaleidoRestUrl, setKaleidoRestUrl] = useState(config?.kaleidoRestUrl || '');
  const [kaleidoAuthHeader, setKaleidoAuthHeader] = useState(config?.kaleidoAuthHeader || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setAppName(config.appName || 'Hyper-Cross Trading Platform');
      setPrimaryColor(config.primaryColor || '#3b82f6');
      setLogoUrl(config.logoUrl || '');
      setTokenName(config.tokenName || 'HYPER');
      setKaleidoRestUrl(config.kaleidoRestUrl || '');
      setKaleidoAuthHeader(config.kaleidoAuthHeader || '');
    }
  }, [config]);

  const toggleHelp = (field: string) => {
    setActiveHelp((prev) => (prev === field ? null : field));
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const configRef = doc(db, 'whiteLabelConfigs', auth.currentUser.uid);
      const newConfig = {
        appName,
        primaryColor,
        logoUrl,
        tokenName,
        kaleidoRestUrl,
        kaleidoAuthHeader,
        ownerUid: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
        createdAt: config?.createdAt || serverTimestamp()
      };
      await setDoc(configRef, newConfig, { merge: true });
      onConfigSaved(newConfig);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const referralLink = `${window.location.origin}?ref=${auth.currentUser?.uid}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="glass-panel border-t-2" style={{ borderTopColor: primaryColor }}>
        <CardHeader>
          <CardTitle className="text-xl font-medium text-white/90">Your Referral Link</CardTitle>
          <CardDescription className="text-white/60">
            Share this link to onboard users to your customized platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              readOnly 
              value={referralLink} 
              className="bg-black/50 border-white/10 text-white font-mono text-sm" 
            />
            <Button 
              onClick={copyToClipboard}
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white shrink-0"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-t-2" style={{ borderTopColor: primaryColor }}>
        <CardHeader>
          <CardTitle className="text-xl font-medium text-white/90">White-Label Customization</CardTitle>
          <CardDescription className="text-white/60">
            Point, tap, and rename. Customize your platform's look and feel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="appName" className="text-white/70">Platform Name</Label>
              <FieldGuide
                field="platform-name"
                active={activeHelp}
                onToggle={toggleHelp}
                text="This is the name users see in the header and login area. Keep it short and recognizable."
              />
            </div>
            <Input 
              id="appName" 
              value={appName} 
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. My Crypto Exchange"
              className="bg-black/50 border-white/10 text-white" 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="primaryColor" className="text-white/70">Brand Color</Label>
              <FieldGuide
                field="brand-color"
                active={activeHelp}
                onToggle={toggleHelp}
                text="Pick one main color used on buttons and highlights. You can paste a hex code like #1d4ed8."
              />
            </div>
            <div className="flex gap-3">
              <Input 
                id="primaryColor" 
                type="color" 
                value={primaryColor} 
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-16 h-10 p-1 bg-black/50 border-white/10 cursor-pointer" 
              />
              <Input 
                value={primaryColor} 
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 bg-black/50 border-white/10 text-white font-mono uppercase" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="logoUrl" className="text-white/70">Logo URL (Optional)</Label>
              <FieldGuide
                field="logo-url"
                active={activeHelp}
                onToggle={toggleHelp}
                text="Paste a direct image URL for your logo (PNG, JPG, or SVG). Leave blank to use text-only branding."
              />
            </div>
            <Input 
              id="logoUrl" 
              value={logoUrl} 
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/my-logo.png"
              className="bg-black/50 border-white/10 text-white" 
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="tokenName" className="text-white/70">Native Token Symbol</Label>
              <FieldGuide
                field="token-name"
                active={activeHelp}
                onToggle={toggleHelp}
                text="Use a short ticker symbol, usually 3 to 6 letters, like BTC or HYPER."
              />
            </div>
            <Input 
              id="tokenName" 
              value={tokenName} 
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="e.g. BTC, ETH, HYPER"
              className="bg-black/50 border-white/10 text-white uppercase" 
            />
          </div>

          <div className="pt-4 border-t border-white/10 space-y-4">
            <h4 className="text-sm font-medium text-white/80">Advanced Infrastructure (Optional)</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="kaleidoUrl" className="text-white/70">Kaleido Node REST URL</Label>
                <FieldGuide
                  field="kaleido-url"
                  active={activeHelp}
                  onToggle={toggleHelp}
                  text="Your Kaleido node API endpoint. Leave empty to keep using the built-in demo API routes."
                />
              </div>
              <Input 
                id="kaleidoUrl" 
                value={kaleidoRestUrl} 
                onChange={(e) => setKaleidoRestUrl(e.target.value)}
                placeholder="https://<node-id>-<env-id>.us0-aws.kaleido.io"
                className="bg-black/50 border-white/10 text-white" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="kaleidoAuth" className="text-white/70">Kaleido Authorization Header</Label>
                <FieldGuide
                  field="kaleido-auth"
                  active={activeHelp}
                  onToggle={toggleHelp}
                  text="Paste the complete authorization value required by your Kaleido API, for example Basic <token>."
                />
              </div>
              <Input 
                id="kaleidoAuth" 
                value={kaleidoAuthHeader} 
                onChange={(e) => setKaleidoAuthHeader(e.target.value)}
                placeholder="Basic dTBtaXdnMmRsYzp..."
                className="bg-black/50 border-white/10 text-white" 
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
