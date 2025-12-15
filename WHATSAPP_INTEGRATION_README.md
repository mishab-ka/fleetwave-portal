# Tawaaq WhatsApp Integration System

A comprehensive WhatsApp integration system for the Tawaaq fleet management dashboard, built with WhatsApp Cloud API, Supabase, and React.js.

## 🚀 Features

### ✅ Core Features

- **Incoming Messages**: Webhook-based message reception and storage
- **Outgoing Messages**: Send text, images, and voice messages via WhatsApp API
- **Real-time Chat**: Live chat interface with 10-second polling
- **Conversation Management**: View and manage all WhatsApp conversations
- **Media Support**: Send and receive images, voice notes, and documents
- **New Lead Detection**: Automatically identify new leads (first message within 24 hours)

### ✅ Database Features

- **Message Storage**: Complete message history with metadata
- **Contact Management**: Store contact names and phone numbers
- **Status Tracking**: Message delivery status tracking
- **Search & Filter**: Advanced search across conversations and messages

### ✅ UI Features

- **Modern Chat Interface**: WhatsApp-style chat UI
- **Conversation List**: Browse all conversations with statistics
- **Real-time Updates**: Live message updates and status changes
- **Media Preview**: Image and document preview in chat
- **Responsive Design**: Works on desktop and mobile

## 📋 Prerequisites

1. **WhatsApp Business API Account**

   - Meta Developer Account
   - WhatsApp Business API access
   - Phone number ID and access token

2. **Supabase Project**

   - Supabase account and project
   - Database access

3. **Node.js Environment**
   - Node.js 16+ installed
   - npm or yarn package manager

## 🛠️ Setup Instructions

### 1. Database Setup

Run the Supabase migration to create the WhatsApp messages table:

```sql
-- Run this in your Supabase SQL editor
-- File: supabase/migrations/20250101000000_create_whatsapp_messages_table.sql
```

### 2. Backend Setup

1. **Navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   ```bash
   cp env.example .env
   ```

4. **Update `.env` with your credentials:**

   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # WhatsApp Cloud API Configuration
   WHATSAPP_TOKEN=your_whatsapp_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
   WHATSAPP_API_VERSION=v18.0

   # Security
   JWT_SECRET=your_jwt_secret
   WEBHOOK_SECRET=your_webhook_secret

   # File Upload
   MAX_FILE_SIZE=16777216
   UPLOAD_PATH=./uploads

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. **Start the backend server:**
   ```bash
   npm run dev
   ```

### 3. Frontend Setup

1. **Add environment variable to your React app:**

   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

2. **Add the WhatsApp page to your admin routes:**

   ```tsx
   // In your admin routing
   import AdminWhatsApp from "@/pages/admin/AdminWhatsApp";

   // Add to your routes
   <Route path="/admin/whatsapp" element={<AdminWhatsApp />} />;
   ```

3. **Add WhatsApp link to your admin navigation:**
   ```tsx
   // In your admin navigation menu
   <Link to="/admin/whatsapp">
     <MessageCircle className="h-4 w-4" />
     WhatsApp
   </Link>
   ```

### 4. WhatsApp Webhook Configuration

1. **Set up webhook in Meta Developer Console:**

   - Webhook URL: `https://localhost:3001/api/whatsapp/webhook`
   - Verify Token: Use the same value as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to: `messages`, `message_status`

2. **Deploy your backend to a public server** (required for webhook)
   - Use services like Railway, Heroku, or DigitalOcean
   - Update webhook URL in Meta Developer Console
   - Update `VITE_API_BASE_URL` to your deployed backend URL

## 📱 API Endpoints

### WhatsApp Webhook

- `GET /api/whatsapp/webhook` - Webhook verification
- `POST /api/whatsapp/webhook` - Receive messages
- `POST /api/whatsapp/send/text` - Send text message
- `POST /api/whatsapp/send/image` - Send image message
- `POST /api/whatsapp/send/voice` - Send voice message

### Chat Management

