import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy route for Kaleido REST Gateway
  app.get("/api/kaleido", async (req, res) => {
    try {
      // Get credentials from headers (provided by the frontend for the specific user)
      const authHeader = req.headers['x-kaleido-auth'] as string || "Basic dTBtaXdnMmRsYzp0eThPUUFpRGg2YWNmemI5SFM2eVMwSjE2Z3pTcTZqMVBMQU5LS2FwTGYw";
      const restUrl = req.headers['x-kaleido-url'] as string || process.env.KALEIDO_REST_URL;

      let recentBlocks: any[] = [];
      let syncStatus = "Syncing...";
      
      if (restUrl) {
        if (!restUrl.startsWith('http://') && !restUrl.startsWith('https://')) {
          console.error(`Invalid KALEIDO_REST_URL provided: "${restUrl}". It must be a valid URL starting with http:// or https://. Did you accidentally paste the base64 credentials here?`);
        } else {
          try {
            // Attempt to fetch from Kaleido JSON-RPC endpoint
            const rpcRes = await fetch(restUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_blockNumber",
                params: [],
                id: 1
              })
            });
            
            if (rpcRes.ok) {
              const rpcData = await rpcRes.json();
              if (rpcData.result) {
                const latestBlock = parseInt(rpcData.result, 16);
                syncStatus = "Synced";
                
                // Fetch last 5 blocks
                for(let i = 0; i < 5; i++) {
                  const blockRes = await fetch(restUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': authHeader
                    },
                    body: JSON.stringify({
                      jsonrpc: "2.0",
                      method: "eth_getBlockByNumber",
                      params: ["0x" + (latestBlock - i).toString(16), false],
                      id: i + 2
                    })
                  });
                  const blockData = await blockRes.json();
                  if (blockData.result) {
                    recentBlocks.push({
                      id: blockData.result.hash ? blockData.result.hash.substring(0, 10) + "..." : `Block ${latestBlock - i}`,
                      timestamp: new Date(parseInt(blockData.result.timestamp, 16) * 1000).toISOString(),
                      transactions: blockData.result.transactions ? blockData.result.transactions.length : 0,
                      status: "Confirmed"
                    });
                  }
                }
              }
            } else {
              console.warn(`Kaleido node returned status ${rpcRes.status}`);
            }
          } catch (e) {
            console.error("Error calling Kaleido node:", e);
          }
        }
      } else {
        console.warn("KALEIDO_REST_URL is not set. Using simulated block data.");
      }

      // If we couldn't fetch real blocks from Kaleido, use real Ethereum mainnet blocks as a fallback
      if (recentBlocks.length === 0) {
        try {
          const ethRes = await fetch('https://cloudflare-eth.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_blockNumber",
              params: [],
              id: 1
            })
          });
          
          if (ethRes.ok) {
            const ethData = await ethRes.json();
            if (ethData.result) {
              const latestBlock = parseInt(ethData.result, 16);
              syncStatus = "Synced (ETH Mainnet Fallback)";
              
              // Fetch last 5 blocks
              for(let i = 0; i < 5; i++) {
                const blockRes = await fetch('https://cloudflare-eth.com', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getBlockByNumber",
                    params: ["0x" + (latestBlock - i).toString(16), false],
                    id: i + 2
                  })
                });
                const blockData = await blockRes.json();
                if (blockData.result) {
                  recentBlocks.push({
                    id: blockData.result.hash ? blockData.result.hash.substring(0, 10) + "..." : `Block ${latestBlock - i}`,
                    timestamp: new Date(parseInt(blockData.result.timestamp, 16) * 1000).toISOString(),
                    transactions: blockData.result.transactions ? blockData.result.transactions.length : 0,
                    status: "Confirmed"
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error("Error fetching fallback ETH blocks:", e);
        }
      }

      // If still empty, use simulated ones
      if (recentBlocks.length === 0) {
        recentBlocks = Array.from({ length: 5 }).map((_, i) => ({
          id: `0x${Math.random().toString(16).slice(2, 10)}`,
          timestamp: new Date(Date.now() - i * 15000).toISOString(),
          transactions: Math.floor(Math.random() * 500),
          status: Math.random() > 0.05 ? "Confirmed" : "Pending",
        }));
        syncStatus = Math.random() > 0.1 ? "Synced" : "Syncing...";
      }

      // Simulated node data for the dashboard-specific metrics (Chaos, Damping)
      const data = {
        nodeState: (Math.random() * 100).toFixed(2),
        chaosLevel: (Math.random() * 10).toFixed(2),
        damping: (Math.random() * 5).toFixed(2),
        syncStatus,
        recentBlocks,
        chartData: Array.from({ length: 20 }).map((_, i) => ({
          time: new Date(Date.now() - (19 - i) * 5000).toLocaleTimeString(),
          stability: 80 + Math.random() * 20,
          chaos: Math.random() * 30,
        }))
      };

      res.json(data);
    } catch (error) {
      console.error("Error fetching Kaleido data:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // Endpoint to deploy a smart contract / issue asset on Kaleido
  app.post("/api/kaleido/deploy", async (req, res) => {
    try {
      const authHeader = req.headers['x-kaleido-auth'] as string;
      const restUrl = req.headers['x-kaleido-url'] as string;
      const { name, ticker, supply } = req.body;

      // TODO: Replace this simulation with an actual call to your Kaleido REST API Gateway
      // to deploy your specific ERC-20 or Hyperledger Fabric chaincode.
      // Example:
      // const response = await fetch(`${restUrl}/api/v1/deploy`, {
      //   method: 'POST',
      //   headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ... })
      // });

      console.log(`Simulating deployment of ${name} (${ticker}) with supply ${supply} to Kaleido...`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      res.json({ 
        success: true, 
        message: "Smart contract deployed successfully",
        transactionHash: `0x${Math.random().toString(16).slice(2, 40)}`,
        contractAddress: `0x${Math.random().toString(16).slice(2, 40)}`
      });
    } catch (error) {
      console.error("Error deploying contract:", error);
      res.status(500).json({ error: "Failed to deploy contract" });
    }
  });

  // Endpoint to tokenize RWA on Kaleido
  app.post("/api/kaleido/tokenize", async (req, res) => {
    try {
      const authHeader = req.headers['x-kaleido-auth'] as string;
      const restUrl = req.headers['x-kaleido-url'] as string;
      const { name, category, valuation, fractions } = req.body;

      // TODO: Replace this simulation with an actual call to your Kaleido REST API Gateway
      // to mint the RWA tokens.
      
      console.log(`Simulating tokenization of ${name} (${category}) on Kaleido...`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      res.json({ 
        success: true, 
        message: "Asset tokenized successfully",
        transactionHash: `0x${Math.random().toString(16).slice(2, 40)}`,
        assetId: `RWA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      });
    } catch (error) {
      console.error("Error tokenizing asset:", error);
      res.status(500).json({ error: "Failed to tokenize asset" });
    }
  });

  // Endpoint to deploy NFT collection on Kaleido
  app.post("/api/kaleido/deploy-nft", async (req, res) => {
    try {
      const authHeader = req.headers['x-kaleido-auth'] as string;
      const restUrl = req.headers['x-kaleido-url'] as string;
      const { name } = req.body;

      // TODO: Replace this simulation with an actual call to your Kaleido REST API Gateway
      // to deploy the NFT collection smart contract.
      
      console.log(`Simulating deployment of NFT Collection ${name} to Kaleido...`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      res.json({ 
        success: true, 
        message: "NFT Collection deployed successfully",
        transactionHash: `0x${Math.random().toString(16).slice(2, 40)}`,
        contractAddress: `0x${Math.random().toString(16).slice(2, 40)}`
      });
    } catch (error) {
      console.error("Error deploying NFT collection:", error);
      res.status(500).json({ error: "Failed to deploy NFT collection" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
