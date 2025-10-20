# Clip2Gif - Video to GIF Converter

A command-line tool that opens a web interface for converting videos to GIFs with visual cropping and timeline selection.

> **🚀 Now built with Vite + TypeScript + React** for faster development and better type safety!

## Features

- 🎥 **Video Player**: Load and preview your video files
- ✂️ **Visual Cropping**: Click and drag to select a specific area of the video
- ⏱️ **Timeline Selection**: Use dual-range sliders to select start and end points
- 🔧 **FFmpeg Command Generation**: Automatically generates the appropriate FFmpeg command
- 📋 **Copy to Clipboard**: Easy command copying for execution

## Prerequisites

- **Node.js** (v14 or higher) and **npm**
- **FFmpeg** (for actually converting the videos)

**Note**: If FFmpeg is not installed, clip2gif will detect this and offer to install a local copy using `@ffmpeg-installer/ffmpeg` for you automatically.

### Installing Node.js

#### macOS

```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org/
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nodejs npm

# Or use Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
```

#### Windows

Download and install from [nodejs.org](https://nodejs.org/)

### Installing FFmpeg

#### macOS

```bash
brew install ffmpeg
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg
```

#### Windows

Download from [ffmpeg.org](https://ffmpeg.org/download.html) or use:

```bash
# Using Chocolatey
choco install ffmpeg
```

## Installation

1. **Install the package globally:**

   ```bash
   npm install -g clip2gif
   ```

   Or if you're in this directory:

   ```bash
   npm install
   npm link
   ```

## Uninstalling

### If installed globally

```bash
npm uninstall -g clip2gif
```

### If installed locally with npm link

```bash
# From the project directory
npm unlink
```

## Usage

### Basic Usage

```bash
clip2gif my-video.mp4
```

This will:

1. Check if FFmpeg is installed (and offer to install if needed)
2. Start a local server
3. Build the React application
4. Open your browser with the video loaded
5. Allow you to select crop area and timeline
6. Generate appropriate FFmpeg commands

### Example Workflow

1. Run the command with your video file:

   ```bash
   clip2gif ~/Downloads/sample-video.mp4
   ```

2. In the opened browser window:

   - The video will be displayed with playback controls
   - Click and drag on the video to select a crop area (optional)
   - Use the timeline sliders below to select start and end points
   - Copy the generated FFmpeg command at the bottom

3. Run the copied FFmpeg command in your terminal:

   ```bash
   ffmpeg -i "~/Downloads/sample-video.mp4" -ss 10.50 -t 5.25 -vf "crop=iw*0.500:ih*0.400:iw*0.250:ih*0.300,palettegen" -y "~/Downloads/sample-video_palette.png" && ffmpeg -i "~/Downloads/sample-video.mp4" -ss 10.50 -t 5.25 -i "~/Downloads/sample-video_palette.png" -lavfi "crop=iw*0.500:ih*0.400:iw*0.250:ih*0.300,paletteuse" -r 15 "~/Downloads/sample-video.gif"
   ```

## Interface Overview

### Title Bar

- Fixed 60px height header with "convert to gif" title

### Video Player

- Displays your video with standard HTML5 controls
- Overlay allows click-and-drag selection for cropping
- Green rectangle shows selected crop area
- "Clear Selection" button to remove crop area

### Timeline Slider

- Dual-range slider for selecting start and end points
- Real-time display of selected time range and duration
- Manual time input fields for precise control

### FFmpeg Command Generator

- Shows current video, crop area, and time range settings
- Generates optimized FFmpeg command with palette generation
- **Smart output naming**: Automatically generates output filename based on input video (e.g., `video.mp4` → `video.gif`)
- One-click copy to clipboard functionality
- Usage notes and tips

## Development

### Setting Up Test Video for Development

For development and testing, you'll need to add a test video file:

1. **Create or obtain a sample video file** (any format supported by HTML5 video element: MP4, WebM, MOV, etc.)

2. **Place the video file at `test/example.mp4`:**

   ```bash
   # If you have a video file ready
   cp /path/to/your/video.mp4 test/example.mp4

   # Or create a simple test video using FFmpeg (if installed)
   ffmpeg -f lavfi -i testsrc=duration=10:size=320x240:rate=30 -pix_fmt yuv420p test/example.mp4
   ```

3. **The test video is used by the debug command:**

   ```bash
   npm run debug
   ```

   This will automatically load `test/example.mp4` for quick testing during development.

**Note**: The `test/example.mp4` file is not included in the repository, so each developer needs to add their own test video file.

### Debug Mode

For development and testing, you can use the debug command to quickly launch the application with a test video:

```bash
npm run debug
```

This requires a test video file at `test/example.mp4`. See `test/README.md` for instructions on how to set up a test video.

**Note**: The CLI script uses ES module syntax. If you encounter `require is not defined` errors, ensure you're using Node.js version 14+ and that the `"type": "module"` is set in `package.json`.

### Local Development

```bash
# Install dependencies
npm install

# Start development server (for development only)
npm run dev

# Build for production (outputs to ./dist directory)
npm run build

# Type checking only
npm run type-check

# Debug with test video (requires test/example.mp4)
npm run debug

# Verify build (helper script)
./build-check.sh
```

### Project Structure

```txt
clip2gif/
├── bin/
│   └── clip2gif.js           # CLI entry point
├── src/
│   ├── components/
│   │   ├── TitleBar.tsx   # Header component
│   │   ├── VideoPlayer.tsx # Video player with crop selection
│   │   ├── TimelineSlider.tsx # Dual-range timeline control
│   │   └── FFmpegCommand.tsx  # Command generation and display
│   ├── App.tsx            # Main React application
│   └── index.tsx          # React entry point
├── public/
│   └── index.html         # HTML template
├── package.json           # Package configuration
├── vite.config.ts         # Vite build configuration
├── tsconfig.json          # TypeScript configuration
└── tsconfig.node.json     # Node TypeScript configuration
```

## Supported Video Formats

Any format supported by HTML5 video element and FFmpeg:

- MP4 (H.264)
- WebM
- MOV
- AVI
- MKV
- And many more...

## Troubleshooting

### "FFmpeg not found" during startup

When you run `clip2gif`, it will automatically check if FFmpeg is installed. If not found, you'll see:

- Information about installing FFmpeg system-wide (recommended)
- An option to install a local copy using `@ffmpeg-installer/ffmpeg`

Choose the option that works best for your setup. The local installer is convenient but system-wide installation provides better performance.

### "Command not found: clip2gif"

- Make sure you've installed the package globally: `npm install -g clip2gif`
- Or use `npm link` if developing locally

### "Video not loading"

- Ensure the video file path is correct and the file exists
- Check that the video format is supported by your browser

### "FFmpeg command not working"

- Ensure FFmpeg is installed and available in your PATH
- Check that input file path is correct
- Make sure you have write permissions in the output directory

### "Server won't start"

- Port 3001 might be in use; close other applications using this port
- Try running with different permissions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for any purpose.

## Acknowledgments

- Built with React and Webpack
- Uses FFmpeg for video processing
- Inspired by the need for an easy visual GIF creation tool
