"use client";

import { CategoryRecommendation, ShoppingRecommendations } from "../../types";
import { Crown, ExternalLink } from "lucide-react";

interface ProductGridProps {
  data: ShoppingRecommendations;
}

export default function ProductGrid({ data }: ProductGridProps) {
  if (!data.recommendations?.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-muted-fg">No products found. Try a different search.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {data.recommendations.map((category: CategoryRecommendation, idx: number) => (
        <div key={idx}>
          <h3 className="mb-3 text-lg font-semibold capitalize">{category.category}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Best match */}
            <ProductItem product={category.best_match} isBest />
            {/* Alternatives */}
            {category.alternatives.map((alt, altIdx) => (
              <ProductItem key={altIdx} product={alt} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductItem({
  product,
  isBest,
}: {
  product: { product_name: string; price: string; url: string; reason: string };
  isBest?: boolean;
}) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex flex-col rounded-xl border p-4 transition-all hover:shadow-md hover:shadow-indigo-500/5 ${
        isBest
          ? "border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/50"
          : "border-border bg-card hover:border-indigo-500/30"
      }`}
    >
      {isBest && (
        <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-300">
          <Crown className="h-3 w-3" />
          Best Match
        </span>
      )}
      <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
        {product.product_name}
      </h4>
      <p className="mt-1.5 text-lg font-bold text-emerald-400">{product.price}</p>
      <p className="mt-2 flex-1 text-xs text-muted-fg leading-relaxed">{product.reason}</p>
      <div className="mt-3 flex items-center gap-1 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
        View product <ExternalLink className="h-3 w-3" />
      </div>
    </a>
  );
}
