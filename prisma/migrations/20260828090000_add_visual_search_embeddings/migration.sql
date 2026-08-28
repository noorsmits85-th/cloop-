-- Enable pgvector for CLOOP Lens visual search.
CREATE EXTENSION IF NOT EXISTS vector;

-- Dedicated table for image embeddings. No existing product/listing data is changed.
CREATE TABLE IF NOT EXISTS product_image_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  image_id TEXT,
  embedding_model TEXT NOT NULL,
  embedding_version TEXT NOT NULL,
  dimension INTEGER NOT NULL,
  embedding vector(1408) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_image_embeddings_product_fk
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT product_image_embeddings_image_fk
    FOREIGN KEY (image_id) REFERENCES "ProductImage"(id) ON DELETE CASCADE,
  CONSTRAINT product_image_embeddings_dimension_check
    CHECK (dimension = 1408)
);

CREATE UNIQUE INDEX IF NOT EXISTS product_image_embeddings_unique_image_model_version
  ON product_image_embeddings (
    product_id,
    COALESCE(image_id, ''),
    embedding_model,
    embedding_version
  );

CREATE INDEX IF NOT EXISTS product_image_embeddings_product_idx
  ON product_image_embeddings (product_id);

CREATE INDEX IF NOT EXISTS product_image_embeddings_model_version_idx
  ON product_image_embeddings (embedding_model, embedding_version, dimension);

CREATE INDEX IF NOT EXISTS product_image_embeddings_hnsw_cosine_idx
  ON product_image_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
