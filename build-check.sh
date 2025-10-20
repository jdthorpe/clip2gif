#!/bin/bash

# Build verification script for clip2gif

echo "🔨 Building clip2gif application..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "vite.config.ts" ]; then
    echo "❌ Error: Not in clip2gif project root directory"
    echo "   Make sure you're in the directory containing package.json and vite.config.ts"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Error: node_modules not found"
    echo "   Run 'npm install' first"
    exit 1
fi

# Remove existing dist directory
if [ -d "dist" ]; then
    echo "🧹 Cleaning existing dist directory..."
    rm -rf dist
fi

# Run the build
echo "🏗️  Running Vite build..."
npm run build

# Check if build was successful
if [ $? -eq 0 ] && [ -d "dist" ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo "📁 Build output directory: ./dist"
    echo "📋 Contents:"
    ls -la dist/
    echo ""
    echo "🎉 Ready to run: npm run debug"
else
    echo ""
    echo "❌ Build failed!"
    echo "   Check the error messages above"
    exit 1
fi