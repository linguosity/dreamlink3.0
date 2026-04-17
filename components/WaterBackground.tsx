'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

/**
 * WaterBackground Component
 *
 * A performant 3D water plane background using Three.js and React Three Fiber.
 * Features a calm ocean surface with gentle wave animation. Optimized for
 * low performance impact with minimal geometry and demand-based rendering.
 *
 * Performance optimizations:
 * - Low resolution plane geometry (4x4 segments)
 * - dpr={1} to cap pixel ratio
 * - frameloop="demand" with manual invalidation
 * - No shadows, reflections, or post-processing
 * - Fallback to CSS gradient for SSR and WebGL unavailability
 */

interface WaterPlaneProps {
  invalidate: () => void;
  scrollY: React.RefObject<number>;
}

// ── Bible verses for the floating books ──────────────────────────
const BIBLE_PAGES = [
  {
    left: {
      header: "Psalm 23",
      lines: [
        "The LORD is my shepherd;",
        "I shall not want.",
        "He maketh me to lie down",
        "in green pastures: he",
        "leadeth me beside the",
        "still waters.",
        "He restoreth my soul:",
        "he leadeth me in the",
        "paths of righteousness",
        "for his name's sake.",
      ],
    },
    right: {
      header: "Psalm 23 (cont.)",
      lines: [
        "Yea, though I walk",
        "through the valley of",
        "the shadow of death,",
        "I will fear no evil:",
        "for thou art with me;",
        "thy rod and thy staff",
        "they comfort me.",
        "Thou preparest a table",
        "before me in the",
        "presence of mine enemies.",
      ],
    },
  },
  {
    left: {
      header: "Isaiah 43",
      lines: [
        "But now thus saith the",
        "LORD that created thee,",
        "Fear not: for I have",
        "redeemed thee, I have",
        "called thee by thy name;",
        "thou art mine.",
        "When thou passest",
        "through the waters,",
        "I will be with thee;",
        "and through the rivers,",
      ],
    },
    right: {
      header: "Isaiah 43 (cont.)",
      lines: [
        "they shall not overflow",
        "thee: when thou walkest",
        "through the fire, thou",
        "shalt not be burned;",
        "neither shall the flame",
        "kindle upon thee.",
        "For I am the LORD",
        "thy God, the Holy One",
        "of Israel, thy Saviour.",
        "",
      ],
    },
  },
  {
    left: {
      header: "Daniel 2",
      lines: [
        "He revealeth the deep",
        "and secret things: he",
        "knoweth what is in the",
        "darkness, and the light",
        "dwelleth with him.",
        "I thank thee, and praise",
        "thee, O thou God of my",
        "fathers, who hast given",
        "me wisdom and might.",
        "",
      ],
    },
    right: {
      header: "Joel 2",
      lines: [
        "And it shall come to",
        "pass afterward, that I",
        "will pour out my spirit",
        "upon all flesh; and your",
        "sons and your daughters",
        "shall prophesy, your old",
        "men shall dream dreams,",
        "your young men shall",
        "see visions.",
        "",
      ],
    },
  },
  {
    left: {
      header: "Revelation 22",
      lines: [
        "And he shewed me a pure",
        "river of water of life,",
        "clear as crystal,",
        "proceeding out of the",
        "throne of God and of",
        "the Lamb.",
        "In the midst of the",
        "street of it, and on",
        "either side of the river,",
        "was there the tree of life.",
      ],
    },
    right: {
      header: "Genesis 28",
      lines: [
        "And Jacob dreamed, and",
        "behold a ladder set up",
        "on the earth, and the",
        "top of it reached to",
        "heaven: and behold the",
        "angels of God ascending",
        "and descending on it.",
        "And, behold, the LORD",
        "stood above it.",
        "",
      ],
    },
  },
];

