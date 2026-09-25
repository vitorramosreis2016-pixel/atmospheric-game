# SEVERE WEATHER FORECAST AND DIAGNOSTIC SIMULATOR
### MESOSCALE ANALYST WORKSTATION // TERM_OPERATIONAL

This repository contains a technical, web-based atmospheric simulation platform designed for severe weather diagnosis and convective profile analysis. Operating completely serverless via GitHub Pages, the system processes raw radiosonde and numerical model data directly within the client browser.

---

## SYSTEM CONFIGURATION

### VERSION 1.0 (CURRENT BASELINE Deployment — Diagnostic Core)
The initial release establishes the thermodynamic processing core and verification pipeline.
*   **ENVIRONMENT INITIALIZATION:** Manual selection of predefined convective vectors (e.g., CASE_01: High-Instability/High-Shear Convective Boundary Layer).
*   **SPC OUTLOOK OVERLAYS:** Static matrix mapping for convective risk categories (MRGL, SLGT, ENH, MDT, HIGH) and deterministic threat probabilities for Tornado (including hatched parameters for EF2+ potential), Severe Wind, and Significant Hail.
*   **NUMERICAL FORECAST SUITES:** Integration of raw text profile arrays from thirteen primary operational models: HRRR, NAM, RRFS, GFS, ECMWF, MONAN, ACCESS, HWRF, WRF, AROME, ICON, UKV, and NEMS.
*   **DIAGNOSTIC MATRIX (SHARPpy UI):** Canvas-rendered thermodynamic interfaces plotting interactive Skew-T / Log-P diagrams, circular Hodograph vectors, and automatic parsing of convective indices (SBCAPE, MLCAPE, CIN, SRH, EHI, STP).
*   **OBSERVED VALIDATION:** Chronological advancement triggers the release of real-world validation datasets from upper-air stations (OUN, ABR, ILX, 76458, KEY, IAD, JAN, RNK) to audit model performance.

### SUBSYSTEM UPGRADES (VERSION 1.X Pipeline)
*   **PROBABILISTIC EXPANSION:** Insertion of the RAP hourly update cycle, GEFS/EPS ensemble member clustering visualization, and long-range seasonal guidance.
*   **FIELD TELEMETRY:** Simulated social media and data-logger streams from virtual Storm Chasers reporting structural and visual storm evolution in real-time.
*   **INCIDENT REPORTING:** Automated post-event local news arrays detailing path lengths, structural damage metrics, and forecast verification summaries.
*   **EMERGENCY WARNING INTRUSION:** Browser-native Text-to-Speech (TTS) integration executing automated Emergency Alert System (EAS) audio streams based on National Weather Service bulletin structures.

### MULTIPLAYER SITUATION ROOM (VERSION 2.0 Architectural Overhaul)
*   **COOPERATIVE WORKSTATION PEER-LINKING:** Multi-client synchronization over low-latency connections, segregating operational roles into Mesoscale Analyst, Radar/Telemetry Operator, and Warning Coordinator.
*   **MANUAL POLYGON ISSUANCE:** Real-time geometric map plotting allowing operators to issue manual Watches and Warnings, dynamically computing public safety impact and driving the automated EAS subsystem.
*   **INTERNATIONAL THERMODYNAMIC STANDARDS:** Integration of non-US diagnostic profiles including Stüve Diagrams, British/Canadian Tephigrams, and Emagram matrices.

---

## TECHNICAL ARCHITECTURE

*   **FRONTEND LAYER:** HTML5 Semantics / CSS3 Slate-Terminal Architecture.
*   **COMPUTATION ENGINE:** Vanilla JavaScript parsing structural text arrays (.txt/.json) on the fly.
*   **GRAPHICS PIPELINE:** Native HTML5 Canvas rendering for mathematical vector plotting.
*   **INFRASTRUCTURE:** Serverless architecture deployed via GitHub Pages.

---

## LEGAL & DEPLOYMENT LICENSE

This project is deployed under the terms of the MIT License. System source code is open for modification, distribution, and academic auditing.
