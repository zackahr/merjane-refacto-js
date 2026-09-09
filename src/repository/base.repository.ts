import {type Database} from '@/db/type.js';

export abstract class BaseRepository {
	protected readonly database: Database;

	public constructor({database}: {database: Database}) {
		this.database = database;
	}
}
