import { ProductGrid, type GridProduct } from '@/components/ProductGrid';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function mapRow(p: {
  id: string;
  barcode: string;
  name: string | null;
  netWeight: unknown;
  grossWeight: unknown;
  purity: string | null;
  metalType: string | null;
  itemCode: string | null;
  mcRate: unknown;
  imageUrl: string | null;
  secondaryImageUrl: string | null;
}): GridProduct {
  return {
    id: p.id,
    barcode: p.barcode,
    name: p.name,
    netWeight: p.netWeight != null ? Number(p.netWeight) : null,
    grossWeight: p.grossWeight != null ? Number(p.grossWeight) : null,
    purity: p.purity,
    metalType: p.metalType,
    itemCode: p.itemCode,
    mcRate: p.mcRate != null ? Number(p.mcRate) : null,
    imageUrl: p.imageUrl,
    secondaryImageUrl: p.secondaryImageUrl
  };
}

export default async function HomePage() {
  let rows: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  try {
    rows = await prisma.product.findMany({ orderBy: { updatedAt: 'desc' }, take: 120 });
  } catch {
    rows = [];
  }

  const products = rows.map(mapRow);
  const dualCount = products.filter((p) => p.secondaryImageUrl).length;

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b border-amber-200/60 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">KC Jewellers</h1>
            <p className="text-sm text-slate-600">
              Browse the synced catalogue — on your phone, tap a product photo to see a second angle when available.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-slate-700 shadow-sm ring-1 ring-amber-200/50">
              {products.length} pieces
            </span>
            {dualCount > 0 ? (
              <span className="rounded-full bg-cyan-100 px-3 py-1 font-medium text-cyan-900 shadow-sm">
                {dualCount} with 2 views
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600 sm:p-12">
            <p className="text-lg font-medium text-slate-800">No products yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm">
              Sync from the ERP using <span className="font-medium">Push to KC Jewellers</span> to load this storefront.
            </p>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </main>
  );
}
