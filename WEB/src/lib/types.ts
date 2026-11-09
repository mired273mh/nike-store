export interface Product {
  id: string;
  name: string;
  description: string;
  descriptionHtml?: string;
  price: number;
  originalPrice?: number | null;
  category: 'Sneaker' | 'SportShoes' | 'Clothing';
  subcategory: string;
  images: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  rating: number;
  reviewsCount: number;
  featured: boolean;
  trending: boolean;
  inStock: boolean;
  stockQuantity: number;
  version: number;
}
export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}
export interface OrderItem {
  productId: string | null;
  name: string;
  image: string;
  quantity: number;
  size: string;
  color: string;
  price: number;
}
export interface Order {
  id: string;
  userId: string;
  customerDetails: { name: string; email: string; address: string; phone: string };
  items: OrderItem[];
  total: number;
  shippingFee: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMethod: 'COD' | 'BANK';
  paymentStatus: 'Unpaid' | 'Paid';
  reportedNotReceived: boolean;
  userConfirmedReceived: boolean;
  createdAt: string;
  version: number;
}
export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
