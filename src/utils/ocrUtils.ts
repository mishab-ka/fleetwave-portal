import Tesseract from "tesseract.js";

export interface ExtractedData {
  totalTrips: string;
  totalEarnings: string;
  toll: string;
  cashCollected: string;
  onlineTime: string;
  distance: string;
  surge: string;
  tips: string;
  confidence: number;
  rawText: string;
  processedAt: string;
  source: "tesseract" | "mock";
  fieldsFound: string[];
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  status: string;
}

export interface OCRConfig {
  confidenceThreshold: number;
  maxImages: number;
  language: string;
  imageQuality: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
  };
  tesseractOptions: {
    tessedit_char_whitelist?: string;
    tessedit_pageseg_mode?: number;
  };
}

export const DEFAULT_OCR_CONFIG: OCRConfig = {
  confidenceThreshold: 70,
  maxImages: 5,
  language: "eng",
  imageQuality: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.95,
  },
  tesseractOptions: {
    tessedit_char_whitelist:
      "0123456789₹.,: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ()-/Rs",
    tessedit_pageseg_mode: 3,
  },
};

// Enhanced text parsing function for comprehensive Uber screenshot data extraction
export const parseUberScreenshotText = (
  text: string
): {
  totalTrips: string;
  totalEarnings: string;
  toll: string;
  cashCollected: string;
  onlineTime: string;
  distance: string;
  surge: string;
  tips: string;
  confidence: number;
  fieldsFound: string[];
} => {
  const lines = text.split("\n").map((line) => line.trim().toLowerCase());
  const originalLines = text.split("\n").map((line) => line.trim());

  let totalTrips = "";
  let totalEarnings = "";
  let toll = "";
  let cashCollected = "";
  let onlineTime = "";
  let distance = "";
  let surge = "";
  let tips = "";
  let fieldsFound: string[] = [];

  console.log("🔍 Parsing OCR text for all fields:");
  console.log("Raw text length:", text.length);
  console.log(
    "Raw text:",
    text.substring(0, 200) + (text.length > 200 ? "..." : "")
  );
  console.log("All lines:", originalLines);
  console.log("Looking for patterns in", originalLines.length, "lines");

  // Enhanced patterns for trip detection
  const tripPatterns = [
    /(\d+)\s*trips?/i,
    /trips?\s*[:\s]*(\d+)/i,
    /(\d+)\s*trip\b/i,
    /completed\s*[:\s]*(\d+)/i,
    /(\d+)\s*rides?/i,
    /rides?\s*[:\s]*(\d+)/i,
    /total[\s:]*(\d+)\s*trips?/i,
    /trips?\s*completed[\s:]*(\d+)/i,
    /(\d+)\s*deliveries/i,
    /bookings?\s*[:\s]*(\d+)/i,
    /^(\d+)$/m, // Standalone numbers on their own line
    /trip[s]?\s*(?:count|number)[\s:]*(\d+)/i,
  ];

  // Enhanced patterns for earnings detection (more comprehensive)
  const earningsPatterns = [
    /total\s*earnings?[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /earnings?[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /earned[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/g,
    /rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi,
    /inr\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi,
    /amount[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /total[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /you\s*earned[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /gross\s*earnings?[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /pay[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /income[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
  ];

  // Toll/Fee patterns (including taxes and deductions)
  const tollPatterns = [
    /toll[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /fees?[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /charges?[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /deduction[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /commission[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /taxes[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /tax[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /-₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/g, // Negative amounts (taxes/fees)
  ];

  // Cash collected patterns (including negative amounts)
  const cashPatterns = [
    /cash\s*collected[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /cash[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /collected[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /cash\s*payment[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /cash\s*from\s*customers?[\s:]*-?₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /-₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:cash|collected)/i,
  ];

  // Online time patterns
  const timePatterns = [
    /online[\s:]*(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)/i,
    /time[\s:]*(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)/i,
    /(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)\s*online/i,
    /duration[\s:]*(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)/i,
  ];

  // Distance patterns
  const distancePatterns = [
    /distance[\s:]*(\d+(?:\.\d+)?)\s*(?:km|kms?|kilometers?)/i,
    /(\d+(?:\.\d+)?)\s*(?:km|kms?)\s*driven/i,
    /traveled[\s:]*(\d+(?:\.\d+)?)\s*(?:km|kms?)/i,
    /total[\s:]*(\d+(?:\.\d+)?)\s*(?:km|kms?)/i,
  ];

  // Surge patterns
  const surgePatterns = [
    /surge[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /surge\s*pricing[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /bonus[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
  ];

  // Tips patterns
  const tipsPatterns = [
    /tips?[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /tip[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /gratuity[\s:]*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
  ];

  // Special handling for Uber breakdown format
  // Look for specific patterns that appear on their own lines
  const specialPatterns = [
    {
      pattern: /^cash\s*collected$/i,
      nextLinePattern: /-?₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      type: "cash",
    },
    {
      pattern: /^taxes?$/i,
      nextLinePattern: /-?₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      type: "toll",
    },
    {
      pattern: /^net\s*fare$/i,
      nextLinePattern: /₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      type: "netfare",
    },
    {
      pattern: /^refunds?$/i,
      nextLinePattern: /₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      type: "refund",
    },
  ];

  for (let i = 0; i < originalLines.length - 1; i++) {
    const currentLine = originalLines[i].trim();
    const nextLine = originalLines[i + 1].trim();

    for (const special of specialPatterns) {
      if (special.pattern.test(currentLine)) {
        const match = nextLine.match(special.nextLinePattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ""));

          if (
            special.type === "cash" &&
            !cashCollected &&
            amount >= 0 &&
            amount <= 50000
          ) {
            cashCollected = amount.toString();
            fieldsFound.push("cash");
            console.log(
              "✅ Found cash collected (special format):",
              cashCollected,
              "from lines:",
              currentLine,
              "->",
              nextLine
            );
          } else if (
            special.type === "toll" &&
            !toll &&
            amount >= 0 &&
            amount <= 2000
          ) {
            toll = amount.toString();
            fieldsFound.push("toll");
            console.log(
              "✅ Found taxes/toll (special format):",
              toll,
              "from lines:",
              currentLine,
              "->",
              nextLine
            );
          }
        }
      }
    }
  }

  // Process each line for different patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const originalLine = originalLines[i];

    // Look for trip patterns
    if (!totalTrips) {
      for (const pattern of tripPatterns) {
        const match = originalLine.match(pattern);
        if (match) {
          const trips = parseInt(match[1]);
          if (trips >= 0 && trips <= 100) {
            totalTrips = trips.toString();
            fieldsFound.push("trips");
            console.log(
              "✅ Found trips:",
              totalTrips,
              "from line:",
              originalLine
            );
            break;
          }
        }
      }
    }

    // Look for toll/fees (check before earnings to avoid confusion)
    if (!toll) {
      for (const pattern of tollPatterns) {
        const match = originalLine.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ""));
          if (amount >= 0 && amount <= 2000) {
            toll = amount.toString();
            fieldsFound.push("toll");
            console.log("✅ Found toll/fee:", toll, "from line:", originalLine);
            break;
          }
        }
      }

      // Special handling for lines containing just "Taxes" with negative amounts
      if (!toll && (line.includes("taxes") || line.includes("tax"))) {
        const negativePattern = /-₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/g;
        const match = originalLine.match(negativePattern);
        if (match) {
          const amount = parseFloat(
            match[0].replace(/-₹\s*/, "").replace(/,/g, "")
          );
          if (amount >= 0 && amount <= 2000) {
            toll = amount.toString();
            fieldsFound.push("toll");
            console.log(
              "✅ Found taxes as toll:",
              toll,
              "from line:",
              originalLine
            );
          }
        }
      }
    }

    // Look for cash collected
    if (!cashCollected) {
      // First try specific "Cash collected" patterns
      for (const pattern of cashPatterns) {
        const match = originalLine.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ""));
          if (amount >= 0 && amount <= 50000) {
            cashCollected = amount.toString();
            fieldsFound.push("cash");
            console.log(
              "✅ Found cash collected:",
              cashCollected,
              "from line:",
              originalLine
            );
            break;
          }
        }
      }

      // Also check for lines that might indicate cash collection with negative amounts
      if (
        !cashCollected &&
        line.includes("cash") &&
        line.includes("collected")
      ) {
        const negativePattern = /-₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/g;
        const match = originalLine.match(negativePattern);
        if (match) {
          const amount = parseFloat(
            match[0].replace(/-₹\s*/, "").replace(/,/g, "")
          );
          if (amount >= 0 && amount <= 50000) {
            cashCollected = amount.toString();
            fieldsFound.push("cash");
            console.log(
              "✅ Found cash collected (negative format):",
              cashCollected,
              "from line:",
              originalLine
            );
          }
        }
      }
    }

    // Look for online time
    if (!onlineTime) {
      for (const pattern of timePatterns) {
        const match = originalLine.match(pattern);
        if (match) {
          const time = parseFloat(match[1]);
          if (time >= 0 && time <= 24) {
            onlineTime = time.toString();
            fieldsFound.push("time");
            console.log(
              "✅ Found online time:",
              onlineTime,
              "hours from line:",
              originalLine
            );
            break;
          }
        }
      }
    }

    // Look for distance
    if (!distance) {
      for (const pattern of distancePatterns) {
        const match = originalLine.match(pattern);
        if (match) {
          const dist = parseFloat(match[1]);
          if (dist >= 0 && dist <= 1000) {
            distance = dist.toString();
            fieldsFound.push("distance");
            console.log(
              "✅ Found distance:",
              distance,
              "km from line:",
              originalLine
            );
            break;
          }
        }
      }
    }

    // Look for surge
    if (!surge) {
      for (const pattern of surgePatterns) {
        const match = originalLine.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ""));
          if (amount >= 0 && amount <= 5000) {
            surge = amount.toString();
            fieldsFound.push("surge");
            console.log("✅ Found surge:", surge, "from line:", originalLine);
            break;
          }
        }
      }
    }

    // Look for tips
    if (!tips) {
      for (const pattern of tipsPatterns) {
        const match = originalLine.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ""));
          if (amount >= 0 && amount <= 2000) {
            tips = amount.toString();
            fieldsFound.push("tips");
            console.log("✅ Found tips:", tips, "from line:", originalLine);
            break;
          }
        }
      }
    }
  }

  // Final fallback: look for standalone negative amounts that might be cash collected
  if (!cashCollected) {
    for (let i = 0; i < originalLines.length; i++) {
      const line = originalLines[i].trim();
      // Look for lines that are just negative amounts (likely cash collected)
      const standaloneNegativePattern = /^-₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)$/;
      const match = line.match(standaloneNegativePattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ""));
        if (amount >= 1000 && amount <= 50000) {
          // Cash collected is usually larger amounts
          cashCollected = amount.toString();
          fieldsFound.push("cash");
          console.log(
            "✅ Found cash collected (standalone negative):",
            cashCollected,
            "from line:",
            line
          );
          break;
        }
      }
    }
  }

  // Look for earnings patterns (do this after other amounts to avoid conflicts)
  if (!totalEarnings) {
    const allEarnings: { amount: number; line: string; pattern: string }[] = [];

    for (let i = 0; i < originalLines.length; i++) {
      const line = originalLines[i];
      for (let j = 0; j < earningsPatterns.length; j++) {
        const pattern = earningsPatterns[j];
        const matches = line.match(pattern);
        if (matches) {
          const amount = parseFloat(matches[1].replace(/,/g, ""));
          if (amount >= 100 && amount <= 25000) {
            allEarnings.push({
              amount,
              line: line,
              pattern: `pattern_${j}`,
            });
            console.log(
              `💰 Found potential earnings: ₹${amount} in line: "${line}"`
            );
          }
        }
      }
    }

    if (allEarnings.length > 0) {
      // Prioritize earnings from lines containing "total" or "earnings"
      const priorityEarnings = allEarnings.filter(
        (e) =>
          e.line.toLowerCase().includes("total") ||
          e.line.toLowerCase().includes("earning") ||
          e.line.toLowerCase().includes("earned")
      );

      const selectedEarnings =
        priorityEarnings.length > 0
          ? priorityEarnings.reduce((max, current) =>
              current.amount > max.amount ? current : max
            )
          : allEarnings.reduce((max, current) =>
              current.amount > max.amount ? current : max
            );

      totalEarnings = selectedEarnings.amount.toString();
      fieldsFound.push("earnings");
      console.log(
        "✅ Selected earnings:",
        totalEarnings,
        "from line:",
        selectedEarnings.line
      );
    } else {
      console.log("❌ No earnings found in any line");
    }
  }

  // Calculate confidence based on fields found and text quality
  let confidence = 0;
  const criticalFields = ["trips", "earnings"];
  const criticalFieldsFound = criticalFields.filter((field) =>
    fieldsFound.includes(field)
  );

  // Base confidence on critical fields
  if (criticalFieldsFound.length === 2) confidence = 0.8;
  else if (criticalFieldsFound.length === 1) confidence = 0.5;
  else confidence = 0.2;

  // Boost confidence for additional fields found
  const additionalFields = fieldsFound.length - criticalFieldsFound.length;
  confidence += additionalFields * 0.05;

  // Boost confidence if values seem reasonable together
  if (totalTrips && totalEarnings) {
    const trips = parseInt(totalTrips);
    const earnings = parseFloat(totalEarnings);
    if (trips > 0 && earnings > trips * 50 && earnings < trips * 1000) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }
  }

  // Text quality factors
  const textLength = text.length;
  const wordCount = text.split(/\s+/).length;

  if (textLength >= 100 && wordCount >= 20) {
    confidence = Math.min(confidence + 0.05, 1.0);
  }

  confidence = Math.max(0, Math.min(1, confidence)); // Clamp between 0 and 1

  console.log("📊 OCR Results Summary:", {
    fieldsFound,
    totalTrips,
    totalEarnings,
    toll,
    cashCollected,
    onlineTime,
    distance,
    surge,
    tips,
    confidence: Math.round(confidence * 100) + "%",
  });

  return {
    totalTrips,
    totalEarnings,
    toll,
    cashCollected,
    onlineTime,
    distance,
    surge,
    tips,
    confidence,
    fieldsFound,
  };
};

// Enhanced image preprocessing for better OCR results
export const preprocessImage = async (
  file: File,
  config: OCRConfig
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate optimal dimensions
      let { width, height } = img;
      const maxWidth = config.imageQuality.maxWidth;
      const maxHeight = config.imageQuality.maxHeight;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        // Enhanced drawing with better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Apply image enhancements for better OCR
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Enhanced contrast and brightness for better text recognition
        const contrast = 1.3;
        const brightness = 15;

        for (let i = 0; i < data.length; i += 4) {
          // Apply contrast and brightness to RGB channels
          data[i] = Math.min(
            255,
            Math.max(0, contrast * (data[i] - 128) + 128 + brightness)
          ); // Red
          data[i + 1] = Math.min(
            255,
            Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness)
          ); // Green
          data[i + 2] = Math.min(
            255,
            Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness)
          ); // Blue
        }

        ctx.putImageData(imageData, 0, 0);

        // Convert to high-quality data URL
        resolve(canvas.toDataURL("image/png", config.imageQuality.quality));
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

// Main OCR processing function with enhanced capabilities
export const processImageWithTesseract = async (
  imageFiles: File[],
  config: OCRConfig,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedData[]> => {
  const results: ExtractedData[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];

    onProgress?.(
      (i / imageFiles.length) * 80,
      `Preprocessing image ${i + 1} of ${imageFiles.length}...`
    );

    try {
      // Preprocess image for better OCR results
      const preprocessedImage = await preprocessImage(file, config);

      onProgress?.(
        (i / imageFiles.length) * 85,
        `Processing image ${i + 1} with OCR...`
      );

      const {
        data: { text, confidence },
      } = await Tesseract.recognize(preprocessedImage, config.language, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const progress =
              (i / imageFiles.length) * 70 +
              (m.progress * 70) / imageFiles.length;
            onProgress?.(
              progress,
              `OCR processing image ${i + 1}: ${Math.round(m.progress * 100)}%`
            );
          }
        },
        ...config.tesseractOptions,
      });

      // Parse the extracted text for all fields
      const parsedData = parseUberScreenshotText(text);

      const extractedResult: ExtractedData = {
        totalTrips: parsedData.totalTrips,
        totalEarnings: parsedData.totalEarnings,
        toll: parsedData.toll,
        cashCollected: parsedData.cashCollected,
        onlineTime: parsedData.onlineTime,
        distance: parsedData.distance,
        surge: parsedData.surge,
        tips: parsedData.tips,
        confidence: Math.min((confidence / 100) * parsedData.confidence, 1.0),
        rawText: text,
        processedAt: new Date().toISOString(),
        source: "tesseract",
        fieldsFound: parsedData.fieldsFound,
      };

      results.push(extractedResult);
      console.log(`📱 Image ${i + 1} OCR result:`, extractedResult);
    } catch (error) {
      console.error(`❌ Error processing image ${i + 1}:`, error);

      // Create a failed result entry
      results.push({
        totalTrips: "",
        totalEarnings: "",
        toll: "",
        cashCollected: "",
        onlineTime: "",
        distance: "",
        surge: "",
        tips: "",
        confidence: 0,
        rawText: "",
        processedAt: new Date().toISOString(),
        source: "tesseract",
        fieldsFound: [],
      });
    }
  }

  onProgress?.(100, "Processing complete!");
  return results;
};

// Enhanced combination of multiple OCR results
export const combineMultipleOCRResults = (
  results: ExtractedData[]
): ExtractedData | null => {
  if (results.length === 0) return null;

  // Find the result with highest confidence
  const bestResult = results.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  );

  // If we have multiple results, try to cross-validate and merge data
  if (results.length > 1) {
    const validResults = results.filter((r) => r.confidence > 0.2);

    if (validResults.length > 1) {
      // Merge fields from different results based on confidence
      const mergedResult = { ...bestResult };

      // For each field, check if we can get better data from other results
      const fields = [
        "totalTrips",
        "totalEarnings",
        "toll",
        "cashCollected",
        "onlineTime",
        "distance",
        "surge",
        "tips",
      ];

      for (const field of fields) {
        if (
          !mergedResult[field as keyof ExtractedData] ||
          mergedResult[field as keyof ExtractedData] === ""
        ) {
          // Find the best result that has this field
          const resultWithField = validResults
            .filter(
              (r) =>
                r[field as keyof ExtractedData] &&
                r[field as keyof ExtractedData] !== ""
            )
            .sort((a, b) => b.confidence - a.confidence)[0];

          if (resultWithField) {
            (mergedResult as any)[field] = (resultWithField as any)[field];
            console.log(
              `🔄 Merged ${field} from another result:`,
              (resultWithField as any)[field]
            );
          }
        }
      }

      // Combine fields found
      const allFieldsFound = new Set<string>();
      validResults.forEach((r) =>
        r.fieldsFound.forEach((f) => allFieldsFound.add(f))
      );
      mergedResult.fieldsFound = Array.from(allFieldsFound);

      // Boost confidence if we merged successfully
      if (mergedResult.fieldsFound.length > bestResult.fieldsFound.length) {
        mergedResult.confidence = Math.min(mergedResult.confidence + 0.1, 1.0);
      }

      return mergedResult;
    }
  }

  return bestResult;
};

