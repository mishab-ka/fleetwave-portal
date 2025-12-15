const express = require("express");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const whatsappService = require("../services/whatsappService");

const router = express.Router();

// Webhook verification endpoint
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("✅ Webhook verified successfully");
      res.status(200).send(challenge);
    } else {
      console.log("❌ Webhook verification failed");
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Webhook endpoint for receiving messages
router.post("/webhook", (req, res) => {
  try {
    const body = req.body;
    console.log("📥 Received webhook:", JSON.stringify(body, null, 2));

    // Verify webhook signature (optional but recommended)
    const signature = req.headers["x-hub-signature-256"];
    if (signature) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.WEBHOOK_SECRET || "default")
        .update(JSON.stringify(body))
        .digest("hex");

      if (signature !== `sha256=${expectedSignature}`) {
        console.log("❌ Invalid webhook signature");
        return res.sendStatus(401);
      }
    }

    // Process the webhook
    if (body.object === "whatsapp_business_account") {
      // Handle messages
      if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
        whatsappService.processWebhook(body);
      }

      // Handle status updates
      if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
        whatsappService.processStatusUpdate(body);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.sendStatus(500);
  }
});

// Send text message
router.post(
  "/send/text",
  [
    body("phoneNumber").isMobilePhone().withMessage("Invalid phone number"),
    body("message").notEmpty().withMessage("Message cannot be empty"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phoneNumber, message } = req.body;
      const result = await whatsappService.sendTextMessage(
        phoneNumber,
        message
      );

      res.json({
        success: true,
        message: "Message sent successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error sending text message:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send message",
        details: error.message,
      });
    }
  }
);

// Send image message
router.post(
  "/send/image",
  [
    body("phoneNumber").isMobilePhone().withMessage("Invalid phone number"),
    body("imageUrl").isURL().withMessage("Invalid image URL"),
    body("caption").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phoneNumber, imageUrl, caption } = req.body;
      const result = await whatsappService.sendImageMessage(
        phoneNumber,
        imageUrl,
        caption
      );

      res.json({
        success: true,
        message: "Image sent successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error sending image message:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send image",
        details: error.message,
      });
    }
  }
);

// Send voice message
router.post(
  "/send/voice",
  [
    body("phoneNumber").isMobilePhone().withMessage("Invalid phone number"),
    body("audioUrl").isURL().withMessage("Invalid audio URL"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phoneNumber, audioUrl } = req.body;
      const result = await whatsappService.sendVoiceMessage(
        phoneNumber,
        audioUrl
      );

      res.json({
        success: true,
        message: "Voice message sent successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error sending voice message:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send voice message",
        details: error.message,
      });
    }
  }
);

// Get webhook status
router.get("/status", (req, res) => {
  res.json({
    status: "active",
    timestamp: new Date().toISOString(),
    webhook_url: `${req.protocol}://${req.get("host")}/api/whatsapp/webhook`,
    verify_token: process.env.WHATSAPP_VERIFY_TOKEN
      ? "configured"
      : "not configured",
  });
});

module.exports = router;
