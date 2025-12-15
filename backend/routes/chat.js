const express = require("express");
const { query, validationResult } = require("express-validator");
const supabase = require("../config/supabase");

const router = express.Router();

// Get all chat summaries (conversations)
router.get(
  "/conversations",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Offset must be a positive integer"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const { data, error } = await supabase
        .from("chat_summaries")
        .select("*")
        .order("last_message_time", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching conversations:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch conversations",
        });
      }

      res.json({
        success: true,
        data: data || [],
        pagination: {
          limit,
          offset,
          hasMore: (data || []).length === limit,
        },
      });
    } catch (error) {
      console.error("Error in conversations endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

// Get chat history for a specific phone number
router.get(
  "/history/:phoneNumber",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Offset must be a positive integer"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phoneNumber } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Validate phone number format
      if (!phoneNumber || phoneNumber.length < 10) {
        return res.status(400).json({
          success: false,
          error: "Invalid phone number",
        });
      }

      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("phone_number", phoneNumber)
        .order("timestamp", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching chat history:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch chat history",
        });
      }

      // Get contact info
      const contactInfo = data?.[0]
        ? {
            phone_number: data[0].phone_number,
            name: data[0].name,
          }
        : null;

      res.json({
        success: true,
        data: {
          messages: data || [],
          contact: contactInfo,
          pagination: {
            limit,
            offset,
            hasMore: (data || []).length === limit,
          },
        },
      });
    } catch (error) {
      console.error("Error in chat history endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

// Search conversations
router.get(
  "/search",
  [
    query("q").notEmpty().withMessage("Search query is required"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { q } = req.query;
      const limit = parseInt(req.query.limit) || 20;

      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("phone_number, name, message_content, timestamp")
        .or(
          `phone_number.ilike.%${q}%,name.ilike.%${q}%,message_content.ilike.%${q}%`
        )
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error searching messages:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to search messages",
        });
      }

      // Group by phone number and get latest message
      const conversations = data?.reduce((acc, message) => {
        if (!acc[message.phone_number]) {
          acc[message.phone_number] = {
            phone_number: message.phone_number,
            name: message.name,
            last_message: message.message_content,
            last_message_time: message.timestamp,
          };
        }
        return acc;
      }, {});

      res.json({
        success: true,
        data: Object.values(conversations || {}),
        query: q,
      });
    } catch (error) {
      console.error("Error in search endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

// Get conversation statistics
router.get("/stats", async (req, res) => {
  try {
    // Get total conversations
    const { data: conversations, error: convError } = await supabase
      .from("chat_summaries")
      .select("phone_number");

    if (convError) {
      console.error("Error fetching conversation stats:", convError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch conversation stats",
      });
    }

    // Get total messages
    const { count: totalMessages, error: msgError } = await supabase
      .from("whatsapp_messages")
      .select("*", { count: "exact", head: true });

    if (msgError) {
      console.error("Error fetching message stats:", msgError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch message stats",
      });
    }

    // Get today's messages
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayMessages, error: todayError } = await supabase
      .from("whatsapp_messages")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", today.toISOString());

    if (todayError) {
      console.error("Error fetching today's stats:", todayError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch today's stats",
      });
    }

    res.json({
      success: true,
      data: {
        totalConversations: conversations?.length || 0,
        totalMessages: totalMessages || 0,
        todayMessages: todayMessages || 0,
      },
    });
  } catch (error) {
    console.error("Error in stats endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Mark conversation as read (update message statuses)
router.put("/read/:phoneNumber", async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    const { error } = await supabase
      .from("whatsapp_messages")
      .update({ status: "read" })
      .eq("phone_number", phoneNumber)
      .eq("direction", "incoming")
      .eq("status", "delivered");

    if (error) {
      console.error("Error marking messages as read:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to mark messages as read",
      });
    }

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Error in mark as read endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
