import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2 } from "lucide-react";
import {
  useAdminSettings,
  FleetRentSlab,
  CompanyEarningsSlab,
} from "@/hooks/useAdminSettings";

const AdminSettings = () => {
  const {
    loading,
    fleetRentSlabs,
    companyEarningsSlabs,
    companyInfo,
    notificationPreferences,
    systemConfig,
    updateFleetRentSlabs,
    updateCompanyEarningsSlabs,
    updateCompanyInfo,
    updateNotificationPreferences,
    updateSystemConfig,
  } = useAdminSettings();

  const [editingFleetSlab, setEditingFleetSlab] =
    useState<FleetRentSlab | null>(null);
  const [editingEarningsSlab, setEditingEarningsSlab] =
    useState<CompanyEarningsSlab | null>(null);
  const [tempCompanyInfo, setTempCompanyInfo] = useState(companyInfo);
  const [tempNotificationPrefs, setTempNotificationPrefs] = useState(
    notificationPreferences
  );
  const [tempSystemConfig, setTempSystemConfig] = useState(systemConfig);

  // Update temp states when data loads
  React.useEffect(() => {
    setTempCompanyInfo(companyInfo);
    setTempNotificationPrefs(notificationPreferences);
    setTempSystemConfig(systemConfig);
  }, [companyInfo, notificationPreferences, systemConfig]);

  const handleAddFleetSlab = () => {
    setEditingFleetSlab({ min_trips: 0, max_trips: null, amount: 0 });
  };

  const handleSaveFleetSlab = () => {
    if (!editingFleetSlab) return;

    const updatedSlabs = [...fleetRentSlabs];
    const existingIndex = updatedSlabs.findIndex(
      (slab) => slab.min_trips === editingFleetSlab.min_trips
    );

    if (existingIndex >= 0) {
      updatedSlabs[existingIndex] = editingFleetSlab;
    } else {
      updatedSlabs.push(editingFleetSlab);
    }

    // Sort by min_trips
    updatedSlabs.sort((a, b) => a.min_trips - b.min_trips);

    updateFleetRentSlabs(updatedSlabs);
    setEditingFleetSlab(null);
  };

  const handleDeleteFleetSlab = (minTrips: number) => {
    const updatedSlabs = fleetRentSlabs.filter(
      (slab) => slab.min_trips !== minTrips
    );
    updateFleetRentSlabs(updatedSlabs);
  };

  const handleAddEarningsSlab = () => {
    setEditingEarningsSlab({ min_trips: 0, max_trips: null, amount: 0 });
  };

  const handleSaveEarningsSlab = () => {
    if (!editingEarningsSlab) return;

    const updatedSlabs = [...companyEarningsSlabs];
    const existingIndex = updatedSlabs.findIndex(
      (slab) => slab.min_trips === editingEarningsSlab.min_trips
    );

    if (existingIndex >= 0) {
      updatedSlabs[existingIndex] = editingEarningsSlab;
    } else {
      updatedSlabs.push(editingEarningsSlab);
    }

    // Sort by min_trips
    updatedSlabs.sort((a, b) => a.min_trips - b.min_trips);

    updateCompanyEarningsSlabs(updatedSlabs);
    setEditingEarningsSlab(null);
  };

  const handleDeleteEarningsSlab = (minTrips: number) => {
    const updatedSlabs = companyEarningsSlabs.filter(
      (slab) => slab.min_trips !== minTrips
    );
    updateCompanyEarningsSlabs(updatedSlabs);
  };

  if (loading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="fleet-expenses">Fleet Expenses</TabsTrigger>
          <TabsTrigger value="company-earnings">Company Earnings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Manage your application's general settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={tempCompanyInfo.company_name}
                  onChange={(e) =>
                    setTempCompanyInfo({
                      ...tempCompanyInfo,
                      company_name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={tempCompanyInfo.contact_email}
                  onChange={(e) =>
                    setTempCompanyInfo({
                      ...tempCompanyInfo,
                      contact_email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={tempCompanyInfo.contact_phone}
                  onChange={(e) =>
                    setTempCompanyInfo({
                      ...tempCompanyInfo,
                      contact_phone: e.target.value,
                    })
                  }
                />
              </div>

              <Button onClick={() => updateCompanyInfo(tempCompanyInfo)}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet-expenses">
          <Card>
            <CardHeader>
              <CardTitle>Fleet Rent Expense Slabs</CardTitle>
              <CardDescription>
                Configure fleet rent expenses based on trip count.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={handleAddFleetSlab} className="mb-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slab
                </Button>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Min Trips</TableHead>
                      <TableHead>Max Trips</TableHead>
                      <TableHead>Amount (₹)</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fleetRentSlabs.map((slab, index) => (
                      <TableRow key={index}>
                        <TableCell>{slab.min_trips}</TableCell>
                        <TableCell>
                          {slab.max_trips === null ? (
                            <Badge variant="secondary">No Limit</Badge>
                          ) : (
                            slab.max_trips
                          )}
                        </TableCell>
                        <TableCell>₹{slab.amount}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingFleetSlab(slab)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteFleetSlab(slab.min_trips)
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {editingFleetSlab && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Edit Fleet Rent Slab</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Min Trips</Label>
                          <Input
                            type="number"
                            value={editingFleetSlab.min_trips}
                            onChange={(e) =>
                              setEditingFleetSlab({
                                ...editingFleetSlab,
                                min_trips: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Max Trips</Label>
                          <Input
                            type="number"
                            value={editingFleetSlab.max_trips || ""}
                            onChange={(e) =>
                              setEditingFleetSlab({
                                ...editingFleetSlab,
                                max_trips: e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              })
                            }
                            placeholder="Leave empty for no limit"
                          />
                        </div>
                        <div>
                          <Label>Amount (₹)</Label>
                          <Input
                            type="number"
                            value={editingFleetSlab.amount}
                            onChange={(e) =>
                              setEditingFleetSlab({
                                ...editingFleetSlab,
                                amount: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleSaveFleetSlab}>Save</Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingFleetSlab(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company-earnings">
          <Card>
            <CardHeader>
              <CardTitle>Company Earnings Slabs</CardTitle>
              <CardDescription>
                Configure company earnings based on trip count.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={handleAddEarningsSlab} className="mb-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slab
                </Button>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Min Trips</TableHead>
                      <TableHead>Max Trips</TableHead>
                      <TableHead>Amount (₹)</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyEarningsSlabs.map((slab, index) => (
                      <TableRow key={index}>
                        <TableCell>{slab.min_trips}</TableCell>
                        <TableCell>
                          {slab.max_trips === null ? (
                            <Badge variant="secondary">No Limit</Badge>
                          ) : (
                            slab.max_trips
                          )}
                        </TableCell>
                        <TableCell>₹{slab.amount}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingEarningsSlab(slab)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteEarningsSlab(slab.min_trips)
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {editingEarningsSlab && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Edit Company Earnings Slab</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Min Trips</Label>
                          <Input
                            type="number"
                            value={editingEarningsSlab.min_trips}
                            onChange={(e) =>
                              setEditingEarningsSlab({
                                ...editingEarningsSlab,
                                min_trips: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Max Trips</Label>
                          <Input
                            type="number"
                            value={editingEarningsSlab.max_trips || ""}
                            onChange={(e) =>
                              setEditingEarningsSlab({
                                ...editingEarningsSlab,
                                max_trips: e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              })
                            }
                            placeholder="Leave empty for no limit"
                          />
                        </div>
                        <div>
                          <Label>Amount (₹)</Label>
                          <Input
                            type="number"
                            value={editingEarningsSlab.amount}
                            onChange={(e) =>
                              setEditingEarningsSlab({
                                ...editingEarningsSlab,
                                amount: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleSaveEarningsSlab}>Save</Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingEarningsSlab(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications Settings</CardTitle>
              <CardDescription>
                Configure how you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notif">Email Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </div>
                </div>
                <Switch
                  id="email-notif"
                  checked={tempNotificationPrefs.email_notifications}
                  onCheckedChange={(checked) =>
                    setTempNotificationPrefs({
                      ...tempNotificationPrefs,
                      email_notifications: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notif">SMS Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive notifications via SMS
                  </div>
                </div>
                <Switch
                  id="sms-notif"
                  checked={tempNotificationPrefs.sms_notifications}
                  onCheckedChange={(checked) =>
                    setTempNotificationPrefs({
                      ...tempNotificationPrefs,
                      sms_notifications: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="report-notif">New Report Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Get notified when a new report is submitted
                  </div>
                </div>
                <Switch
                  id="report-notif"
                  checked={tempNotificationPrefs.new_report_notifications}
                  onCheckedChange={(checked) =>
                    setTempNotificationPrefs({
                      ...tempNotificationPrefs,
                      new_report_notifications: checked,
                    })
                  }
                />
              </div>

              <Button
                onClick={() =>
                  updateNotificationPreferences(tempNotificationPrefs)
                }
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Advanced system configuration options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex">
                  <Input
                    id="api-key"
                    type="password"
                    value={tempSystemConfig.api_key}
                    onChange={(e) =>
                      setTempSystemConfig({
                        ...tempSystemConfig,
                        api_key: e.target.value,
                      })
                    }
                    className="flex-1"
                  />
                  <Button variant="outline" className="ml-2">
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is your API key. Keep it secure.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable dark mode for the application
                  </div>
                </div>
                <Switch
                  id="dark-mode"
                  checked={tempSystemConfig.dark_mode}
                  onCheckedChange={(checked) =>
                    setTempSystemConfig({
                      ...tempSystemConfig,
                      dark_mode: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="debug-mode">Debug Mode</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable detailed error logging
                  </div>
                </div>
                <Switch
                  id="debug-mode"
                  checked={tempSystemConfig.debug_mode}
                  onCheckedChange={(checked) =>
                    setTempSystemConfig({
                      ...tempSystemConfig,
                      debug_mode: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <div className="text-sm text-muted-foreground">
                    Put the site in maintenance mode
                  </div>
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={tempSystemConfig.maintenance_mode}
                  onCheckedChange={(checked) =>
                    setTempSystemConfig({
                      ...tempSystemConfig,
                      maintenance_mode: checked,
                    })
                  }
                />
              </div>

              <Button onClick={() => updateSystemConfig(tempSystemConfig)}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;
