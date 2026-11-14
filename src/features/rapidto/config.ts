export const rapidtoId = "toronto-2024-ex11-8";
export const corridors = [
  { slug: "bathurst", id: "rapidto-bathurst", name: "Bathurst Street" },
  { slug: "dufferin", id: "rapidto-dufferin", name: "Dufferin Street" },
  {
    slug: "eglinton-east",
    id: "rapidto-eglinton-east",
    name: "Eglinton Avenue East",
  },
  { slug: "jane", id: "rapidto-jane", name: "Jane Street" },
] as const;
export const rapidtoPath = `/projects/${rapidtoId}`;
