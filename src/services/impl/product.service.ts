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

	public async processOrder(orderId: number): Promise<void> {
		const order = await this.orderRepository.findByIdWithProducts(orderId);

		if (!order) {
			return;
		}

		// Products are chained sequentially: each product's side effects are emitted and persisted
		// before the next one begins, keeping the processing order deterministic. `Promise.all` is
		// intentionally avoided here — concurrent handling would be order-dependent and race-prone.
		let chain: Promise<void> = Promise.resolve();
		for (const {product} of order.products) {
			chain = chain.then(async () => this.processProduct(product));
		}

		await chain;
	}

	public async notifyDelay(leadTime: number, p: Product): Promise<void> {
		p.leadTime = leadTime;
		await this.apply({type: STRATEGY_ACTIONS.DELAY}, p);
	}

	private async processProduct(product: Product): Promise<void> {
		const strategy = createProductStrategy(product.type);
		await this.apply(strategy.evaluate(product, new Date()), product);
	}

	private async apply(action: StrategyAction, product: Product): Promise<void> {
		const handle = ACTION_HANDLERS[action.type];
		await handle({product, notifier: this.notificationService});

		// `NONE` implies no write: the row must stay untouched.
		if (action.type !== STRATEGY_ACTIONS.NONE) {
			await this.productRepository.persist(product);
		}
	}
}
