import { describe, expect, it } from "vitest";

import { buildSequence } from "./product-sort";

const cats = [
  { id: "b", name: "Bebidas", sort_order: 2 },
  { id: "a", name: "Acessórios", sort_order: 1 },
];
const items = [
  { id: "1", title: "Égua", price: 30, category_id: "a" },
  { id: "2", title: "abacate", price: null, category_id: "b" },
  { id: "3", title: "Zebra", price: 10, category_id: null },
  { id: "4", title: "Banana", price: 20, category_id: "a" },
  { id: "5", title: "Caju", price: 15, category_id: "b" },
];
const ids = (list: { id: string }[]) => list.map((i) => i.id);

describe("buildSequence", () => {
  it("preço crescente deixa sem preço no final", () => {
    expect(ids(buildSequence(items, "price_asc", "manual", cats))).toEqual(["3", "5", "4", "1", "2"]);
  });
  it("preço decrescente deixa sem preço no final", () => {
    expect(ids(buildSequence(items, "price_desc", "manual", cats))).toEqual(["1", "4", "5", "3", "2"]);
  });
  it("nome A–Z respeita acentos do português", () => {
    expect(ids(buildSequence(items, "name_asc", "manual", cats))).toEqual(["2", "4", "5", "1", "3"]);
  });
  it("nome Z–A", () => {
    expect(ids(buildSequence(items, "name_desc", "manual", cats))).toEqual(["3", "1", "5", "4", "2"]);
  });
  it("categoria + preço crescente agrupa e põe Sem categoria ao final", () => {
    expect(ids(buildSequence(items, "category", "price_asc", cats))).toEqual(["4", "1", "5", "2", "3"]);
  });
  it("categoria + manual preserva a ordem atual no grupo", () => {
    expect(ids(buildSequence(items, "category", "manual", cats))).toEqual(["1", "4", "2", "5", "3"]);
  });
  it("manual não altera a sequência", () => {
    expect(ids(buildSequence(items, "manual", "manual", cats))).toEqual(["1", "2", "3", "4", "5"]);
  });
});
