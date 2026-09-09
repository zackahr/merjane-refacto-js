import {eq} from 'drizzle-orm';
import {orders, type Order, type Product} from '@/db/schema.js';
import {type Database} from '@/db/type.js';

export type OrderWithProducts = Order & {
	products: Array<{product: Product}>;
};

export class OrderRepository {
	private readonly database: Database;

	public constructor({database}: {database: Database}) {
		this.database = database;
	}

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
