import {STRATEGY_ACTIONS, type StrategyActionType} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';
import {type INotificationService} from '@/services/notifications.port.js';

type ActionContext = {
	product: Product;
	notifier: INotificationService;
};

export type ActionHandler = (context: ActionContext) => Promise<void> | void;

export const ACTION_HANDLERS: Record<StrategyActionType, ActionHandler> = {
	[STRATEGY_ACTIONS.DECREMENT]({product}) {
		product.available -= 1;
	},

	[STRATEGY_ACTIONS.DELAY]({product, notifier}) {
		notifier.sendDelayNotification(product.leadTime, product.name);
	},

	[STRATEGY_ACTIONS.OUT_OF_STOCK]({product, notifier}) {
		notifier.sendOutOfStockNotification(product.name);
	},

	// A delivery past the season end means the product can never sell again: zero the stock.
	[STRATEGY_ACTIONS.OUT_OF_SEASON]({product, notifier}) {
		product.available = 0;
		notifier.sendOutOfStockNotification(product.name);
	},

	// An expired product can never sell again: zero the stock.
	[STRATEGY_ACTIONS.EXPIRED]({product, notifier}) {
		product.available = 0;
		notifier.sendExpirationNotification(product.name, product.expiryDate!);
	},

	[STRATEGY_ACTIONS.NONE]() {
		return undefined;
	},
};
