#!/bin/bash

# Tawaaq WhatsApp Backend Deployment Script
echo "🚀 Deploying Tawaaq WhatsApp Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from env.example"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if uploads directory exists
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir uploads
fi

# Run database migrations (if needed)
echo "🗄️ Checking database setup..."
echo "Please run the Supabase migration manually:"
echo "supabase/migrations/20250101000000_create_whatsapp_messages_table.sql"

# Start the server
echo "🚀 Starting WhatsApp backend server..."
echo "📱 Webhook URL: http://localhost:3001/api/whatsapp/webhook"
echo "💬 Chat API: http://localhost:3001/api/chat"
echo "📁 Media API: http://localhost:3001/api/media"
echo ""
echo "Press Ctrl+C to stop the server"

npm run dev 