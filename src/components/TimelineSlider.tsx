import React, { useState, useEffect } from 'react';
import './TimelineSlider.css';

interface TimeRange {
  start: number;
  end: number;
}

interface TimelineSliderProps {
  duration: number;
  timeRange: TimeRange;
  currentTime: number;
  onTimeRangeChange: (range: TimeRange) => void;
}

const TimelineSlider: React.FC<TimelineSliderProps> = ({ duration, timeRange, currentTime, onTimeRangeChange }) => {
  const [startTime, setStartTime] = useState<number>(timeRange.start);
  const [endTime, setEndTime] = useState<number>(timeRange.end);

  useEffect(() => {
    setStartTime(timeRange.start);
    setEndTime(timeRange.end);
  }, [timeRange]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleStartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseFloat(event.target.value);
    const newStartTime = Math.min(newStart, endTime - 0.01); // Ensure start is before end
    setStartTime(newStartTime);
    onTimeRangeChange({ start: newStartTime, end: endTime });
  };

  const handleEndChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseFloat(event.target.value);
    const newEndTime = Math.max(newEnd, startTime + 0.01); // Ensure end is after start
    setEndTime(newEndTime);
    onTimeRangeChange({ start: startTime, end: newEndTime });
  };

  const setCurrentTimeAsStart = () => {
    const newStartTime = Math.min(currentTime, endTime - 0.01); // Ensure start is before end
    setStartTime(newStartTime);
    onTimeRangeChange({ start: newStartTime, end: endTime });
  };

  const setCurrentTimeAsEnd = () => {
    const newEndTime = Math.max(currentTime, startTime + 0.01); // Ensure end is after start
    setEndTime(newEndTime);
    onTimeRangeChange({ start: startTime, end: newEndTime });
  };

  if (duration === 0) {
    return null;
  }

  return (
    <div className="timeline-slider-container">
      <h3>Select Time Range</h3>
      <div className="slider-container">
        <div className="time-display">
          <span>
            Start: {formatTime(startTime)}
            <button className="time-button" onClick={setCurrentTimeAsStart} title="Use current video time as start time">
              Use Current
            </button>
          </span>
          <span>
            End: {formatTime(endTime)}
            <button className="time-button" onClick={setCurrentTimeAsEnd} title="Use current video time as end time">
              Use Current
            </button>
          </span>
          <span>Duration: {formatTime(endTime - startTime)}</span>
          <span>Current: {formatTime(currentTime)}</span>
        </div>

        <div className="range-slider-wrapper">
          <input
            type="range"
            min="0"
            max={duration}
            step="0.01"
            value={startTime}
            onChange={handleStartChange}
            className="range-slider start-slider"
          />
          <input
            type="range"
            min="0"
            max={duration}
            step="0.01"
            value={endTime}
            onChange={handleEndChange}
            className="range-slider end-slider"
          />
          <div className="slider-track">
            <div
              className="slider-range"
              style={{
                left: `${(startTime / duration) * 100}%`,
                width: `${((endTime - startTime) / duration) * 100}%`
              }}
            />
          </div>
        </div>

        <div className="time-inputs">
          <div className="input-group">
            <label>Start Time (seconds):</label>
            <input
              type="number"
              min="0"
              max={duration}
              step="0.01"
              value={startTime.toFixed(2)}
              onChange={(e) => handleStartChange(e)}
              className="time-input"
            />
          </div>
          <div className="input-group">
            <label>End Time (seconds):</label>
            <input
              type="number"
              min="0"
              max={duration}
              step="0.01"
              value={endTime.toFixed(2)}
              onChange={(e) => handleEndChange(e)}
              className="time-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineSlider;