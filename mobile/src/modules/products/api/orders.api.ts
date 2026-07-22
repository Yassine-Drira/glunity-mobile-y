import http from '../../../core/network/http.client';

export interface OrderItem {
  product: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
}

export interface ShippingAddress {
  fullName: string;
  addressLine: string;
  city: string;
  phone: string;
  notes?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  _id: string;
  user: string | { _id: string; name?: string; fullName?: string; email: string; avatar?: string };
  items: OrderItem[];
  total: number;
  deliveryFee: number;
  address: ShippingAddress;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDto {
  items: { productId: string; qty: number }[];
  address: ShippingAddress;
}

export async function createOrderApi(dto: CreateOrderDto): Promise<Order> {
  const { data } = await http.post<{ success: boolean; data: Order }>('/orders', dto);
  return data.data;
}

export async function getMyOrdersApi(): Promise<Order[]> {
  const { data } = await http.get<{ success: boolean; data: Order[] }>('/orders/my-orders');
  return data.data;
}

export async function getSellerOrdersApi(): Promise<Order[]> {
  const { data } = await http.get<{ success: boolean; data: Order[] }>('/orders/seller-orders');
  return data.data;
}

export async function getOrderByIdApi(id: string): Promise<Order> {
  const { data } = await http.get<{ success: boolean; data: Order }>(`/orders/${id}`);
  return data.data;
}

export async function updateOrderStatusApi(id: string, status: OrderStatus): Promise<Order> {
  const { data } = await http.put<{ success: boolean; data: Order }>(`/orders/${id}/status`, { status });
  return data.data;
}
