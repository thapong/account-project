-- pgvector is enabled for future product/search embeddings. This release does not
-- expose vector values to the sales UI and keeps business data relational.
CREATE EXTENSION IF NOT EXISTS vector;
