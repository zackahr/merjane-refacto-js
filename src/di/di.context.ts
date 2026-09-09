import {type Cradle, diContainer} from '@fastify/awilix';
import {asClass, asValue} from 'awilix';
import {type FastifyBaseLogger, type FastifyInstance} from 'fastify';
import {type INotificationService} from '@/services/notifications.port.js';
import {NotificationService} from '@/services/impl/notification.service.js';
import {type Database} from '@/db/type.js';
import {OrderRepository} from '@/repository/order.repository.js';
import {ProductRepository} from '@/repository/product.repository.js';
import {ProductService} from '@/services/impl/product.service.js';

declare module '@fastify/awilix' {

	interface Cradle { // eslint-disable-line @typescript-eslint/consistent-type-definitions
		logger: FastifyBaseLogger;
		database: Database;
		notificationService: INotificationService;
		productService: ProductService;
		productRepository: ProductRepository;
		orderRepository: OrderRepository;
	}
}

export async function configureDiContext(
	server: FastifyInstance,
): Promise<void> {
	diContainer.register({
		logger: asValue(server.log),
	});
	diContainer.register({
		database: asValue(server.database),
	});
	diContainer.register({
		notificationService: asClass(NotificationService),
	});
	diContainer.register({
		productService: asClass(ProductService),
	});
	diContainer.register({
		productRepository: asClass(ProductRepository),
	});
	diContainer.register({
		orderRepository: asClass(OrderRepository),
	});
}

export function resolve<Service extends keyof Cradle>(
	service: Service,
): Cradle[Service] {
	return diContainer.resolve(service);
}