// ── Canvas texture generator for open book ──────────────────────
function createBookTexture(
  page: (typeof BIBLE_PAGES)[number],
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;

  // Book background — aged parchment
  ctx.fillStyle = "#f5e6c8";
  ctx.fillRect(0, 0, 512, 320);

  // Subtle aging / vignette
  const grad = ctx.createRadialGradient(256, 160, 60, 256, 160, 280);
  grad.addColorStop(0, "rgba(245, 230, 200, 0)");
  grad.addColorStop(1, "rgba(180, 155, 120, 0.3)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 320);

  // Center spine shadow
  const spineGrad = ctx.createLinearGradient(240, 0, 272, 0);
  spineGrad.addColorStop(0, "rgba(160, 130, 90, 0.3)");
  spineGrad.addColorStop(0.5, "rgba(120, 95, 60, 0.5)");
  spineGrad.addColorStop(1, "rgba(160, 130, 90, 0.3)");
  ctx.fillStyle = spineGrad;
  ctx.fillRect(246, 8, 20, 304);

  // Spine line
  ctx.strokeStyle = "rgba(120, 95, 60, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(256, 10);
  ctx.lineTo(256, 310);
  ctx.stroke();

  // Page edges (subtle lines)
  ctx.strokeStyle = "rgba(180, 160, 130, 0.3)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    const offset = 2 + i * 2;
    // Left page edge
    ctx.strokeRect(12 - offset, 8 - offset, 234 + offset, 304 + offset * 2);
    // Right page edge
    ctx.strokeRect(266, 8 - offset, 234 + offset, 304 + offset * 2);
  }

  // Draw text on pages
  const drawPage = (
    text: { header: string; lines: string[] },
    xStart: number,
  ) => {
    // Header
    ctx.fillStyle = "rgba(80, 55, 30, 0.7)";
    ctx.font = "bold 13px Georgia, serif";
    ctx.fillText(text.header, xStart, 36);

    // Divider
    ctx.strokeStyle = "rgba(80, 55, 30, 0.25)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(xStart, 44);
    ctx.lineTo(xStart + 200, 44);
    ctx.stroke();

    // Body text
    ctx.fillStyle = "rgba(60, 40, 20, 0.55)";
    ctx.font = "11px Georgia, serif";
    text.lines.forEach((line, i) => {
      ctx.fillText(line, xStart, 64 + i * 24);
    });
  };

  drawPage(page.left, 24);
  drawPage(page.right, 278);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ── Floating book positions/config ──────────────────────────────
const BOOK_CONFIGS = [
  { x: -12, z: -8, rotY: 0.3, scale: 3.5, speed: 0.7 },
  { x: 8, z: -18, rotY: -0.2, scale: 3.0, speed: 0.9 },
  { x: -5, z: -30, rotY: 0.15, scale: 2.8, speed: 0.6 },
  { x: 15, z: -5, rotY: -0.4, scale: 3.2, speed: 0.8 },
];

// Base camera position — scroll moves forward from here
const BASE_CAM_Z = 18;
const BASE_CAM_Y = 8;

// How far the camera travels per pixel of scroll
// 0.008 = subtle drift; increase for more dramatic movement
const SCROLL_SPEED = 0.024;

// Max camera travel distance (prevents drifting too far into fog)
const MAX_TRAVEL = 12;

function WaterPlane({ invalidate, scrollY }: WaterPlaneProps) {
  const { gl, scene, camera } = useThree();
  const waterRef = useRef<Water | null>(null);
  const booksRef = useRef<THREE.Mesh[]>([]);
  // Smoothed scroll value for buttery lerp
  const smoothScroll = useRef(0);
  // Time tracker for book bobbing
  const timeRef = useRef(0);

  useEffect(() => {
    // Create the water geometry with minimal segments for performance
    const geometry = new THREE.PlaneGeometry(200, 200, 16, 16);

    // Water shader material with calm, visible settings
    const water = new Water(geometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        '/textures/waternormals.jpg',
        (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        }
      ),
      alphaMap: undefined,
      sunDirection: new THREE.Vector3(0.0, 1.0, 0.0).normalize(),
      sunColor: 0xd4dde3,
      waterColor: 0x8fa5ab,
      distortionScale: 1.2,
      fog: true,
      format: THREE.RGBAFormat,
    });

    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    scene.add(water);
    waterRef.current = water;

    // ── Floating Bible books ──────────────────────────────────
    const books: THREE.Mesh[] = [];
    BOOK_CONFIGS.forEach((cfg, i) => {
      const page = BIBLE_PAGES[i % BIBLE_PAGES.length];
      const texture = createBookTexture(page);

      // Plane for the open book (wider than tall, like an open book)
      const bookGeo = new THREE.PlaneGeometry(
        cfg.scale * 1.6,
        cfg.scale,
      );
      const bookMat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0.0,
      });

      const mesh = new THREE.Mesh(bookGeo, bookMat);
      // Lay flat on water, tilted very slightly toward camera
      mesh.rotation.x = -Math.PI / 2 + 0.08;
      mesh.rotation.z = cfg.rotY;
      mesh.position.set(cfg.x, 0.15, cfg.z);

      scene.add(mesh);
      books.push(mesh);
    });
    booksRef.current = books;

    // Add lighting so the water surface is visible
    const ambientLight = new THREE.AmbientLight(0xc5d5db, 1.2);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xe8eef0, 0.6);
    dirLight.position.set(0, 1, 0);
    scene.add(dirLight);

    // Heavy fog — water fades into pale mist like the original photo
    const fogColor = new THREE.Color(0xdfe8ec);
    scene.fog = new THREE.Fog(fogColor, 10, 55);
    scene.background = fogColor;

    // Gentle angle — water in lower half, fog/mist in upper half
    camera.position.set(0, BASE_CAM_Y, BASE_CAM_Z);
    camera.lookAt(0, 0, -20);

    return () => {
      scene.remove(water);
      scene.remove(ambientLight);
      scene.remove(dirLight);
      geometry.dispose();
      water.material.dispose();
      books.forEach((b) => {
        scene.remove(b);
        b.geometry.dispose();
        (b.material as THREE.MeshStandardMaterial).map?.dispose();
        (b.material as THREE.MeshStandardMaterial).dispose();
      });
    };
  }, [gl, scene, camera]);

  // Animate the water surface, floating books, and glide camera based on scroll
  useFrame(() => {
    if (waterRef.current) {
      waterRef.current.material.uniforms['time'].value += 0.0027;
      timeRef.current += 0.01;

      // Animate floating books — gentle bob and slow drift
      booksRef.current.forEach((mesh, i) => {
        const cfg = BOOK_CONFIGS[i];
        const t = timeRef.current * cfg.speed;

        // Vertical bob (gentle sine wave)
        mesh.position.y = 0.15 + Math.sin(t * 0.8 + i * 1.5) * 0.08;

        // Subtle rocking rotation
        mesh.rotation.z =
          cfg.rotY + Math.sin(t * 0.5 + i * 2.0) * 0.03;

        // Very slow lateral drift
        mesh.position.x =
          cfg.x + Math.sin(t * 0.15 + i * 3.0) * 0.4;
        mesh.position.z =
          cfg.z + Math.cos(t * 0.12 + i * 2.5) * 0.3;
      });

      // Smooth lerp toward the target scroll position (0.06 = gentle easing)
      const target = Math.min(scrollY.current * SCROLL_SPEED, MAX_TRAVEL);
      smoothScroll.current += (target - smoothScroll.current) * 0.06;

      // Move camera forward (negative Z) and dip slightly as you scroll
      camera.position.z = BASE_CAM_Z - smoothScroll.current;
      camera.position.y = BASE_CAM_Y - smoothScroll.current * 0.15;
      camera.lookAt(0, 0, camera.position.z - 38);

      invalidate();
    }
  });

  return null;
}

