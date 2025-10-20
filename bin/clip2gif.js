#!/usr/bin/env node

import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import express from "express";
import open from "open";
import {spawn, exec} from "child_process";
import {promisify} from "util";
import readline from "readline";

const execAsync = promisify(exec);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FFmpeg checking and installation functions
async function checkFFmpegInstalled() {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch (error) {
    return false;
  }
}

function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function installFFmpegPackage() {
  console.log("Installing @ffmpeg-installer/ffmpeg package...");

  try {
    const projectRoot = path.join(__dirname, "..");
    await execAsync("npm install @ffmpeg-installer/ffmpeg", {
      cwd: projectRoot,
    });
    console.log("✅ @ffmpeg-installer/ffmpeg installed successfully!");
    return true;
  } catch (error) {
    console.error(
      "❌ Failed to install @ffmpeg-installer/ffmpeg:",
      error.message
    );
    return false;
  }
}

async function setupFFmpeg() {
  const isInstalled = await checkFFmpegInstalled();

  if (isInstalled) {
    console.log("✅ FFmpeg is already installed and available in PATH");
    return true;
  }

  console.log("⚠️  FFmpeg not found in your system PATH");
  console.log("");
  console.log("FFmpeg is required to convert videos to GIFs.");
  console.log("You have two options:");
  console.log("1. Install FFmpeg system-wide (recommended):");
  console.log("   - macOS: brew install ffmpeg");
  console.log("   - Linux: sudo apt-get install ffmpeg");
  console.log("   - Windows: Download from https://ffmpeg.org/download.html");
  console.log("");
  console.log(
    "2. Or I can install a local copy using @ffmpeg-installer/ffmpeg"
  );
  console.log("");

  const answer = await promptUser(
    "Would you like me to install a local copy now? (y/N): "
  );

  if (answer === "y" || answer === "yes") {
    const success = await installFFmpegPackage();
    if (success) {
      console.log("");
      console.log("✅ Local FFmpeg installation complete!");
      console.log(
        "Note: The web interface will now use the local FFmpeg binary for conversions."
      );
      return true;
    } else {
      console.log("");
      console.log(
        "❌ Installation failed. Please install FFmpeg manually and try again."
      );
      return false;
    }
  } else {
    console.log("");
    console.log("Please install FFmpeg manually and run clip2gif again.");
    console.log("Installation instructions: https://ffmpeg.org/download.html");
    return false;
  }
}

// Get the video file from command line arguments
const videoFile = process.argv[2];

if (!videoFile) {
  console.error("Usage: clip2gif <video-file>");
  process.exit(1);
}

// Resolve absolute path to video file
const videoPath = path.resolve(videoFile);

// Check if video file exists
if (!fs.existsSync(videoPath)) {
  console.error(`Error: Video file "${videoFile}" not found.`);
  process.exit(1);
}

// Check FFmpeg installation before proceeding
console.log("🔍 Checking FFmpeg installation...");
const ffmpegReady = await setupFFmpeg();

if (!ffmpegReady) {
  process.exit(1);
}

// Create Express server to serve the video file
const app = express();
// Generate a random 5-digit port (10000-99999)
const PORT = Math.floor(Math.random() * 55536) + 10000;

// Serve static files from the dist directory
const distPath = path.join(__dirname, "..", "dist");
console.log(`Serving static files from: ${distPath}`);
app.use(express.static(distPath));

// Parse JSON bodies for POST requests
app.use(express.json());

