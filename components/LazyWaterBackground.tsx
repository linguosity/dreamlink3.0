'use client';

import dynamic from 'next/dynamic';

const DynamicWaterBackground = dynamic(
  () => import('@/components/WaterBackground').then(mod => mod.WaterBackground),
  {
    ssr: false,
    loading: () => null,
  }
);

export function LazyWaterBackground() {
  return <DynamicWaterBackground />;
}
