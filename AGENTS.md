<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Product order is saved as a whole sequence via the reorder_products database function (one transaction, rejects stale lists); auto-sorting lives in src/lib/product-sort.ts and only prepares a temporary sequence.
- Category order uses products.category_sort_order and reorder_category_products independently of sort_order; database triggers append on category assignment and compact on removal, while scopedProductSequence selects the saved sequence for admin and public category views.
