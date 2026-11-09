'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { ShoppingCart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useApp();
  const [hovered, setHovered] = useState(false);
  const [addedMessage, setAddedMessage] = useState(false);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleQuickAdd = (size: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Add to cart with the first available color
    const defaultColor = product.colors[0] || { name: 'Default', hex: '#000000' };
    addToCart(product, 1, size, defaultColor);

    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="product-card group relative flex flex-col overflow-hidden bg-card border border-border"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      {/* Product Image Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {/* Discount Badge */}
        {discount > 0 && (
          <span className="absolute top-3 left-3 z-10 bg-brand-red px-2 py-1 text-[10px] font-black tracking-widest text-white uppercase">
            -{discount}%
          </span>
        )}

        {/* Product Images (Swap on hover) */}
        <Link href={`/products/${product.id}`} className="block h-full w-full">
          <Image
            width={1200}
            height={1200}
            src={hovered && product.images[1] ? product.images[1] : product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Quick Add Sizes Overlay (Slides up on card hover) */}
        <div className="absolute inset-x-0 bottom-0 z-10 translate-y-full bg-background/95 p-4 transition-transform duration-300 ease-out group-hover:translate-y-0 border-t border-border">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-2 text-center">
            Thêm nhanh Size
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={(e) => handleQuickAdd(size, e)}
                className="h-8 min-w-8 rounded border border-border bg-background text-xs font-semibold hover:border-brand-red hover:bg-brand-red hover:text-white transition-colors"
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Add to Cart Message Overlay */}
        <AnimatePresence>
          {addedMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 px-4 text-center text-white"
            >
              <ShoppingCart className="h-8 w-8 text-brand-red mb-2 animate-bounce" />
              <p className="text-sm font-bold uppercase tracking-wider">Đã thêm vào giỏ!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category & Subcategory */}
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-red mb-1">
          {product.category} &bull; {product.subcategory}
        </span>

        {/* Name */}
        <h3 className="text-sm font-bold tracking-tight text-foreground line-clamp-1 hover:text-brand-red transition-colors mb-2">
          <Link href={`/products/${product.id}`}>{product.name}</Link>
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex text-yellow-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < Math.floor(product.rating)
                    ? 'fill-current'
                    : 'text-zinc-300 dark:text-zinc-600'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">
            ({product.reviewsCount})
          </span>
        </div>

        {/* Pricing */}
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-sm font-extrabold text-foreground">
            {product.price.toLocaleString('vi-VN')}đ
          </span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {product.originalPrice.toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
