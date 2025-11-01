import { NitroSQLiteConnection, open, SQLiteQueryParamItem } from "react-native-nitro-sqlite";

class DB {
    private static instance: DB;
    private db: NitroSQLiteConnection;
    private bindings = {
        table: {
            name: null as string | null,
            as: null as string | null,
        },
        column: [] as string[],
        where: [] as {
            column: string;
            operator: string;
            value: string;
        }[],
        orderBy: [] as {
            column: string;
            direction: 'ASC' | 'DESC';
        }[],
        limit: null as number | null,
        offset: null as number | null,
        groupBy: [] as string[],
        values: [] as string[],
    };

    private constructor() {
       try {
         this.db = open({
            name: 'AppChatRN.db',
        });
        console.log('✅ Database opened:', 'AppChatRN.db');
       } catch (error) {
        console.error('❌ Lỗi khởi tạo database:', error);
        throw error;
       }
    }

    public static getInstance(): DB {
        if (!DB.instance) {
            DB.instance = new DB();
        }
        return DB.instance;
    }

    public static setTable(name: string, as: string | null = null) {
        this.getInstance().bindings.table.name = name;
        this.getInstance().bindings.table.as = as;
        return this.getInstance();
    }

    public static select(columns: string[]) {
        this.getInstance().bindings.column.push(...columns);
        return this.getInstance();
    }

    public static where(column: string, operator: string, value: string) {
        this.getInstance().bindings.where.push({
            column,
            operator,
            value: '?',
        });
        this.getInstance().bindings.values.push(value);
        return this.getInstance();
    }

    public static orderBy(column: string, direction: 'ASC' | 'DESC') {
        this.getInstance().bindings.orderBy.push({
            column,
            direction,
        });
        return this.getInstance();
    }

    public static limit(limit: number) {
        this.getInstance().bindings.limit = limit;
        return this.getInstance();
    }

    public static offset(offset: number) {
        this.getInstance().bindings.offset = offset;
        return this.getInstance();
    }

    public static groupBy(column: string) {
        this.getInstance().bindings.groupBy.push(column);
        return this.getInstance();
    }

    public static async get() {
        const query = this.getQuery('select');

        const result = await this.getInstance().db.executeAsync(query);
        return result;
    }

    public static async insert(columns: string[], values: string[]) {
        this.getInstance().bindings.column.push(...columns);
        this.getInstance().bindings.values.push(...values);
        const query = this.getQuery('insert');
        return await this.getInstance().db.executeAsync(query);
    }

    public static async update(columns: string[], values: string[]) {
        this.getInstance().bindings.column.push(...columns);
        this.getInstance().bindings.values.push(...values);
        const query = this.getQuery('update');
        return await this.getInstance().db.executeAsync(query);
    }

    public static async delete() {
        const query = this.getQuery('delete');
        return await this.getInstance().db.executeAsync(query);
    }
    

    private static getQuery(type: 'select' | 'insert' | 'update' | 'delete'): string {
        const { table, column, where, orderBy, limit, offset, groupBy, values } = this.getInstance().bindings;
        let query = '';
        if (type === 'select') {
            query = 'SELECT';
            if (column.length > 0) {
                query += ` ${column.join(',')}`;
            } else {
                query += ` *`;
            }
            if (table.name) {
                query += ` FROM ${table.name}`;
            }
            if (table.as) {
                query += ` AS ${table.as}`;
            }
        } else if (type === 'insert') {
            query = 'INSERT INTO';
            if (table.name) {
                query += ` ${table.name}`;
            }
            if (table.as) {
                query += ` AS ${table.as}`;
            }
            if (column.length > 0) {
                query += ` (${column.map(column => `${column} = ?`).join(',')})`;
            }
        } else if (type === 'update') {
            query = 'UPDATE';
            if (table.name) {
                query += ` ${table.name}`;
            }
            if (table.as) {
                query += ` AS ${table.as}`;
            }
            if (column.length > 0) {
                query += ` SET ${column.map(column => `${column} = ?`).join(',')}`;
            }
        } else if (type === 'delete') {
            query = 'DELETE';
            if (table.name) {
                query += ` ${table.name}`;
            }
            if (table.as) {
                query += ` AS ${table.as}`;
            }
        }
        
        if (where.length > 0) {
            query += ` WHERE ${where.map(where => `${where.column} ${where.operator} ${where.value}`).join(' AND ')}`;
        }
        if (orderBy.length > 0) {
            query += ` ORDER BY ${orderBy.map(orderBy => `${orderBy.column} ${orderBy.direction}`).join(',')}`;
        }
        if (limit) {
            query += ` LIMIT ${limit}`;
        }
        if (offset) {
            query += ` OFFSET ${offset}`;
        }
        if (groupBy.length > 0) {
            query += ` GROUP BY ${groupBy.join(',')}`;
        }
        this.clear();
        return query;
    }

    public static clear() {
        this.getInstance().bindings = {
            table: {
                name: null,
                as: null,
            },
            column: [],
            where: [],
            orderBy: [],
            limit: null,
            offset: null,
            groupBy: [],
            values: [],
        };
        return this.getInstance();
    }
}

export default DB.getInstance();