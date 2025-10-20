import { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import VideoPlayer from './components/VideoPlayer';
import CropInfo from './components/CropInfo';
import Scale from './components/Scale';
import TimelineSlider from './components/TimelineSlider';
import FFmpegCommand from './components/FFmpegCommand';
import './App.css';

interface VideoInfo {
  filename: string;
  path: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TimeRange {
  start: number;
  end: number;
}

interface ScaleInfo {
  scaleFactor: number;
  targetWidth: number | null;
  targetHeight: number | null;
  mode: 'factor' | 'width' | 'height';
}

function App() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>({ start: 0, end: 0 });
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [scaleInfo, setScaleInfo] = useState<ScaleInfo>({ scaleFactor: 1.0, targetWidth: null, targetHeight: null, mode: 'factor' });
  const [isShuttingDown, setIsShuttingDown] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    // Fetch video info from the server
    fetch('/video-info')
      .then(response => response.json())
      .then(data => setVideoInfo(data))
      .catch(error => console.error('Error fetching video info:', error));
  }, []);

  useEffect(() => {
    // Set up page unload handlers to shutdown server
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable shutdown request even when page is closing
      if (!isShuttingDown) {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/shutdown', JSON.stringify({}));
        } else {
          // Fallback for older browsers
          try {
            fetch('/shutdown', {
              method: 'POST',
              keepalive: true,
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({})
            });
          } catch (error) {
            // Ignore errors during page unload
          }
        }
      }
    };

    const handleUnload = () => {
      // Additional fallback for unload event
      if (!isShuttingDown) {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/shutdown', JSON.stringify({}));
        }
      }
    };

    // Add event listeners for page unload (not visibility changes)
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [isShuttingDown]);

  const handleCropChange = (cropData: CropArea | null) => {
    setCropArea(cropData);
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  const handleVideoDurationChange = (duration: number) => {
    setVideoDuration(duration);
    if (timeRange.end === 0) {
      setTimeRange({ start: 0, end: duration });
    }
  };

  const handleVideoDimensionsChange = (width: number, height: number) => {
    setVideoDimensions({ width, height });
  };

  const handleCurrentTimeChange = (time: number) => {
    setCurrentTime(time);
  };

  const handleScaleChange = (scale: ScaleInfo) => {
    setScaleInfo(scale);
  };

  const handleShutdown = async () => {
    try {
      setIsShuttingDown(true);
      await fetch('/shutdown', { method: 'POST' });
    } catch (error) {
      // Server is likely already down, which is expected
      console.log('Server shutdown initiated');
    }
  };

  const generateCommand = (): string => {
    if (!videoInfo || !videoDimensions) return '';

    const inputVideo = `"${videoInfo.path}"`;
    const duration = timeRange.end - timeRange.start;

    let cropFilter = '';
    if (cropArea) {
      const cropX = Math.round(cropArea.x * videoDimensions.width);
      const cropY = Math.round(cropArea.y * videoDimensions.height);
      const cropWidth = Math.round(cropArea.width * videoDimensions.width);
      const cropHeight = Math.round(cropArea.height * videoDimensions.height);
      cropFilter = `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`;
    }

    let scaleFilter = '';
    if (scaleInfo.mode === 'factor' && scaleInfo.scaleFactor !== 1.0) {
      const finalWidth = cropArea ? Math.round(cropArea.width * videoDimensions.width * scaleInfo.scaleFactor) : Math.round(videoDimensions.width * scaleInfo.scaleFactor);
      const finalHeight = cropArea ? Math.round(cropArea.height * videoDimensions.height * scaleInfo.scaleFactor) : Math.round(videoDimensions.height * scaleInfo.scaleFactor);
      scaleFilter = `scale=${finalWidth}:${finalHeight}`;
    } else if (scaleInfo.mode === 'width' && scaleInfo.targetWidth) {
      scaleFilter = `scale=${scaleInfo.targetWidth}:-1`;
    } else if (scaleInfo.mode === 'height' && scaleInfo.targetHeight) {
      scaleFilter = `scale=-1:${scaleInfo.targetHeight}`;
    }

    const filters = [cropFilter, scaleFilter].filter(f => f).join(',');
    const videoFilters = filters ? `"${filters},palettegen"` : '"palettegen"';
    const gifFilters = filters ? `"${filters}[x];[x][1:v]paletteuse"` : '"[0:v][1:v]paletteuse"';

    const outputPath = videoInfo.path.replace(/\.[^/.]+$/, '.gif');
    const paletteFile = videoInfo.path.replace(/\.[^/.]+$/, '_palette.png');

    return `ffmpeg -ss ${timeRange.start} -t ${duration.toFixed(2)} -i ${inputVideo} -vf ${videoFilters} -y "${paletteFile}" && ffmpeg -ss ${timeRange.start} -t ${duration.toFixed(2)} -i ${inputVideo} -i "${paletteFile}" -filter_complex ${gifFilters} -y "${outputPath}"`;
  };

  const getOutputFileName = (): string => {
    if (!videoInfo) return 'output.gif';
    return videoInfo.path.replace(/\.[^/.]+$/, '.gif');
  };

  const handleRunAndClose = async () => {
    if (isRunning || !videoInfo) return;

    try {
      setIsRunning(true);

      const response = await fetch('/run-ffmpeg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: generateCommand(),
          outputPath: getOutputFileName()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Command succeeded, now shut down
        console.log(`FFmpeg completed successfully! Output saved to: ${data.outputPath}`);
        await handleShutdown();
      } else {
        // Handle errors without shutting down
        setIsRunning(false);
        if (data.errorCode === 'FFMPEG_NOT_FOUND') {
          alert(
            `FFmpeg Not Found!\n\n${data.error}\n\n${data.details}\n\nAfter installing FFmpeg, restart the clip2gif application.`
          );
        } else {
          alert(`FFmpeg failed: ${data.error}`);
        }
      }
    } catch (error) {
      setIsRunning(false);
      console.error('Error running FFmpeg:', error);
      alert('Failed to run FFmpeg command. Please check the console for details.');
    }
  };

  // Render shutdown message if shutting down
  if (isShuttingDown) {
    return (
      <div className="app">
        <div className="shutdown-message">
          <h1>The server has stopped. Ok to close the page</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <TitleBar onShutdown={handleShutdown} />
      <div className="content">
        {videoInfo && (
          <>
            <VideoPlayer
              src="/video"
              cropArea={cropArea}
              onCropChange={handleCropChange}
              onDurationChange={handleVideoDurationChange}
              onVideoDimensionsChange={handleVideoDimensionsChange}
              onCurrentTimeChange={handleCurrentTimeChange}
            />
            <CropInfo cropArea={cropArea} videoDimensions={videoDimensions} onCropChange={handleCropChange} />
            <Scale cropArea={cropArea} videoDimensions={videoDimensions} onScaleChange={handleScaleChange} />
            <TimelineSlider
              duration={videoDuration}
              timeRange={timeRange}
              currentTime={currentTime}
              onTimeRangeChange={handleTimeRangeChange}
            />
            <FFmpegCommand
              videoPath={videoInfo.path}
              cropArea={cropArea}
              timeRange={timeRange}
              videoDimensions={videoDimensions}
              scaleInfo={scaleInfo}
              onRunAndClose={handleRunAndClose}
              isGloballyRunning={isRunning}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;