// Enhanced validation for all extracted fields
export const validateExtractedData = (
  data: ExtractedData
): { isValid: boolean; issues: string[]; warnings: string[] } => {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check trips
  if (data.totalTrips) {
    const trips = parseInt(data.totalTrips);
    if (isNaN(trips) || trips < 0 || trips > 100) {
      issues.push("Trip count seems unrealistic (0-100 expected)");
    }
  } else {
    issues.push("No trip count detected");
  }

  // Check earnings
  if (data.totalEarnings) {
    const earnings = parseFloat(data.totalEarnings);
    if (isNaN(earnings) || earnings < 0 || earnings > 25000) {
      issues.push("Earnings amount seems unrealistic (₹0-₹25,000 expected)");
    }

    // Check earnings per trip ratio
    if (data.totalTrips && !isNaN(parseInt(data.totalTrips))) {
      const earningsPerTrip = earnings / parseInt(data.totalTrips);
      if (earningsPerTrip < 50 || earningsPerTrip > 1500) {
        warnings.push(
          "Earnings per trip ratio seems unusual (₹50-₹1,500 per trip expected)"
        );
      }
    }
  } else {
    issues.push("No earnings detected");
  }

  // Check optional fields
  if (data.toll) {
    const toll = parseFloat(data.toll);
    if (isNaN(toll) || toll < 0 || toll > 1000) {
      warnings.push("Toll amount seems high (₹0-₹1,000 expected)");
    }
  }

  if (data.cashCollected) {
    const cash = parseFloat(data.cashCollected);
    if (isNaN(cash) || cash < 0 || cash > 20000) {
      warnings.push("Cash collected amount seems unrealistic");
    }
  }

  if (data.onlineTime) {
    const time = parseFloat(data.onlineTime);
    if (isNaN(time) || time < 0 || time > 24) {
      warnings.push("Online time seems unrealistic (0-24 hours expected)");
    }
  }

  if (data.distance) {
    const dist = parseFloat(data.distance);
    if (isNaN(dist) || dist < 0 || dist > 1000) {
      warnings.push("Distance seems unrealistic (0-1000 km expected)");
    }
  }

  // Check confidence
  if (data.confidence < 0.3) {
    issues.push(
      "Very low extraction confidence - manual verification required"
    );
  } else if (data.confidence < 0.5) {
    warnings.push("Low extraction confidence - please verify data carefully");
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
  };
};

// Get confidence level description with enhanced categories
export const getConfidenceDescription = (
  confidence: number
): { level: string; color: string; description: string } => {
  if (confidence >= 0.8) {
    return {
      level: "Excellent",
      color: "green",
      description: "Data extraction is highly reliable and accurate",
    };
  } else if (confidence >= 0.6) {
    return {
      level: "Good",
      color: "blue",
      description: "Data extraction is reliable with good accuracy",
    };
  } else if (confidence >= 0.4) {
    return {
      level: "Fair",
      color: "orange",
      description: "Data extracted but please verify carefully",
    };
  } else if (confidence >= 0.2) {
    return {
      level: "Poor",
      color: "red",
      description: "Low accuracy - manual verification strongly recommended",
    };
  } else {
    return {
      level: "Failed",
      color: "red",
      description: "OCR failed - please enter data manually",
    };
  }
};
