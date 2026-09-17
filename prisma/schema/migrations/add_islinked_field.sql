-- Add isLinked field to EditorExtension
ALTER TABLE "editor_extensions" ADD COLUMN "isLinked" BOOLEAN NOT NULL DEFAULT false;

-- Create index on isLinked
CREATE INDEX "editor_extensions_isLinked_idx" ON "editor_extensions"("isLinked");
