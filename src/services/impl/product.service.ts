import {type Cradle} from '@fastify/awilix';
import {eq} from 'drizzle-orm';
import {type INotificationService} from '../notifications.port.js';
import {orders, products, type Product} from '@/db/schema.js';
import {type Database} from '@/db/type.js';
import {type StrategyAction, createProductStrategy} from '@/strategies/product.strategy.js';

export class ProductService {
	private readonly ns: INotificationService;
	private readonly db: Database;

	public constructor({ns, db}: Pick<Cradle, 'ns' | 'db'>) {
		this.ns = ns;
		this.db = db;
	}

	/**
	 * Processes one order: for each product, asks its category strategy what to do,
	 * then applies the resulting side effects (stock mutation, persistence, notification).
	 */
	public async processOrder(orderId: number): Promise<void> {
		const order = await this.db.query.orders.findFirst({
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

		if (!order) {
			return;
		}

		for (const {product} of order.products) {
			const strategy = createProductStrategy(product.type);
			// `new Date()` is the reference date; strategies are pure so they can be exercised with any date in unit tests.
			/* eslint-disable-next-line no-await-in-loop -- products are processed sequentially to keep order deterministic */
			await this.apply(strategy.evaluate(product, new Date()), product);
		}
	}

	/**
	 * Convenience helper retained for direct use / unit tests: sets the lead time, persists,
	 * and notifies a restocking delay. The order flow reaches the same outcome via
	 * `processOrder -> apply({type: 'delay'})`.
	 */
	public async notifyDelay(leadTime: number, p: Product): Promise<void> {
		p.leadTime = leadTime;
		await this.persist(p);
		this.ns.sendDelayNotification(leadTime, p.name);
	}

	/** Executes the side effects decided by a strategy: mutates stock, persists the row, and emits the matching notification. */
	private async apply(action: StrategyAction, product: Product): Promise<void> {
		switch (action.type) {
			case 'decrement': {
				product.available -= 1;
				await this.persist(product);
				break;
			}

			case 'delay': {
				await this.persist(product);
				this.ns.sendDelayNotification(product.leadTime, product.name);
				break;
			}

			case 'out-of-stock': {
				await this.persist(product);
				this.ns.sendOutOfStockNotification(product.name);
				break;
			}

			case 'unavailable': {
				product.available = 0;
				await this.persist(product);
				this.ns.sendOutOfStockNotification(product.name);
				break;
			}

			case 'expired': {
				product.available = 0;
				await this.persist(product);
				this.ns.sendExpirationNotification(product.name, product.expiryDate!);
				break;
			}

			case 'none': {
				break;
			}
		}
	}

	/** Persists the product row with every column as currently mutated on the in-memory object. */
	private async persist(product: Product): Promise<void> {
		await this.db.update(products).set(product).where(eq(products.id, product.id));
	}
}
