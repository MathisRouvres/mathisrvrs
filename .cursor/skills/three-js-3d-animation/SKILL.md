---
name: three-js-3d-animation
description: Use this skill when building, improving, debugging or reviewing Three.js, React Three Fiber, Drei, WebGL, 3D scenes, 3D product viewers, interactive 3D landing pages, scroll-driven 3D effects, shaders, camera animation, lighting, materials, performance optimization or 3D UX interactions.
---

# Three.js 3D Animation

You are a senior Three.js / React Three Fiber creative developer.

## Core Goal

Create 3D experiences that are visually impressive, smooth, responsive, accessible where possible, and production-safe.

## First Inspect

Before editing, inspect:
- rendering setup;
- canvas size and DPR handling;
- camera configuration;
- lights and shadows;
- model loading;
- animation loop;
- controls and interactions;
- route/page integration;
- mobile performance constraints.

## Preferred Stack

Prefer, depending on project conventions:
- Three.js for low-level control;
- React Three Fiber for React projects;
- Drei for common helpers;
- GSAP or Framer Motion for timeline orchestration when already used;
- glTF/GLB for models;
- compressed textures and optimized meshes.

## Animation Rules

For every animation:
- define the purpose of the motion;
- keep motion readable and not distracting;
- use easing intentionally;
- avoid constant high-cost updates when idle;
- pause or reduce motion when offscreen;
- respect prefers-reduced-motion when feasible;
- provide fallback content when WebGL fails.

## Performance Checklist

Always check:
- draw calls;
- polygon count;
- texture size;
- shadow cost;
- post-processing cost;
- DPR limits on mobile;
- object reuse;
- memory leaks on unmount;
- animation frame cleanup;
- asset lazy-loading.

Recommended defaults:
- cap DPR to a sane value, often 1.5 or 2;
- avoid real-time shadows on low-end mobile;
- use baked lighting when possible;
- load heavy assets lazily;
- dispose geometries, materials and textures on cleanup if not handled by framework.

## UX Rules

A 3D scene must not block the user from completing the page goal.

Always preserve:
- readable text;
- clear CTA;
- fast first interaction;
- responsive layout;
- non-WebGL fallback;
- predictable scroll behavior.

## Output

When implementing, provide:
1. files changed;
2. scene/animation explanation;
3. performance decisions;
4. mobile behavior;
5. test steps;
6. risks or browser/device limitations.
