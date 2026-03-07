import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { DollarSign, HardDrive, MousePointerClick, Wifi } from "lucide-react";
import prettyBytes from "pretty-bytes";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { prisma } from "~/services/database.server";

// S3 Standard storage price per GB/month by region
const S3_STORAGE_PRICE_PER_GB: Record<string, number> = {
  "us-east-1": 0.023,
  "us-east-2": 0.023,
  "us-west-1": 0.026,
  "us-west-2": 0.023,
  "ca-central-1": 0.023,
  "eu-west-1": 0.023,
  "eu-west-2": 0.023,
  "eu-west-3": 0.023,
  "eu-central-1": 0.0245,
  "eu-north-1": 0.023,
  "eu-south-1": 0.0245,
  "ap-south-1": 0.025,
  "ap-southeast-1": 0.025,
  "ap-southeast-2": 0.025,
  "ap-northeast-1": 0.025,
  "ap-northeast-2": 0.024,
  "ap-northeast-3": 0.025,
  "sa-east-1": 0.0405,
  "me-south-1": 0.026,
  "af-south-1": 0.028,
};

// S3 request prices per 1,000 requests
const S3_PUT_PRICE_PER_1K = 0.005; // PUT, COPY, POST, LIST
const S3_GET_PRICE_PER_1K = 0.0004; // GET, SELECT

// Data transfer out pricing (per GB, applied after free tier)
const FREE_TIER_TRANSFER_GB = 100;
const DATA_TRANSFER_PRICE_PER_GB = 0.09;

export async function loader(_: LoaderFunctionArgs) {
  const region = process.env.STORAGE_REGION ?? "us-east-1";
  const storagePerGb = S3_STORAGE_PRICE_PER_GB[region] ?? 0.023;

  const images = await prisma.image.findMany({
    where: { deleted_at: null },
    select: { size: true },
  });

  const totalBytes = images.reduce((acc, img) => acc + img.size, 0);
  const totalGB = totalBytes / (1024 * 1024 * 1024);
  const imageCount = images.length;

  // Storage cost
  const storageCostMonthly = totalGB * storagePerGb;

  // Request cost estimate — assume each image required 1 PUT on upload,
  // and roughly 10 GETs/month per image as a conservative estimate.
  const putRequests = imageCount;
  const getRequestsPerMonth = imageCount * 10;
  const putCostMonthly = (putRequests / 1000) * S3_PUT_PRICE_PER_1K;
  const getCostMonthly = (getRequestsPerMonth / 1000) * S3_GET_PRICE_PER_1K;

  // Data transfer estimate — assume each image is downloaded 10 times/month
  // at average size
  const avgImageBytes = imageCount > 0 ? totalBytes / imageCount : 0;
  const estimatedTransferGB =
    (avgImageBytes * imageCount * 10) / (1024 * 1024 * 1024);
  const billableTransferGB = Math.max(
    0,
    estimatedTransferGB - FREE_TIER_TRANSFER_GB,
  );
  const transferCostMonthly = billableTransferGB * DATA_TRANSFER_PRICE_PER_GB;

  const totalCostMonthly =
    storageCostMonthly + putCostMonthly + getCostMonthly + transferCostMonthly;

  return {
    region,
    storagePerGb,
    totalBytes,
    totalGB,
    imageCount,
    storageCostMonthly,
    putRequests,
    getRequestsPerMonth,
    putCostMonthly,
    getCostMonthly,
    estimatedTransferGB,
    billableTransferGB,
    transferCostMonthly,
    totalCostMonthly,
  };
}

function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
  }).format(value);
}

export default function AdminAWSPricing() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">AWS Cost Estimate</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Estimated monthly S3 costs for region{" "}
          <code className="bg-muted px-1 rounded text-xs">{data.region}</code>.
          Request and transfer figures are estimates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Est. Monthly Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUSD(data.totalCostMonthly)}
            </div>
            <p className="text-xs text-muted-foreground">per month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Cost</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUSD(data.storageCostMonthly)}
            </div>
            <p className="text-xs text-muted-foreground">
              {prettyBytes(data.totalBytes)} stored
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Request Cost</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUSD(data.putCostMonthly + data.getCostMonthly)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.imageCount.toLocaleString()} images
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transfer Cost</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUSD(data.transferCostMonthly)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.estimatedTransferGB.toFixed(2)} GB estimated out
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead className="text-right">Est. Monthly Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  S3 Standard Storage
                </TableCell>
                <TableCell>{data.totalGB.toFixed(4)} GB</TableCell>
                <TableCell>${data.storagePerGb.toFixed(4)}/GB/month</TableCell>
                <TableCell className="text-right">
                  {formatUSD(data.storageCostMonthly)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">PUT Requests</TableCell>
                <TableCell>
                  {data.putRequests.toLocaleString()} requests
                </TableCell>
                <TableCell>${S3_PUT_PRICE_PER_1K}/1k requests</TableCell>
                <TableCell className="text-right">
                  {formatUSD(data.putCostMonthly)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  GET Requests (est.)
                </TableCell>
                <TableCell>
                  {data.getRequestsPerMonth.toLocaleString()} requests/month
                </TableCell>
                <TableCell>${S3_GET_PRICE_PER_1K}/1k requests</TableCell>
                <TableCell className="text-right">
                  {formatUSD(data.getCostMonthly)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Data Transfer Out (est.)
                </TableCell>
                <TableCell>
                  {data.estimatedTransferGB.toFixed(2)} GB (
                  {data.billableTransferGB.toFixed(2)} GB billable)
                </TableCell>
                <TableCell>
                  First {FREE_TIER_TRANSFER_GB} GB free, then $
                  {DATA_TRANSFER_PRICE_PER_GB}/GB
                </TableCell>
                <TableCell className="text-right">
                  {formatUSD(data.transferCostMonthly)}
                </TableCell>
              </TableRow>
              <TableRow className="font-bold">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right">
                  {formatUSD(data.totalCostMonthly)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Prices shown are for S3 Standard storage. GET request counts and data
        transfer are estimates based on 10 views per image per month. Actual
        costs may vary. Check the{" "}
        <a
          href="https://aws.amazon.com/s3/pricing/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          AWS S3 pricing page
        </a>{" "}
        for the latest rates.
      </p>
    </div>
  );
}
