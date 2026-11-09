'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import ProductCard from '@/components/ui/ProductCard';
import {
  Star,
  Plus,
  Minus,
  ShoppingBag,
  Truck,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductDetailClientProps {
  product: Product;
  allProducts: Product[];
}

export default function ProductDetailClient({ product, allProducts }: ProductDetailClientProps) {
  const { addToCart } = useApp();

  // States
  const [activeImage, setActiveImage] = useState(product.images[0]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  // Accordion state
  const [openAccordions, setOpenAccordions] = useState({
    desc: true,
    shipping: false,
    care: false,
  });

  const toggleAccordion = (section: 'desc' | 'shipping' | 'care') => {
    setOpenAccordions((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Zoom on hover state for main image
  const [zoomStyle, setZoomStyle] = useState({ display: 'none', backgroundPosition: '0% 0%' });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundPosition: `${x}% ${y}%`,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none', backgroundPosition: '0% 0%' });
  };

  // Add to cart handler
  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    addToCart(product, quantity, selectedSize, selectedColor);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  // Related products (same category, excluding current product)
  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-12">
      {/* Product Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left Column: Image Gallery */}
        <div className="flex flex-col-reverse md:flex-row gap-4">
          {/* Thumbnails */}
          <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-x-visible md:w-20 shrink-0">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`relative aspect-square w-16 md:w-full bg-muted overflow-hidden border-2 transition-colors shrink-0 ${
                  activeImage === img ? 'border-brand-red' : 'border-transparent'
                }`}
              >
                <Image
                  width={1200}
                  height={1200}
                  src={img}
                  alt={`${product.name} thumbnail ${idx}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Main Zoomable Image */}
          <div
            className="relative flex-1 aspect-[4/5] bg-muted overflow-hidden border border-border cursor-zoom-in"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <Image
              width={1200}
              height={1200}
              src={activeImage}
              alt={product.name}
              className="h-full w-full object-cover object-center"
            />
            {/* Hover Magnifying Zoom Effect */}
            <div
              style={{
                ...zoomStyle,
                backgroundImage: `url(${activeImage})`,
                backgroundSize: '200%',
                backgroundRepeat: 'no-repeat',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
              }}
              className="hidden lg:block z-10 transition-opacity duration-200"
            />
          </div>
        </div>

        {/* Right Column: Configuration & Buy Panel */}
        <div className="flex flex-col">
          {/* Tag & Category */}
          <span className="text-xs font-black tracking-widest text-brand-red uppercase mb-2">
            {product.category} &bull; {product.subcategory}
          </span>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground mb-3">
            {product.name}
          </h1>

          {/* Ratings */}
          <div className="flex items-center gap-1.5 mb-6">
            <div className="flex text-yellow-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(product.rating)
                      ? 'fill-current'
                      : 'text-zinc-300 dark:text-zinc-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-foreground">{product.rating} / 5</span>
            <span className="text-xs text-muted-foreground font-semibold">
              ({product.reviewsCount} đánh giá)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-8 border-b border-border pb-6">
            <span className="text-2xl font-black text-foreground">
              {product.price.toLocaleString('vi-VN')}đ
            </span>
            {product.originalPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {product.originalPrice.toLocaleString('vi-VN')}đ
                </span>
                <span className="bg-brand-red px-2 py-0.5 text-[10px] font-black text-white uppercase tracking-wider">
                  TIẾT KIỆM {(product.originalPrice - product.price).toLocaleString('vi-VN')}đ
                </span>
              </>
            )}
          </div>

          {/* 1. Color Select Swatch */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-3">
              Màu sắc:{' '}
              <span className="text-muted-foreground font-semibold normal-case">
                {selectedColor.name}
              </span>
            </h3>
            <div className="flex gap-2">
              {product.colors.map((color) => {
                const isSelected = selectedColor.hex === color.hex;
                return (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color)}
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-brand-red scale-110 shadow-sm'
                        : 'border-border hover:border-foreground'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {/* Tick icon or blank */}
                    {isSelected && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          color.hex.toLowerCase() === '#ffffff' ? 'bg-black' : 'bg-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Size Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                Chọn kích thước (Size)
              </h3>
              <a
                href="/policies#sizes"
                className="text-xs font-bold text-brand-red hover:underline uppercase tracking-wide"
              >
                Bảng quy đổi size
              </a>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {product.sizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedSize(size);
                      setSizeError(false);
                    }}
                    className={`h-12 border text-sm font-extrabold tracking-wide transition-all ${
                      isSelected
                        ? 'border-brand-red bg-brand-red text-white'
                        : 'border-border bg-background text-foreground hover:border-foreground'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
            {sizeError && (
              <p className="text-xs text-brand-red font-bold mt-2">
                * Vui lòng chọn size sản phẩm trước khi thêm vào giỏ hàng.
              </p>
            )}
          </div>

          {/* 3. Quantity & Add Button */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {/* Quantity Selector */}
            <div className="flex items-center justify-between border border-border h-14 px-4 bg-background sm:w-32">
              <button
                aria-label="Giảm số lượng"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-base font-extrabold w-8 text-center">{quantity}</span>
              <button
                aria-label="Tăng số lượng"
                disabled={quantity >= Math.min(99, product.stockQuantity)}
                onClick={() => setQuantity((q) => Math.min(99, product.stockQuantity, q + 1))}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* ATC Button */}
            <button
              onClick={handleAddToCart}
              className="flex-1 h-14 bg-foreground hover:bg-brand-red text-background hover:text-white font-extrabold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-5 w-5" /> Thêm vào giỏ hàng
            </button>
          </div>

          {/* Success Notification Banner */}
          <AnimatePresence>
            {addedToCart && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-zinc-900 text-white p-4 rounded border border-brand-red mb-8 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-brand-red animate-ping" />
                  <p className="text-sm font-semibold">
                    Đã thêm thành công {quantity} sản phẩm vào giỏ hàng!
                  </p>
                </div>
                <Link
                  href="/cart"
                  className="text-xs font-black uppercase tracking-widest text-brand-red hover:underline"
                >
                  Xem giỏ hàng
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-4 border-y border-border py-4 mb-8 text-center text-xs font-bold text-muted-foreground bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="flex flex-col items-center gap-1.5">
              <Truck className="h-4.5 w-4.5 text-brand-red" />
              <span>Giao Hỏa Tốc 2H</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <RotateCcw className="h-4.5 w-4.5 text-brand-red" />
              <span>30 Ngày Đổi Trả</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-brand-red" />
              <span>100% Chính Hãng</span>
            </div>
          </div>

          {/* Accordion list */}
          <div className="space-y-4">
            {/* Description Accordion */}
            <div className="border-b border-border pb-4">
              <button
                onClick={() => toggleAccordion('desc')}
                className="flex w-full items-center justify-between py-2 text-sm font-bold uppercase tracking-wider text-foreground text-left"
              >
                <span>Mô tả sản phẩm</span>
                {openAccordions.desc ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <AnimatePresence>
                {openAccordions.desc && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="text-sm text-muted-foreground leading-relaxed pt-2">
                      {product.descriptionHtml ? (
                        <div
                          className="prose-editor"
                          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                        />
                      ) : (
                        product.description
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Shipping Accordion */}
            <div className="border-b border-border pb-4">
              <button
                onClick={() => toggleAccordion('shipping')}
                className="flex w-full items-center justify-between py-2 text-sm font-bold uppercase tracking-wider text-foreground text-left"
              >
                <span>Thông tin giao hàng & Đổi trả</span>
                {openAccordions.shipping ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <AnimatePresence>
                {openAccordions.shipping && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="text-sm text-muted-foreground space-y-2 pt-2">
                      <p>• Miễn phí vận chuyển toàn quốc cho đơn hàng từ 1.000.000đ.</p>
                      <p>
                        • Thời gian nhận hàng: TP.HCM / Hà Nội trong 1-2 ngày, tỉnh thành khác 2-4
                        ngày.
                      </p>
                      <p>
                        • Hỗ trợ đổi size hoặc đổi mẫu trong vòng 30 ngày kể từ ngày nhận hàng với
                        điều kiện sản phẩm còn nguyên tem mác.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Grid */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 border-t border-border pt-16">
          <div className="flex flex-col mb-10">
            <span className="text-xs font-black tracking-widest text-brand-red uppercase">
              RECOMMENDATIONS
            </span>
            <h2 className="text-2xl font-extrabold uppercase tracking-tight text-foreground mt-1">
              CÓ THỂ BẠN CŨNG THÍCH
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
