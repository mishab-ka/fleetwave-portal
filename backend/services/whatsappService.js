const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const supabase = require("../config/supabase");

class WhatsAppService {
  constructor() {
    this.token = process.env.WHATSAPP_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || "v18.0";
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
  }

  // Send text message
  async sendTextMessage(phoneNumber, message) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phoneNumber,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Save to database
      await this.saveMessage({
        phone_number: phoneNumber,
        message_type: "text",
        message_content: message,
        direction: "outgoing",
        status: "sent",
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error sending text message:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Send image message
  async sendImageMessage(phoneNumber, imageUrl, caption = "") {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phoneNumber,
          type: "image",
          image: {
            link: imageUrl,
            caption: caption,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Save to database
      await this.saveMessage({
        phone_number: phoneNumber,
        message_type: "image",
        message_content: caption || "Image message",
        direction: "outgoing",
        status: "sent",
        media_url: imageUrl,
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error sending image message:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Send voice message
  async sendVoiceMessage(phoneNumber, audioUrl) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phoneNumber,
          type: "audio",
          audio: {
            link: audioUrl,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Save to database
      await this.saveMessage({
        phone_number: phoneNumber,
        message_type: "voice",
        message_content: "Voice message",
        direction: "outgoing",
        status: "sent",
        media_url: audioUrl,
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error sending voice message:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Upload media to WhatsApp
  async uploadMedia(filePath, type) {
    try {
      const form = new FormData();
      form.append("messaging_product", "whatsapp");
      form.append("file", fs.createReadStream(filePath));

      const response = await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/media`,
        form,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            ...form.getHeaders(),
          },
        }
      );

      return response.data.id;
    } catch (error) {
      console.error(
        "Error uploading media:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Save message to database
  async saveMessage(messageData) {
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .insert([messageData]);

      if (error) {
        console.error("Error saving message to database:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error saving message:", error);
      throw error;
    }
  }

  // Process incoming webhook
  async processWebhook(webhookData) {
    try {
      const entry = webhookData.entry?.[0];
      if (!entry) return;

      const changes = entry.changes?.[0];
      if (!changes || changes.value?.object !== "whatsapp_business_account")
        return;

      const messages = changes.value?.messages;
      if (!messages || messages.length === 0) return;

      for (const message of messages) {
        await this.processIncomingMessage(message);
      }
    } catch (error) {
      console.error("Error processing webhook:", error);
      throw error;
    }
  }

  // Process individual incoming message
  async processIncomingMessage(message) {
    try {
      const phoneNumber = message.from;
      const messageType = message.type;
      let messageContent = "";
      let mediaUrl = null;
      let mediaId = null;

      // Extract message content based on type
      switch (messageType) {
        case "text":
          messageContent = message.text?.body || "";
          break;
        case "image":
          messageContent = message.image?.caption || "Image message";
          mediaId = message.image?.id;
          break;
        case "audio":
          messageContent = "Voice message";
          mediaId = message.audio?.id;
          break;
        case "document":
          messageContent = message.document?.filename || "Document";
          mediaId = message.document?.id;
          break;
        default:
          messageContent = `${messageType} message`;
      }

      // Get contact name if available
      let contactName = null;
      if (message.contacts && message.contacts.length > 0) {
        contactName = message.contacts[0].profile?.name;
      }

      // Save to database
      await this.saveMessage({
        phone_number: phoneNumber,
        name: contactName,
        message_type: messageType,
        message_content: messageContent,
        direction: "incoming",
        status: "received",
        media_id: mediaId,
      });

      console.log(
        `📱 Received ${messageType} message from ${phoneNumber}: ${messageContent}`
      );
    } catch (error) {
      console.error("Error processing incoming message:", error);
      throw error;
    }
  }

  // Get message status updates
  async processStatusUpdate(statusData) {
    try {
      const entry = statusData.entry?.[0];
      if (!entry) return;

      const statuses = entry.changes?.[0]?.value?.statuses;
      if (!statuses || statuses.length === 0) return;

      for (const status of statuses) {
        await this.updateMessageStatus(status);
      }
    } catch (error) {
      console.error("Error processing status update:", error);
      throw error;
    }
  }

  // Update message status in database
  async updateMessageStatus(statusData) {
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .update({ status: statusData.status })
        .eq("id", statusData.id);

      if (error) {
        console.error("Error updating message status:", error);
        throw error;
      }

      console.log(
        `📊 Message status updated: ${statusData.id} -> ${statusData.status}`
      );
    } catch (error) {
      console.error("Error updating message status:", error);
      throw error;
    }
  }
}

module.exports = new WhatsAppService();
