#!/bin/bash

# Render Build Script for Savings Dashboard

# Exit on error
set -e

echo "🏗️ Building Savings Dashboard for Render..."
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create public directory if it doesn't exist
if [ ! -d "public" ]; then
  echo "📁 Creating public directory..."
  mkdir -p public
fi

# Copy HTML/CSS files to public (if they exist)
if [ -f "index.html" ]; then
  echo "📄 Copying index.html to public/"
  cp index.html public/
fi

if [ -f "style.css" ]; then
  echo "🎨 Copying style.css to public/"
  cp style.css public/
fi

if [ -f "App dashboard.js" ]; then
  echo "⚙️ Copying App dashboard.js to public/"
  cp "App dashboard.js" public/
fi

if [ -f "firebase.js" ]; then
  echo "🔥 Copying firebase.js to public/"
  cp firebase.js public/
fi

if [ -f "storage.js" ]; then
  echo "💾 Copying storage.js to public/"
  cp storage.js public/
fi

echo ""
echo "✅ Build complete! Ready for deployment."
echo "🚀 Starting server..."
