'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ShoppingBag, User, Search, Menu, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { cart, user, logoutUser } = useApp();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  const navLinks = [
    { name: 'Trang Chủ', href: '/' },
    { name: 'Sản Phẩm', href: '/products' },
    { name: 'Giày Sneaker', href: '/products?category=Sneaker' },
    { name: 'Giày Thể Thao', href: '/products?category=SportShoes' },
    { name: 'Quần Áo', href: '/products?category=Clothing' },
    ...(user
      ? user.role === 'admin'
        ? [{ name: 'Quản Trị', href: '/admin' }]
        : [{ name: 'Đơn Hàng', href: '/orders' }]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="group flex items-center gap-1.5">
              <span className="text-2xl font-black tracking-tighter text-foreground group-hover:text-brand-red transition-colors">
                NIKE<span className="text-brand-red font-extrabold font-mono">.</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold tracking-wider uppercase">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`btn-underline py-2 transition-colors hover:text-brand-red ${
                    isActive ? 'text-brand-red' : 'text-foreground'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action Icons */}
          <div className="flex items-center space-x-4">
            {/* Search Bar - Slide in out */}
            <div className="relative flex items-center">
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.form
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 200, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchQuery.trim()) {
                        window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
                      }
                    }}
                    className="absolute right-8 h-8 overflow-hidden"
                  >
                    <input
                      type="text"
                      placeholder="Tìm kiếm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-full w-full rounded-full border border-border bg-muted px-4 py-1 text-xs focus:border-brand-red focus:outline-none"
                      autoFocus
                    />
                  </motion.form>
                )}
              </AnimatePresence>
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 text-foreground hover:text-brand-red transition-colors"
                aria-label="Toggle Search"
              >
                {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </button>
            </div>

            {/* User Auth Info */}
            <div className="relative group">
              {user ? (
                <div className="flex items-center space-x-1 cursor-pointer">
                  <Link
                    href={user.role === 'admin' ? '/admin' : '/orders'}
                    className="hidden lg:inline text-xs font-bold text-foreground hover:text-brand-red transition-colors mr-1"
                  >
                    {user.name.split(' ')[0]}
                  </Link>
                  <button
                    onClick={logoutUser}
                    className="p-2 text-foreground hover:text-brand-red transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="p-2 text-foreground hover:text-brand-red transition-colors"
                  aria-label="User Account"
                >
                  <User className="h-5 w-5" />
                </Link>
              )}
            </div>

            {/* Shopping Cart Bag */}
            <Link
              href="/cart"
              className="relative p-2 text-foreground hover:text-brand-red transition-colors"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              <AnimatePresence>
                {cartItemsCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-red text-[9px] font-bold text-white"
                  >
                    {cartItemsCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 md:hidden text-foreground hover:text-brand-red transition-colors"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 border-b border-border bg-background/95 backdrop-blur-lg shadow-lg md:hidden"
          >
            <div className="space-y-1 px-4 py-6">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-base font-bold tracking-wider uppercase transition-colors hover:bg-muted hover:text-brand-red ${
                      isActive ? 'bg-muted text-brand-red' : 'text-foreground'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              {user && (
                <button
                  onClick={() => {
                    logoutUser();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-start gap-2 rounded-lg px-3 py-2.5 text-base font-bold tracking-wider uppercase text-brand-red hover:bg-muted transition-colors"
                >
                  <LogOut className="h-5 w-5" /> Đăng xuất ({user.name})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
