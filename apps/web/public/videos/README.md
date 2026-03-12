# Video Assets for Life Design App

This folder contains video files used in the onboarding cinematic experience.

## Required Video Files

### 1. `brain-cinematic.mp4`
- **Purpose:** Opening cinematic sequence showing neural network/brain animation
- **Duration:** 8-10 seconds
- **Resolution:** 1920x1080 (Full HD) minimum
- **Format:** MP4 (H.264 codec)
- **Usage:** Plays during the initial onboarding experience
- **Fallback:** If missing, a gradient animation with pulsing orbs is shown

### 2. `beach-hero.mp4`
- **Purpose:** Looping beach background video for theme/voice selection
- **Duration:** 10-30 seconds (will loop)
- **Resolution:** 1920x1080 (Full HD) minimum  
- **Format:** MP4 (H.264 codec)
- **Usage:** Background for onboarding UI after cinematic opener
- **Fallback:** If missing, a static poster image is shown (`life-design-hero-illustration.png`)

## Creating Placeholder Videos

If you don't have the actual video files yet, you can create simple placeholders:

### Option 1: Download stock footage
- Search for "neural network animation" and "beach waves" on free stock video sites
- Pexels: https://www.pexels.com/videos/
- Pixabay: https://pixabay.com/videos/
- Coverr: https://coverr.co/

### Option 2: Generate with AI
- Use AI video generators like Runway, Pika, or similar
- Prompt for "brain-cinematic": "Neural network with glowing connections, dark background, futuristic"
- Prompt for "beach-hero": "Calm ocean waves on beach, peaceful, cinematic"

### Option 3: Create with After Effects/Premiere
- Create animated graphics for brain-cinematic
- Record or composite beach footage

## Optimization Tips

- Keep file sizes under 5MB for fast loading
- Use H.264 codec for best browser compatibility
- Compress videos using HandBrake or FFmpeg
- Test autoplay in different browsers

## Current Status

🔴 **MISSING:** Both video files are currently missing
✅ **FALLBACKS WORKING:** App functions without videos using fallback animations/images
