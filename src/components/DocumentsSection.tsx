import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileCheck, FileX, RefreshCw, X } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type DocumentSide = "front" | "back";

type DocumentType =
  | "profile_photo"
  | "license"
  | "aadhar"
  | "pan"
  | "bank"
  | "uber_profile";

interface DocumentItem {
  type: DocumentType;
  title: string;
  description: string;
  hasSides?: boolean; // true for documents that have front/back
  icon: React.ReactNode;
}

const DocumentsSection = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<Tables<"users"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState<{
    type: DocumentType;
    side?: DocumentSide;
  } | null>(null);

  const documentItems: DocumentItem[] = [
    {
      type: "profile_photo",
      title: "Profile Photo",
      description: "Upload a clear passport-size photo",
      hasSides: false,
      icon: <Upload className="h-5 w-5" />,
    },
    {
      type: "license",
      title: "Driving License",
      description: "Upload both sides of your driving license",
      hasSides: true,
      icon: <Upload className="h-5 w-5" />,
    },
    {
      type: "aadhar",
      title: "Aadhar Card",
      description: "Upload both sides of your Aadhar card",
      hasSides: true,
      icon: <Upload className="h-5 w-5" />,
    },
    {
      type: "pan",
      title: "PAN Card",
      description: "Upload both sides of your PAN card",
      hasSides: true,
      icon: <Upload className="h-5 w-5" />,
    },

    {
      type: "uber_profile",
      title: "Uber Profile",
      description: "Upload your Uber driver profile screenshot",
      hasSides: false,
      icon: <Upload className="h-5 w-5" />,
    },
  ];

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!user) return;

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        setProfileData(data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const getFieldName = (
    docType: DocumentType,
    side?: DocumentSide
  ): keyof Tables<"users"> => {
    if (side) {
      return `${docType}_${side}` as keyof Tables<"users">;
    }
    return docType as keyof Tables<"users">;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: DocumentType,
    side?: DocumentSide
  ) => {
    try {
      if (!e.target.files || e.target.files.length === 0 || !user) {
        return;
      }

      const file = e.target.files[0];

      // Check file type
      if (
        (docType === "uber_profile" || docType === "profile_photo") &&
        !file.type.startsWith("image/")
      ) {
        toast.error("Please upload an image file");
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = side
        ? `${user.id}_${docType}_${side}.${fileExt}`
        : `${user.id}_${docType}.${fileExt}`;
      const filePath = `${docType}/${fileName}`;

      setUploadLoading({ type: docType, side });

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(filePath);

      // Update user record
      const updateField = getFieldName(docType, side);
      const { error: updateError } = await supabase
        .from("users")
        .update({ [updateField]: publicUrlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfileData((prev) =>
        prev ? { ...prev, [updateField]: publicUrlData.publicUrl } : null
      );

      const sideText = side ? ` (${side})` : "";
      toast.success(
        `${docType.replace("_", " ")}${sideText} uploaded successfully!`
      );
    } catch (error) {
      console.error(`Error uploading ${docType}:`, error);
      const sideText = side ? ` (${side})` : "";
      toast.error(`Failed to upload ${docType.replace("_", " ")}${sideText}`);
    } finally {
      setUploadLoading(null);
      // Reset file input
      e.target.value = "";
    }
  };

  const removeDocument = async (docType: DocumentType, side?: DocumentSide) => {
    try {
      if (!user || !profileData) return;

      setUploadLoading({ type: docType, side });

      const updateField = getFieldName(docType, side);
      const currentUrl = profileData[updateField] as string | null;

      if (!currentUrl) return;

      // Extract file path from URL or construct it
      let filePath: string;
      if (currentUrl.includes("/storage/v1/object/public/uploads/")) {
        filePath = currentUrl.split("/uploads/")[1];
      } else {
        // Fallback: construct path
        const fileExt = currentUrl.split(".").pop();
        const fileName = side
          ? `${user.id}_${docType}_${side}.${fileExt}`
          : `${user.id}_${docType}.${fileExt}`;
        filePath = `${docType}/${fileName}`;
      }

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("uploads")
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update user record
      const { error: updateError } = await supabase
        .from("users")
        .update({ [updateField]: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfileData((prev) =>
        prev ? { ...prev, [updateField]: null } : null
      );

      const sideText = side ? ` (${side})` : "";
      toast.success(
        `${docType.replace("_", " ")}${sideText} removed successfully!`
      );
    } catch (error) {
      console.error(`Error removing ${docType}:`, error);
      const sideText = side ? ` (${side})` : "";
      toast.error(`Failed to remove ${docType.replace("_", " ")}${sideText}`);
    } finally {
      setUploadLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">
        Required Documents
      </h2>
      <p className="text-gray-600">
        Upload all the required documents for verification. All documents should
        be clear and readable.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentItems.map((doc) => {
          const renderDocumentSide = (side: DocumentSide) => {
            const fieldName = getFieldName(doc.type, side);
            const isUploaded = profileData && profileData[fieldName];
            const isUploading =
              uploadLoading?.type === doc.type && uploadLoading?.side === side;

            return (
              <div key={side} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium capitalize">
                    {side} Side
                  </Label>
                  {isUploaded && (
                    <FileCheck className="h-4 w-4 text-green-500" />
                  )}
                  {!isUploaded && <FileX className="h-4 w-4 text-yellow-500" />}
                </div>

                {isUploaded ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={profileData![fieldName] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-fleet-purple hover:underline"
                    >
                      View
                    </a>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={(e) => handleFileUpload(e, doc.type, side)}
                        disabled={uploadLoading !== null}
                      />
                      <span className="text-xs text-gray-600 hover:text-fleet-purple hover:underline">
                        Replace
                      </span>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => removeDocument(doc.type, side)}
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      id={`file-input-${doc.type}-${side}`}
                      className="hidden"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, doc.type, side)}
                      disabled={uploadLoading !== null}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-dashed"
                      disabled={uploadLoading !== null}
                      onClick={() => {
                        const input = document.getElementById(
                          `file-input-${doc.type}-${side}`
                        );
                        if (input) input.click();
                      }}
                    >
                      {isUploading ? (
                        <span className="flex items-center justify-center">
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Uploading...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <Upload className="h-3 w-3 mr-1" />
                          Upload {side}
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          };

          const renderSingleDocument = () => {
            const fieldName = getFieldName(doc.type);
            const isUploaded = profileData && profileData[fieldName];
            const isUploading =
              uploadLoading?.type === doc.type && !uploadLoading?.side;

            if (isUploaded) {
              return (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-medium">Uploaded</span>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={profileData![fieldName] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-fleet-purple hover:underline"
                    >
                      View Document
                    </a>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept={
                          doc.type === "profile_photo" ||
                          doc.type === "uber_profile"
                            ? "image/*"
                            : ".pdf,image/*"
                        }
                        onChange={(e) => handleFileUpload(e, doc.type)}
                        disabled={uploadLoading !== null}
                      />
                      <span className="text-sm text-gray-600 hover:text-fleet-purple hover:underline">
                        Replace
                      </span>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => removeDocument(doc.type)}
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <FileX className="h-5 w-5 text-yellow-500" />
                  <span className="text-yellow-600 font-medium">
                    Not Uploaded
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    id={`file-input-${doc.type}`}
                    className="hidden"
                    accept={
                      doc.type === "profile_photo" ||
                      doc.type === "uber_profile"
                        ? "image/*"
                        : ".pdf,image/*"
                    }
                    onChange={(e) => handleFileUpload(e, doc.type)}
                    disabled={uploadLoading !== null}
                  />
                  <Button
                    variant="outline"
                    className="w-full bg-white hover:bg-gray-50 border-dashed"
                    disabled={uploadLoading !== null}
                    onClick={() => {
                      const input = document.getElementById(
                        `file-input-${doc.type}`
                      );
                      if (input) input.click();
                    }}
                  >
                    {isUploading ? (
                      <span className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {doc.title}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            );
          };

          return (
            <Card key={doc.type} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{doc.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">{doc.description}</p>

                {doc.hasSides ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {renderDocumentSide("front")}
                      {renderDocumentSide("back")}
                    </div>
                    <Separator />
                    <div className="text-xs text-gray-500">
                      Both sides must be uploaded for verification
                    </div>
                  </div>
                ) : (
                  renderSingleDocument()
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg bg-blue-50 p-4 mt-8">
        <h3 className="text-lg font-medium text-blue-800 mb-2">
          Document Verification
        </h3>
        <p className="text-blue-700 text-sm">
          All uploaded documents will be reviewed by our team. The verification
          process typically takes 1-2 business days. You will be notified once
          your documents are verified.
        </p>
      </div>
    </div>
  );
};

export default DocumentsSection;
