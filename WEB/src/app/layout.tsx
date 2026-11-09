import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'NIKE | Premium Sports & Activewear Store',
  description:
    'Trang mua sắm đồ thể thao, giày chạy bộ, giày tập luyện cao cấp và thời trang streetwear phong cách tối giản, hiện đại.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppProvider>
          <Navbar />
          <main className="flex-1 flex flex-col w-full">{children}</main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
