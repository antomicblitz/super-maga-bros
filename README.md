<img width="256" height="256" alt="game-cover-2" src="https://github.com/user-attachments/assets/7b89eaac-35a8-454d-ac1d-99d0c8e6954f" />>
# 🇺🇸 Super MAGA Bros.

> *"Make Platforming Great Again"*

A satirical 2D pixel-art platformer built with Phaser 3. Run, jump, and stomp your way across Mar-a-Lago island in this parody of a classic platformer genre. Collect classified documents, dodge the fake news media, and make it to the finish line — bigly.
<img width="246" height="410" alt="image" src="https://github.com/user-attachments/assets/e8858d3d-a7d6-431a-9080-a1963b2cec52" /> <img width="246" height="410" alt="image" src="https://github.com/user-attachments/assets/94477169-31de-4d6c-8421-3a98f25456bb" /> <img width="246" height="410" alt="image" src="https://github.com/user-attachments/assets/3f721f9f-2c34-4be2-82a8-b2488bfc9b97" />



---

## 🎮 Play

**[Play Super MAGA Bros online](https://super-maga-bros.surge.sh)**

Or serve the project locally — no build tools or installation required:

```bash
# Option 1
npx serve .

# Option 2
python3 -m http.server 8080
```

Then open your browser at `http://localhost:3000` (or `http://localhost:8080`).

> ⚠️ When running locally, the game **must** be served from a local server. Opening `index.html` directly via `file://` will block asset loading due to browser CORS restrictions.

---

## 🕹️ Controls

| Key | Action |
|-----|--------|
| `←` `→` / `A` `D` | Move left / right |
| `Space` / `W` / `↑` | Jump |
| `Z` | Fire tweet-blast *(requires Classified Docs power-up)* |
| HF IL3 controller `←` / `→` | Move left / right |
| HF IL3 controller `↑` / action A | Jump |
| HF IL3 controller action B | Fire tweet-blast *(requires Classified Docs power-up)* |

**Mobile:** SNES-themed on-screen controller with D-pad and action buttons (Jump, Tweet, Shart).

**Pro tips:**
- Hold jump briefly for a small hop, hold longer for a full jump
- You have 80ms of "coyote time" — you can still jump just after walking off a ledge
- Stomp enemies by jumping and landing on top of them

---

## 🌴 Story

The Deep State is everywhere. Journalists lurk on the beach. Scientists roam the resort grounds. Your mission: cross the entire Mar-a-Lago island, stomp the opposition, collect power-ups like classified documents, MAGA hats, and censor bars, and reach the finish flag.

---

## 👾 Enemies

| Enemy | Speed | Points | Notes |
|-------|-------|--------|-------|
| Journalist | 60px/s | 200 pts | Walks slowly, carries a camera |
| Scientist | 80px/s | 300 pts | Faster, holds a mysterious flask |
| Nervous Girl | 100px/s | 150 pts | Quickest enemy, erratic movement |
| Lobbyist | 55px/s | 250 pts | Stomping releases a sliding briefcase |

All enemies can be defeated by **jumping on them** or by a **tweet-blast** projectile.

**Lobbyist mechanic:** Stomping a lobbyist releases a sliding briefcase that bounces off walls and knocks out any enemy it hits (+300 chain bonus). Stomp the briefcase from above to catch it (+200), or hit it with a tweet blast (+500 BIGLY). When the briefcase stops or bursts, it scatters dollar coins worth +50 each. Watch out — getting hit by a briefcase from the side is lethal!

---

## ⭐ Power-Ups

| Power-Up | Effect | Duration |
|----------|--------|----------|
| 🧢 MAGA Hat | Absorbs one hit — lose the hat instead of a life | Until hit |
| ⬛ Censor Bar | Full invincibility — destroys enemies on contact | 10 seconds |
| 📁 Classified Docs | Enables Z-key tweet-blast projectile attack | 15 seconds |

Power-ups appear as floating, bobbing items throughout the level. Active power-ups and remaining time are shown in the top-left HUD. **Power-ups stack independently** — you can have the Censor Bar and Classified Docs active at the same time on separate timers.

---

## 🏆 Scoring

| Action | Points |
|--------|--------|
| Collect a gold star | +100 |
| Stomp a journalist | +200 |
| Stomp a scientist | +300 |
| Stomp a nervous girl | +150 |
| Stomp a lobbyist | +250 |
| Stomp a briefcase | +200 |
| Tweet-blast an enemy | +300 |
| Tweet-blast a briefcase | +500 |
| Briefcase chain kill | +300 |
| Collect dollar coin | +50 |
| Reach the finish flag | +1000 |
| Each star collected at finish | +50 bonus |

---

## 🗂️ Project Structure

```
super-maga-bros/
├── index.html              # Entry point (loads Phaser 3 via CDN)
├── game.js                 # All game logic (~1100 lines, single file)
├── CLAUDE.md               # AI assistant project guide
├── Images/                 # Original concept art and reference images
└── assets/
    ├── sprites/
    │   ├── player.png            # 288×48px — 6-frame horizontal strip
    │   ├── enemies.png           # 192×144px — 4 cols × 3 rows grid
    │   ├── powerups.png          # 144×48px — 3-frame horizontal strip
    │   ├── lobbyist.png          # 144×48px — 3-frame lobbyist sprite
    │   ├── lobbyist-suitcase.png # 144×48px — 3-frame briefcase sprite
    │   ├── bar.png               # Censor bar sprite
    │   ├── classified-docs.png   # Classified docs map sprite
    │   ├── hat.png               # MAGA hat sprite
    │   └── background.png        # 800×500px — scrolling level background
    ├── tiles/
    │   ├── ground.png      # 32×32px — sandy beach ground tile
    │   ├── brick.png       # 32×32px — platform tile
    │   └── qblock.png      # 64×32px — 2-frame question block
    ├── ui/
    │   ├── title-screen.png # 800×500px — menu background
    │   └── hud-icons.png    # 96×32px — life, star, power-up icons
    └── audio/
        ├── jump.wav
        ├── stomp.wav
        ├── coin.wav
        ├── die.wav
        ├── win.wav
        ├── powerup.wav
        ├── tweet.wav        # Tweet blast sound effect
        ├── shart.wav        # Shart sound effect
        ├── bgm-game.mp3    # Looping gameplay music
        ├── bgm-menu.mp3    # Looping menu music
        ├── bgm-censor.mp3  # Censor bar invincibility music
        ├── trump-speech.mp3 # Speech scene audio
        ├── hail-the-chief.mp3 # Intro music
        └── crowd.mp3        # Crowd ambience
```

---

## 🎨 Asset Specifications

All assets are **drop-in replaceable** — swap the file, the game automatically uses it on next reload. No code changes needed.

### Spritesheets

| File | Total Size | Frame Size | Frame Count | Layout |
|------|-----------|------------|-------------|--------|
| `player.png` | 288×48px | 48×48px | 6 | Horizontal strip |
| `enemies.png` | 192×144px | 48×48px | 12 (4×3) | Grid |
| `powerups.png` | 144×48px | 48×48px | 3 | Horizontal strip |

**Player frame order:** `0=idle` `1=run1` `2=run2` `3=run3` `4=jump` `5=hurt`

**Enemy grid layout:**
```
Row 0: Journalist  → [walk1] [walk2] [stomp] [dead]
Row 1: Scientist   → [walk1] [walk2] [stomp] [dead]
Row 2: Girl        → [walk1] [walk2] [stomp] [dead]
```

**Power-up frame order:** `0=MAGA Hat` `1=Censor Bar` `2=Classified Docs`

### Audio

| File | Format | Max Duration |
|------|--------|-------------|
| SFX files | WAV, 44.1kHz mono | < 0.5s each |
| `bgm-game.mp3` | MP3, 128kbps stereo | 60–90s loop |
| `bgm-menu.mp3` | MP3, 128kbps stereo | 30s loop |

---

## 🔧 Tech Stack

- **[Phaser 3.60](https://phaser.io)** — HTML5 game framework (loaded via CDN)
- **Vanilla JavaScript** — ES6 classes, no TypeScript
- **Web Audio API** — procedural SFX fallback when audio files are missing
- **No build tools** — no npm, no webpack, no bundler

---

## 🧠 Scene Flow

```
PreloadScene  →  BootScene  →  MenuScene  →  SpeechScene  →  GameScene
(load assets)    (fallback      (title        (Trump speech    (gameplay,
                  textures)      screen)       intro)           HUD, logic)
```

The game uses a **graceful fallback system**: if any external asset file is missing or empty (e.g. placeholder), the engine automatically falls back to procedurally generated pixel art. This means the game is always playable, even without final artwork.

---

## 🚧 Roadmap

- [x] Animated enemy death frames
- [x] Mobile touch controls (SNES-themed)
- [x] Sound effects and background music
- [x] Lobbyist enemy with briefcase mechanic
- [x] Stackable power-up system
- [x] Speech intro scene
- [ ] Additional level worlds (Washington DC, Trump Tower)
- [ ] High score leaderboard
- [ ] Boss fight: The Deep State
- [ ] Additional power-up: Gold Bar (score multiplier)
- [ ] Moving platform: golf cart
- [ ] Animated water / hazard zones

---

## 🛠️ Development with Claude Code

This project is optimized for development with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). See `CLAUDE.md` for the full project guide including asset specs, design rules, and coding conventions.

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Launch in project directory
claude
```

---

## ⚖️ Disclaimer

Super MAGA Bros. is a **satirical parody** game created for comedic and commentary purposes. It is protected under fair use principles applicable to political satire and parody. All characters are fictional caricatures. In case it's not obvious, this game is satire and does not support Trump.

---

## 📄 License

MIT License — free to use, modify, and distribute with attribution.

---

*Built with Phaser 3 · Pixel art generated with AI 🦅
