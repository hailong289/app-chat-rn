import db from "../libs/db";

export class Messages {
    private static instance: Messages | null = null;
    protected tableName = 'messages';
    protected field = [
        "id",
        "roomId",
        "type",
        "content",
        "createdAt",
        "editedAt",
        "deletedAt",
        "pinned" ,
        "sender",
        "attachments",
        "reactions",
        "reply",
        "isMine",
        "isRead",
        "hiddenBy",
        "hiddenByMe",
        "hiddenAt",
        "read_by",
        "isDeleted",
        "read_by_count",
        "status",
        "call_history"
    ];

    protected cast = {
        "reactions": "array",
        "reply": "object",
        "read_by": "object",
        "hiddenBy": "array",
        "call_history": "object"
    };

    static getInstance() {
        if (!this.instance) {
            this.instance = new Messages();
        }
        return this.instance;
    }

    private q() {
        return db.setTable(this.tableName).setCast(this.cast).setFields(this.field);
    }

    getQuery() {
        return this.q();
    }

    createTable() {
      return `
            CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            roomId TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'text',
            content TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            editedAt TEXT,
            deletedAt TEXT,
            pinned INTEGER DEFAULT 0,
            sender TEXT,
            attachments TEXT,
            reactions TEXT,
            reply TEXT,
            isMine INTEGER DEFAULT 0,
            isRead INTEGER DEFAULT 0,
            hiddenBy TEXT,
            hiddenByMe INTEGER DEFAULT 0,
            hiddenAt TEXT,
            read_by TEXT,
            isDeleted INTEGER DEFAULT 0,
            read_by_count INTEGER DEFAULT 0,
            status TEXT,
            call_history TEXT
            )
        `;
    }

    dropTable() {
      return `DROP TABLE IF EXISTS messages`;
    }

    createIndex() {
        return `
            CREATE INDEX IF NOT EXISTS idx_messages_roomId ON messages(roomId);
            CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages(createdAt);
            CREATE INDEX IF NOT EXISTS idx_messages_roomId_createdAt ON messages(roomId, createdAt DESC);
        `;
    }
}