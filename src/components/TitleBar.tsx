import React from 'react';
import './TitleBar.css';

interface TitleBarProps {
  onShutdown: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ onShutdown }) => {
  return (
    <div className="title-bar">
      <h1>Clip 2 Gif</h1>
      <button className="close-button" onClick={onShutdown} title="Close application">
        ✕
      </button>
    </div>
  );
};

export default TitleBar;