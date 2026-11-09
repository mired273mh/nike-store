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
  paymentInstructions?: BankSettings | null;
  lastNotification?: MailNotification | null;
}
export interface BankSettings {
  mode: 'demo' | 'real';
  name: string;
  account: string;
  holder: string;
  bin: string;
  notice?: string;
}
export interface MailSettings {
  transport: 'file' | 'smtp';
  from: string;
  adminEmail: string;
  host: string;
  port: number;
  username: string;
  encryption: 'tls' | 'ssl' | 'none';
  passwordConfigured: boolean;
}
export interface MailNotification {
  id: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'preview' | 'failed';
  createdAt: string;
}
export interface QrPayment extends BankSettings {
  amount: number;
  reference: string;
  orderId: string;
  qrPayload: string | null;
  qrImageUrl: string | null;
}
export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
