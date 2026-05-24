'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';

export type GridProduct = {
  id: string;
  barcode: string;
  name: string | null;
  netWeight: number | null;
  grossWeight: number | null;
  purity: string | null;
  metalType: string | null;
  itemCode: string | null;
  mcRate: number | null;
  imageUrl: string | null;
  secondaryImageUrl: string | null;
};

function ProductCard({ product }: { product: GridProduct }) {
  const primary = product.imageUrl || '/placeholder-jewellery.svg';
  const secondary = product.secondaryImageUrl || null;
  const slides = secondary ? [primary, secondary] : [primary];
  const [index, setIndex] = useState(0);
  const src = slides[Math.min(index, slides.length - 1)];

  const advance = useCallback(() => {
    if (slides.length < 2) return;
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const w = product.netWeight;

  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
      <button
        type="button"
        onClick={advance}
        className="relative aspect-square w-full touch-manipulation overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-label={slides.length > 1 ? 'Show next product image' : 'Product image'}
      >
        <Image
          src={src}
          alt={product.name || product.barcode}
          fill
          className="object-contain p-2 transition duration-300 group-active:scale-[0.98]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized={src.startsWith('/uploads/')}
          priority={false}
        />
        {slides.length > 1 ? (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {index + 1}/{slides.length} · tap
          </span>
        ) : null}
        {slides.length > 1 ? (
          <span className="pointer-events-none absolute bottom-2 left-2 flex gap-1" aria-hidden>
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </span>
        ) : null}
      </button>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-900 sm:min-h-0 sm:text-base">
          {product.name || 'Untitled'}
        </p>
        <p className="font-mono text-[10px] text-slate-500 sm:text-xs">{product.barcode}</p>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] sm:text-xs">
          {product.metalType ? (
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 capitalize text-amber-900">{product.metalType}</span>
          ) : null}
          {product.purity ? (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700">{product.purity}</span>
          ) : null}
          {w != null && !Number.isNaN(w) ? (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700">{w}g</span>
          ) : null}
        </div>
        {product.mcRate != null && !Number.isNaN(product.mcRate) ? (
          <p className="mt-auto pt-2 text-sm font-bold text-emerald-700">MC ₹{product.mcRate.toFixed(0)}</p>
        ) : null}
      </div>
    </li>
  );
}

export function ProductGrid({ products }: { products: GridProduct[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}
