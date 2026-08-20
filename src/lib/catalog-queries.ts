import { queryOptions } from "@tanstack/react-query";

import { getCatalog } from "./catalog.functions";

export function catalogQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["catalog", slug],
    queryFn: () => getCatalog({ data: { slug } }),
    staleTime: 60_000,
  });
}
