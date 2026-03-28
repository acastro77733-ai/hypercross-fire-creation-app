import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, Building2, Image as ImageIcon, Plus, ArrowRight } from "lucide-react";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export function AssetIssuance({ primaryColor, userUid, config }: { primaryColor: string, userUid?: string, config?: any }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [supply, setSupply] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  useEffect(() => {
    if (!userUid) return;
    const q = query(collection(db, 'issuedAssets'), where('ownerUid', '==', userUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assetData: any[] = [];
      snapshot.forEach((doc) => assetData.push({ id: doc.id, ...doc.data() }));
      setAssets(assetData);
    });
    return () => unsubscribe();
  }, [userUid]);

  const handleMint = async () => {
    if (!name || !ticker || !supply || !userUid) return;
    setIsMinting(true);
    try {
      // 1. Call Kaleido backend to deploy contract
      const res = await fetch('/api/kaleido/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kaleido-url': config?.kaleidoRestUrl || '',
          'x-kaleido-auth': config?.kaleidoAuthHeader || ''
        },
        body: JSON.stringify({ name, ticker, supply: Number(supply) })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to deploy');

      // 2. Save to Firestore
      await addDoc(collection(db, 'issuedAssets'), {
        name,
        ticker,
        supply: Number(supply),
        type: 'Standard ERC-20',
        holders: 1,
        status: 'Active',
        ownerUid: userUid,
        contractAddress: data.contractAddress,
        createdAt: serverTimestamp()
      });
      setName('');
      setTicker('');
      setSupply('');
    } catch (error) {
      console.error("Error minting asset:", error);
      alert("Error deploying contract. Check console for details.");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Digital Asset Issuance</h2>
          <p className="text-white/60">Mint and manage custom tokens on your Kaleido network.</p>
        </div>
        <Button className="text-white" style={{ backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}60` }}>
          <Plus className="mr-2 h-4 w-4" /> Issue New Asset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-panel neon-border-blue lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg text-white">Quick Mint</CardTitle>
            <CardDescription className="text-white/50">Deploy a standard ERC-20 / Fabric Token</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Asset Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nexus USD" className="bg-black/50 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Ticker Symbol</Label>
              <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="NUSD" className="bg-black/50 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Initial Supply</Label>
              <Input value={supply} onChange={(e) => setSupply(e.target.value)} type="number" placeholder="1000000" className="bg-black/50 border-white/10 text-white" />
            </div>
            <Button 
              onClick={handleMint} 
              disabled={isMinting || !name || !ticker || !supply}
              className="w-full mt-4 text-white" 
              style={{ backgroundColor: primaryColor }}
            >
              {isMinting ? 'Deploying...' : 'Deploy Smart Contract'}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel neon-border-purple lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-white">Issued Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10">
                  <TableHead className="text-white/60">Asset</TableHead>
                  <TableHead className="text-white/60">Type</TableHead>
                  <TableHead className="text-white/60">Supply</TableHead>
                  <TableHead className="text-white/60">Holders</TableHead>
                  <TableHead className="text-white/60 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={5} className="text-center text-white/50 py-8">No assets issued yet.</TableCell>
                  </TableRow>
                ) : (
                  assets.map((asset, i) => (
                    <TableRow key={asset.id || i} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        {asset.name} <span className="text-white/40 text-xs ml-2">{asset.ticker}</span>
                      </TableCell>
                      <TableCell className="text-white/70">{asset.type}</TableCell>
                      <TableCell className="text-white/70 font-mono">{asset.supply?.toLocaleString()}</TableCell>
                      <TableCell className="text-white/70">{asset.holders}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={asset.status === 'Active' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-400'}>
                          {asset.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RWAInfrastructure({ primaryColor, userUid, config }: { primaryColor: string, userUid?: string, config?: any }) {
  const [rwas, setRwas] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Real Estate');
  const [valuation, setValuation] = useState('');
  const [fractions, setFractions] = useState('');
  const [isTokenizing, setIsTokenizing] = useState(false);

  useEffect(() => {
    if (!userUid) return;
    const q = query(collection(db, 'realWorldAssets'), where('ownerUid', '==', userUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rwaData: any[] = [];
      snapshot.forEach((doc) => rwaData.push({ id: doc.id, ...doc.data() }));
      setRwas(rwaData);
    });
    return () => unsubscribe();
  }, [userUid]);

  const handleTokenize = async () => {
    if (!name || !valuation || !fractions || !userUid) return;
    setIsTokenizing(true);
    try {
      // 1. Call Kaleido backend to tokenize asset
      const res = await fetch('/api/kaleido/tokenize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kaleido-url': config?.kaleidoRestUrl || '',
          'x-kaleido-auth': config?.kaleidoAuthHeader || ''
        },
        body: JSON.stringify({ name, category, valuation: Number(valuation), fractions: Number(fractions) })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to tokenize');

      // 2. Save to Firestore
      await addDoc(collection(db, 'realWorldAssets'), {
        name,
        category,
        valuation: Number(valuation),
        fractions: Number(fractions),
        oracleStatus: 'Synced',
        ownerUid: userUid,
        assetId: data.assetId,
        createdAt: serverTimestamp()
      });
      setName('');
      setValuation('');
      setFractions('');
    } catch (error) {
      console.error("Error tokenizing asset:", error);
      alert("Error tokenizing asset. Check console for details.");
    } finally {
      setIsTokenizing(false);
    }
  };

  const totalValuation = rwas.reduce((sum, rwa) => sum + (rwa.valuation || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Real World Assets (RWA)</h2>
          <p className="text-white/60">Tokenize and manage physical assets, real estate, and commodities.</p>
        </div>
        <Button className="text-white" style={{ backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}60` }}>
          <Building2 className="mr-2 h-4 w-4" /> Tokenize Asset
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Total RWA TVL", value: `$${(totalValuation / 1000000).toFixed(2)}M`, change: "+0.0%" },
          { title: "Active Properties", value: rwas.filter(r => r.category === 'Real Estate').length.toString(), change: "+0" },
          { title: "Commodity Vaults", value: rwas.filter(r => r.category === 'Commodity').length.toString(), change: "Stable" }
        ].map((stat, i) => (
          <Card key={i} className="glass-panel glow-hover border-t-2" style={{ borderColor: primaryColor }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white/60 uppercase">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <p className="text-xs text-green-400 mt-1">{stat.change} this month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-panel neon-border-blue lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg text-white">Tokenize New Asset</CardTitle>
            <CardDescription className="text-white/50">Register a new physical asset</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Asset Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Manhattan Plaza" className="bg-black/50 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Category</Label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Real Estate">Real Estate</option>
                <option value="Commodity">Commodity</option>
                <option value="Bonds">Bonds</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Valuation (USD)</Label>
              <Input value={valuation} onChange={(e) => setValuation(e.target.value)} type="number" placeholder="45000000" className="bg-black/50 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Fractions to Issue</Label>
              <Input value={fractions} onChange={(e) => setFractions(e.target.value)} type="number" placeholder="100000" className="bg-black/50 border-white/10 text-white" />
            </div>
            <Button 
              onClick={handleTokenize} 
              disabled={isTokenizing || !name || !valuation || !fractions}
              className="w-full mt-4 text-white" 
              style={{ backgroundColor: primaryColor }}
            >
              {isTokenizing ? 'Tokenizing...' : 'Tokenize Asset'}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel neon-border-gold lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-white">Tokenized Asset Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10">
                  <TableHead className="text-white/60">Asset Name</TableHead>
                  <TableHead className="text-white/60">Category</TableHead>
                  <TableHead className="text-white/60">Valuation</TableHead>
                  <TableHead className="text-white/60">Fractions Issued</TableHead>
                  <TableHead className="text-white/60">Oracle Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rwas.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={5} className="text-center text-white/50 py-8">No RWAs tokenized yet.</TableCell>
                  </TableRow>
                ) : (
                  rwas.map((row, i) => (
                    <TableRow key={row.id || i} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        <div>{row.name}</div>
                        <div className="text-xs text-white/40 font-mono">{row.id?.substring(0, 8)}...</div>
                      </TableCell>
                      <TableCell className="text-white/70">{row.category}</TableCell>
                      <TableCell className="text-white/70 font-mono">${row.valuation?.toLocaleString()}</TableCell>
                      <TableCell className="text-white/70">{row.fractions?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={row.oracleStatus === 'Synced' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-400'}>
                          {row.oracleStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export function NFTMarketplace({ primaryColor, userUid, config }: { primaryColor: string, userUid?: string, config?: any }) {
  const [collections, setCollections] = useState<any[]>([]);
  const [tradingFee, setTradingFee] = useState('2.5');
  const [creatorRoyalty, setCreatorRoyalty] = useState('5.0');
  const [mintingFee, setMintingFee] = useState('0.05');
  const [isSavingModel, setIsSavingModel] = useState(false);
  
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (!userUid) return;

    // Fetch Revenue Model
    const fetchRevenueModel = async () => {
      try {
        const docRef = doc(db, 'nftRevenueModels', userUid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTradingFee(data.tradingFee?.toString() || '2.5');
          setCreatorRoyalty(data.creatorRoyalty?.toString() || '5.0');
          setMintingFee(data.mintingFee?.toString() || '0.05');
        }
      } catch (error) {
        console.error("Error fetching revenue model:", error);
      }
    };
    fetchRevenueModel();

    // Listen to NFT Collections
    const q = query(collection(db, 'nftCollections'), where('ownerUid', '==', userUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const colData: any[] = [];
      snapshot.forEach((doc) => colData.push({ id: doc.id, ...doc.data() }));
      setCollections(colData);
    });

    return () => unsubscribe();
  }, [userUid]);

  const handleSaveRevenueModel = async () => {
    if (!userUid) return;
    setIsSavingModel(true);
    try {
      const docRef = doc(db, 'nftRevenueModels', userUid);
      const docSnap = await getDoc(docRef);
      
      const data = {
        tradingFee: Number(tradingFee),
        creatorRoyalty: Number(creatorRoyalty),
        mintingFee: Number(mintingFee),
        ownerUid: userUid,
        updatedAt: serverTimestamp()
      };

      if (docSnap.exists()) {
        await updateDoc(docRef, data);
      } else {
        await setDoc(docRef, data);
      }
      alert("Revenue model updated successfully.");
    } catch (error) {
      console.error("Error saving revenue model:", error);
      alert("Failed to save revenue model.");
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleDeployCollection = async () => {
    if (!newCollectionName || !userUid) return;
    setIsDeploying(true);
    try {
      // 1. Call Kaleido backend to deploy NFT collection
      const res = await fetch('/api/kaleido/deploy-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kaleido-url': config?.kaleidoRestUrl || '',
          'x-kaleido-auth': config?.kaleidoAuthHeader || ''
        },
        body: JSON.stringify({ name: newCollectionName })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to deploy');

      // 2. Save to Firestore
      await addDoc(collection(db, 'nftCollections'), {
        name: newCollectionName,
        volume: 0,
        floorPrice: 0,
        change: 0,
        contractAddress: data.contractAddress,
        ownerUid: userUid,
        createdAt: serverTimestamp()
      });
      setNewCollectionName('');
    } catch (error) {
      console.error("Error deploying collection:", error);
      alert("Error deploying collection. Check console for details.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">NFT Marketplace & Revenue</h2>
          <p className="text-white/60">Manage NFT collections, marketplace fees, and creator royalties.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-panel neon-border-purple">
          <CardHeader>
            <CardTitle className="text-lg text-white">Revenue Model Settings</CardTitle>
            <CardDescription className="text-white/50">Configure platform-wide fee structures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
              <div>
                <div className="text-white font-medium">Marketplace Trading Fee</div>
                <div className="text-xs text-white/50">Fee taken on every secondary sale</div>
              </div>
              <div className="flex items-center gap-2">
                <Input value={tradingFee} onChange={(e) => setTradingFee(e.target.value)} type="number" className="w-20 bg-black/50 border-white/10 text-white text-right" />
                <span className="text-white/60">%</span>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
              <div>
                <div className="text-white font-medium">Default Creator Royalty</div>
                <div className="text-xs text-white/50">Enforced at the smart contract level</div>
              </div>
              <div className="flex items-center gap-2">
                <Input value={creatorRoyalty} onChange={(e) => setCreatorRoyalty(e.target.value)} type="number" className="w-20 bg-black/50 border-white/10 text-white text-right" />
                <span className="text-white/60">%</span>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
              <div>
                <div className="text-white font-medium">Minting Fee (Flat)</div>
                <div className="text-xs text-white/50">Charged to creators per collection</div>
              </div>
              <div className="flex items-center gap-2">
                <Input value={mintingFee} onChange={(e) => setMintingFee(e.target.value)} type="number" className="w-24 bg-black/50 border-white/10 text-white text-right" />
                <span className="text-white/60">ETH</span>
              </div>
            </div>
            <Button 
              onClick={handleSaveRevenueModel}
              disabled={isSavingModel}
              className="w-full text-white" 
              variant="outline" 
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              {isSavingModel ? 'Saving...' : 'Update Revenue Model'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-panel neon-border-blue">
            <CardHeader>
              <CardTitle className="text-lg text-white">Deploy New Collection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input 
                  value={newCollectionName} 
                  onChange={(e) => setNewCollectionName(e.target.value)} 
                  placeholder="Collection Name (e.g. Cyber Punks)" 
                  className="bg-black/50 border-white/10 text-white flex-1" 
                />
                <Button 
                  onClick={handleDeployCollection}
                  disabled={isDeploying || !newCollectionName}
                  className="text-white" 
                  style={{ backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}60` }}
                >
                  {isDeploying ? 'Deploying...' : <><ImageIcon className="mr-2 h-4 w-4" /> Deploy</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel neon-border-blue">
            <CardHeader>
              <CardTitle className="text-lg text-white">Top Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {collections.length === 0 ? (
                  <div className="text-center text-white/50 py-4">No collections deployed yet.</div>
                ) : (
                  collections.map((col, i) => (
                    <div key={col.id || i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <ImageIcon size={16} className="text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{col.name}</div>
                          <div className="text-xs text-white/50">Floor: {col.floorPrice || 0} ETH</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-mono">{col.volume || 0} ETH</div>
                        <div className={`text-xs ${col.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {col.change >= 0 ? '+' : ''}{col.change || 0}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
