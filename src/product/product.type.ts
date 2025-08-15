export default interface ProductType {
  name: string;
  category: string;
  productPrice: number;
  purchasePrice: number;
  het: number;
  expiredDate: Date;
  quantity?: number;
  createdAt?: Date;
  position?: string;
  userId: string;
}
