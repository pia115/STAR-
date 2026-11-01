# 📸 Virtual Vintage Photobooth

> *Working title — current favourites: **CLICK CLUB** or **honeyflash***

A virtual photo booth where you can take pictures with your webcam (or upload existing ones), customise them, and download your very own vintage photo strips.

It shouldn't feel like a modern SaaS website — it should feel like stepping into an actual vintage object: a little booth in the corner of an old arcade, with warm light, film grain, and a strip of memories that pops out at the end.

---

## ✨ Features

### 01. The Photo Booth
- Use your **webcam** or **upload** pictures
- **Countdown** before each shot (3, 2, 1…)
- Capture **3 or 4 consecutive pictures**
- **Preview** the entire photo strip before saving

### 02. Vintage Filters
Experiment with:
- Black & white
- Kodak-inspired warm tones
- Sepia
- Faded film
- Flash photography
- Grainy disposable-camera effect

### 03. Scrapbook Studio
- Add **stickers, hearts and doodles**
- Add **handwritten captions**
- Choose different **photo borders**
- Add **dates and timestamps**
- Change **background colours**

### 04. Memory Gallery
- **Save** previous photo strips
- Create a personal **photo gallery**
- **Download** as PNG or JPEG
- **Share** photo strips with friends

### 05. Soundtrack *(idea — still exploring)*
- Connect **Spotify / Apple Music**
- Pick a song to play while taking your pictures
- Have the song show up on the strip somehow — e.g. a little "now playing" label, a cassette/vinyl sticker, or a scannable song code printed on the strip

---

## 🎨 Aesthetic & UI

| Element      | Design                                   |
|--------------|------------------------------------------|
| Background   | Warm cream / paper texture               |
| Primary      | Dusty rose                               |
| Secondary    | Burgundy / espresso                      |
| Accent       | Butter yellow                            |
| Typography   | Vintage serif + handwritten font         |
| Buttons      | Rounded, retro physical buttons          |
| Decorations  | Stars, flowers, film borders             |

---

## 🏷️ Name Ideas

- FLASHBACK
- little moments
- **CLICK CLUB** ⭐
- **honeyflash** ⭐
- afterglow
- the memory booth
- film darling
- SNAP! studio

---

## 🛠️ Tech Stack

The core experience can be built entirely with frontend technologies:

| Technology            | Purpose                          |
|-----------------------|----------------------------------|
| HTML, CSS, JavaScript | Website interface                |
| React                 | Interactive components           |
| Webcam API (`getUserMedia`) | Access the camera          |
| Canvas API            | Capture and edit images          |
| CSS Filters           | Quick vintage effects            |
| LocalStorage          | Save photo strips locally        |
| html2canvas           | Export customised layouts        |

A lightweight backend can be added for features that need it — saving galleries across devices, shareable links, and music-service integration.

### Custom filters with the Canvas API
The fun part: using the Canvas API to manipulate actual image pixels and build our own vintage filters, e.g.:
- Increase contrast
- Reduce saturation
- Add warm colour overlays
- Add film grain
- Add vignette effects

---

## 🗺️ Roadmap

- [ ] Project setup
- [ ] Backend (storage, sharing, music integration)
- [ ] Photo booth: webcam capture + upload + countdown
- [ ] Vintage filter engine (Canvas)
- [ ] Photo strip layout & preview
- [ ] Scrapbook studio (stickers, captions, borders, dates)
- [ ] Memory gallery + download + share
- [ ] Soundtrack integration (exploratory)
- [ ] Final vintage UI polish

---

*Everything here is a starting point and will change as the project evolves.* 🌼
