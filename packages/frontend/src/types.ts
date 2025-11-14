export interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  inventory: number;
  sizes: string[];
  tags: string[];
  isPublished: boolean;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  pages: number;
}
