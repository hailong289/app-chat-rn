import db from "../libs/db";

class Rooms {
    protected query;
    protected tableName = 'rooms';
    protected field = [
        "id",
        "roomId",
        "type",
        "name",
        "avatar",
        "members",
        "updatedAt",
        "last_message" ,
        "is_read",
        "unread_count",
        "pinned",
        "muted",
        "last_read_id",
        "pinned_messages",
        "pinned_count"
    ];

    protected cast = {
        "members": "array",
        "last_message": "object"
    };

    constructor() {
        this.query = db.setTable('rooms').setCast(this.cast);
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
            pinned_count INTEGER DEFAULT 0
            )
        `;
    }


}