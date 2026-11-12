import type { ProductListItem } from "../../types/api";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: ProductListItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
