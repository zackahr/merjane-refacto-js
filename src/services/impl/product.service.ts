import {type Cradle} from '@fastify/awilix';
import {type INotificationService} from '../notifications.port.js';
import {ACTION_HANDLERS} from '@/actions/action-handlers.js';
import {STRATEGY_ACTIONS} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';
import {type OrderRepository} from '@/repository/order.repository.js';
import {type ProductRepository} from '@/repository/product.repository.js';
import {type StrategyAction, createProductStrategy} from '@/strategies/product.strategy.js';

export class ProductService {
	private readonly notificationService: INotificationService;
	private readonly productRepository: ProductRepository;
	private readonly orderRepository: OrderRepository;

	public constructor(
		{notificationService, productRepository, orderRepository}: Pick<Cradle, 'notificationService' | 'productRepository' | 'orderRepository'>,
	) {
		this.notificationService = notificationService;
		this.productRepository = productRepository;
		this.orderRepository = orderRepository;
	}

	/**
	 * Processes one order: for each product, asks its category strategy what to do,
	 * then applies the resulting side effects (stock mutation, persistence, notification).
	 */
	public async processOrder(orderId: number): Promise<void> {
		const order = await this.orderRepository.findByIdWithProducts(orderId);

		if (!order) {
			return;
		}

		// Each product is processed independently; better-sqlite3 executes writes synchronously,
		// so side effects still land in order.
		await Promise.all(order.products.map(async ({product}) => this.processProduct(product)));
	}

	/**
	 * Convenience helper retained for direct use / unit tests: sets the lead time, persists,
	 * and notifies a restocking delay. The order flow reaches the same outcome via
	 * `processOrder -> apply({type: 'delay'})`.
	 */
	public async notifyDelay(leadTime: number, p: Product): Promise<void> {
		p.leadTime = leadTime;
		await this.apply({type: STRATEGY_ACTIONS.DELAY}, p);
	}

	private async processProduct(product: Product): Promise<void> {
		const strategy = createProductStrategy(product.type);
		// `new Date()` is the reference date; strategies are pure so they can be exercised with any date in unit tests.
		await this.apply(strategy.evaluate(product, new Date()), product);
	}

	/** Executes the side effects decided by a strategy: mutates stock, persists the row, and emits the matching notification. */
	private async apply(action: StrategyAction, product: Product): Promise<void> {
		const handle = ACTION_HANDLERS[action.type];
		await handle({product, notifier: this.notificationService});

		// `NONE` has no side effects at all: neither a write nor a notification.
		if (action.type !== STRATEGY_ACTIONS.NONE) {
			await this.productRepository.persist(product);
		}
	}
}