// Serve the video file
app.get("/video", (req, res) => {
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, {start, end});
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Get video info endpoint
app.get("/video-info", (req, res) => {
  res.json({
    filename: path.basename(videoPath),
    path: videoPath,
  });
});

// Check if file exists endpoint
app.post("/check-file-exists", (req, res) => {
  try {
    const {filePath} = req.body;

    if (!filePath) {
      return res.status(400).json({error: "File path is required"});
    }

    // Resolve the file path relative to the video file's directory
    let fullPath;
    if (path.isAbsolute(filePath)) {
      fullPath = filePath;
    } else {
      // If relative path, resolve it relative to the video file's directory
      const videoDir = path.dirname(videoPath);
      fullPath = path.resolve(videoDir, filePath);
    }

    const exists = fs.existsSync(fullPath);
    res.json({exists, fullPath});
  } catch (error) {
    console.error("Error checking file existence:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// Helper function to get FFmpeg executable path
async function getFFmpegPath() {
  // First try system FFmpeg
  try {
    await execAsync("ffmpeg -version");
    return "ffmpeg";
  } catch (error) {
    // Try @ffmpeg-installer/ffmpeg
    try {
      const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
      return ffmpegInstaller.path;
    } catch (importError) {
      throw new Error(
        "FFmpeg not found. Please install FFmpeg or run the installer."
      );
    }
  }
}

// Run FFmpeg command endpoint
app.post("/run-ffmpeg", async (req, res) => {
  try {
    const {command, outputPath} = req.body;

    if (!command) {
      return res.status(400).json({error: "FFmpeg command is required"});
    }

    console.log("Running FFmpeg command:", command);

    // Get the correct FFmpeg path
    let ffmpegPath;
    try {
      ffmpegPath = await getFFmpegPath();
    } catch (error) {
      return res.status(500).json({
        error: "FFmpeg not available",
        details: error.message,
        errorCode: "FFMPEG_NOT_FOUND",
      });
    }

    // Execute the FFmpeg command in the video file's directory
    const videoDir = path.dirname(videoPath);

    // Split the command to handle the && operator properly
    const commands = command.split(" && ");
    let currentCommand = 0;

    const runNextCommand = () => {
      if (currentCommand >= commands.length) {
        // All commands completed successfully
        const resolvedOutputPath = path.isAbsolute(outputPath)
          ? outputPath
          : path.resolve(videoDir, outputPath);

        // Clean up temporary palette file
        const paletteFile = outputPath.replace(/\.[^/.]+$/, "_palette.png");
        const palettePath = path.isAbsolute(paletteFile)
          ? paletteFile
          : path.resolve(videoDir, paletteFile);

        try {
          if (fs.existsSync(palettePath)) {
            fs.unlinkSync(palettePath);
            console.log(`Cleaned up temporary palette file: ${palettePath}`);
          }
        } catch (error) {
          console.log(
            `Note: Could not clean up palette file: ${error.message}`
          );
          // Don't fail the whole operation for cleanup issues
        }

        console.log("FFmpeg completed successfully!");
        return res.json({
          success: true,
          outputPath: resolvedOutputPath,
          message: "FFmpeg completed successfully",
        });
      }

      const cmd = commands[currentCommand].trim();
      const parts = cmd.split(" ");
      // Replace the first part (ffmpeg) with the correct path
      const program = parts[0] === "ffmpeg" ? ffmpegPath : parts[0];
      const args = parts.slice(1);

      console.log(
        `==============\nExecuting command ${currentCommand + 1}/${
          commands.length
        }: ${program}, ${JSON.stringify(args)}`
      );

      const process = spawn(
        program,
        args.map((x) => x.replace(/^"/, "").replace(/"$/, "")),
        {
          cwd: videoDir,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      let stdout = "";
      let stderr = "";
      let responseSent = false;

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
        // FFmpeg outputs progress to stderr, so we can log it
        console.log(data.toString());
      });

      process.on("close", (code) => {
        if (responseSent) return; // Prevent duplicate responses

        if (code === 0) {
          currentCommand++;
          runNextCommand();
        } else {
          responseSent = true;
          console.error(`FFmpeg command failed with exit code ${code}`);
          console.error("stderr:", stderr);
          res.status(500).json({
            error: `FFmpeg command failed with exit code ${code}`,
            stderr: stderr,
            stdout: stdout,
          });
        }
      });

      process.on("error", (error) => {
        if (responseSent) return; // Prevent duplicate responses
        responseSent = true;

        console.error("Error spawning FFmpeg process:", error);

        // Handle ENOENT error specifically (command not found)
        if (error.code === "ENOENT") {
          res.status(500).json({
            error: "FFmpeg is not installed or not found in your PATH",
            details:
              "Please install FFmpeg from https://ffmpeg.org/download.html and make sure it's available in your system PATH",
            errorCode: "FFMPEG_NOT_FOUND",
          });
        } else {
          res.status(500).json({
            error: `Failed to start FFmpeg: ${error.message}`,
            errorCode: error.code || "UNKNOWN_ERROR",
          });
        }
      });
    };

    runNextCommand();
  } catch (error) {
    console.error("Error running FFmpeg:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// Shutdown endpoint
app.post("/shutdown", (req, res) => {
  console.log("Shutdown request received");

  // Handle both regular fetch and sendBeacon requests
  res.status(200);

  // Set headers for CORS if needed
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  // Send response
  res.json({message: "Server shutting down"});

  // Give the response time to be sent before shutting down
  setTimeout(() => {
    console.log("Shutting down server...");
    process.exit(0);
  }, 100);
});

// Start server and open browser
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Opening video: ${path.basename(videoPath)}`);

  // Check if dist directory exists, if not build the app
  const projectRoot = path.join(__dirname, "..");
  const distExists = fs.existsSync(distPath);

  if (!distExists) {
    console.log("Building application...");
  }

  // First build the React app, then open browser
  const buildProcess = spawn("npm", ["run", "build"], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  buildProcess.on("close", (code) => {
    if (code === 0) {
      console.log(
        `Build completed successfully. Files written to: ${distPath}`
      );
      open(`http://localhost:${PORT}`);
    } else {
      console.error("Failed to build the application");
      console.error(
        `Make sure you're in the correct directory and have run 'npm install'`
      );
      process.exit(1);
    }
  });

  buildProcess.on("error", (error) => {
    console.error("Error starting build process:", error.message);
    process.exit(1);
  });
});

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\nClosing clip2gif...");
  process.exit(0);
});
