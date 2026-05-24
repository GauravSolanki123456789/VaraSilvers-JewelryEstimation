import { prisma } from '@/lib/prisma';
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

type SyncProductRow = {
  barcode: string;
  styleCode?: string | null;
  sku?: string | null;
  name?: string | null;
  netWeight?: number | null;
  grossWeight?: number | null;
  purity?: string | number | null;
  metalType?: string | null;
  itemCode?: string | null;
  mcRate?: number | null;
  fixedPrice?: number | null;
  hasSecondaryImage?: boolean;
  secondaryImageUrl?: string | null;
};

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  const expected = process.env.KC_SYNC_API_KEY || process.env.KC_API_KEY;
  if (!expected || apiKey !== expected) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid multipart body' }, { status: 400 });
  }

  const payloadRaw = formData.get('payload');
  if (typeof payloadRaw !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing payload' }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadRaw);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!Array.isArray(parsed)) {
    return NextResponse.json({ success: false, error: 'Payload must be an array' }, { status: 400 });
  }

  const items = parsed as SyncProductRow[];

  const primaryFiles = formData.getAll('images');
  const secondaryFiles = formData.getAll('secondaryImages');
  const primaryMap = new Map<string, Buffer>();

  for (const file of primaryFiles) {
    if (!file || typeof (file as Blob).arrayBuffer !== 'function') continue;
    const f = file as File;
    const barcode = (f.name || '').replace(/\.webp$/i, '');
    if (!barcode) continue;
    primaryMap.set(barcode, Buffer.from(await f.arrayBuffer()));
  }

  const secondaryMap = new Map<string, Buffer>();
  for (const file of secondaryFiles) {
    if (!file || typeof (file as Blob).arrayBuffer !== 'function') continue;
    const f = file as File;
    const m = (f.name || '').match(/^(.+)_secondary\.webp$/i);
    if (!m?.[1]) continue;
    secondaryMap.set(m[1], Buffer.from(await f.arrayBuffer()));
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
  fs.mkdirSync(uploadDir, { recursive: true });

  let upserted = 0;

  for (const e of items) {
    if (!e?.barcode) continue;

    const primaryBuf = primaryMap.get(e.barcode);
    if (!primaryBuf) continue;

    const imageUrl = `/uploads/products/${e.barcode}.webp`;
    fs.writeFileSync(path.join(process.cwd(), 'public', imageUrl.replace(/^\//, '')), primaryBuf);

    const existing = await prisma.product.findUnique({
      where: { barcode: e.barcode },
      select: { secondaryImageUrl: true }
    });

    let secondaryImageUrl: string | null = existing?.secondaryImageUrl ?? null;

    if (e.hasSecondaryImage && secondaryMap.has(e.barcode)) {
      const buf = secondaryMap.get(e.barcode)!;
      const secPathRel = `/uploads/products/${e.barcode}_secondary.webp`;
      fs.writeFileSync(path.join(process.cwd(), 'public', secPathRel.replace(/^\//, '')), buf);
      secondaryImageUrl = secPathRel;
    } else if (typeof e.secondaryImageUrl === 'string' && e.secondaryImageUrl.trim() && !secondaryMap.has(e.barcode)) {
      const u = e.secondaryImageUrl.trim();
      if (/^https?:\/\//i.test(u) || u.startsWith('/')) {
        secondaryImageUrl = u;
      }
    }

    await prisma.product.upsert({
      where: { barcode: e.barcode },
      create: {
        barcode: e.barcode,
        styleCode: e.styleCode || null,
        sku: e.sku || null,
        name: e.name || null,
        netWeight: e.netWeight ?? null,
        grossWeight: e.grossWeight ?? null,
        purity: e.purity != null ? String(e.purity) : null,
        metalType: e.metalType || null,
        itemCode: e.itemCode || null,
        mcRate: e.mcRate ?? null,
        fixedPrice: e.fixedPrice ?? null,
        imageUrl,
        secondaryImageUrl
      },
      update: {
        styleCode: e.styleCode || null,
        sku: e.sku || null,
        name: e.name || null,
        netWeight: e.netWeight ?? null,
        grossWeight: e.grossWeight ?? null,
        purity: e.purity != null ? String(e.purity) : null,
        metalType: e.metalType || null,
        itemCode: e.itemCode || null,
        mcRate: e.mcRate ?? null,
        fixedPrice: e.fixedPrice ?? null,
        imageUrl,
        secondaryImageUrl
      }
    });

    upserted++;
  }

  return NextResponse.json({ success: true, upserted });
}