/**
 * Main WaterBackground component
 * Returns a fixed full-screen canvas with water effect
 * Includes fallback for SSR and WebGL unavailability
 */
export function WaterBackground() {
  const [isClient, setIsClient] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const invalidateRef = useRef<(() => void) | null>(null);
  const scrollYRef = useRef(0);

  useEffect(() => {
    setIsClient(true);

    // Track scroll position in a ref (no re-renders, read each frame)
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
      // Trigger a frame so the camera updates
      invalidateRef.current?.();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Trigger the fade-in reveal shortly after client mount so the
  // canvas has a moment to initialise before the animation begins
  useEffect(() => {
    if (isClient) {
      const timer = setTimeout(() => setIsRevealed(true), 120);
      return () => clearTimeout(timer);
    }
  }, [isClient]);

  // Check for WebGL support
  const isWebGLAvailable = () => {
    if (typeof window === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('webgl2');
      return !!gl;
    } catch {
      return false;
    }
  };

  // For SSR or WebGL unavailable, show CSS gradient fallback
  if (!isClient || !isWebGLAvailable()) {
    return (
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `linear-gradient(180deg,
            #dfe8ec 0%,
            #cdd8de 30%,
            #b5c4cb 60%,
            #9aacb3 100%)`,
          opacity: isRevealed ? 1 : 0,
          transition: 'opacity 1.8s ease-out',
        }}
      />
    );
  }

  return (
    <div
      ref={canvasWrapperRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        filter: 'blur(4px)',
        opacity: isRevealed ? 1 : 0,
        transition: 'opacity 1.8s ease-out',
      }}
    >
      <Canvas
        dpr={1}
        frameloop="demand"
        onCreated={(state) => {
          invalidateRef.current = state.invalidate;
        }}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <WaterPlane invalidate={() => invalidateRef.current?.()} scrollY={scrollYRef} />
      </Canvas>
    </div>
  );
}

export default WaterBackground;
