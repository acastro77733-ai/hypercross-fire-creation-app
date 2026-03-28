import React from "react";
import { Activity, Box } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface OverviewDashboardProps {
  data: KaleidoData | null;
  loading: boolean;
  primaryColor: string;
}

export default function OverviewDashboard({
  data,
  loading,
  primaryColor,
}: OverviewDashboardProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Node State (Φ)"
          value={data?.nodeState}
          loading={loading}
          borderColor={primaryColor}
        />
        <StatCard
          title="Chaos Level (Γ)"
          value={data?.chaosLevel}
          loading={loading}
          borderClass="neon-border-red"
        />
        <StatCard
          title="Damping (Λ)"
          value={data?.damping}
          loading={loading}
          borderClass="neon-border-purple"
        />
        <StatCard
          title="Sync Status"
          value={data?.syncStatus}
          loading={loading}
          borderClass="neon-border-gold"
          valueClass={data?.syncStatus === "Synced" ? "text-green-400" : "text-yellow-400"}
        />
      </div>

      <Card className="glass-panel neon-border-purple glow-hover border-t-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-white/90">
            <Activity className="h-5 w-5 text-[#c300ff]" />
            Real-time Stability Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mt-4 h-[300px] w-full">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg bg-white/5" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      borderColor: "rgba(195,0,255,0.5)",
                      borderRadius: "8px",
                      boxShadow: "0 0 15px rgba(195,0,255,0.3)",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="stability"
                    stroke="#c300ff"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#c300ff", stroke: "#fff", strokeWidth: 2 }}
                    style={{ filter: "drop-shadow(0 0 8px rgba(195,0,255,0.8))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="chaos"
                    stroke="#ff2600"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    style={{ filter: "drop-shadow(0 0 5px rgba(255,38,0,0.5))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel glow-hover border-t-2" style={{ borderColor: primaryColor }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-white/90">
            <Box className="h-5 w-5" style={{ color: primaryColor }} />
            Recent Blocks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-10 w-full bg-white/5" />
              <Skeleton className="h-10 w-full bg-white/5" />
              <Skeleton className="h-10 w-full bg-white/5" />
              <Skeleton className="h-10 w-full bg-white/5" />
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-md border border-white/10">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60">Block ID</TableHead>
                    <TableHead className="text-white/60">Timestamp</TableHead>
                    <TableHead className="text-right text-white/60">Transactions</TableHead>
                    <TableHead className="text-right text-white/60">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentBlocks.map((block) => (
                    <TableRow key={block.id} className="border-white/10 transition-colors hover:bg-white/5">
                      <TableCell className="font-mono text-white/80">{block.id}</TableCell>
                      <TableCell className="text-white/60">
                        {new Date(block.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-right text-white/80">{block.transactions}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            block.status === "Confirmed"
                              ? "border-green-500/50 bg-green-500/10 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                              : "border-yellow-500/50 bg-yellow-500/10 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                          }
                        >
                          {block.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function StatCard({
  title,
  value,
  loading,
  borderClass,
  borderColor,
  valueClass = "text-white",
}: {
  title: string;
  value?: string;
  loading: boolean;
  borderClass?: string;
  borderColor?: string;
  valueClass?: string;
}) {
  return (
    <Card
      className={`glass-panel ${borderClass || ""} glow-hover group relative overflow-hidden border-t-2`}
      style={borderColor ? { borderColor } : {}}
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-white/5 to-transparent" />
      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-white/60">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        {loading ? (
          <Skeleton className="h-10 w-24 rounded bg-white/10" />
        ) : (
          <div className={`font-mono text-3xl font-bold tracking-tight ${valueClass}`}>
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}