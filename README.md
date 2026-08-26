# FORGE — Strength OS 🏋️‍♂️⚡

> **The ultimate modern strength training engine, exercise database, and workout analytics web app.**

Built with pure **Vanilla JavaScript**, **CSS3 Design Variables**, and **HTML5**. Zero heavy framework overhead, 100% offline-ready, and equipped with a PWA service worker.

---

## 🚀 Quick Start

To run locally in your browser:

```bash
# Navigate to the project directory
cd ~/forge-workout-tracker

# Start a local static server
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your web browser.

---

## 🔥 Features Included

- **🏋️‍♂️ 104+ Exercise Database**: Categorized by primary & secondary muscle groups (Chest, Back, Quads, Hamstrings, Shoulders, Biceps, Triceps, Core, Cardio).
- **⏱️ Active Workout Tracker**: Set logging with set types (**Warmup**, **Normal**, **Drop Set**, **Failure**), **RPE (1-10)** ratings, live rest timer countdown, and previous weight/reps hints.
- **🔊 Web Audio Rest Timer**: Audio beep alerts synthesized directly via `AudioContext` without requiring external sound files.
- **🏋️ Plate Calculator**: Interactive barbell plate loader (supports 45, 35, 25, 10, 5, 2.5 lb / 20, 15, 10, 5, 2.5 kg plates & custom bar weights).
- **📈 Advanced Analytics**: Custom SVG volume graphs, 1RM progression trackers, workout heatmaps, and muscle group volume distribution radar/pie breakdowns.
- **🔢 1RM Estimator**: Calculates 1-Rep Max using Epley, Brzycki, Lander, and Mayhew formulas.
- **🌱 1-Click Demo Data**: Populates realistic sample workout history with 1 click to preview charts & analytics immediately.
- **💾 Complete Backup & Export**: Full JSON import/export and CSV export for Excel/Google Sheets.
- **📱 PWA & Offline Support**: Mobile app manifest and offline caching Service Worker included.

---

## 🛠️ Project Structure

```
forge-workout-tracker/
├── index.html        # Main single-file app (HTML + CSS + JavaScript)
├── manifest.json     # PWA Manifest configuration
├── sw.js             # Offline Service Worker cache engine
└── README.md         # Documentation & roadmap
```

---

## 📋 Recommended Roadmap & Final Improvements

1. **Body Measurement Tracker**: Weight & body fat percentage logging over time.
2. **Superset Support**: Ability to pair exercises together in active workout sessions.
3. **Timer Presets**: Quick 30s / 60s / 90s / 2m / 3m buttons for rest timer adjustments.
4. **Custom Exercise Creator Modal**: Enhanced modal for adding custom movements with muscle group tags.
