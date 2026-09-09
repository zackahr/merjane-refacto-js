import {type Cradle} from '@fastify/awilix';
import {type INotificationService} from '../notifications.port.js';
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
		await this.productRepository.persist(p);
		this.notificationService.sendDelayNotification(leadTime, p.name);
	}

	/** Executes the side effects decided by a strategy: mutates stock, persists the row, and emits the matching notification. */
	private async apply(action: StrategyAction, product: Product): Promise<void> {
		switch (action.type) {
			case 'decrement': {
				product.available -= 1;
				await this.productRepository.persist(product);
				break;
			}

			case 'delay': {
				await this.productRepository.persist(product);
				this.notificationService.sendDelayNotification(product.leadTime, product.name);
				break;
			}

			case 'out-of-stock': {
				await this.productRepository.persist(product);
				this.notificationService.sendOutOfStockNotification(product.name);
				break;
			}

			case 'unavailable': {
				product.available = 0;
				await this.productRepository.persist(product);
				this.notificationService.sendOutOfStockNotification(product.name);
				break;
			}

			case 'expired': {
				product.available = 0;
				await this.productRepository.persist(product);
				this.notificationService.sendExpirationNotification(product.name, product.expiryDate!);
				break;
			}

			case 'none': {
				break;
			}
		}
	}
}
