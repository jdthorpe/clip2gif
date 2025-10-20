# FFmpeg Command Examples

This file shows examples of how the dynamic filename generation works in clip2gif.

## Input → Output Examples

| Input Video Path          | Generated GIF Path        | Generated Palette Path            |
| ------------------------- | ------------------------- | --------------------------------- |
| `/Users/me/video.mp4`     | `/Users/me/video.gif`     | `/Users/me/video_palette.png`     |
| `/home/user/my-movie.avi` | `/home/user/my-movie.gif` | `/home/user/my-movie_palette.png` |
| `C:\Videos\sample.mov`    | `C:\Videos\sample.gif`    | `C:\Videos\sample_palette.png`    |
| `./test/example.mp4`      | `./test/example.gif`      | `./test/example_palette.png`      |

## Sample Generated Command

For input file `./test/example.mp4`:

```bash
# First pass: Generate optimized palette
ffmpeg -i "./test/example.mp4" -ss 2.00 -t 5.50 -vf "palettegen" -y "./test/example_palette.png"

# Second pass: Create GIF using the palette
&& ffmpeg -i "./test/example.mp4" -ss 2.00 -t 5.50 -i "./test/example_palette.png" -lavfi "paletteuse" -r 15 "./test/example.gif"
```

## Benefits

- **No file overwrites**: Each video gets its own uniquely named output
- **Organized output**: GIF files are created alongside the source videos
- **Easy identification**: Output filename clearly matches input filename
- **Path preservation**: Maintains the directory structure of the original file
