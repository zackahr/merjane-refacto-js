import {eq} from 'drizzle-orm';
import {BaseRepository} from './base.repository.js';
import {orders, type Order, type Product} from '@/db/schema.js';

export type OrderWithProducts = Order & {
	products: Array<{product: Product}>;
};

export class OrderRepository extends BaseRepository {
	public async findByIdWithProducts(orderId: number): Promise<OrderWithProducts | undefined> {
		return this.database.query.orders.findFirst({
			where: eq(orders.id, orderId),
			with: {
				products: {
					columns: {},
					with: {
						product: true,
					},
				},
			},
		});
	}
}
