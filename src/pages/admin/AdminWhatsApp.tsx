import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Send,
  Image,
  Mic,
  FileText,
  Phone,
  MessageCircle,
} from "lucide-react";
import WhatsAppChatPanel from "@/components/admin/whatsapp/WhatsAppChatPanel";
import WhatsAppConversations from "@/components/admin/whatsapp/WhatsAppConversations";
import WhatsAppStats from "@/components/admin/whatsapp/WhatsAppStats";

interface Conversation {
  phone_number: string;
  name: string;
  last_message_time: string;
  total_messages: number;
  incoming_count: number;
  outgoing_count: number;
  first_message_time: string;
}

interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  todayMessages: number;
}

export default function AdminWhatsApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [stats, setStats] = useState<ChatStats>({
    totalConversations: 0,
    totalMessages: 0,
    todayMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

  useEffect(() => {
    fetchConversations();
    fetchStats();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/conversations`);
      const data = await response.json();

      if (data.success) {
        setConversations(data.data || []);
      } else {
        toast.error("Failed to fetch conversations");
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/stats`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleConversationSelect = (phoneNumber: string) => {
    setSelectedConversation(phoneNumber);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchConversations();
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/chat/search?q=${encodeURIComponent(searchTerm)}`
      );
      const data = await response.json();

      if (data.success) {
        // Transform search results to match conversation format
        const searchResults = data.data.map((item: any) => ({
          phone_number: item.phone_number,
          name: item.name,
          last_message_time: item.last_message_time,
          total_messages: 1,
          incoming_count: 0,
          outgoing_count: 0,
          first_message_time: item.last_message_time,
        }));
        setConversations(searchResults);
      } else {
        toast.error("Search failed");
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Search failed");
    }
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.phone_number.includes(searchTerm) ||
      (conv.name && conv.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <AdminLayout title="WhatsApp Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fleet-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="WhatsApp Management">
      <div className="space-y-6">
        {/* Stats Cards */}
        <WhatsAppStats stats={stats} />

        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="chat">Live Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="conversations">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>All Conversations</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Button onClick={handleSearch} size="sm">
                      Search
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <WhatsAppConversations
                  conversations={filteredConversations}
                  onSelectConversation={handleConversationSelect}
                  selectedConversation={selectedConversation}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>Live Chat</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedConversation ? (
                  <WhatsAppChatPanel
                    phoneNumber={selectedConversation}
                    onBack={() => setSelectedConversation(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <MessageCircle className="h-16 w-16 mb-4" />
                    <p className="text-lg font-medium">
                      Select a conversation to start chatting
                    </p>
                    <p className="text-sm">
                      Choose from the conversations tab to begin
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
