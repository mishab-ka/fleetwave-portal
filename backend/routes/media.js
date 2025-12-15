const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { body, validationResult } = require("express-validator");
const whatsappService = require("../services/whatsappService");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || "./uploads";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  // Allow images, audio, and documents
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/m4a",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only images, audio, and documents are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 16 * 1024 * 1024, // 16MB default
  },
});

// Upload media file
router.post(
  "/upload",
  upload.single("file"),
  [
    body("phoneNumber").isMobilePhone().withMessage("Invalid phone number"),
    body("messageType")
      .isIn(["image", "voice", "document"])
      .withMessage("Invalid message type"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      const { phoneNumber, messageType, caption } = req.body;
      const filePath = req.file.path;
      const fileName = req.file.filename;
      const fileUrl = `${req.protocol}://${req.get(
        "host"
      )}/uploads/${fileName}`;

      // Upload to WhatsApp
      let result;
      switch (messageType) {
        case "image":
          result = await whatsappService.sendImageMessage(
            phoneNumber,
            fileUrl,
            caption
          );
          break;
        case "voice":
          result = await whatsappService.sendVoiceMessage(phoneNumber, fileUrl);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: "Unsupported message type",
          });
      }

      res.json({
        success: true,
        message: `${messageType} sent successfully`,
        data: {
          fileName,
          fileUrl,
          whatsappResponse: result,
        },
      });
    } catch (error) {
      console.error("Error uploading media:", error);

      // Clean up uploaded file on error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: "Failed to upload media",
        details: error.message,
      });
    }
  }
);

// Get media file
router.get("/file/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const uploadPath = process.env.UPLOAD_PATH || "./uploads";
    const filePath = path.join(uploadPath, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error("Error serving media file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to serve file",
    });
  }
});

// Delete media file
router.delete("/file/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const uploadPath = process.env.UPLOAD_PATH || "./uploads";
    const filePath = path.join(uploadPath, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting media file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete file",
    });
  }
});

// Get upload statistics
router.get("/stats", (req, res) => {
  try {
    const uploadPath = process.env.UPLOAD_PATH || "./uploads";

    if (!fs.existsSync(uploadPath)) {
      return res.json({
        success: true,
        data: {
          totalFiles: 0,
          totalSize: 0,
          fileTypes: {},
        },
      });
    }

    const files = fs.readdirSync(uploadPath);
    let totalSize = 0;
    const fileTypes = {};

    files.forEach((file) => {
      const filePath = path.join(uploadPath, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;

      const ext = path.extname(file).toLowerCase();
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalFiles: files.length,
        totalSize,
        fileTypes,
      },
    });
  } catch (error) {
    console.error("Error getting upload stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get upload statistics",
    });
  }
});

// Clean up old files (optional maintenance endpoint)
router.post(
  "/cleanup",
  [
    body("days")
      .isInt({ min: 1, max: 365 })
      .withMessage("Days must be between 1 and 365"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { days } = req.body;
      const uploadPath = process.env.UPLOAD_PATH || "./uploads";
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      if (!fs.existsSync(uploadPath)) {
        return res.json({
          success: true,
          message: "No files to clean up",
          deletedCount: 0,
        });
      }

      const files = fs.readdirSync(uploadPath);
      let deletedCount = 0;

      files.forEach((file) => {
        const filePath = path.join(uploadPath, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} files older than ${days} days`,
        deletedCount,
      });
    } catch (error) {
      console.error("Error cleaning up files:", error);
      res.status(500).json({
        success: false,
        error: "Failed to clean up files",
      });
    }
  }
);

module.exports = router;
