import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clipboard,
  Car,
  AlertTriangle,
  CheckCircle,
  Image,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AdminVehicleAuditReports = () => {
  const navigate = useNavigate();
  const [auditReports, setAuditReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditReports = async () => {
      try {
        const { data, error } = await supabase
          .from("vehicle_audits")
          .select("*")
          .order("audit_date", { ascending: false });

        if (error) throw error;
        setAuditReports(data || []);
      } catch (error) {
        console.error("Error fetching audit reports:", error);
        toast.error("Failed to load audit reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchAuditReports();
  }, []);

  const handleVerify = async (id) => {
    try {
      const { error } = await supabase
        .from("vehicle_audits")
        .update({ verified: true })
        .eq("id", id);

      if (error) throw error;

      setAuditReports((prev) =>
        prev.map((report) =>
          report.id === id ? { ...report, verified: true } : report
        )
      );

      toast.success("Audit report verified successfully.");
    } catch (error) {
      console.error("Error verifying audit report:", error);
      toast.error("Failed to verify audit report.");
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Vehicle Audit Reports">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Vehicle Audit Reports">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Clipboard className="h-6 w-6 text-white" />
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Audit Tool
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-blue-900">
              Vehicle Auditing
            </h3>
            <p className="text-sm text-blue-600 mt-2 mb-4">
              Comprehensive vehicle inspection and damage reporting system.
            </p>
            <Button
              onClick={() => navigate("/admin/AdminVehicleAudit")}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Start New Audit
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500 rounded-lg">
                <Car className="h-6 w-6 text-white" />
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700"
              >
                Status
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-green-900">Fleet Status</h3>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Total Audits</span>
                <span className="font-semibold text-green-700">
                  {auditReports.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Verified</span>
                <span className="font-semibold text-green-700">
                  {auditReports.filter((report) => report.verified).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-500 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700"
              >
                Issues
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-amber-900">Pending Issues</h3>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-amber-600">Open Issues</span>
                <span className="font-semibold text-amber-700">
                  {
                    auditReports.filter(
                      (report) => report.issues && !report.verified
                    ).length
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500 rounded-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-700"
              >
                Checks
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-purple-900">Audit Checks</h3>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-600">Pass Rate</span>
                <span className="font-semibold text-purple-700">
                  {Math.round(
                    (auditReports.filter(
                      (report) =>
                        report.checks &&
                        Object.values(report.checks).every((check) => check)
                    ).length /
                      (auditReports.length || 1)) *
                      100
                  )}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-md">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Clipboard className="h-5 w-5" />
            Vehicle Audit Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle Number</TableHead>
                <TableHead>Audit Date</TableHead>
                <TableHead>KM</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Checks</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No audit reports found.
                  </TableCell>
                </TableRow>
              ) : (
                auditReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.vehicle_number}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(report.audit_date).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {report.km} km
                    </TableCell>
                    <TableCell>
                      {report.issues ? (
                        <span className="text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {report.issues}
                        </span>
                      ) : (
                        <span className="text-green-500 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          No Issues
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(report.checks).map(([key, value]) => (
                          <Badge
                            key={key}
                            variant="outline"
                            className={cn(
                              "flex items-center justify-between px-2 py-1 capitalize",
                              value
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            )}
                          >
                            {key}
                            <span className="ml-2">{value ? "✓" : "✗"}</span>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-24 justify-center",
                          report.verified
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                        )}
                      >
                        {report.verified ? "Verified" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {!report.verified && (
                          <Button
                            onClick={() => handleVerify(report.id)}
                            className="bg-green-500 text-white hover:bg-green-600 px-3 py-1 h-8"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 h-8 flex items-center"
                        size="sm"
                        onClick={() => {
                          if (report.images && report.images.length > 0) {
                            const imageUrls = report.images.map(
                              (image) =>
                                supabase.storage
                                  .from("uploads")
                                  .getPublicUrl(image).data.publicUrl
                            );
                            const sliderWindow = window.open("", "_blank");
                            if (sliderWindow) {
                              sliderWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Image Slider</title>
                                    <style>
                                      body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #000; }
                                      img { max-width: 90%; max-height: 90%; }
                                      .slider { display: flex; flex-direction: column; align-items: center; }
                                      .controls { margin-top: 10px; }
                                      button { margin: 0 5px; padding: 10px; background-color: #fff; border: none; cursor: pointer; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="slider">
                                      <img id="slider-image" src="${
                                        imageUrls[0]
                                      }" alt="Image" />
                                      <div class="controls">
                                        <button onclick="prevImage()">Previous</button>
                                        <button onclick="nextImage()">Next</button>
                                      </div>
                                    </div>
                                    <script>
                                      const images = ${JSON.stringify(
                                        imageUrls
                                      )};
                                      let currentIndex = 0;

                                      function updateImage() {
                                        document.getElementById('slider-image').src = images[currentIndex];
                                      }

                                      function prevImage() {
                                        currentIndex = (currentIndex - 1 + images.length) % images.length;
                                        updateImage();
                                      }

                                      function nextImage() {
                                        currentIndex = (currentIndex + 1) % images.length;
                                        updateImage();
                                      }
                                    </script>
                                  </body>
                                </html>
                              `);
                            }
                          } else {
                            toast.error("No images available for this report.");
                          }
                        }}
                      >
                        <Image className="h-4 w-4 mr-1" />
                        View Images
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminVehicleAuditReports;