- `GET /api/chat/conversations` - Get all conversations
- `GET /api/chat/history/:phoneNumber` - Get chat history
- `GET /api/chat/search` - Search conversations
- `GET /api/chat/stats` - Get chat statistics
- `PUT /api/chat/read/:phoneNumber` - Mark as read

### Media Management

- `POST /api/media/upload` - Upload and send media
- `GET /api/media/file/:filename` - Get media file
- `DELETE /api/media/file/:filename` - Delete media file
- `GET /api/media/stats` - Get upload statistics

## 🔧 Configuration

### WhatsApp Cloud API Setup

1. **Create Meta Developer Account:**

   - Go to [Meta Developers](https://developers.facebook.com/)
   - Create a new app
   - Add WhatsApp Business API product

2. **Configure WhatsApp Business API:**

   - Get your Phone Number ID
   - Generate access token
   - Set up webhook URL

3. **Test your setup:**
   ```bash
   # Test webhook verification
   curl "http://localhost:3001/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test"
   ```

### Environment Variables Explained

| Variable                    | Description                               | Required |
| --------------------------- | ----------------------------------------- | -------- |
| `WHATSAPP_TOKEN`            | Your WhatsApp API access token            | ✅       |
| `WHATSAPP_PHONE_NUMBER_ID`  | Your WhatsApp phone number ID             | ✅       |
| `WHATSAPP_VERIFY_TOKEN`     | Webhook verification token                | ✅       |
| `SUPABASE_URL`              | Your Supabase project URL                 | ✅       |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key                 | ✅       |
| `WEBHOOK_SECRET`            | Secret for webhook signature verification | ❌       |
| `MAX_FILE_SIZE`             | Maximum file upload size (bytes)          | ❌       |

## 🎯 Usage

### 1. Access WhatsApp Dashboard

Navigate to `/admin/whatsapp` in your admin panel.

### 2. View Conversations

- See all WhatsApp conversations
- Search for specific contacts
- View message statistics
- Identify new leads

### 3. Send Messages

- Type text messages
- Upload and send images
- Record and send voice messages
- View message status

### 4. Real-time Updates

- Messages update every 10 seconds
- See delivery status in real-time
- New messages appear automatically

## 🔒 Security Considerations

1. **Webhook Security:**

   - Use HTTPS for production
   - Verify webhook signatures
   - Rate limit webhook endpoints

2. **API Security:**

   - Secure your WhatsApp tokens
   - Use environment variables
   - Implement proper CORS

3. **File Upload Security:**
   - Validate file types
   - Limit file sizes
   - Sanitize filenames

## 🚀 Deployment

### Backend Deployment

1. **Railway (Recommended):**

   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Deploy
   railway login
   railway init
   railway up
   ```

2. **Heroku:**

   ```bash
   # Create Procfile
   echo "web: node server.js" > Procfile

   # Deploy
   heroku create
   git push heroku main
   ```

3. **DigitalOcean App Platform:**
   - Connect your GitHub repository
   - Set environment variables
   - Deploy automatically

### Frontend Deployment

Deploy your React app to Vercel, Netlify, or your preferred hosting service.

## 🐛 Troubleshooting

### Common Issues

1. **Webhook not receiving messages:**

   - Check webhook URL is accessible
   - Verify webhook is subscribed to correct events
   - Check server logs for errors

2. **Messages not sending:**

   - Verify WhatsApp token is correct
   - Check phone number format (include country code)
   - Ensure phone number is verified

3. **Database connection issues:**
   - Verify Supabase credentials
   - Check database migrations are applied
   - Test connection with Supabase client

### Debug Mode

Enable debug logging:

```bash
# Backend
DEBUG=* npm run dev

# Frontend
# Check browser console for API errors
```

## 📞 Support

For issues and questions:

1. Check the troubleshooting section
2. Review server logs
3. Verify configuration settings
4. Test with WhatsApp API documentation

## 🔄 Updates

To update the system:

1. Pull latest changes
2. Run database migrations
3. Update environment variables if needed
4. Restart backend server
5. Clear frontend cache

## 📄 License

This project is part of the Tawaaq fleet management system.

---

**Happy WhatsApp Integration! 🚀📱**
