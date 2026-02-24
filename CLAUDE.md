# Super MAGA Bros — Claude Code Project Guide

## Project Overview
A satirical, parody 2D platformer built with Phaser 3.60 (CDN).
Trump-themed Mario Bros. clone. Island setting (Mar-a-Lago).
Single file architecture: all game logic lives in game.js.
No build tools. Run with: npx serve . or python3 -m http.server 8080

## Tech Stack
- Phaser 3.60.0 via CDN (https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js)
- Vanilla JavaScript (ES6 classes)
- Web Audio API (fallback SFX when audio files are missing)
- No npm, no bundler, no TypeScript

## Scene Flow
PreloadScene → BootScene → MenuScene → GameScene

## Asset Specifications — DO NOT CHANGE THESE DIMENSIONS

### Spritesheets
| File | Total Size | Frame Size | Frames | Layout |
|------|-----------|------------|--------|--------|
| assets/sprites/player.png | 288×48px | 48×48px | 6 | Horizontal strip |
| assets/sprites/enemies.png | 192×144px | 48×48px | 4 cols × 3 rows | Grid |
| assets/sprites/powerups.png | 144×48px | 48×48px | 3 | Horizontal strip |

### Player Frame Order (player.png)
0=idle, 1=run1, 2=run2, 3=run3, 4=jump, 5=hurt

### Enemy Frame Order (enemies.png)
Row 0 (frames 0–3):  journalist  — walk1, walk2, stomp, dead
Row 1 (frames 4–7):  scientist   — walk1, walk2, stomp, dead
Row 2 (frames 8–11): girl        — walk1, walk2, stomp, dead

### Power-Up Frame Order (powerups.png)
0=MAGA Hat, 1=Censor Bar (black rectangle), 2=Classified Docs folder

### Tiles (all 32×32px PNG)
assets/tiles/ground.png  — sandy beach ground, seamlessly tileable
assets/tiles/brick.png   — platform tile
assets/tiles/qblock.png  — 64×32px, 2-frame strip: frame0=normal, frame1=hit

### Backgrounds (800×500px)
assets/sprites/background.png — island sky scene, used as tileSprite
assets/ui/title-screen.png    — full menu background image

### HUD Icons
assets/ui/hud-icons.png — 96×32px, 3 icons at 32×32: life, star, power-up slot

### Audio
| File | Format | Max Duration |
|------|--------|-------------|
| jump.wav | WAV 44.1kHz mono | 0.3s |
| stomp.wav | WAV 44.1kHz mono | 0.3s |
| coin.wav | WAV 44.1kHz mono | 0.2s |
| die.wav | WAV 44.1kHz mono | 0.5s |
| win.wav | WAV 44.1kHz mono | 1.0s |
| powerup.wav | WAV 44.1kHz mono | 0.5s |
| bgm-game.mp3 | MP3 128kbps stereo | 60–90s loop |
| bgm-menu.mp3 | MP3 128kbps stereo | 30s loop |

## Game Constants (do not change)
GW=800, GH=500, TILE=32, WORLD_W=6400, WORLD_H=600, GROUND_Y=468

## Enemy Types
0 = journalist  (speed: 60px/s, score: 200)
1 = scientist   (speed: 80px/s, score: 300)
2 = girl        (speed: 100px/s, score: 150)

## Power-Up Types
0 = MAGA Hat      — absorbs 1 hit, duration: permanent until hit
1 = Censor Bar    — full invincibility, duration: 10 seconds
2 = Classified Docs — enables Z-key tweet-blast projectile, duration: 15 seconds

## Controls
Arrow keys / WASD = move
Space / W / Up = jump
Z = fire tweet-blast (only when Classified Docs power-up is active)

## Key Design Rules
- ALWAYS keep Web Audio API SFX functions as fallback (never delete SFX object)
- ALWAYS keep all procedural sprite generation functions (genPlayer, genEnemy etc.)
- External assets load via PreloadScene; procedural art is fallback in BootScene
- Use playSound(key, fallbackFn) helper for all audio — never call SFX directly
- Parallax background: bg1 scrolls at 0.2x camera speed
- Power-up state lives on GameScene: this.playerPower, this.powerTimer, this.invincible
- Tweet-blast travels 400px/s horizontally, no gravity, destroys on enemy hit, auto-destroys after 2s

## File Editing Rules for Claude Code
- Only edit game.js and CLAUDE.md unless explicitly told otherwise
- Never delete existing level data (LEVEL object) without instruction
- Always test that scene transitions work: PreloadScene→BootScene→MenuScene→GameScene
- When adding new features, add them to the appropriate scene only
