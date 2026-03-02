import { useState } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useRootData } from "~/root";

export default function Help() {
  const [reportingActiveTab, setReportingActiveTab] = useState("images");
  const [uploadingActiveTab, setUploadingActiveTab] = useState("onsite");
  const rootData = useRootData();
  const siteName = rootData?.siteName ?? "jays.pics";

  return (
    <div className="container mx-auto px-4 py-8">
      <p>Uploading</p>
      <Tabs
        value={uploadingActiveTab}
        onValueChange={setUploadingActiveTab}
        className="mt-8"
      >
        <TabsList>
          <TabsTrigger value="onsite">On-site</TabsTrigger>
          <TabsTrigger value="sharex">ShareX</TabsTrigger>
        </TabsList>
        <TabsContent value="onsite" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>On-Site</CardTitle>
              <CardDescription>
                How to upload images to {siteName} on-site
              </CardDescription>
            </CardHeader>
            <CardContent>
              1. Navigate to the dashboard
              <br />
              2. Click on the 'Upload New Image' button
              <br />
              3. Select a file or drag one onto the page
              <br />
              4. Click upload
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sharex" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>ShareX</CardTitle>
              <CardDescription>
                How to set up ShareX to automatically upload to {siteName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              1. Visit the Upload Settings page
              <br />
              2. Click "ShareX" to download your config
              <br />
              2. Double click the file to open it with ShareX
              <br />
              3. Double click the file to import it into ShareX
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="my-8">Reporting content</p>
      <Tabs
        value={reportingActiveTab}
        onValueChange={setReportingActiveTab}
        className="mt-2"
      >
        <TabsList>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>
        <TabsContent value="images" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>How to report uploaded images</CardDescription>
            </CardHeader>
            <CardContent>
              1. Open the image page
              <br />
              2. Click the "Report" link below the image
              <br />
              3. Provide a reason and submit
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="comments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
              <CardDescription>
                How to report comments on profile or images
              </CardDescription>
            </CardHeader>
            <CardContent>
              1. Hover over the comment
              <br />
              2. Click "Report"
              <br />
              3. Fill out the form and submit
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
