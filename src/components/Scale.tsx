import React, { useState, useCallback, useEffect } from 'react';
import './Scale.css';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScaleInfo {
  scaleFactor: number;
  targetWidth: number | null;
  targetHeight: number | null;
  mode: 'factor' | 'width' | 'height';
}

interface ScaleProps {
  cropArea: CropArea | null;
  videoDimensions: { width: number; height: number } | null;
  onScaleChange: (scaleInfo: ScaleInfo) => void;
}

const Scale: React.FC<ScaleProps> = ({ cropArea, videoDimensions, onScaleChange }) => {
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [targetWidth, setTargetWidth] = useState<number | null>(null);
  const [targetHeight, setTargetHeight] = useState<number | null>(null);
  const [mode, setMode] = useState<'factor' | 'width' | 'height'>('factor');

  // Raw input values for typing (before makeEven is applied)
  const [rawWidthInput, setRawWidthInput] = useState<string>('');
  const [rawHeightInput, setRawHeightInput] = useState<string>('');

  // Helper function to ensure even dimensions for video encoding
  const makeEven = (num: number): number => {
    return Math.floor(num / 2) * 2;
  };

  // Calculate current crop dimensions in pixels
  const getCurrentDimensions = useCallback(() => {
    if (!cropArea || !videoDimensions) return { width: 0, height: 0 };
    return {
      width: makeEven(Math.round(cropArea.width * videoDimensions.width)),
      height: makeEven(Math.round(cropArea.height * videoDimensions.height)),
    };
  }, [cropArea, videoDimensions]);

  // Update scale info when mode or values change
  const updateScaleInfo = useCallback(() => {
    const scaleInfo: ScaleInfo = {
      scaleFactor,
      targetWidth,
      targetHeight,
      mode,
    };
    onScaleChange(scaleInfo);
  }, [scaleFactor, targetWidth, targetHeight, mode, onScaleChange]);

  // Recalculate dimensions when crop area changes
  useEffect(() => {
    const currentDims = getCurrentDimensions();
    if (currentDims.width === 0 || currentDims.height === 0) return;

    if (mode === 'width' && targetWidth) {
      // Maintain width, recalculate height and scale factor
      const evenWidth = makeEven(targetWidth);
      const newScaleFactor = evenWidth / currentDims.width;
      const newHeight = makeEven(Math.round(currentDims.height * newScaleFactor));
      setScaleFactor(newScaleFactor);
      setTargetWidth(evenWidth);
      setTargetHeight(newHeight);
    } else if (mode === 'height' && targetHeight) {
      // Maintain height, recalculate width and scale factor
      const evenHeight = makeEven(targetHeight);
      const newScaleFactor = evenHeight / currentDims.height;
      const newWidth = makeEven(Math.round(currentDims.width * newScaleFactor));
      setScaleFactor(newScaleFactor);
      setTargetWidth(newWidth);
      setTargetHeight(evenHeight);
    } else if (mode === 'factor') {
      // Recalculate target dimensions based on scale factor
      setTargetWidth(makeEven(Math.round(currentDims.width * scaleFactor)));
      setTargetHeight(makeEven(Math.round(currentDims.height * scaleFactor)));
    }
  }, [cropArea, mode, targetWidth, targetHeight, scaleFactor, getCurrentDimensions]);

  // Update scale info whenever values change
  useEffect(() => {
    updateScaleInfo();
  }, [updateScaleInfo]);

  const handleScaleFactorChange = (value: string) => {
    const newFactor = parseFloat(value);
    if (isNaN(newFactor) || newFactor <= 0) return;

    setMode('factor');
    setScaleFactor(newFactor);

    const currentDims = getCurrentDimensions();
    setTargetWidth(makeEven(Math.round(currentDims.width * newFactor)));
    setTargetHeight(makeEven(Math.round(currentDims.height * newFactor)));
    setRawWidthInput(''); // Clear raw inputs to show calculated values
    setRawHeightInput('');
  };

  const handleWidthChange = (value: string) => {
    setRawWidthInput(value);
    const newWidth = parseInt(value, 10);
    if (isNaN(newWidth) || newWidth <= 0) return;

    setMode('width');
    setTargetWidth(newWidth); // Don't apply makeEven here, just store the raw value

    const currentDims = getCurrentDimensions();
    if (currentDims.width > 0) {
      const newScaleFactor = newWidth / currentDims.width;
      setScaleFactor(newScaleFactor);
      setTargetHeight(Math.round(currentDims.height * newScaleFactor));
    }
  };

  const handleWidthBlur = () => {
    if (targetWidth !== null) {
      const evenWidth = makeEven(targetWidth);
      setTargetWidth(evenWidth);
      setRawWidthInput(evenWidth.toString());

      const currentDims = getCurrentDimensions();
      if (currentDims.width > 0) {
        const newScaleFactor = evenWidth / currentDims.width;
        setScaleFactor(newScaleFactor);
        setTargetHeight(makeEven(Math.round(currentDims.height * newScaleFactor)));
      }
      setRawWidthInput(''); // Clear raw inputs to show calculated values
      setRawHeightInput('');
    }
  };

  const handleHeightChange = (value: string) => {
    setRawHeightInput(value);
    const newHeight = parseInt(value, 10);
    if (isNaN(newHeight) || newHeight <= 0) return;

    setMode('height');
    setTargetHeight(newHeight); // Don't apply makeEven here, just store the raw value

    const currentDims = getCurrentDimensions();
    if (currentDims.height > 0) {
      const newScaleFactor = newHeight / currentDims.height;
      setScaleFactor(newScaleFactor);
      setTargetWidth(Math.round(currentDims.width * newScaleFactor));
    }
  };

  const handleHeightBlur = () => {
    if (targetHeight !== null) {
      const evenHeight = makeEven(targetHeight);
      setTargetHeight(evenHeight);
      setRawHeightInput(evenHeight.toString());

      const currentDims = getCurrentDimensions();
      if (currentDims.height > 0) {
        const newScaleFactor = evenHeight / currentDims.height;
        setScaleFactor(newScaleFactor);
        setTargetWidth(makeEven(Math.round(currentDims.width * newScaleFactor)));
      }
    }
  };

  if (!cropArea || !videoDimensions) {
    return (
      <div className="scale-component">
        <div className="scale-content">
          <span className="scale-label">Scale Output:</span>
          <span className="scale-value">No selection</span>
        </div>
      </div>
    );
  }

  const currentDims = getCurrentDimensions();

  return (
    <div className="scale-component">
      <div className="scale-content">
        <span className="scale-label">Scale Output:</span>
        <div className="scale-grid">
          <div className="scale-item">
            <span className="scale-key">Scale Factor:</span>
            <input
              type="number"
              className="scale-input"
              value={scaleFactor.toFixed(2)}
              min="0.1"
              max="5.0"
              step="0.1"
              onChange={(e) => handleScaleFactorChange(e.target.value)}
            />
          </div>
          <div className="scale-item">
            <span className="scale-key">Width:</span>
            <input
              type="number"
              className="scale-input"
              value={rawWidthInput || (targetWidth || makeEven(Math.round(currentDims.width * scaleFactor))).toString()}
              min="2"
              step="2"
              onChange={(e) => handleWidthChange(e.target.value)}
              onBlur={handleWidthBlur}
            />
          </div>
          <div className="scale-item">
            <span className="scale-key">Height:</span>
            <input
              type="number"
              className="scale-input"
              value={rawHeightInput || (targetHeight || makeEven(Math.round(currentDims.height * scaleFactor))).toString()}
              min="2"
              step="2"
              onChange={(e) => handleHeightChange(e.target.value)}
              onBlur={handleHeightBlur}
            />
          </div>
        </div>
        <div className="scale-info">
          <span className="scale-info-text">
            Original: {currentDims.width}×{currentDims.height} →
            Output: {targetWidth || makeEven(Math.round(currentDims.width * scaleFactor))}×{targetHeight || makeEven(Math.round(currentDims.height * scaleFactor))}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Scale;