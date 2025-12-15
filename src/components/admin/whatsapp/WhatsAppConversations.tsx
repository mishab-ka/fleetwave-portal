import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, MessageCircle, Clock } from "lucide-react";

interface Conversation {
  phone_number: string;
  name: string;
  last_message_time: string;
  total_messages: number;
  incoming_count: number;
  outgoing_count: number;
  first_message_time: string;
}

interface WhatsAppConversationsProps {
  conversations: Conversation[];
  onSelectConversation: (phoneNumber: string) => void;
  selectedConversation: string | null;
}

export default function WhatsAppConversations({
  conversations,
  onSelectConversation,
  selectedConversation,
}: WhatsAppConversationsProps) {
  const isNewLead = (firstMessageTime: string) => {
    const firstMessage = new Date(firstMessageTime);
    const now = new Date();
    const diffInHours =
      (now.getTime() - firstMessage.getTime()) / (1000 * 60 * 60);
    return diffInHours <= 24; // New lead if first message was within 24 hours
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove any non-digit characters and format
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <MessageCircle className="h-16 w-16 mb-4" />
        <p className="text-lg font-medium">No conversations yet</p>
        <p className="text-sm">
          Start receiving WhatsApp messages to see conversations here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.phone_number}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedConversation === conversation.phone_number
                ? "bg-primary/10 border-primary"
                : "hover:bg-muted/50"
            }`}
            onClick={() => onSelectConversation(conversation.phone_number)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {conversation.name ||
                      formatPhoneNumber(conversation.phone_number)}
                  </span>
                  {conversation.name && (
                    <span className="text-sm text-muted-foreground">
                      ({formatPhoneNumber(conversation.phone_number)})
                    </span>
                  )}
                  {isNewLead(conversation.first_message_time) && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700"
                    >
                      New Lead
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    <span>{conversation.total_messages} messages</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(
                        new Date(conversation.last_message_time),
                        "MMM d, h:mm a"
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {conversation.incoming_count} received
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {conversation.outgoing_count} sent
                  </Badge>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectConversation(conversation.phone_number);
                }}
              >
                Open Chat
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
