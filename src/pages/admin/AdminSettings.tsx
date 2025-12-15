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
    companyEarningsSlabs24hr,
    companyInfo,
    notificationPreferences,
    systemConfig,
    penaltyDivisionSettings,
    vehiclePerformanceRentalIncome,
    updateFleetRentSlabs,
    updateCompanyEarningsSlabs,
    updateCompanyEarningsSlabs24hr,
    updateCompanyInfo,
    updateNotificationPreferences,
    updateSystemConfig,
    updatePenaltyDivisionSettings,
    updateVehiclePerformanceRentalIncome,
  } = useAdminSettings();

  const [editingFleetSlab, setEditingFleetSlab] =
    useState<FleetRentSlab | null>(null);
  const [editingEarningsSlab, setEditingEarningsSlab] =
    useState<CompanyEarningsSlab | null>(null);
  const [editingEarningsSlab24hr, setEditingEarningsSlab24hr] =
    useState<CompanyEarningsSlab | null>(null);
  const [tempCompanyInfo, setTempCompanyInfo] = useState(companyInfo);
  const [tempNotificationPrefs, setTempNotificationPrefs] = useState(
    notificationPreferences
  );
  const [tempSystemConfig, setTempSystemConfig] = useState(systemConfig);
  const [tempVehiclePerformanceRentalIncome, setTempVehiclePerformanceRentalIncome] =
    useState<number>(vehiclePerformanceRentalIncome);

  // Update temp states when data loads
  React.useEffect(() => {
    setTempCompanyInfo(companyInfo);
    setTempNotificationPrefs(notificationPreferences);
    setTempSystemConfig(systemConfig);
    setTempVehiclePerformanceRentalIncome(vehiclePerformanceRentalIncome);
  }, [companyInfo, notificationPreferences, systemConfig, vehiclePerformanceRentalIncome]);

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

  const handleAddEarningsSlab24hr = () => {
    setEditingEarningsSlab24hr({ min_trips: 0, max_trips: null, amount: 0 });
  };

  const handleSaveEarningsSlab24hr = () => {
    if (!editingEarningsSlab24hr) return;

    const updatedSlabs = [...companyEarningsSlabs24hr];
    const existingIndex = updatedSlabs.findIndex(
      (slab) => slab.min_trips === editingEarningsSlab24hr.min_trips
    );

    if (existingIndex >= 0) {
      updatedSlabs[existingIndex] = editingEarningsSlab24hr;
    } else {
      updatedSlabs.push(editingEarningsSlab24hr);
    }

    // Sort by min_trips
    updatedSlabs.sort((a, b) => a.min_trips - b.min_trips);

    updateCompanyEarningsSlabs24hr(updatedSlabs);
    setEditingEarningsSlab24hr(null);
  };

  const handleDeleteEarningsSlab24hr = (minTrips: number) => {
    const updatedSlabs = companyEarningsSlabs24hr.filter(
      (slab) => slab.min_trips !== minTrips
    );
    updateCompanyEarningsSlabs24hr(updatedSlabs);
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
          <TabsTrigger value="penalty-division">Penalty Division</TabsTrigger>
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
          <div className="space-y-6">
            {/* Regular Shift Earnings */}
            <Card>
              <CardHeader>
                <CardTitle>Regular Shift Earnings Slabs</CardTitle>
                <CardDescription>
                  Configure company earnings for morning/night shifts based on
                  trip count.
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
                        <CardTitle>Edit Regular Shift Earnings Slab</CardTitle>
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

            {/* Vehicle Performance Rental Income */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Performance Rental Income</CardTitle>
                <CardDescription>
                  Set a fixed rental income amount that will be displayed in the
                  Vehicle Performance tab for all vehicles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-performance-rental-income">
                    Rental Income Amount (₹)
                  </Label>
                  <Input
                    id="vehicle-performance-rental-income"
                    type="number"
                    min="0"
                    step="0.01"
                    value={tempVehiclePerformanceRentalIncome}
                    onChange={(e) =>
                      setTempVehiclePerformanceRentalIncome(
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="Enter rental income amount"
                  />
                  <p className="text-sm text-muted-foreground">
                    This amount will be used as the "Rental Income" value for
                    all vehicles in the Vehicle Performance tab.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    updateVehiclePerformanceRentalIncome(
                      tempVehiclePerformanceRentalIncome
                    )
                  }
                >
                  Save Rental Income
                </Button>
              </CardContent>
            </Card>

            {/* 24-Hour Shift Earnings */}
            <Card>
              <CardHeader>
                <CardTitle>24-Hour Shift Earnings Slabs</CardTitle>
                <CardDescription>
                  Configure company earnings for 24-hour shifts based on trip
                  count.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={handleAddEarningsSlab24hr} className="mb-4">
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
                      {companyEarningsSlabs24hr.map((slab, index) => (
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
                                onClick={() => setEditingEarningsSlab24hr(slab)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeleteEarningsSlab24hr(slab.min_trips)
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

                  {editingEarningsSlab24hr && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>Edit 24-Hour Shift Earnings Slab</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Min Trips</Label>
                            <Input
                              type="number"
                              value={editingEarningsSlab24hr.min_trips}
                              onChange={(e) =>
                                setEditingEarningsSlab24hr({
                                  ...editingEarningsSlab24hr,
                                  min_trips: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Max Trips</Label>
                            <Input
                              type="number"
                              value={editingEarningsSlab24hr.max_trips || ""}
                              onChange={(e) =>
                                setEditingEarningsSlab24hr({
                                  ...editingEarningsSlab24hr,
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
                              value={editingEarningsSlab24hr.amount}
                              onChange={(e) =>
                                setEditingEarningsSlab24hr({
                                  ...editingEarningsSlab24hr,
                                  amount: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={handleSaveEarningsSlab24hr}>
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingEarningsSlab24hr(null)}
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
          </div>
        </TabsContent>

        <TabsContent value="penalty-division">
          <Card>
            <CardHeader>
              <CardTitle>Penalty Division Settings</CardTitle>
              <CardDescription>
                Configure how penalties are divided and applied to drivers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="division-days">Division Period (Days)</Label>
                <Input
                  id="division-days"
                  type="number"
                  min="1"
                  max="365"
                  value={penaltyDivisionSettings.division_days}
                  onChange={(e) =>
                    updatePenaltyDivisionSettings({
                      ...penaltyDivisionSettings,
                      division_days: parseInt(e.target.value) || 7,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Number of days over which penalties will be divided. For
                  example, if set to 7, a ₹700 penalty will be divided into ₹100
                  per day.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="penalty-enabled">
                    Enable Penalty Division
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    Enable automatic penalty division for all drivers
                  </div>
                </div>
                <Switch
                  id="penalty-enabled"
                  checked={penaltyDivisionSettings.enabled}
                  onCheckedChange={(checked) =>
                    updatePenaltyDivisionSettings({
                      ...penaltyDivisionSettings,
                      enabled: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-apply">Auto-apply to Reports</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatically add daily penalty amount to submit reports
                  </div>
                </div>
                <Switch
                  id="auto-apply"
                  checked={penaltyDivisionSettings.auto_apply}
                  onCheckedChange={(checked) =>
                    updatePenaltyDivisionSettings({
                      ...penaltyDivisionSettings,
                      auto_apply: checked,
                    })
                  }
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-semibold text-blue-800 mb-2">
                  How it works:
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>
                    • When a penalty is added, it's divided by the division
                    period
                  </li>
                  <li>• Daily penalty amount is automatically calculated</li>
                  <li>
                    • This amount is added to the rent payable in submit reports
                  </li>
                  <li>
                    • Penalties are automatically marked as paid when fully
                    recovered
                  </li>
                </ul>
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
