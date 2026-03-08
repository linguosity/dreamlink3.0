/**
 * INTEGRATION SNIPPET FOR app/layout.tsx
 *
 * This file shows EXACTLY how to integrate the WaterBackground component
 * into your layout.tsx file. This is a REFERENCE SNIPPET, not a real component.
 *
 * STEP 1: Add the dynamic import at the top of app/layout.tsx
 * ============================================================
 *
 * Add this line with your other imports:
 *
 * ```typescript
 * import dynamic from 'next/dynamic';
 * ```
 *
 *
 * STEP 2: Create a dynamic reference to WaterBackground
 * =========================================================
 *
 * Add this after your other imports but before the RootLayout function:
 *
 * ```typescript
 * const DynamicWaterBackground = dynamic(
 *   () => import('@/components/WaterBackground').then(mod => mod.WaterBackground),
 *   {
 *     ssr: false, // Critical: Disable SSR to prevent Three.js/Canvas issues on server
 *     loading: () => null, // No loading placeholder needed
 *   }
 * );
 * ```
 *
 *
 * STEP 3: Replace the current Image background
 * ============================================
 *
 * REMOVE THIS:
 * ```typescript
 *   <div className="fixed inset-0 -z-10">
 *     <Image
 *       src="/images/background.jpg"
 *       alt=""
 *       fill
 *       className="object-cover object-center blur-[5px]"
 *       priority
 *     />
 *   </div>
 * ```
 *
 * REPLACE WITH THIS:
 * ```typescript
 *   <DynamicWaterBackground />
 * ```
 *
 * The updated code should look like:
 * ```typescript
 * return (
 *   <html lang="en" className={geistSans.className} suppressHydrationWarning>
 *     <body className="bg-background text-foreground">
 *       <DynamicWaterBackground />
 *       <Providers>
 *         {/* rest of your layout */}
 *       </Providers>
 *     </body>
 *   </html>
 * );
 * ```
 *
 *
 * IMPORTANT NOTES:
 * ================
 *
 * 1. ssr: false is CRITICAL
 *    - Three.js requires browser APIs (WebGL, canvas)
 *    - Server-side rendering will fail without this flag
 *    - The component handles its own SSR fallback internally
 *
 * 2. The WaterBackground handles:
 *    - WebGL availability detection
 *    - Automatic CSS gradient fallback
 *    - All performance optimizations (low-poly, demand rendering, etc.)
 *    - Blur effect matching the original blur-[5px]
 *
 * 3. No additional props needed
 *    - All colors are hard-coded for a deep blue/teal ocean aesthetic
 *    - Animation speed is baked in (very slow/calm)
 *    - Can be customized by editing WaterBackground.tsx
 *
 * 4. Remove the Image import if no longer used elsewhere:
 *    - If you're not using Image elsewhere, remove: import Image from 'next/image';
 *    - The WaterBackground component replaces the Image entirely
 *
 * 5. Testing:
 *    - In development: npm run dev
 *    - In production: npm run build && npm start
 *    - On devices without WebGL support, the CSS gradient fallback activates
 */

// This file is for documentation only. Do not import or use it.
