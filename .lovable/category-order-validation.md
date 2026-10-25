# Independent category product ordering

## Implementation
- Existing /admin/produtos reorganize mode now has an independent edit scope: Vitrine geral or a specific category.
- Both scopes retain temporary automatic sorting, drag-and-drop, keyboard movement, arrows, save/cancel, discard confirmation and error retry.
- Category edits load only that category's saved sequence. Scope changes with unsaved changes require confirmation. Saving disables editing controls.
- General immediate arrows now use the existing transactional general RPC rather than separate per-product requests.

## Database
- Migration: drizzle/migrations/0001_independent_category_product_order.sql.
- Existing products.sort_order and reorder_products remain the general-order source.
- New products.category_sort_order stores independent 1-based category positions, initialized from each category's general relative order.
- reorder_category_products validates admin/company membership, complete category membership, duplicates and foreign IDs, then saves only category positions in one transaction.
- A deferred unique constraint prevents duplicate positions within a company/category; a positive-position constraint prevents invalid positions.
- Triggers append created/moved products to the destination category and compact the source on moves/deletes. They never change general order.
- Trigger functions are not directly executable by public, anonymous or authenticated API callers. Category RPC is authenticated only and uses caller RLS.

## Public catalog
getCatalog includes category_sort_order in the existing complete product read. scopedProductSequence retains general order without a category filter and uses category positions when a category is selected. Promotion/availability filters apply afterward. No pagination currently exists.

## Files changed
- src/lib/admin-data.ts
- src/lib/catalog.functions.ts
- src/lib/product-sort.ts
- src/lib/product-sort.test.ts
- src/routes/_authenticated/admin.produtos.index.tsx
- src/routes/$slug.index.tsx
- drizzle/migrations/0001_independent_category_product_order.sql
- Automatically refreshed src/integrations/supabase/types.ts and migration metadata.
- AGENTS.md and roadmap.md.
- Content route head metadata completed in src/routes/index.tsx, admin.login.tsx, master.login.tsx, $slug.carrinho.tsx and authenticated admin/master content routes.

## Verification
- Vitest: 15/15 passing (existing automatic sorts plus category/general independence, concrete example order, fallback and additional filters).
- Authenticated browser: real category save and reload, public category rendering, general save/reload, category independence, arrows, cancellation, dirty scope change confirmation, simulated save failure preserving draft and successful retry.
- Live database through authenticated client: create/edit/move/delete, destination append/source compaction, positive unique contiguous category positions, duplicate/incomplete/foreign sequence rejection with transaction rollback, isolation of general and other category positions.
- Temporary test products/categories were deleted and existing general/category orders restored.
- Responsive public category view inspected at 390×844; no page errors during the end-to-end flow.
- Preview build log: build OK.

## Limitations
- Like the existing general-order contract, two editors saving the same membership use last successful save wins; membership changes are rejected as stale. No new revision-based concurrent-editor conflict contract was introduced.
- Bulk moves append destination positions; row-level iteration order of a multi-product move is not specified by the existing bulk-move operation.