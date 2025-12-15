// Test script to send WhatsApp message
// Replace with your actual phone number and credentials

const API_URL = "https://test-production-bc50.up.railway.app/api";

async function testWhatsAppMessage() {
  try {
    const response = await fetch(`${API_URL}/whatsapp/send/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: "919876543210", // Replace with your test phone number
        message:
          "Hello from Tawaaq! This is a test message from your fleet management system.",
      }),
    });

    const data = await response.json();
    console.log("Response:", data);

    if (data.success) {
      console.log("✅ Message sent successfully!");
    } else {
      console.log("❌ Failed to send message:", data.error);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the test
testWhatsAppMessage();
