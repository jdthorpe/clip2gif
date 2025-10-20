import React, { useRef, useState, useEffect } from 'react';
import './VideoPlayer.css';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VideoPlayerProps {
  src: string;
  cropArea: CropArea | null;
  onCropChange: (cropData: CropArea | null) => void;
  onDurationChange: (duration: number) => void;
  onVideoDimensionsChange: (width: number, height: number) => void;
  onCurrentTimeChange: (currentTime: number) => void;
}

type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, cropArea, onCropChange, onDurationChange, onVideoDimensionsChange, onCurrentTimeChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [startPoint, setStartPoint] = useState<Position | null>(null);
  const [_, setEndPoint] = useState<Position | null>(null);
  const [selectionRect, setSelectionRect] = useState<Rectangle | null>(null);
  const [previousSelection, setPreviousSelection] = useState<Rectangle | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedMetadata = () => {
        setDuration(video.duration);
        onDurationChange(video.duration);
        onVideoDimensionsChange(video.videoWidth, video.videoHeight);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        onCurrentTimeChange(video.currentTime);
      };

      const handlePlay = () => {
        setIsPlaying(true);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [onDurationChange, onVideoDimensionsChange, onCurrentTimeChange]);

  // Sync external crop area changes with internal selection rectangle
  useEffect(() => {
    if (!overlayRef.current) return;

    if (cropArea) {
      const overlayRect = overlayRef.current.getBoundingClientRect();
      const displayRect: Rectangle = {
        x: cropArea.x * overlayRect.width,
        y: cropArea.y * overlayRect.height,
        width: cropArea.width * overlayRect.width,
        height: cropArea.height * overlayRect.height,
      };
      setSelectionRect(displayRect);
    } else {
      setSelectionRect(null);
    }
  }, [cropArea]);

  const getRelativePosition = (event: React.PointerEvent<HTMLDivElement>): Position => {
    if (!overlayRef.current) throw new Error('Overlay ref is null');
    const rect = overlayRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height
    };
  };

  const isPointInSelection = (x: number, y: number, rect: Rectangle | null): boolean => {
    if (!rect) return false;
    return x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Don't start selection if clicking on a resize handle
    if ((event.target as Element).classList.contains('resize-handle')) {
      return;
    }

    const position = getRelativePosition(event);

    // Store current selection before potentially clearing it
    setPreviousSelection(selectionRect);

    setIsSelecting(true);
    setStartPoint(position);
    setEndPoint(null);
    setSelectionRect(null);
    if (overlayRef.current) {
      overlayRef.current.setPointerCapture(event.pointerId);
    }
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>, handle: ResizeHandle) => {
    event.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    if (overlayRef.current) {
      overlayRef.current.setPointerCapture(event.pointerId);
    }
  };

  const resizeRectangle = (position: Position, handle: ResizeHandle, currentRect: Rectangle): Rectangle => {
    const newRect = { ...currentRect };

    switch (handle) {
      case 'top-left':
        newRect.width = currentRect.width + (currentRect.x - position.x);
        newRect.height = currentRect.height + (currentRect.y - position.y);
        newRect.x = Math.min(position.x, currentRect.x + currentRect.width - 10);
        newRect.y = Math.min(position.y, currentRect.y + currentRect.height - 10);
        break;
      case 'top-right':
        newRect.width = position.x - currentRect.x;
        newRect.height = currentRect.height + (currentRect.y - position.y);
        newRect.y = Math.min(position.y, currentRect.y + currentRect.height - 10);
        break;
      case 'bottom-left':
        newRect.width = currentRect.width + (currentRect.x - position.x);
        newRect.height = position.y - currentRect.y;
        newRect.x = Math.min(position.x, currentRect.x + currentRect.width - 10);
        break;
      case 'bottom-right':
        newRect.width = position.x - currentRect.x;
        newRect.height = position.y - currentRect.y;
        break;
    }

    // Ensure minimum size
    newRect.width = Math.max(newRect.width, 20);
    newRect.height = Math.max(newRect.height, 20);

    // Ensure bounds
    if (newRect.x < 0) {
      newRect.width += newRect.x;
      newRect.x = 0;
    }
    if (newRect.y < 0) {
      newRect.height += newRect.y;
      newRect.y = 0;
    }
    if (newRect.x + newRect.width > position.width) {
      newRect.width = position.width - newRect.x;
    }
    if (newRect.y + newRect.height > position.height) {
      newRect.height = position.height - newRect.y;
    }

    return newRect;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const position = getRelativePosition(event);

    if (isResizing && resizeHandle && selectionRect) {
      const newRect = resizeRectangle(position, resizeHandle, selectionRect);
      setSelectionRect(newRect);
    } else if (isSelecting && startPoint) {
      setEndPoint(position);

      const rect: Rectangle = {
        x: Math.min(startPoint.x, position.x),
        y: Math.min(startPoint.y, position.y),
        width: Math.abs(position.x - startPoint.x),
        height: Math.abs(position.y - startPoint.y)
      };
      setSelectionRect(rect);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const position = getRelativePosition(event);

    if (isResizing && selectionRect) {
      setIsResizing(false);
      setResizeHandle(null);

      // Convert to relative coordinates (0-1) and send crop data
      const relativeRect: CropArea = {
        x: selectionRect.x / position.width,
        y: selectionRect.y / position.height,
        width: selectionRect.width / position.width,
        height: selectionRect.height / position.height
      };
      onCropChange(relativeRect);
    } else if (isSelecting && startPoint) {
      setEndPoint(position);
      setIsSelecting(false);

      // Calculate final selection rectangle
      const rect: Rectangle = {
        x: Math.min(startPoint.x, position.x),
        y: Math.min(startPoint.y, position.y),
        width: Math.abs(position.x - startPoint.x),
        height: Math.abs(position.y - startPoint.y)
      };

      // Check if this was just a click (no meaningful drag) and clear selection if so
      const isJustClick = rect.width <= 5 && rect.height <= 5;

      if (isJustClick && previousSelection) {
        // Check if the click was inside the previous selection
        const clickedInsideSelection = isPointInSelection(startPoint.x, startPoint.y, previousSelection);

        if (clickedInsideSelection) {
          // Restore the previous selection if clicked inside it
          setSelectionRect(previousSelection);
        } else {
          // Clear selection if clicked outside
          clearSelection();
        }
      } else if (rect.width > 5 && rect.height > 5) {
        // Only create/update selection if the drag is meaningful
        const relativeRect: CropArea = {
          x: rect.x / startPoint.width,
          y: rect.y / startPoint.height,
          width: rect.width / startPoint.width,
          height: rect.height / startPoint.height
        };

        setSelectionRect(rect);
        onCropChange(relativeRect);
      }
    }

    if (overlayRef.current) {
      overlayRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const clearSelection = () => {
    setSelectionRect(null);
    setStartPoint(null);
    setEndPoint(null);
    setIsSelecting(false);
    onCropChange(null);
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      const newTime = parseFloat(event.target.value);
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hundredths = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-player-container">
      <div className="video-wrapper">
        <video
          ref={videoRef}
          src={src}
          className="video-element"
        />
        <div
          ref={overlayRef}
          className="video-overlay"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {selectionRect && (
            <div
              className="selection-rectangle"
              style={{
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
            >
              <div
                className="resize-handle resize-handle-tl"
                onPointerDown={(e) => handleResizeStart(e, 'top-left')}
              />
              <div
                className="resize-handle resize-handle-tr"
                onPointerDown={(e) => handleResizeStart(e, 'top-right')}
              />
              <div
                className="resize-handle resize-handle-bl"
                onPointerDown={(e) => handleResizeStart(e, 'bottom-left')}
              />
              <div
                className="resize-handle resize-handle-br"
                onPointerDown={(e) => handleResizeStart(e, 'bottom-right')}
              />
            </div>
          )}
        </div>
      </div>

      <div className="video-controls">
        <button
          className="play-pause-btn"
          onClick={togglePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <input
          type="range"
          className="seek-slider"
          min="0"
          max={duration || 0}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
        />
      </div>

      {selectionRect && (
        <button className="clear-selection-btn" onClick={clearSelection}>
          Clear Selection
        </button>
      )}
    </div>
  );
};

export default VideoPlayer;