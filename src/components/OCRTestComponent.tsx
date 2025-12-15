import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUp, Wand2, Sparkles, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  ExtractedData,
  ProcessingState,
  processImageWithTesseract,
  combineMultipleOCRResults,
  validateExtractedData,
  getConfidenceDescription,
  DEFAULT_OCR_CONFIG,
} from "@/utils/ocrUtils";

const OCRTestComponent: React.FC = () => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    status: "",
  });
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 3);
      setSelectedFiles(files);
    }
  };

  const processImages = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    try {
      const results = await processImageWithTesseract(
        selectedFiles,
        DEFAULT_OCR_CONFIG,
        (progress, status) => {
          setProcessingState({
            isProcessing: true,
            progress,
            status,
          });
        }
      );

      setExtractedData(results);

      const bestResult = combineMultipleOCRResults(results);
      if (bestResult) {
        const validation = validateExtractedData(bestResult);
        const confidenceInfo = getConfidenceDescription(bestResult.confidence);

        if (validation.isValid) {
          toast.success(
            `✅ ${confidenceInfo.description} - ${Math.round(
              bestResult.confidence * 100
            )}% confidence`
          );
        } else {
          toast.warning(`⚠️ Issues detected: ${validation.issues.join(", ")}`);
        }
      }

      setProcessingState({
        isProcessing: false,
        progress: 100,
        status: "Processing complete",
      });
    } catch (error) {
      console.error("OCR Test Error:", error);
      toast.error("OCR processing failed");
      setProcessingState({
        isProcessing: false,
        progress: 0,
        status: "Processing failed",
      });
    }
  };

  const bestResult =
    extractedData.length > 0 ? combineMultipleOCRResults(extractedData) : null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-blue-600" />
            OCR Test Component
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Tesseract.js
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors">
              <FileUp className="mr-2 h-5 w-5 text-gray-400" />
              {selectedFiles.length > 0 ? (
                <span className="text-green-600">
                  ✓ {selectedFiles.length} image
                  {selectedFiles.length > 1 ? "s" : ""} selected
                </span>
              ) : (
                "Upload Uber Screenshots for Testing"
              )}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                disabled={processingState.isProcessing}
              />
            </label>
          </div>

          {/* Process Button */}
          <Button
            onClick={processImages}
            disabled={
              processingState.isProcessing || selectedFiles.length === 0
            }
            className="w-full"
          >
            {processingState.isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Test OCR Processing
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {processingState.isProcessing && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  {processingState.status}
                </span>
                <span className="text-sm text-blue-600">
                  {Math.round(processingState.progress)}%
                </span>
              </div>
              <Progress value={processingState.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {extractedData.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              OCR Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestResult && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-green-700">
                      Total Trips
                    </label>
                    <p className="text-lg font-semibold">
                      {bestResult.totalTrips || "Not found"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-700">
                      Total Earnings
                    </label>
                    <p className="text-lg font-semibold">
                      {bestResult.totalEarnings
                        ? `₹${bestResult.totalEarnings}`
                        : "Not found"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-700">
                      Confidence
                    </label>
                    <p className="text-lg font-semibold">
                      {Math.round(bestResult.confidence * 100)}%
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-700">
                      Images Processed
                    </label>
                    <p className="text-lg font-semibold">
                      {extractedData.length}
                    </p>
                  </div>
                </div>

                {/* Confidence Description */}
                {(() => {
                  const confidenceInfo = getConfidenceDescription(
                    bestResult.confidence
                  );
                  return (
                    <Alert
                      className={`mb-4 border-${confidenceInfo.color}-300 bg-${confidenceInfo.color}-100`}
                    >
                      <AlertDescription
                        className={`text-${confidenceInfo.color}-800`}
                      >
                        <strong>{confidenceInfo.level} Confidence:</strong>{" "}
                        {confidenceInfo.description}
                      </AlertDescription>
                    </Alert>
                  );
                })()}

                {/* Validation Results */}
                {(() => {
                  const validation = validateExtractedData(bestResult);
                  if (!validation.isValid) {
                    return (
                      <Alert className="mb-4 border-orange-300 bg-orange-100">
                        <AlertDescription className="text-orange-800">
                          <strong>Validation Issues:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {validation.issues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}

                {/* Raw Text Preview */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-green-700 hover:text-green-600">
                    View Raw OCR Text
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                    {bestResult.rawText}
                  </pre>
                </details>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OCRTestComponent;
