"use client";

import * as maplibregl from "maplibre-gl";

// Turbopack cannot bundle MapLibre's module worker; serve the worker and its
// shared chunk from /public instead (copied by the copy:worker script).
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

export default maplibregl;
