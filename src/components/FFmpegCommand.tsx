import React, { useState, useEffect } from 'react';
import './FFmpegCommand.css';

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

interface FFmpegCommandProps {
  videoPath: string;
  cropArea: CropArea | null;
  timeRange: TimeRange;
  videoDimensions: { width: number; height: number } | null;
  scaleInfo: ScaleInfo;
  onRunAndClose?: () => void;
  isGloballyRunning?: boolean;
}

const FFmpegCommand: React.FC<FFmpegCommandProps> = ({ videoPath, cropArea, timeRange, videoDimensions, scaleInfo, onRunAndClose, isGloballyRunning = false }) => {
  const [outputFileType, setOutputFileType] = useState<'gif' | 'mp4'>('gif');

  const getDefaultOutputFileName = (): string => {
    if (!videoPath) return `output.${outputFileType}`;

    // Get the input file extension
    const inputExtension = videoPath.match(/\.([^/.]+)$/)?.[1]?.toLowerCase();

    // If output type matches input type, add _copy suffix
    if (inputExtension === outputFileType) {
      return videoPath.replace(/\.[^/.]+$/, `_copy.${outputFileType}`);
    }

    return videoPath.replace(/\.[^/.]+$/, `.${outputFileType}`);
  };

  const [outputFileName, setOutputFileName] = useState<string>('');
  const [fileExists, setFileExists] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // GIF looping options
  const [loopingEnabled, setLoopingEnabled] = useState<boolean>(true);
  const [loopCount, setLoopCount] = useState<number>(0); // 0 means infinite

  // Update output filename when video path or file type changes
  useEffect(() => {
    setOutputFileName(getDefaultOutputFileName());
  }, [videoPath, outputFileType]);

  // Check if output file exists
  const checkFileExists = async (filePath: string) => {
    try {
      const response = await fetch('/check-file-exists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      });
      const data = await response.json();
      setFileExists(data.exists);
    } catch (error) {
      console.error('Error checking file existence:', error);
      setFileExists(false);
    }
  };

  // Check file existence when output filename changes
  useEffect(() => {
    const fullPath = getOutputFileName();
    if (fullPath) {
      checkFileExists(fullPath);
    }
  }, [outputFileName, videoPath]);

  const getOutputFileName = (): string => {
    return outputFileName || getDefaultOutputFileName();
  };

  const getRelativeFileName = (fullPath: string): string => {
    return fullPath.split('/').pop() || fullPath;
  };

  const getPaletteFileName = (): string => {
    if (!videoPath) return 'palette.png';
    return videoPath.replace(/\.[^/.]+$/, '_palette.png');
  };

  const getRelativePaletteFileName = (): string => {
    return getRelativeFileName(getPaletteFileName());
  };

  // Helper function to ensure even dimensions for video encoding
  const makeEven = (num: number): number => {
    return num % 2 === 0 ? num : num - 1;
  };

  // Validation function to check if dimensions are valid
  const validateDimensions = (): string | null => {
    if (scaleInfo.targetWidth && scaleInfo.targetWidth % 2 !== 0) {
      return "Width must be an even number for proper video encoding.";
    }
    if (scaleInfo.targetHeight && scaleInfo.targetHeight % 2 !== 0) {
      return "Height must be an even number for proper video encoding.";
    }
    return null;
  };

  const generateCommand = (): string => {
    if (!videoPath || !timeRange) return '';

    let command = 'ffmpeg';
    // Use relative filename since FFmpeg will run from the video's directory
    let inputFile = `"${getRelativeFileName(videoPath)}"`;

    // Generate output filename based on input file (also relative)
    const outputFile = `"${getRelativeFileName(getOutputFileName())}"`;
    const paletteFile = `"${getRelativePaletteFileName()}"`;

    // Add start time BEFORE input file for better performance
    if (timeRange.start > 0) {
      command += ` -ss ${timeRange.start.toFixed(2)}`;
    }

    // Add duration if not full video
    if (timeRange.end > timeRange.start) {
      const duration = (timeRange.end - timeRange.start).toFixed(2);
      command += ` -t ${duration}`;
    }

    // Add input file
    command += ` -i ${inputFile}`;

    // Add crop filter if crop area is selected
    let filters = [];

    if (cropArea && cropArea.width > 0 && cropArea.height > 0 && videoDimensions) {
      // Convert relative coordinates to pixel coordinates
      const pixelX = Math.round(cropArea.x * videoDimensions.width);
      const pixelY = Math.round(cropArea.y * videoDimensions.height);
      const pixelWidth = makeEven(Math.round(cropArea.width * videoDimensions.width));
      const pixelHeight = makeEven(Math.round(cropArea.height * videoDimensions.height));

      const cropFilter = `crop=${pixelWidth}:${pixelHeight}:${pixelX}:${pixelY}`;
      filters.push(cropFilter);
    }

    // Add scale filter if scaling is needed
    if (scaleInfo.scaleFactor !== 1.0 || scaleInfo.targetWidth || scaleInfo.targetHeight) {
      let scaleFilter = '';

      if (scaleInfo.targetWidth && scaleInfo.targetHeight) {
        const evenWidth = makeEven(scaleInfo.targetWidth);
        const evenHeight = makeEven(scaleInfo.targetHeight);
        scaleFilter = `scale=${evenWidth}:${evenHeight}`;
      } else if (scaleInfo.targetWidth) {
        const evenWidth = makeEven(scaleInfo.targetWidth);
        scaleFilter = `scale=${evenWidth}:-2`; // -2 ensures output height is even
      } else if (scaleInfo.targetHeight) {
        const evenHeight = makeEven(scaleInfo.targetHeight);
        scaleFilter = `scale=-2:${evenHeight}`; // -2 ensures output width is even
      } else {
        // Use scale factor with even dimensions
        scaleFilter = `scale=2*floor(iw*${scaleInfo.scaleFactor}/2):2*floor(ih*${scaleInfo.scaleFactor}/2)`;
      }

      filters.push(scaleFilter);
    }

    // Generate command based on output file type
    if (outputFileType === 'gif') {
      // GIF output requires palette generation for optimal quality
      if (filters.length > 0) {
        // First pass: generate palette
        const paletteFilters = [...filters, 'palettegen'].join(',');
        command += ` -vf "${paletteFilters}" -y ${paletteFile}`;

        // Second pass: create GIF using palette
        command += ` && ffmpeg`;

        if (timeRange.start > 0) {
          command += ` -ss ${timeRange.start.toFixed(2)}`;
        }

        if (timeRange.end > timeRange.start) {
          const duration = (timeRange.end - timeRange.start).toFixed(2);
          command += ` -t ${duration}`;
        }

        command += ` -i ${inputFile}`;

        command += ` -i ${paletteFile} -lavfi "${filters.join(',')}[x];[x][1:v]paletteuse"`;
      } else {
        // Simple GIF conversion without crop/scale
        command += ` -vf "palettegen" -y ${paletteFile}`;

        // Second pass: create GIF using palette
        command += ` && ffmpeg`;

        if (timeRange.start > 0) {
          command += ` -ss ${timeRange.start.toFixed(2)}`;
        }


        if (timeRange.end > timeRange.start) {
          const duration = (timeRange.end - timeRange.start).toFixed(2);
          command += ` -t ${duration}`;
        }

        command += ` -i ${inputFile}`;

        command += ` -i ${paletteFile} -lavfi "[0:v][1:v]paletteuse"`;
      }

      // Add output options for better GIF quality
      command += ` -r 15`; // 15 fps for reasonable file size

      // Add looping option for GIF
      if (loopingEnabled) {
        if (loopCount === 0) {
          command += ` -loop 0`; // Infinite looping (0 means infinite in GIF)
        } else {
          command += ` -loop ${loopCount}`;
        }
      } else {
        command += ` -loop -1`; // No looping
      }

      command += ` -y ${outputFile}`;
    } else {
      // MP4 output - single pass with filters
      if (filters.length > 0) {
        command += ` -vf "${filters.join(',')}"`;
      }

      // Add output options for MP4
      command += ` -c:v libx264 -preset fast -crf 23`; // Good quality/speed balance
      command += ` -y ${outputFile}`;
    }

    return command;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateCommand());
      // You could add a toast notification here
      console.log('Command copied to clipboard');
    } catch (err) {
      console.error('Failed to copy command:', err);
    }
  };

  const runFFmpegCommand = async () => {
    if (isRunning) return;

    // Validate dimensions before running
    const dimensionError = validateDimensions();
    if (dimensionError) {
      alert(dimensionError);
      return;
    }

    // Check if file exists and confirm with user
    if (fileExists) {
      const confirmed = window.confirm(
        `The file "${getOutputFileName().split('/').pop()}" already exists. Do you want to overwrite it?`
      );
      if (!confirmed) {
        return;
      }
    }

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
        alert(`FFmpeg completed successfully!\nOutput saved to: ${data.outputPath}`);
        // Recheck file existence after successful execution
        checkFileExists(getOutputFileName());
      } else {
        // Handle specific error types
        if (data.errorCode === 'FFMPEG_NOT_FOUND') {
          alert(
            `FFmpeg Not Found!\n\n${data.error}\n\n${data.details}\n\nAfter installing FFmpeg, restart the clip2gif application.`
          );
        } else {
          alert(`FFmpeg failed: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('Error running FFmpeg:', error);
      alert('Failed to run FFmpeg command. Please check the console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const command = generateCommand();

  return (
    <div className="ffmpeg-command-container">
      <h3>FFmpeg Command</h3>
      <div className="command-info">
        <div className="info-row">
          <span className="label">Input:</span>
          <span className="value">{videoPath ? videoPath.split('/').pop() : 'No video'}</span>
        </div>
        <div className="info-row">
          <span className="label">Output:</span>
          <input
            type="text"
            className={`output-filename-input ${fileExists ? 'file-exists' : ''}`}
            value={getOutputFileName().split('/').pop()}
            onChange={(e) => {
              const newFileName = e.target.value;
              // Preserve the directory path but update the filename
              const directory = getOutputFileName().includes('/')
                ? getOutputFileName().substring(0, getOutputFileName().lastIndexOf('/') + 1)
                : '';
              setOutputFileName(directory + newFileName);
            }}
            placeholder={`output.${outputFileType}`}
          />
        </div>
        <div className="info-row">
          <span className="label">Output File Type:</span>
          <select
            className="output-type-select"
            value={outputFileType}
            onChange={(e) => setOutputFileType(e.target.value as 'gif' | 'mp4')}
          >
            <option value="gif">GIF</option>
            <option value="mp4">MP4</option>
          </select>
        </div>
        {outputFileType === 'gif' && (
          <>
            <div className="info-row">
              <span className="label">Looping:</span>
              <label className="toggle-container">
                <input
                  type="checkbox"
                  checked={loopingEnabled}
                  onChange={(e) => setLoopingEnabled(e.target.checked)}
                />
                <span className="toggle-text">{loopingEnabled ? 'On' : 'Off'}</span>
              </label>
            </div>
            {loopingEnabled && (
              <div className="info-row">
                <span className="label">Loop Count:</span>
                <div className="loop-count-container">
                  <input
                    type="number"
                    className="loop-count-input"
                    value={loopCount}
                    min="0"
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (!isNaN(value) && value >= 0) {
                        setLoopCount(value);
                      }
                    }}
                  />
                  {loopCount === 0 && <span className="loop-text">Infinite looping</span>}
                </div>
              </div>
            )}
          </>
        )}
        {cropArea && videoDimensions && (
          <div className="info-row">
            <span className="label">Crop Area:</span>
            <span className="value">
              {`${Math.round(cropArea.width * videoDimensions.width)}×${Math.round(cropArea.height * videoDimensions.height)} pixels 
               at (${Math.round(cropArea.x * videoDimensions.width)}, ${Math.round(cropArea.y * videoDimensions.height)})`}
            </span>
          </div>
        )}
        {timeRange && (
          <div className="info-row">
            <span className="label">Time Range:</span>
            <span className="value">
              {`${timeRange.start.toFixed(2)}s - ${timeRange.end.toFixed(2)}s 
               (${(timeRange.end - timeRange.start).toFixed(2)}s duration)`}
            </span>
          </div>
        )}
        {(scaleInfo.scaleFactor !== 1.0 || scaleInfo.targetWidth || scaleInfo.targetHeight) && (
          <div className="info-row">
            <span className="label">Scale:</span>
            <span className="value">
              {scaleInfo.targetWidth && scaleInfo.targetHeight
                ? `${scaleInfo.targetWidth}×${scaleInfo.targetHeight} pixels`
                : `${scaleInfo.scaleFactor.toFixed(2)}x scale factor`}
            </span>
          </div>
        )}
      </div>

      <div className="command-display">
        <div className="command-header">
          <span>Generated Command:</span>
          <div className="command-buttons">
            <button
              className="copy-button"
              onClick={copyToClipboard}
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
            <button
              className={`run-button ${isRunning ? 'running' : ''}`}
              onClick={runFFmpegCommand}
              disabled={isRunning || isGloballyRunning}
              title="Run FFmpeg command"
            >
              {isRunning ? '⏳ Running...' : '▶️ Run'}
            </button>
            {onRunAndClose && (
              <button
                className={`run-and-close-button ${isGloballyRunning ? 'running' : ''}`}
                onClick={onRunAndClose}
                disabled={isRunning || isGloballyRunning}
                title="Run FFmpeg command and close application"
              >
                {isGloballyRunning ? '⏳ Running...' : '▶️ Run & Close'}
              </button>
            )}
          </div>
        </div>
        <pre className="command-text">{command}</pre>
      </div>

      <div className="usage-note">
        <p><strong>Note:</strong> This command assumes ffmpeg is installed and available in your PATH.
          The command will be executed in the same directory as your video file.</p>
        <p><strong>Output:</strong> The command will create <code>{getRelativeFileName(getOutputFileName())}</code> and a temporary palette file.</p>
      </div>
    </div>
  );
};

export default FFmpegCommand;