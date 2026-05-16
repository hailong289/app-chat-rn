import db from "../libs/db";
import { Room } from "../types/room.type";

export class Rooms {
    private static instance: Rooms | null = null;
    protected tableName = 'rooms';
    protected field = [
        "id",
        "roomId",
        "type",
        "name",
        "avatar",
        "members",
        "updatedAt",
        "last_message",
        "is_read",
        "unread_count",
        "pinned",
        "muted",
        "last_read_id",
        "pinned_messages",
        "pinned_count",
        "isBlocked",
        "blockByMine"
    ];

    protected cast = {
        "members": "array",
        "last_message": "object"
    };

    static getInstance() {
        if (!this.instance) {
            this.instance = new Rooms();
        }
        return this.instance;
    }

    /**
     * Helper method để lấy query với tableName và cast đã được set
     */
    private q() {
        return db.setTable(this.tableName).setCast(this.cast).setFields(this.field);
    }

    getQuery() {
        return this.q();
    }

    createTable() {
        return `
            CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            roomId TEXT NOT NULL,
            type TEXT DEFAULT 'private',
            name TEXT,
            avatar TEXT,
            members TEXT,
            updatedAt TEXT,
            last_message TEXT,
            is_read INTEGER DEFAULT 1,
            unread_count INTEGER DEFAULT 0,
            pinned INTEGER DEFAULT 0,
            muted INTEGER DEFAULT 0,
            last_read_id TEXT,
            pinned_messages TEXT,
            pinned_count INTEGER DEFAULT 0,
            isBlocked INTEGER DEFAULT 0,
            blockByMine INTEGER DEFAULT 0
            )
        `;
    }

    dropTable() {
        return `DROP TABLE IF EXISTS rooms`;
    }

    createIndex() {
        return `
            CREATE INDEX IF NOT EXISTS idx_rooms_roomId ON rooms(roomId);
            CREATE INDEX IF NOT EXISTS idx_rooms_updatedAt ON rooms(updatedAt);
            CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(type);
        `;
    }

    static async upsert(data: any) {
        return await Rooms.getInstance().q().upsert(data);
    }


    static async getRooms(limit: number, offset: number, type: string) {
        let rooms;
        const query = Rooms.getInstance().q().select(['*']).orderBy('updatedAt', 'ASC').limit(limit).offset(offset);
        if (type == "all") {
            rooms = await query.get() as unknown as Room[];
        } else {
            rooms = await query.where('type', '=', type).get() as unknown as Room[];
        }
        return rooms;
    }

}