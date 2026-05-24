-- CreateTable
CREATE TABLE IF NOT EXISTS "kc_products" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "style_code" TEXT,
    "sku" TEXT,
    "name" TEXT,
    "net_weight" DECIMAL(65,30),
    "gross_weight" DECIMAL(65,30),
    "purity" TEXT,
    "metal_type" TEXT,
    "item_code" TEXT,
    "mc_rate" DECIMAL(65,30),
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kc_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "kc_products_barcode_key" ON "kc_products"("barcode");
