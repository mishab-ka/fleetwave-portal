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

type DocumentType =
  | "profile_photo"
  | "license"
  | "aadhar"
  | "pan"
  | "uber_profile";

interface DocumentItem {
  type: DocumentType;
  title: string;
  description: string;
  fieldName: keyof Tables<"users">;
  icon: React.ReactNode;
}

const DocumentsSection = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<Tables<"users"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState<DocumentType | null>(null);

  const documentItems: DocumentItem[] = [
    {
      type: "profile_photo",
      title: "Profile Photo",
      description: "Upload a clear passport-size photo",
      fieldName: "profile_photo",
      icon: <Upload className="h-5 w-5" />,
    },
    {
      type: "license",
      title: "Driving License",
      description: "Upload both sides of your driving license",
      fieldName: "license",
      icon: <Upload className="h-5 w-5" />,
    },
    {
      type: "aadhar",
      title: "Aadhar Card",
      description: "Upload your Aadhar card",
      fieldName: "aadhar",
      icon: <Upload className="h-5 w-5" />,
    },
    {
      type: "pan",
      title: "PAN Card",
      description: "Upload your PAN card",
      fieldName: "pan",
      icon: <Upload className="h-5 w-5" />,
    },
    {
      type: "uber_profile",
      title: "Uber Profile",
      description: "Upload your Uber driver profile screenshot",
      fieldName: "uber_profile",
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

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: DocumentType
  ) => {
    try {
      if (!e.target.files || e.target.files.length === 0 || !user) {
        return;
      }

      const file = e.target.files[0];

      // Check file type
      if (docType === "uber_profile" && !file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}_${docType}.${fileExt}`;
      const filePath = `${docType}/${fileName}`;

      setUploadLoading(docType);

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
      const updateField = docType as keyof Tables<"users">;
      const { error: updateError } = await supabase
        .from("users")
        .update({ [updateField]: publicUrlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfileData((prev) =>
        prev ? { ...prev, [updateField]: publicUrlData.publicUrl } : prev
      );

      toast.success(`${docType.replace("_", " ")} uploaded successfully!`);
    } catch (error) {
      console.error(`Error uploading ${docType}:`, error);
      toast.error(`Failed to upload ${docType.replace("_", " ")}`);
    } finally {
      setUploadLoading(null);
      // Reset file input
      e.target.value = "";
    }
  };

  const removeDocument = async (docType: DocumentType) => {
    try {
      if (!user || !profileData) return;

      setUploadLoading(docType);

      // Delete from storage
      const fileExt = profileData[docType as keyof Tables<"users">]
        ?.split(".")
        .pop();
      const fileName = `${user.id}_${docType}.${fileExt}`;
      const filePath = `${docType}/${fileName}`;

      const { error: deleteError } = await supabase.storage
        .from("uploads")
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update user record
      const updateField = docType as keyof Tables<"users">;
      const { error: updateError } = await supabase
        .from("users")
        .update({ [updateField]: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfileData((prev) =>
        prev ? { ...prev, [updateField]: null } : prev
      );

      toast.success(`${docType.replace("_", " ")} removed successfully!`);
    } catch (error) {
      console.error(`Error removing ${docType}:`, error);
      toast.error(`Failed to remove ${docType.replace("_", " ")}`);
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
        {documentItems.map((doc) => (
          <Card key={doc.type} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{doc.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{doc.description}</p>

              {profileData && profileData[doc.fieldName] ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-medium">Uploaded</span>
                  </div>

                  {doc.type === "uber_profile" ? (
                    // <div className="relative">
                    //   <img
                    //     src={profileData[doc.fieldName] as string}
                    //     alt={doc.title}
                    //     className="w-full max-w-md rounded-lg shadow-sm"
                    //   />
                    //   <Button
                    //     variant="destructive"
                    //     size="sm"
                    //     className="absolute top-2 right-2"
                    //     onClick={() => removeDocument(doc.type)}
                    //     disabled={uploadLoading === doc.type}
                    //   >
                    //     <X className="h-4 w-4" />
                    //   </Button>
                    // </div>
                    <>
                      <div className="flex space-x-2">
                        <a
                          href={profileData[doc.fieldName] as string}
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
                      </div>
                    </>
                  ) : (
                    <div className="flex space-x-2">
                      <a
                        href={profileData[doc.fieldName] as string}
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
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <FileX className="h-5 w-5 text-yellow-500" />
                    <span className="text-yellow-600 font-medium">
                      Not Uploaded
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full bg-white hover:bg-gray-50 border-dashed"
                    asChild
                    disabled={uploadLoading !== null}
                  >
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
                      />
                      {uploadLoading === doc.type ? (
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
                    </label>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
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
