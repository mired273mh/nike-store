'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/db';
import ProductCard from '@/components/ui/ProductCard';
import { ArrowRight, Flame, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface HomeClientProps {
  products: Product[];
}

export default function HomeClient({ products }: HomeClientProps) {
  const trendingProducts = products.filter((p) => p.trending && p.inStock).slice(0, 4);
  const campaignProduct = products.find((p) => p.featured && p.inStock) || products[0];

  const categories = [
    {
      name: 'Giày Sneaker',
      subtitle: 'Thời trang đường phố',
      href: '/products?category=Sneaker',
      image: '/images/shoe-sneaker.jpg',
    },
    {
      name: 'Giày Thể Thao',
      subtitle: 'Bứt phá hiệu suất',
      href: '/products?category=SportShoes',
      image: '/images/shoe-running.jpg',
    },
    {
      name: 'Quần Áo',
      subtitle: 'Năng động thể thao',
      href: '/products?category=Clothing',
      image: '/images/hoodie.jpg',
    },
  ];

  const brandSlogans = [
    'NIKE',
    'JUST DO IT',
    'MOVE WITH PURPOSE',
    'FAST & LIGHT',
    'LIMITLESS ENERGY',
    'Varsity Red Edition',
    'PERFORMANCE PRO',
    'MOVE WITH SOUL',
  ];

  return (
    <div className="flex flex-col w-full pb-16">
      {/* 1. Hero Banner */}
      <section className="relative h-[90vh] min-h-[600px] w-full overflow-hidden bg-black flex items-center">
        <div className="absolute inset-0 z-0">
          <Image
            width={1200}
            height={1200}
            src="/images/hero-running.jpg"
            alt="Hero Banner Sports"
            className="h-full w-full object-cover object-center opacity-60 brightness-[0.4]"
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 text-white">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-block bg-brand-red px-3 py-1 text-xs font-black tracking-widest uppercase mb-6"
            >
              Bộ sưu tập hè 2026
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-[0.9] mb-6"
            >
              BỨT PHÁ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-white">
                GIỚI HẠN
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-base sm:text-lg text-zinc-300 mb-8 font-medium leading-relaxed"
            >
              Trải nghiệm các dòng giày thể thao và quần áo chuyên dụng cao cấp được thiết kế tối
              giản, hỗ trợ hiệu suất tối đa cho vận động viên chuyên nghiệp.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-red-hover text-white px-8 py-4 text-sm font-extrabold uppercase tracking-wider transition-colors duration-300"
              >
                Mua ngay <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/products?category=SportShoes"
                className="inline-flex items-center gap-2 border-2 border-white hover:bg-white hover:text-black text-white px-8 py-4 text-sm font-extrabold uppercase tracking-wider transition-all duration-300"
              >
                Khám phá
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Infinite Marquee Slogan */}
      <section className="bg-zinc-950 py-4 overflow-hidden border-y border-zinc-800">
        <div className="animate-marquee flex gap-16 text-zinc-600 font-black text-xl sm:text-2xl uppercase tracking-widest">
          {/* Double array for infinite effect */}
          {[...brandSlogans, ...brandSlogans].map((slogan, index) => (
            <div key={index} className="flex items-center gap-4">
              <span>{slogan}</span>
              <span className="h-2 w-2 rounded-full bg-brand-red"></span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Category Showcase Grid */}
      <section className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center text-center mb-12">
          <span className="text-xs font-black tracking-widest text-brand-red uppercase mb-2">
            DANH MỤC NỔI BẬT
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground uppercase">
            CHỌN PHONG CÁCH TẬP LUYỆN
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative h-96 group overflow-hidden bg-black border border-border"
            >
              <Image
                width={1200}
                height={1200}
                src={cat.image}
                alt={cat.name}
                className="absolute inset-0 h-full w-full object-cover object-center opacity-70 transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8">
                <span className="text-xs text-brand-red font-bold uppercase tracking-wider mb-1">
                  {cat.subtitle}
                </span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">
                  {cat.name}
                </h3>
                <Link
                  href={cat.href}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider group/btn"
                >
                  Xem ngay
                  <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. Featured Products (Trending Now) */}
      <section className="bg-zinc-50 dark:bg-zinc-900/30 py-16 border-y border-border">
        <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-xs font-black tracking-widest text-brand-red uppercase">
                TRENDING
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground uppercase mt-1">
                SẢN PHẨM BÁN CHẠY
              </h2>
            </div>
            <Link
              href="/products"
              className="text-xs font-extrabold uppercase tracking-widest text-foreground hover:text-brand-red transition-colors flex items-center gap-1.5"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Campaign Promo Section */}
      {campaignProduct && (
        <section className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-16">
          <div className="relative overflow-hidden bg-black text-white lg:grid lg:grid-cols-2 lg:gap-8 items-center border border-border">
            <div className="px-6 py-12 sm:px-12 lg:py-16 lg:pr-0">
              <span className="text-xs font-black tracking-widest text-brand-red uppercase mb-4 inline-block">
                Chiến dịch đặc biệt
              </span>
              <h2 className="text-4xl font-black tracking-tighter uppercase leading-[0.9] mb-6">
                {campaignProduct.name}
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed mb-8 max-w-md">
                {campaignProduct.description}
              </p>
              <Link
                href={`/products/${campaignProduct.id}`}
                className="inline-flex items-center gap-2 bg-white hover:bg-brand-red hover:text-white text-black px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider transition-all duration-300"
              >
                Xem chi tiết sản phẩm
              </Link>
            </div>
            <div className="relative aspect-[16/9] lg:aspect-auto lg:h-full min-h-[300px]">
              <Image
                width={1200}
                height={1200}
                src={campaignProduct.images[0]}
                alt={campaignProduct.name}
                className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
              />
            </div>
          </div>
        </section>
      )}

      {/* 6. Brand Core Value Badges */}
      <section className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 border-t border-border pt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex flex-col items-center text-center p-4">
          <div className="h-12 w-12 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red mb-4">
            <Zap className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2">Hiệu suất Đỉnh cao</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            Ứng dụng chất liệu kỹ thuật cao, siêu nhẹ và bền bỉ giúp nâng tầm thành tích thể thao
            của bạn.
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-4">
          <div className="h-12 w-12 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red mb-4">
            <Flame className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2">Thiết kế Tối giản</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            Phong cách hiện đại, tinh gọn giúp bạn dễ dàng kết hợp phục trang trong phòng tập lẫn
            phong cách hàng ngày.
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-4">
          <div className="h-12 w-12 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2">Đổi trả Linh hoạt</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            Miễn phí vận chuyển và đổi trả dễ dàng trong vòng 30 ngày nếu không vừa size hoặc không
            ưng ý.
          </p>
        </div>
      </section>
    </div>
  );
}
