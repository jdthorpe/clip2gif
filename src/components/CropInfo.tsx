import React, { useCallback } from 'react';
import './CropInfo.css';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropInfoProps {
  cropArea: CropArea | null;
  videoDimensions: { width: number; height: number } | null;
  onCropChange: (cropData: CropArea | null) => void;
}

const CropInfo: React.FC<CropInfoProps> = ({ cropArea, videoDimensions, onCropChange }) => {
  if (!cropArea || !videoDimensions) {
    return (
      <div className="crop-info">
        <div className="crop-info-content">
          <span className="crop-info-label">Crop Area:</span>
          <span className="crop-info-value">No selection. Use the mouse to select an area of the video to crop</span>
        </div>
      </div>
    );
  }

  // Convert from [0,1] range to pixel coordinates
  const { x, y, width, height } = cropArea;
  const pixelX = Math.round(x * videoDimensions.width);
  const pixelY = Math.round(y * videoDimensions.height);
  const pixelWidth = Math.round(width * videoDimensions.width);
  const pixelHeight = Math.round(height * videoDimensions.height);
  const pixelRight = pixelX + pixelWidth;
  const pixelBottom = pixelY + pixelHeight;

  const updateCropFromPixels = useCallback((left: number, top: number, right: number, bottom: number) => {
    // Ensure valid bounds
    const clampedLeft = Math.max(0, Math.min(left, videoDimensions.width - 1));
    const clampedTop = Math.max(0, Math.min(top, videoDimensions.height - 1));
    const clampedRight = Math.max(clampedLeft + 1, Math.min(right, videoDimensions.width));
    const clampedBottom = Math.max(clampedTop + 1, Math.min(bottom, videoDimensions.height));

    const newWidth = clampedRight - clampedLeft;
    const newHeight = clampedBottom - clampedTop;

    // Convert back to [0,1] range
    const newCropArea: CropArea = {
      x: clampedLeft / videoDimensions.width,
      y: clampedTop / videoDimensions.height,
      width: newWidth / videoDimensions.width,
      height: newHeight / videoDimensions.height,
    };

    onCropChange(newCropArea);
  }, [videoDimensions, onCropChange]);

  const handleInputChange = useCallback((field: 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    let newLeft = pixelX;
    let newTop = pixelY;
    let newRight = pixelRight;
    let newBottom = pixelBottom;

    switch (field) {
      case 'left':
        newLeft = numValue;
        break;
      case 'top':
        newTop = numValue;
        break;
      case 'right':
        newRight = numValue;
        break;
      case 'bottom':
        newBottom = numValue;
        break;
      case 'width':
        newRight = newLeft + numValue;
        break;
      case 'height':
        newBottom = newTop + numValue;
        break;
    }

    updateCropFromPixels(newLeft, newTop, newRight, newBottom);
  }, [pixelX, pixelY, pixelRight, pixelBottom, updateCropFromPixels]);

  return (
    <div className="crop-info">
      <div className="crop-info-content">
        <span className="crop-info-label">Crop Area (pixels):</span>
        <div className="crop-info-grid">
          <div className="crop-info-item">
            <span className="crop-info-key">Left:</span>
            <input
              type="number"
              className="crop-info-input"
              value={pixelX}
              min="0"
              max={videoDimensions.width - 1}
              onChange={(e) => handleInputChange('left', e.target.value)}
            />
          </div>
          <div className="crop-info-item">
            <span className="crop-info-key">Right:</span>
            <input
              type="number"
              className="crop-info-input"
              value={pixelRight}
              min={pixelX + 1}
              max={videoDimensions.width}
              onChange={(e) => handleInputChange('right', e.target.value)}
            />
          </div>
          <div className="crop-info-item">
            <span className="crop-info-key">Width:</span>
            <input
              type="number"
              className="crop-info-input"
              value={pixelWidth}
              min="1"
              max={videoDimensions.width - pixelX}
              onChange={(e) => handleInputChange('width', e.target.value)}
            />
          </div>
          <div className="crop-info-item">
            <span className="crop-info-key">Top:</span>
            <input
              type="number"
              className="crop-info-input"
              value={pixelY}
              min="0"
              max={videoDimensions.height - 1}
              onChange={(e) => handleInputChange('top', e.target.value)}
            />
          </div>
          <div className="crop-info-item">
            <span className="crop-info-key">Bottom:</span>
            <input
              type="number"
              className="crop-info-input"
              value={pixelBottom}
              min={pixelY + 1}
              max={videoDimensions.height}
              onChange={(e) => handleInputChange('bottom', e.target.value)}
            />
          </div>
          <div className="crop-info-item">
            <span className="crop-info-key">Height:</span>
            <input
              type="number"
              className="crop-info-input"
              value={pixelHeight}
              min="1"
              max={videoDimensions.height - pixelY}
              onChange={(e) => handleInputChange('height', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropInfo;