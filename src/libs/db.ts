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
    private log = {
        query: '',
        params: [] as any[],
        enable: false,
    }

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

    public static enableLog(enable: boolean) {
        DB.getInstance().log.enable = enable;
        return this;
    }

    public static logQuery(query: string, params: any[]) {
        DB.getInstance().log.query = query;
        DB.getInstance().log.params = params;
        return this;
    }

    public static getLog() {
        return DB.getInstance().log;
    }

    public static getLogRaw() {
        const { query, params } = DB.getInstance().log;
        let queryRaw = query;
        for (const param of params) {
            queryRaw = queryRaw.replace('?', typeof param === 'string' ? `'${param}'` : param?.toString() ?? '');
        }
        return queryRaw;
    }

    public setTable(name: string, as: string | null = null) {
        this.bindings.table.name = name;
        this.bindings.table.as = as;
        return this;
    }

    public select(columns: string[]) {
        this.bindings.column.push(...columns);
        return this;
    }

    public where(column: string, operator: string, value: string) {
        this.bindings.where.push({
            column,
            operator,
            value: '?',
        });
        this.bindings.values.push(value);
        return this;
    }

    public whereIn(column: string, values: string[]) {
        this.bindings.where.push({
            column,
            operator: 'IN',
            value: values.map(() => '?').join(','),
        });
        this.bindings.values.push(...values);
        return this;
    }

    public whereNotIn(column: string, values: string[]) {
        this.bindings.where.push({
            column,
            operator: 'NOT IN',
            value: values.map(() => '?').join(','),
        });
        this.bindings.values.push(...values);
        return this;
    }


    public orderBy(column: string, direction: 'ASC' | 'DESC') {
        this.bindings.orderBy.push({
            column,
            direction,
        });
        return this;
    }

    public limit(limit: number) {
        this.bindings.limit = limit;
        return this;
    }

    public offset(offset: number) {
        this.bindings.offset = offset;
        return this;
    }

    public groupBy(column: string) {
        this.bindings.groupBy.push(column);
        return this;
    }


    public async get() {
        const params = this.bindings.values;
        const query = this.getQuery('select');
        const result = await this.db.executeAsync(query, params);
        return result?.rows?._array;
    }

    public async getOne() {
        const params = this.bindings.values;
        const query = this.getQuery('select');
        const result = await this.db.executeAsync(query, params);
        return result?.rows?._array?.[0];
    }

    public async exists() {
        const params = this.bindings.values;
        const query = this.getQuery('select');
        const result = await this.db.executeAsync(query, params);
        return (result?.rows?._array?.length ?? 0) > 0;
    }

    public async insert(data: Record<string, any>) {
        const columns = Object.keys(data);
        const values = Object.values(data);
        this.bindings.column.push(...columns);
        this.bindings.values.push(...values);
        const params = this.bindings.values;
        const query = this.getQuery('insert');
        const result = await this.db.executeAsync(query, params);
        return result;
    }

    public async insertMany(dataArray: Record<string, any>[]) {
        if (dataArray.length === 0) return;
        
        const columns = Object.keys(dataArray[0]);
        const placeholders = columns.map(() => '?').join(',');
        const query = `INSERT INTO ${this.bindings.table.name} (${columns.join(',')}) VALUES (${placeholders})`;
        
        const results = [];
        for (const data of dataArray) {
            const values = columns.map(col => data[col]);
            const result = await this.db.executeAsync(query, values);
            results.push(result);
        }
        this.clear();
        return results;
    }

    public async update(columns: string[], values: string[]) {
        this.bindings.column.push(...columns);
        this.bindings.values.push(...values);
        const params = this.bindings.values;
        const query = this.getQuery('update');
        return await this.db.executeAsync(query, params);
    }

    public async delete() {
        const params = this.bindings.values;
        const query = this.getQuery('delete');
        return await this.db.executeAsync(query, params);
    }
    

    private getQuery(type: 'select' | 'insert' | 'update' | 'delete'): string {
        const { table, column, where, orderBy, limit, offset, groupBy, values } = this.bindings;
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
                const placeholders = column.map(() => '?').join(',');
                query += ` (${column.join(',')}) VALUES (${placeholders})`;
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
            const whereConditions = [];
            for (const item of where) {
                if (item.operator === 'IN') {
                    whereConditions.push(`${item.column} IN (${item.value})`);
                } else if (item.operator === 'NOT IN') {
                    whereConditions.push(`${item.column} NOT IN (${item.value})`);
                } else {    
                    whereConditions.push(`${item.column} ${item.operator} ${item.value}`);
                }
            }
            query += ` WHERE ${whereConditions.join(' AND ')}`;
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
        if (DB.getInstance().log.enable) {
            DB.logQuery(query, this.bindings.values);
        }
        this.clear();
        return query;
    }

   

    public clear() {
        this.bindings = {
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
        return this;
    }
}

export default DB;