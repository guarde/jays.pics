import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Clock, FileChartColumn, FileImage, Users } from "lucide-react";
import prettyBytes from "pretty-bytes";
import prettyMs from "pretty-ms";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ChartPoint } from "~/components/ui/simple-chart";
import { prisma } from "~/services/database.server";

import { useAdminLoader } from "./_admin";

export async function loader({ request }: LoaderFunctionArgs) {
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - 6);

  const usersDailyRaw = await prisma.$queryRaw<{ date: Date; count: number }[]>`
    SELECT DATE_TRUNC('day', "created_at") as date, COUNT(*)::int as count
    FROM "User"
    WHERE "created_at" >= ${startDate} AND "deleted_at" IS NULL
    GROUP BY date
    ORDER BY date`;

  const imagesDailyRaw = await prisma.$queryRaw<
    { date: Date; count: number }[]
  >`
    SELECT DATE_TRUNC('day', "created_at") as date, COUNT(*)::int as count
    FROM "Image"
    WHERE "created_at" >= ${startDate} AND "deleted_at" IS NULL
    GROUP BY date
    ORDER BY date`;

  const typeCounts = await prisma.$queryRaw<{ type: string; count: number }[]>`
    SELECT "type", COUNT(*)::int as count
    FROM "Image"
    WHERE "deleted_at" IS NULL
    GROUP BY "type"
    ORDER BY count DESC
    LIMIT 5`;

  const topUploaders = await prisma.$queryRaw<
    { username: string; count: number }[]
  >`
    SELECT "User"."username", COUNT(*)::int as count
    FROM "Image"
    JOIN "User" ON "User"."id" = "Image"."uploader_id"
    WHERE "Image"."deleted_at" IS NULL
    GROUP BY "User"."username"
    ORDER BY count DESC
    LIMIT 5`;

  function fillMissing(src: { date: Date; count: number }[]): ChartPoint[] {
    const out: ChartPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setUTCDate(startDate.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const found = src.find((s) => s.date.toISOString().slice(0, 10) === key);
      out.push({ date: key, count: found ? found.count : 0 });
    }
    return out;
  }

  const storageDailyRaw = await prisma.$queryRaw<
    { date: Date; count: number }[]
  >`
  SELECT DATE_TRUNC('day', "created_at") as date, SUM(size)::int as count
  FROM "Image"
  WHERE "created_at" >= ${startDate} AND "deleted_at" IS NULL
  GROUP BY date
  ORDER BY date`;

  const uptime = prettyMs(process.uptime() * 1000, { compact: true });

  const users = await prisma.user.count();
  const images = await prisma.image.count();
  const bytesUsed = prettyBytes(
    (await prisma.image.findMany({ select: { size: true } })).reduce(
      (acc, val) => acc + val.size,
      0,
    ),
  );

  return {
    usersDaily: fillMissing(usersDailyRaw),
    imagesDaily: fillMissing(imagesDailyRaw),
    storageDaily: fillMissing(storageDailyRaw),
    typeCounts,
    topUploaders,
    uptime,
    users,
    images,
    bytesUsed,
  };
}

const COLORS = ["#e05cd9", "#8b5cf6", "#22d3ee", "#16a34a", "#f97316"];

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--background))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  },
};

export default function AdminIndex() {
  const {
    usersDaily,
    imagesDaily,
    typeCounts,
    topUploaders,
    storageDaily,
    uptime,
    users,
    images,
    bytesUsed,
  } = useLoaderData<typeof loader>();
  useAdminLoader();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Server uptime:{" "}
          <span className="font-medium text-foreground">{uptime}</span>
        </p>
      </div>

      <div className="space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Uptime
                  </p>
                  <p className="text-2xl font-bold">{uptime}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Users
                  </p>
                  <p className="text-2xl font-bold">{users}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Images
                  </p>
                  <p className="text-2xl font-bold">{images}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <FileImage className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Storage Used
                  </p>
                  <p className="text-2xl font-bold">{bytesUsed}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <FileChartColumn className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Registrations (7d)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={usersDaily}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).getUTCDate().toString()}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    {...chartTooltipStyle}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Uploads (7d)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={imagesDaily}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).getUTCDate().toString()}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    {...chartTooltipStyle}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                File Types
              </CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="count"
                    data={typeCounts}
                    cx="50%"
                    cy="50%"
                    outerRadius={72}
                    label={(entry) => entry.type.replace("image/", "")}
                    labelLine={false}
                  >
                    {typeCounts.map((_, index) => (
                      <Cell
                        key={`tc-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Top Uploaders
              </CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topUploaders}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="username"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip {...chartTooltipStyle} />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Storage trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Storage Added (7d)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={storageDaily}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => new Date(v).getUTCDate().toString()}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...chartTooltipStyle}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  formatter={(value: number) => [prettyBytes(value), "Storage"]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
