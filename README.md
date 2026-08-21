# FrameIQ

**Live Production Link:** [frameiq.site.je](https://www.google.com/search?q=https://frameiq.site.je)

## Overview

FrameIQ is a Virtual Memory Lab and Page Replacement Algorithm Simulator. It is designed to help users visualize and understand how operating system algorithms manage memory frames through an interactive, step-by-step simulation.

## Key Features

* **Interactive Playback:** Users can control the simulation using playback controls, including play, pause, previous step, and next step functionality.
* **Summary Metrics:** The dashboard tracks and calculates key performance indicators, including Total Hits, Total Faults, Hit Ratio, and Fault Ratio.
* **Step-by-Step Visualization:** A detailed table displays memory state changes, highlighting hits, faults, and new cell entries for each step in the simulation.
* **Queue Tracker:** A solution table breaks down the internal queue state at each step to clearly demonstrate the algorithm's eviction order.
* **Input Validation & History:** The input system strictly enforces either fully numeric or fully alphabetic reference strings without mixing tokens, and it saves up to 20 recent inputs in a dropdown history.
* **Quick Presets:** Users can instantly generate random numeric (12 or 20 items) or alphabetic (15 items) reference strings for quick testing.
* **Theming:** Includes a toggle for alternating between light and dark viewing modes.

## Supported Algorithms

* **FIFO (First-In-First-Out):** Replaces the oldest page in memory by utilizing a queue to track page insertion order.
* **LRU (Least Recently Used):** Replaces the page that has not been accessed for the longest period of time by tracking the most recently used pages.

## Tech Stack

* **Frontend:** HTML5, Tailwind CSS (via CDN), and Vanilla JavaScript for UI rendering, validation, and table generation.
* **Backend:** PHP (interfaces with an `api/process.php` endpoint to process the simulation logic).

---

*Compiled by: Jasper Enjambre Momo*
