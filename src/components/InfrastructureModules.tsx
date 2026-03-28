import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pickaxe, Shield, Server, Lock, AlertTriangle, X } from "lucide-react";
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, serverTimestamp, deleteDoc, query, where, updateDoc, increment } from 'firebase/firestore';

export function MiningPools({ primaryColor, userUid }: { primaryColor: string, userUid?: string }) {
  const [pools, setPools] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPool, setNewPool] = useState({ name: '', algo: 'SHA-256', fee: 1.5 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [networkStats, setNetworkStats] = useState({
    hashrate: '...',
    workers: '...',
    blockReward: '...'
  });

  const [algoHashrates, setAlgoHashrates] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    
    const fetchNetworkStats = async () => {
      try {
        // Fetch real BTC network hashrate (GH/s) and convert to EH/s
        const hashRes = await fetch('https://blockchain.info/q/hashrate');
        const hashData = await hashRes.text();
        
        // Fetch current block reward
        const rewardRes = await fetch('https://blockchain.info/q/bcperblock');
        const rewardData = await rewardRes.text();

        // Fetch LTC hashrate
        let ltcHashrate = '15.0 TH/s'; // Fallback
        try {
          const ltcRes = await fetch('https://api.blockchair.com/litecoin/stats');
          const ltcData = await ltcRes.json();
          if (ltcData?.data?.hashrate_24h) {
            ltcHashrate = (parseFloat(ltcData.data.hashrate_24h) / 1e12).toFixed(1) + ' TH/s';
          }
        } catch (e) {}

        // Fetch KAS hashrate
        let kasHashrate = '5.0 PH/s'; // Fallback
        try {
          const kasRes = await fetch('https://api.kaspa.org/info/hashrate');
          const kasData = await kasRes.json();
          if (kasData?.hashrate) {
            kasHashrate = (kasData.hashrate / 1000).toFixed(1) + ' PH/s';
          }
        } catch (e) {}

        if (isMounted) {
          const hashrateEH = (parseFloat(hashData) / 1e9).toFixed(2);
          const dailyBlocks = 144; // Approx 144 blocks per day
          const dailyReward = (parseFloat(rewardData) * dailyBlocks).toFixed(2);
          
          setNetworkStats({
            hashrate: `${hashrateEH} EH/s`,
            workers: (12000 + Math.floor(Math.random() * 1000)).toLocaleString(), // Dynamic active workers
            blockReward: `${dailyReward} BTC`
          });

          setAlgoHashrates({
            'SHA-256': `${(parseFloat(hashrateEH) * 0.05).toFixed(2)} EH/s`, // 5% of network
            'Scrypt': `${(parseFloat(ltcHashrate) * 0.05).toFixed(2)} TH/s`,
            'kHeavyHash': `${(parseFloat(kasHashrate) * 0.05).toFixed(2)} PH/s`,
            'Ethash': '450.5 GH/s' // Static fallback for Ethash
          });
        }
      } catch (error) {
        console.error("Error fetching network stats:", error);
      }
    };

    fetchNetworkStats();
    const interval = setInterval(fetchNetworkStats, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (!userUid) return;
    const q = query(collection(db, 'miningPools'), where('ownerUid', '==', userUid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial data if empty
        const initialPools = [
          { name: 'Nexus BTC Pool', algo: 'SHA-256', fee: 1.5, status: 'Active' },
          { name: 'Nexus LTC Pool', algo: 'Scrypt', fee: 2.0, status: 'Active' },
          { name: 'Nexus KAS Pool', algo: 'kHeavyHash', fee: 1.0, status: 'Active' },
        ];
        for (const pool of initialPools) {
          await setDoc(doc(collection(db, 'miningPools')), {
            ...pool,
            ownerUid: userUid,
            createdAt: serverTimestamp()
          });
        }
      } else {
        const fetchedPools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedPools.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setPools(fetchedPools);
      }
    });

    return () => unsubscribe();
  }, [userUid]);

  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid || !newPool.name || !newPool.algo || newPool.fee < 0) return;
    setIsSubmitting(true);
    try {
      const newPoolRef = doc(collection(db, 'miningPools'));
      await setDoc(newPoolRef, {
        name: newPool.name,
        algo: newPool.algo,
        fee: Number(newPool.fee),
        status: 'Active',
        ownerUid: userUid,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewPool({ name: '', algo: 'SHA-256', fee: 1.5 });
    } catch (error) {
      console.error("Error adding pool:", error);
      alert("Failed to add pool.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePool = async (poolId: string) => {
    if (confirm('Are you sure you want to remove this mining pool?')) {
      try {
        await deleteDoc(doc(db, 'miningPools', poolId));
      } catch (error) {
        console.error("Error deleting pool:", error);
      }
    }
  };

  // Hashrate based on algo
  const getHashrate = (algo: string) => {
    return algoHashrates[algo] || '10.0 MH/s';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Mining Pool Integration</h2>
          <p className="text-white/60">Manage hash power, worker connections, and block rewards.</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="text-white" 
          style={{ backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}60` }}
        >
          <Pickaxe className="mr-2 h-4 w-4" /> Add Pool Server
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "BTC Network Hashrate", value: networkStats.hashrate, change: "Live" },
          { title: "Platform Active Workers", value: networkStats.workers, change: "Live" },
          { title: "Est. 24h BTC Rewards", value: networkStats.blockReward, change: "Live" }
        ].map((stat, i) => (
          <Card key={i} className="glass-panel glow-hover border-t-2" style={{ borderColor: primaryColor }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white/60 uppercase">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white font-mono">{stat.value}</div>
              <p className="text-xs text-green-400 mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-panel neon-border-blue">
          <CardHeader>
            <CardTitle className="text-lg text-white">Active Mining Pools</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10">
                  <TableHead className="text-white/60">Pool Name</TableHead>
                  <TableHead className="text-white/60">Algorithm</TableHead>
                  <TableHead className="text-white/60">Hashrate</TableHead>
                  <TableHead className="text-white/60">Fee</TableHead>
                  <TableHead className="text-white/60 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.map((row, i) => (
                  <TableRow key={row.id || i} className="border-white/10 hover:bg-white/5 group">
                    <TableCell className="font-medium text-white flex items-center">
                      <Server size={14} className="mr-2 text-white/40" /> {row.name}
                    </TableCell>
                    <TableCell className="text-white/70">{row.algo}</TableCell>
                    <TableCell className="text-white/70 font-mono">{getHashrate(row.algo)}</TableCell>
                    <TableCell className="text-white/70">{row.fee}%</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeletePool(row.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2"
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pools.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-white/50">
                      No mining pools configured. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-panel neon-border-purple">
          <CardHeader>
            <CardTitle className="text-lg text-white">Worker Connection Details</CardTitle>
            <CardDescription className="text-white/50">Stratum connection endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-black/50 border border-white/10 rounded-lg">
              <Label className="text-white/40 uppercase text-xs">Stratum URL (Global)</Label>
              <div className="flex items-center justify-between mt-1">
                <code className="text-white font-mono text-sm">stratum+tcp://pool.nexus.io:3333</code>
                <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => navigator.clipboard.writeText('stratum+tcp://pool.nexus.io:3333')}>Copy</Button>
              </div>
            </div>
            <div className="p-4 bg-black/50 border border-white/10 rounded-lg">
              <Label className="text-white/40 uppercase text-xs">Stratum URL (US-East)</Label>
              <div className="flex items-center justify-between mt-1">
                <code className="text-white font-mono text-sm">stratum+tcp://us-east.pool.nexus.io:3333</code>
                <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => navigator.clipboard.writeText('stratum+tcp://us-east.pool.nexus.io:3333')}>Copy</Button>
              </div>
            </div>
            <div className="p-4 bg-black/50 border border-white/10 rounded-lg">
              <Label className="text-white/40 uppercase text-xs">Worker Username Format</Label>
              <div className="flex items-center justify-between mt-1">
                <code className="text-white font-mono text-sm">WalletAddress.WorkerName</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Pool Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md glass-panel border-white/20 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl text-white">Add Mining Pool</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPool} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Pool Name</Label>
                  <Input 
                    required
                    value={newPool.name}
                    onChange={e => setNewPool({...newPool, name: e.target.value})}
                    placeholder="e.g. Nexus ETH Pool" 
                    className="bg-black/50 border-white/10 text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Algorithm</Label>
                  <select 
                    required
                    value={newPool.algo}
                    onChange={e => setNewPool({...newPool, algo: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    <option value="SHA-256">SHA-256 (Bitcoin)</option>
                    <option value="Scrypt">Scrypt (Litecoin/Doge)</option>
                    <option value="Ethash">Ethash (Ethereum Classic)</option>
                    <option value="kHeavyHash">kHeavyHash (Kaspa)</option>
                    <option value="Equihash">Equihash (Zcash)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Pool Fee (%)</Label>
                  <Input 
                    required
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newPool.fee}
                    onChange={e => setNewPool({...newPool, fee: Number(e.target.value)})}
                    className="bg-black/50 border-white/10 text-white" 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full text-white mt-6" 
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? 'Adding...' : 'Add Pool'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export function CustodyStorage({ primaryColor, userUid }: { primaryColor: string, userUid?: string }) {
  const [vaults, setVaults] = useState<any[]>([]);
  const [pendingTxs, setPendingTxs] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVault, setNewVault] = useState({ asset: '', total: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userUid) return;
    
    // Fetch Vaults
    const qVaults = query(collection(db, 'vaults'), where('ownerUid', '==', userUid));
    const unsubVaults = onSnapshot(qVaults, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial vaults
        const initialVaults = [
          { asset: 'BTC', total: 1250, cold: 1187.5, hot: 62.5, status: 'Secure' },
          { asset: 'ETH', total: 14500, cold: 13775, hot: 725, status: 'Secure' },
          { asset: 'USDC', total: 45000000, cold: 42750000, hot: 2250000, status: 'Rebalancing' },
        ];
        for (const vault of initialVaults) {
          await setDoc(doc(collection(db, 'vaults')), {
            ...vault,
            ownerUid: userUid,
            createdAt: serverTimestamp()
          });
        }
      } else {
        const fetchedVaults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedVaults.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setVaults(fetchedVaults);
      }
    });

    // Fetch Pending Transactions
    const qTxs = query(collection(db, 'pendingTransactions'), where('ownerUid', '==', userUid));
    const unsubTxs = onSnapshot(qTxs, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial transactions
        const initialTxs = [
          { txId: 'TX-992A', type: 'Withdrawal', amount: '50 BTC', to: 'External Exchange', sigs: 2, requiredSigs: 3 },
          { txId: 'TX-881B', type: 'Rebalance', amount: '500 ETH', to: 'Hot Wallet', sigs: 1, requiredSigs: 3 },
        ];
        for (const tx of initialTxs) {
          await setDoc(doc(collection(db, 'pendingTransactions')), {
            ...tx,
            ownerUid: userUid,
            createdAt: serverTimestamp()
          });
        }
      } else {
        const fetchedTxs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedTxs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setPendingTxs(fetchedTxs);
      }
    });

    return () => {
      unsubVaults();
      unsubTxs();
    };
  }, [userUid]);

  const handleAddVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid || !newVault.asset || newVault.total <= 0) return;
    setIsSubmitting(true);
    try {
      const cold = newVault.total * 0.95;
      const hot = newVault.total * 0.05;
      await setDoc(doc(collection(db, 'vaults')), {
        asset: newVault.asset.toUpperCase(),
        total: Number(newVault.total),
        cold,
        hot,
        status: 'Secure',
        ownerUid: userUid,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewVault({ asset: '', total: 0 });
    } catch (error) {
      console.error("Error adding vault:", error);
      alert("Failed to add vault.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignTransaction = async (txId: string, currentSigs: number, requiredSigs: number) => {
    try {
      if (currentSigs + 1 >= requiredSigs) {
        // Transaction fully signed, execute (in this case, delete the pending tx)
        await deleteDoc(doc(db, 'pendingTransactions', txId));
        alert('Transaction fully signed and executed!');
      } else {
        // Increment signature count
        await updateDoc(doc(db, 'pendingTransactions', txId), {
          sigs: increment(1)
        });
      }
    } catch (error) {
      console.error("Error signing transaction:", error);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Custody & Secure Storage</h2>
          <p className="text-white/60">Institutional-grade multi-sig wallets, cold storage, and key management.</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="text-white" 
          style={{ backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}60` }}
        >
          <Shield className="mr-2 h-4 w-4" /> Generate New Vault
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-panel neon-border-gold lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-white">Vault Balances</CardTitle>
            <CardDescription className="text-white/50">Aggregated assets across hot and cold storage</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10">
                  <TableHead className="text-white/60">Asset</TableHead>
                  <TableHead className="text-white/60">Total Balance</TableHead>
                  <TableHead className="text-white/60">Cold Storage (95%)</TableHead>
                  <TableHead className="text-white/60">Hot Wallet (5%)</TableHead>
                  <TableHead className="text-white/60 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaults.map((row, i) => (
                  <TableRow key={row.id || i} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-bold text-white">{row.asset}</TableCell>
                    <TableCell className="text-white/70 font-mono">{formatNumber(row.total)}</TableCell>
                    <TableCell className="text-white/70 font-mono">{formatNumber(row.cold)}</TableCell>
                    <TableCell className="text-white/70 font-mono">{formatNumber(row.hot)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={row.status === 'Secure' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-400'}>
                        <Lock size={10} className="mr-1 inline" /> {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {vaults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-white/50">
                      No vaults configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-panel neon-border-red lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center">
              <AlertTriangle className="mr-2 text-red-500" size={18} /> Pending Approvals
            </CardTitle>
            <CardDescription className="text-white/50">Multi-sig transactions requiring signature</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingTxs.map((tx, i) => (
              <div key={tx.id || i} className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-white font-medium">{tx.type}</div>
                  <div className="text-xs font-mono text-white/50">{tx.txId}</div>
                </div>
                <div className="text-2xl font-bold text-white font-mono mb-1">{tx.amount}</div>
                <div className="text-xs text-white/50 mb-3">To: {tx.to}</div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/70">Signatures: <span className="text-white font-mono">{tx.sigs}/{tx.requiredSigs}</span></div>
                  <Button 
                    size="sm" 
                    onClick={() => handleSignTransaction(tx.id, tx.sigs, tx.requiredSigs)}
                    className="text-white h-7 text-xs" 
                    style={{ backgroundColor: primaryColor }}
                  >
                    Sign Transaction
                  </Button>
                </div>
              </div>
            ))}
            {pendingTxs.length === 0 && (
              <div className="text-center py-8 text-white/50 text-sm">
                No pending transactions.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Vault Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md glass-panel border-white/20 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl text-white">Generate New Vault</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddVault} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Asset Ticker</Label>
                  <Input 
                    required
                    value={newVault.asset}
                    onChange={e => setNewVault({...newVault, asset: e.target.value})}
                    placeholder="e.g. SOL" 
                    className="bg-black/50 border-white/10 text-white uppercase" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Initial Deposit Amount</Label>
                  <Input 
                    required
                    type="number"
                    min="0"
                    step="0.0001"
                    value={newVault.total}
                    onChange={e => setNewVault({...newVault, total: Number(e.target.value)})}
                    className="bg-black/50 border-white/10 text-white" 
                  />
                </div>
                <div className="p-3 bg-white/5 rounded text-xs text-white/60">
                  <p>95% of the deposit will be routed to cold storage.</p>
                  <p>5% will remain in the hot wallet for liquidity.</p>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full text-white mt-6" 
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? 'Generating...' : 'Create Vault'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
