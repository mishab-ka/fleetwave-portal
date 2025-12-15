import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  Send,
  Image,
  Mic,
  ArrowLeft,
  Phone,
  FileText,
  Download,
} from "lucide-react";

interface Message {
  id: string;
  phone_number: string;
  name: string;
  message_type: string;
  message_content: string;
  direction: "incoming" | "outgoing";
  timestamp: string;
  media_url?: string;
  media_id?: string;
  status: string;
}

interface WhatsAppChatPanelProps {
  phoneNumber: string;
  onBack: () => void;
}

export default function WhatsAppChatPanel({
  phoneNumber,
  onBack,
}: WhatsAppChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contactInfo, setContactInfo] = useState<{
    phone_number: string;
    name: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

  useEffect(() => {
    fetchChatHistory();
    const interval = setInterval(fetchChatHistory, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [phoneNumber]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/chat/history/${phoneNumber}`
      );
      const data = await response.json();

      if (data.success) {
        setMessages(data.data.messages || []);
        setContactInfo(data.data.contact);
      } else {
        toast.error("Failed to fetch chat history");
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      toast.error("Failed to load chat history");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          message: newMessage.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewMessage("");
        toast.success("Message sent successfully");
        fetchChatHistory(); // Refresh to get the new message
      } else {
        toast.error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("phoneNumber", phoneNumber);
    formData.append("messageType", "image");

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/media/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Image sent successfully");
        fetchChatHistory();
      } else {
        toast.error(data.error || "Failed to send image");
      }
    } catch (error) {
      console.error("Error sending image:", error);
      toast.error("Failed to send image");
    } finally {
      setSending(false);
    }
  };

  const handleVoiceUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("phoneNumber", phoneNumber);
    formData.append("messageType", "voice");

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/media/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Voice message sent successfully");
        fetchChatHistory();
      } else {
        toast.error(data.error || "Failed to send voice message");
      }
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast.error("Failed to send voice message");
    } finally {
      setSending(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "voice":
        return <Mic className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {contactInfo?.name || formatPhoneNumber(phoneNumber)}
            </p>
            <p className="text-sm text-muted-foreground">
              {contactInfo?.name && formatPhoneNumber(phoneNumber)}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.direction === "outgoing"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.direction === "outgoing"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="flex items-start gap-2">
                  {getMessageIcon(message.message_type)}
                  <div className="flex-1">
                    <p className="text-sm">{message.message_content}</p>
                    {message.media_url && (
                      <div className="mt-2">
                        {message.message_type === "image" ? (
                          <img
                            src={message.media_url}
                            alt="Media"
                            className="max-w-full rounded"
                            style={{ maxHeight: "200px" }}
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                            {getMessageIcon(message.message_type)}
                            <span className="text-xs">Media file</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs opacity-70">
                        {format(new Date(message.timestamp), "h:mm a")}
                      </span>
                      {message.direction === "outgoing" && (
                        <Badge variant="secondary" className="text-xs">
                          {message.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <input
            ref={audioRef}
            type="file"
            accept="audio/*"
            onChange={handleVoiceUpload}
            className="hidden"
          />

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Image className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => audioRef.current?.click()}
            disabled={sending}
          >
            <Mic className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
