"use client";

import { lazy, Suspense } from "react";

// Lazy load the heavy Three.js component
const ThreeBackground = lazy(() => 
  import("./three-background").then(module => ({ default: module.ThreeBackground }))
);

export function LazyThreeBackground() {
  return (
    <Suspense fallback={<div className="fixed inset-0 -z-10 bg-background" />}>
      <ThreeBackground />
    </Suspense>
  );
}