import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, TrendingUp, Users, Rocket, ArrowUpRight, ArrowDownRight, Save, X } from "lucide-react";
import { AreaChart, Area, CartesianGrid, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot, serverTimestamp, deleteDoc, query, where, updateDoc, increment } from 'firebase/firestore';

export function TradingEngine({ primaryColor }: { primaryColor: string }) {
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);
  const [price, setPrice] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [activeSymbol, setActiveSymbol] = useState('BTCUSDT');
  const [marketStats, setMarketStats] = useState<any>({});
  
  const marketPairs = [
    { pair: 'BTC/USDT', symbol: 'BTCUSDT' },
    { pair: 'ETH/USDT', symbol: 'ETHUSDT' },
    { pair: 'SOL/USDT', symbol: 'SOLUSDT' },
    { pair: 'XRP/USDT', symbol: 'XRPUSDT' },
    { pair: 'ADA/USDT', symbol: 'ADAUSDT' },
    { pair: 'DOGE/USDT', symbol: 'DOGEUSDT' },
    { pair: 'AVAX/USDT', symbol: 'AVAXUSDT' },
    { pair: 'LINK/USDT', symbol: 'LINKUSDT' }
  ];

  const [marketTickers, setMarketTickers] = useState<Record<string, any>>({});

  useEffect(() => {
    let isMounted = true;

    // Fetch all tickers for the sidebar
    const fetchAllTickers = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const data = await res.json();
        if (isMounted && Array.isArray(data)) {
          const tickerMap: Record<string, any> = {};
          data.forEach((t: any) => {
            tickerMap[t.symbol] = t;
          });
          setMarketTickers(tickerMap);
        }
      } catch (error) {
        console.error("Error fetching all tickers:", error);
      }
    };

    fetchAllTickers();
    const tickerInterval = setInterval(fetchAllTickers, 10000);

    return () => {
      isMounted = false;
      clearInterval(tickerInterval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        // Fetch Order Book
        const depthRes = await fetch(`https://api.binance.com/api/v3/depth?symbol=${activeSymbol}&limit=15`);
        const depthData = await depthRes.json();
        
        if (isMounted && depthData.bids && depthData.asks) {
          setBids(depthData.bids.map((b: any) => ({ price: parseFloat(b[0]), amount: parseFloat(b[1]) })));
          setAsks(depthData.asks.map((a: any) => ({ price: parseFloat(a[0]), amount: parseFloat(a[1]) })).reverse());
        }

        // Fetch 24hr Ticker for current price and stats
        const tickerRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${activeSymbol}`);
        const tickerData = await tickerRes.json();
        
        if (isMounted && tickerData.lastPrice) {
          setPrice(parseFloat(tickerData.lastPrice));
          setMarketStats(tickerData);
        }
      } catch (error) {
        console.error("Error fetching market data:", error);
      }
    };

    const fetchChart = async () => {
      try {
        const klinesRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${activeSymbol}&interval=1m&limit=40`);
        const klinesData = await klinesRes.json();
        if (isMounted && Array.isArray(klinesData)) {
          const formattedChart = klinesData.map((k: any) => ({
            time: k[0],
            price: parseFloat(k[4]) // Close price
          }));
          setChartData(formattedChart);
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
      }
    };

    fetchData();
    fetchChart();

    const interval = setInterval(fetchData, 3000);
    const chartInterval = setInterval(fetchChart, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearInterval(chartInterval);
    };
  }, [activeSymbol]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Spot Trading Engine</h2>
          <p className="text-white/60">High-performance matching engine with real-time Binance order book.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2">
            <div className="text-xs text-white/50">24h Volume ({activeSymbol})</div>
            <div className="text-white font-mono">{marketStats.quoteVolume ? `$${(parseFloat(marketStats.quoteVolume) / 1000000).toFixed(2)}M` : '...'}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2">
            <div className="text-xs text-white/50">24h Change</div>
            <div className={`font-mono ${parseFloat(marketStats.priceChangePercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {marketStats.priceChangePercent ? `${parseFloat(marketStats.priceChangePercent) > 0 ? '+' : ''}${parseFloat(marketStats.priceChangePercent).toFixed(2)}%` : '...'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Markets */}
        <Card className="glass-panel neon-border-blue lg:col-span-1 flex flex-col h-[600px]">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm text-white/70 uppercase tracking-wider">Markets</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <div className="divide-y divide-white/5">
              {marketPairs.map((market, i) => {
                const ticker = marketTickers[market.symbol];
                const change = ticker ? parseFloat(ticker.priceChangePercent) : 0;
                const isActive = activeSymbol === market.symbol;
                return (
                  <div 
                    key={i} 
                    onClick={() => setActiveSymbol(market.symbol)}
                    className={`p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 ${isActive ? 'bg-white/10 border-l-2' : ''}`} 
                    style={{ borderLeftColor: isActive ? primaryColor : 'transparent' }}
                  >
                    <span className="text-white font-medium text-sm">{market.pair}</span>
                    <span className={`text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Middle Column: Chart & Order Entry */}
        <div className="lg:col-span-2 space-y-6 flex flex-col h-[600px]">
          {/* Chart */}
          <Card className="glass-panel neon-border-purple flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2 flex flex-row justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg text-white">{marketPairs.find(m => m.symbol === activeSymbol)?.pair || activeSymbol}</CardTitle>
                <span className="text-2xl font-mono text-green-400">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
              </div>
              <div className="flex gap-2">
                {['15m', '1H', '4H', '1D'].map(tf => (
                  <button key={tf} className="text-xs text-white/50 hover:text-white px-2 py-1 rounded bg-white/5">{tf}</button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <YAxis domain={['auto', 'auto']} orientation="right" stroke="rgba(255,255,255,0.2)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 10}} tickFormatter={(val) => `$${val}`} />
                  <Area type="monotone" dataKey="price" stroke={primaryColor} fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Order Entry */}
          <Card className="glass-panel neon-border-blue flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex gap-2 mb-4">
                <Button 
                  className="flex-1" 
                  variant={orderSide === 'buy' ? 'default' : 'outline'}
                  style={orderSide === 'buy' ? { backgroundColor: '#22c55e', color: 'white', borderColor: '#22c55e' } : { borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                  onClick={() => setOrderSide('buy')}
                >
                  Buy
                </Button>
                <Button 
                  className="flex-1" 
                  variant={orderSide === 'sell' ? 'default' : 'outline'}
                  style={orderSide === 'sell' ? { backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' } : { borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                  onClick={() => setOrderSide('sell')}
                >
                  Sell
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-white/50">
                  <span>Available</span>
                  <span className="font-mono">124,500.00 USD</span>
                </div>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">Price</span>
                    <Input type="number" value={price} readOnly className="pl-14 bg-black/50 border-white/10 text-white text-right font-mono" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">USDT</span>
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">Amount</span>
                    <Input type="number" placeholder="0.00" className="pl-16 bg-black/50 border-white/10 text-white text-right font-mono" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">{activeSymbol.replace('USDT', '')}</span>
                  </div>
                </div>
                <Button className="w-full text-white font-bold" style={{ backgroundColor: orderSide === 'buy' ? '#22c55e' : '#ef4444' }}>
                  {orderSide === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Order Book */}
        <Card className="glass-panel neon-border-green lg:col-span-1 flex flex-col h-[600px]">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm text-white/70 uppercase tracking-wider flex justify-between">
              <span>Price (USD)</span>
              <span>Amount</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            {/* Asks (Sells) */}
            <div className="flex-1 overflow-y-auto flex flex-col-reverse scrollbar-hide">
              {asks.map((ask, i) => (
                <div key={i} className="flex justify-between px-4 py-1 text-xs font-mono relative group cursor-pointer hover:bg-white/5">
                  <div className="absolute right-0 top-0 bottom-0 bg-red-500/10" style={{ width: `${Math.min(100, (ask.amount / (asks[asks.length-1]?.amount || 1)) * 100)}%` }}></div>
                  <span className="text-red-400 relative z-10">{ask.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                  <span className="text-white relative z-10">{ask.amount.toFixed(4)}</span>
                </div>
              ))}
            </div>
            
            {/* Current Price Divider */}
            <div className="py-2 px-4 border-y border-white/10 bg-white/5 flex items-center justify-between flex-shrink-0">
              <span className="text-lg font-mono text-green-400">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>

            {/* Bids (Buys) */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {bids.map((bid, i) => (
                <div key={i} className="flex justify-between px-4 py-1 text-xs font-mono relative group cursor-pointer hover:bg-white/5">
                  <div className="absolute right-0 top-0 bottom-0 bg-green-500/10" style={{ width: `${Math.min(100, (bid.amount / (bids[0]?.amount || 1)) * 100)}%` }}></div>
                  <span className="text-green-400 relative z-10">{bid.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                  <span className="text-white relative z-10">{bid.amount.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function Derivatives({ primaryColor, userUid }: { primaryColor: string, userUid?: string }) {
  const [maxLeverage, setMaxLeverage] = useState<number>(50);
  const [maintenanceMargin, setMaintenanceMargin] = useState<number>(0.5);
  const [isSaving, setIsSaving] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);

  const perpSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT'];

  useEffect(() => {
    let isMounted = true;

    const fetchFuturesData = async () => {
      try {
        const [premiumRes, tickerRes] = await Promise.all([
          fetch('https://fapi.binance.com/fapi/v1/premiumIndex'),
          fetch('https://fapi.binance.com/fapi/v1/ticker/24hr')
        ]);

        const premiumData = await premiumRes.json();
        const tickerData = await tickerRes.json();

        if (isMounted && Array.isArray(premiumData) && Array.isArray(tickerData)) {
          const premiumMap = new Map(premiumData.map((p: any) => [p.symbol, p]));
          const tickerMap = new Map(tickerData.map((t: any) => [t.symbol, t]));

          const formattedContracts = perpSymbols.map(symbol => {
            const p = premiumMap.get(symbol);
            const t = tickerMap.get(symbol);
            
            return {
              pair: symbol.replace('USDT', '-PERP'),
              price: p ? parseFloat(p.markPrice) : 0,
              funding: p ? parseFloat(p.lastFundingRate) * 100 : 0, // Convert to percentage
              vol: t ? `$${(parseFloat(t.quoteVolume) / 1000000).toFixed(2)}M` : '...',
              estimatedOi: t ? `$${(parseFloat(t.quoteVolume) / 1000000 * 0.4).toFixed(2)}M` : '...'
            };
          });

          setContracts(formattedContracts);
        }
      } catch (error) {
        console.error("Error fetching futures data:", error);
      }
    };

    fetchFuturesData();
    const interval = setInterval(fetchFuturesData, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!userUid) return;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'riskEngineSettings', userUid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMaxLeverage(data.maxLeverage);
          setMaintenanceMargin(data.maintenanceMargin);
        }
      } catch (error) {
        console.error("Error fetching risk settings:", error);
      }
    };
    fetchSettings();
  }, [userUid]);

  const handleSaveSettings = async () => {
    if (!userUid) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'riskEngineSettings', userUid), {
        maxLeverage: Number(maxLeverage),
        maintenanceMargin: Number(maintenanceMargin),
        ownerUid: userUid,
        updatedAt: serverTimestamp()
      });
      alert('Risk Engine settings saved successfully!');
    } catch (error) {
      console.error("Error saving risk settings:", error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Derivatives & Perpetuals</h2>
          <p className="text-white/60">Manage leveraged trading, perpetual contracts, and funding rates.</p>
        </div>
        <Button className="text-white" style={{ backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}60` }}>
          <TrendingUp className="mr-2 h-4 w-4" /> New Contract
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel neon-border-purple md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-white">Active Contracts (Perpetual Swaps)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10">
                  <TableHead className="text-white/60">Market</TableHead>
                  <TableHead className="text-white/60">Index Price</TableHead>
                  <TableHead className="text-white/60">Funding Rate</TableHead>
                  <TableHead className="text-white/60">24h Vol</TableHead>
                  <TableHead className="text-white/60">Open Interest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((row, i) => (
                  <TableRow key={i} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell className="font-bold text-white">{row.pair}</TableCell>
                    <TableCell className="text-white/70 font-mono">${row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className={`font-mono ${row.funding < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {row.funding > 0 ? '+' : ''}{row.funding.toFixed(4)}%
                    </TableCell>
                    <TableCell className="text-white/70 font-mono">{row.vol}</TableCell>
                    <TableCell className="text-white/70 font-mono">{row.estimatedOi}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-panel neon-border-gold">
          <CardHeader>
            <CardTitle className="text-lg text-white">Risk Engine</CardTitle>
            <CardDescription className="text-white/50">Global liquidation monitoring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="text-sm text-red-400 font-medium mb-1 flex items-center">
                <ArrowDownRight size={16} className="mr-1" /> Recent Liquidations
              </div>
              <div className="text-2xl font-bold text-white font-mono">$14.2M</div>
              <div className="text-xs text-white/50 mt-1">Past 24 hours</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white/70">Max Leverage Allowed</Label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={maxLeverage} 
                  onChange={(e) => setMaxLeverage(Number(e.target.value))}
                  className="w-full accent-white" 
                />
                <span className="text-white font-mono bg-white/10 px-2 py-1 rounded w-16 text-center">{maxLeverage}x</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Maintenance Margin (%)</Label>
              <Input 
                type="number" 
                value={maintenanceMargin} 
                onChange={(e) => setMaintenanceMargin(Number(e.target.value))}
                className="bg-black/50 border-white/10 text-white" 
                step="0.1"
                min="0"
                max="100"
              />
            </div>

            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving}
              className="w-full mt-4 text-white" 
              style={{ backgroundColor: primaryColor }}
            >
              {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Risk Settings</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CopyTrading({ primaryColor, userUid }: { primaryColor: string, userUid?: string }) {
  const [copiedTraders, setCopiedTraders] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const availableTraders = [
    { id: 'trader1', name: 'CryptoWhale99', roi: '+345.2%', aum: '$4.2M', copiers: 1240, risk: 'High' },
    { id: 'trader2', name: 'SteadyGains', roi: '+45.8%', aum: '$12.5M', copiers: 8400, risk: 'Low' },
    { id: 'trader3', name: 'AlphaSeeker', roi: '+120.4%', aum: '$1.8M', copiers: 450, risk: 'Medium' },
  ];

  useEffect(() => {
    if (!userUid) return;
    
    const unsubscribe = onSnapshot(collection(db, 'copiedTraders'), (snapshot) => {
      const copied = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((doc: any) => doc.ownerUid === userUid);
      setCopiedTraders(copied);
    }, (error) => {
      console.error("Error fetching copied traders:", error);
    });

    return () => unsubscribe();
  }, [userUid]);

  const handleCopyTrader = async (trader: any) => {
    if (!userUid) return;
    setIsProcessing(trader.id);
    
    try {
      // Check if already copying
      const existingCopy = copiedTraders.find(c => c.traderId === trader.id);
      
      if (existingCopy) {
        // Stop copying
        await deleteDoc(doc(db, 'copiedTraders', existingCopy.id));
      } else {
        // Start copying
        const newCopyRef = doc(collection(db, 'copiedTraders'));
        await setDoc(newCopyRef, {
          traderId: trader.id,
          traderName: trader.name,
          allocation: 1000, // Default allocation
          ownerUid: userUid,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error toggling copy trader:", error);
      alert("Failed to update copy trading status.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Copy Trading Module</h2>
          <p className="text-white/60">Allow users to automatically mirror the trades of top performers.</p>
        </div>
        <Button className="text-white" style={{ backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}60` }}>
          <Users className="mr-2 h-4 w-4" /> Manage Traders
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {availableTraders.map((trader, i) => {
          const isCopied = copiedTraders.some(c => c.traderId === trader.id);
          const isCurrentlyProcessing = isProcessing === trader.id;

          return (
            <Card key={i} className={`glass-panel transition-all cursor-pointer ${isCopied ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'hover:border-white/30'}`}>
              <CardHeader className="pb-2 flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="text-lg text-white">{trader.name}</CardTitle>
                  <Badge variant="outline" className={`mt-2 ${trader.risk === 'Low' ? 'border-green-500/50 text-green-400' : trader.risk === 'Medium' ? 'border-yellow-500/50 text-yellow-400' : 'border-red-500/50 text-red-400'}`}>
                    {trader.risk} Risk
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{trader.roi}</div>
                  <div className="text-xs text-white/40 uppercase">30d ROI</div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 border-t border-white/10 mt-4">
                <div className="flex justify-between text-sm mb-4">
                  <div className="text-white/60">AUM: <span className="text-white font-mono">{trader.aum}</span></div>
                  <div className="text-white/60">Copiers: <span className="text-white font-mono">{trader.copiers + (isCopied ? 1 : 0)}</span></div>
                </div>
                <Button 
                  onClick={() => handleCopyTrader(trader)}
                  disabled={isCurrentlyProcessing}
                  className="w-full text-white font-medium transition-all" 
                  style={{ 
                    backgroundColor: isCopied ? 'transparent' : primaryColor,
                    border: isCopied ? '1px solid #22c55e' : 'none',
                    color: isCopied ? '#22c55e' : 'white'
                  }}
                >
                  {isCurrentlyProcessing ? 'Processing...' : isCopied ? 'Stop Copying' : 'Copy Trader'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function Launchpad({ primaryColor, userUid }: { primaryColor: string, userUid?: string }) {
  const [sales, setSales] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSale, setNewSale] = useState({ name: '', ticker: '', target: 1000000 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userUid) return;
    const q = query(collection(db, 'tokenSales'), where('ownerUid', '==', userUid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial data if empty
        const initialSales = [
          { name: 'Nexus AI Protocol', ticker: 'NAI', raised: 2500000, target: 5000000, status: 'Live', participants: 1240 },
          { name: 'Decentralized Storage', ticker: 'DSTORE', raised: 5000000, target: 5000000, status: 'Completed', participants: 3400 },
          { name: 'Web3 Gaming Hub', ticker: 'PLAY', raised: 0, target: 1000000, status: 'Upcoming', participants: 0 },
        ];
        for (const sale of initialSales) {
          await setDoc(doc(collection(db, 'tokenSales')), {
            ...sale,
            ownerUid: userUid,
            createdAt: serverTimestamp()
          });
        }
      } else {
        const fetchedSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by createdAt descending
        fetchedSales.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setSales(fetchedSales);
      }
    });

    return () => unsubscribe();
  }, [userUid]);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid || !newSale.name || !newSale.ticker || newSale.target <= 0) return;
    setIsSubmitting(true);
    try {
      const newSaleRef = doc(collection(db, 'tokenSales'));
      await setDoc(newSaleRef, {
        name: newSale.name,
        ticker: newSale.ticker.toUpperCase(),
        raised: 0,
        target: Number(newSale.target),
        status: 'Upcoming',
        participants: 0,
        ownerUid: userUid,
        createdAt: serverTimestamp()
      });
      setShowCreateModal(false);
      setNewSale({ name: '', ticker: '', target: 1000000 });
    } catch (error) {
      console.error("Error creating sale:", error);
      alert("Failed to create sale.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParticipate = async (saleId: string) => {
    try {
      const saleRef = doc(db, 'tokenSales', saleId);
      // Simulate a random investment between 10k and 50k
      const investment = Math.floor(Math.random() * 40000) + 10000;
      await updateDoc(saleRef, {
        raised: increment(investment),
        participants: increment(1),
        status: 'Live' // Automatically set to live if someone participates
      });
    } catch (error) {
      console.error("Error participating:", error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Token Launchpad & Fundraising</h2>
          <p className="text-white/60">Host IDOs, IEOs, and token sales directly on your platform.</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="text-white" 
          style={{ backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}60` }}
        >
          <Rocket className="mr-2 h-4 w-4" /> Create Sale
        </Button>
      </div>

      <Card className="glass-panel neon-border-blue">
        <CardHeader>
          <CardTitle className="text-lg text-white">Active & Upcoming Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {sales.map((sale, i) => {
              const progress = Math.min((sale.raised / sale.target) * 100, 100);
              const isCompleted = sale.status === 'Completed' || sale.raised >= sale.target;
              
              return (
                <div key={sale.id || i} className="p-4 bg-white/5 rounded-lg border border-white/10 relative overflow-hidden group">
                  {/* Background Progress Glow */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 opacity-5 transition-all duration-1000"
                    style={{ width: `${progress}%`, backgroundColor: primaryColor }}
                  ></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{sale.name} <span className="text-sm font-normal text-white/50 ml-2">{sale.ticker}</span></h3>
                        <div className="text-sm text-white/60 mt-1">{sale.participants} Participants</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className={
                          isCompleted ? 'border-blue-500/50 text-blue-400' : 
                          sale.status === 'Live' ? 'border-green-500/50 text-green-400 animate-pulse' : 
                          'border-yellow-500/50 text-yellow-400'
                        }>
                          {isCompleted ? 'Completed' : sale.status}
                        </Badge>
                        {!isCompleted && (
                          <Button 
                            size="sm" 
                            onClick={() => handleParticipate(sale.id)}
                            className="text-white h-7 text-xs" 
                            style={{ backgroundColor: primaryColor }}
                          >
                            Invest (Simulate)
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">Progress</span>
                        <span className="text-white font-mono">${(sale.raised / 1000000).toFixed(2)}M / ${(sale.target / 1000000).toFixed(2)}M</span>
                      </div>
                      <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000" 
                          style={{ 
                            width: `${progress}%`,
                            backgroundColor: isCompleted ? '#3b82f6' : primaryColor,
                            boxShadow: `0 0 10px ${isCompleted ? '#3b82f6' : primaryColor}`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {sales.length === 0 && (
              <div className="text-center py-12 text-white/50">
                Loading sales data...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Sale Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md glass-panel border-white/20 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl text-white">Create Token Sale</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSale} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Project Name</Label>
                  <Input 
                    required
                    value={newSale.name}
                    onChange={e => setNewSale({...newSale, name: e.target.value})}
                    placeholder="e.g. Nexus Protocol" 
                    className="bg-black/50 border-white/10 text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Token Ticker</Label>
                  <Input 
                    required
                    value={newSale.ticker}
                    onChange={e => setNewSale({...newSale, ticker: e.target.value})}
                    placeholder="e.g. NXP" 
                    className="bg-black/50 border-white/10 text-white uppercase" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Target Raise (USD)</Label>
                  <Input 
                    required
                    type="number"
                    min="10000"
                    value={newSale.target}
                    onChange={e => setNewSale({...newSale, target: Number(e.target.value)})}
                    className="bg-black/50 border-white/10 text-white" 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full text-white mt-6" 
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? 'Creating...' : 'Launch Sale'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
