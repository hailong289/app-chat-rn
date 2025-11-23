import { NitroSQLiteConnection, open } from "react-native-nitro-sqlite";
import { CURRENT_VERSION, DB_NAME, MIGRATIONS } from "./migrations";
import Helpers from "./helpers";
import { Rooms } from "../models/rooms.model";
import { Messages } from "../models/messages.model";

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
        cast: {} as Record<string, string>
    };


    private log = {
        logs: [] as {
            query: string;
            params: any[];
        }[],
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

    public getDb(): NitroSQLiteConnection {
        if (!this.db) throw new Error('Database chưa khởi tạo');
        return this.db;
    }

    public static getInstance(): DB {
        if (!DB.instance) {
            DB.instance = new DB();
        }
        return DB.instance;
    }

    public enableLog(enable: boolean) {
        this.log.enable = enable;
        return this;
    }

    public logQuery(query: string, params: any[]) {
        this.log.logs.push({ query, params });
        return this;
    }

    public getLog() {
        return this.log.logs;
    }

    public getLogRaw() {
        const { logs } = DB.getInstance().log;
        const queryRaw = logs.map((log) => {
            let query = log.query;
            for (const param of log.params) {
                query = query.replace('?', typeof param === 'string' ? `'${param}'` : param?.toString() ?? '');
            }
            return query;
        });
        return queryRaw;
    }

    public async migrations() {
        const db = this.getDb();
        const targetVersion = CURRENT_VERSION;
        try {
            const result = await db.executeAsync('PRAGMA user_version');
            const currentVersionRow = result.rows?.item(0);
            const currentVersion = Number(currentVersionRow?.user_version) || 0;
            if (currentVersion < targetVersion) {
                for (const [version, migration] of Object.entries(MIGRATIONS)) {
                    const versionNum = Number(version);
                    if (versionNum > currentVersion) {
                        await migration(db);
                        await db.executeAsync(`PRAGMA user_version = ${targetVersion}`);
                    }
                }
            } else {
                console.log('✅ Database đã có version', currentVersion);
            }
        } catch (error) {
            console.error('❌ Database migration error:', error);
        }
    }

    // Helper query tổng quát
    public async executeQuery(query: string, params: any[] = []) {
        const db = this.getDb();
        const result = await db.executeAsync(query, params);

        // Helper convert rows sang array chuẩn
        const rows: any[] = [];
        const len = result.rows?.length || 0;
        for (let i = 0; i < len; i++) {
            rows.push(result.rows!.item(i));
        }

        return {
            insertId: result.insertId,
            rowsAffected: result.rowsAffected,
            rows,
        };
    }

    public async resetDatabase() {
        try {
            if (!this.db) {
                throw new Error('Database chưa khởi tạo');
            }
            console.warn('⚠️ Xóa và tạo lại database...');
            await MIGRATIONS[100](this.db); 
        } catch (error) {
            console.error('❌ Lỗi reset database:', error);
            throw error;
        }
    }

    public close() {
        if (this.db) {
            this.db.close();
        }
    }

    public setTable(name: string, as: string | null = null) {
        this.bindings.table.name = name;
        this.bindings.table.as = as;
        return this;
    }

    public setCast(values: Record<string, string>) {
        this.bindings.cast = values;
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
        return this.withCast(result?.rows?._array ?? []);
    }

    public async getOne() {
        const params = this.bindings.values;
        const query = this.getQuery('select');
        const result = await this.db.executeAsync(query, params);
        return this.withCast(result?.rows?._array?.[0] ?? {});
    }

    public async exists() {
        const params = this.bindings.values;
        const query = this.getQuery('select');
        const result = await this.db.executeAsync(query, params);
        return (result?.rows?._array?.length ?? 0) > 0;
    }

    public async insert(data: Record<string, any>) {
        const columns = Object.keys(data);
        const values = Object.values(data).map((value) => this.convertValue(value));
        this.bindings.column.push(...columns);
        const params = values;
        if (this.bindings.values.length > 0) {
            params.push(...this.bindings.values);
        }
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
            const values = columns.map(col => this.convertValue(data[col]));
            const result = await this.db.executeAsync(query, values);
            results.push(result);
        }
        this.clear();
        return results;
    }

    public async update(data: Record<string, any>) {
        const columns = Object.keys(data);
        const values = Object.values(data).map((value) => this.convertValue(value));
        this.bindings.column.push(...columns);
        const params = values;
        if (this.bindings.values.length > 0) {
            params.push(...this.bindings.values);
        }
        const query = this.getQuery('update');
        return await this.db.executeAsync(query, params);
    }

    public async upsert(data: Record<string, any>) {
        const params = JSON.parse(JSON.stringify(data));
        // Lưu table name trước khi clear
        const tableName = this.bindings.table.name;
        if (!tableName) {
            throw new Error('Table name is required for upsert operation');
        }

        // Kiểm tra record có tồn tại không
        const result = await this.setTable(tableName).where('id', '=', params.id).exists();

        // Set lại table name và where condition cho update
        if (result) {
            const id = params.id;
            delete params.id;
            return await this.setTable(tableName).where('id', '=', id).update(params);
        }
        // Set lại table name cho insert
        return await this.setTable(tableName).insert(params);
    }

    public async delete() {
        const params = this.bindings.values;
        const query = this.getQuery('delete');
        return await this.db.executeAsync(query, params);
    }


    private getQuery(type: 'select' | 'insert' | 'update' | 'delete' | 'upsert'): string {
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

        } else if (type === 'upsert') {
            query = 'INSERT OR REPLACE INTO';
            if (table.name) {
                query += ` ${table.name}`;
            }
            if (table.as) {
                query += ` AS ${table.as}`;
            }
            if (column.length > 0) {
                query += ` (${column.join(',')}) VALUES (${column.map(() => '?').join(',')})`;
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
        if (this.log.enable) {
            this.logQuery(query, this.bindings.values);

        }
        this.clear();
        return query;
    }


    private convertValue(value: any) {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        if (Array.isArray(value)) {
            return JSON.stringify(value);
        }
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }
        if (typeof value === 'number') {
            return value;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'function') {
            return value.toString();
        }
        if (typeof value === 'symbol') {
            return value.description;
        }
        if (typeof value === 'bigint') {
            return value.toString() as string;
        }
        if (typeof value === 'undefined') {
            return null;
        }
        return value;
    }

    private withCast(value: Array<any> | Object): any {
        if (Array.isArray(value)) {
            return value.map((item: any) => this.withCast(item));
        }
        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            const out: any = {};
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    const rawValue = value[key as keyof Object];
                    const castType = this.bindings.cast[key];
                    if (castType) {
                        if (castType === 'object' || castType === 'array') {
                            // Logic parse an toàn
                            out[key] = Helpers.safeJsonParse(rawValue, castType === 'array' ? [] : {});
                        }
                    } else {
                        out[key] = this.withCast(rawValue);
                    }
                }
            }
            return out;
        }
        // 3. Giá trị cơ bản (string, number, null...) -> trả về nguyên gốc
        return value;
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
            cast: {}
        };
        return this;
    }
}

export default DB.getInstance();