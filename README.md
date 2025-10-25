# Clip2Gif - Video to GIF Converter

A command-line tool that opens a web interface for clipping and cropping videos
and (optionally) converting them to GIF

## Features

- **Visual Cropping**: Select an area of the video
- **Timeline Selection**: Select start and end points
- **FFmpeg Command Generation**: Automatically generates the appropriate FFmpeg command, and (optionally) runs it for you

and that's it!

## Usage

Open a file for editing:

```sh
clip2gif my-video.mp4
```

## Installation

This application requires NodeJs (an it's package manager `npm`)

- `npm install -g clip2gif`
- or:

  ```sh
  git clone https://github.com/jdthorpe/clip2gif
  cd clip2gif
  npm install
  npm link
  ```

The application will use an existing ffmpeg installation or offer to install it for you.

## Uninstalling

If installed globally:

```sh
npm uninstall -g clip2gif
```

If installed from the project directory:

```sh
cd clip2gif
npm unlink
```
