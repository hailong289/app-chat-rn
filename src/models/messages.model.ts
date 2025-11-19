
class Messages {
    protected query;
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
        "hiddenByMe",
        "hiddenAt",
        "read_by",
        "isDeleted",
        "read_by_count",
        "status"
    ];

    protected cast = {
        "reactions": "array",
        "reply": "object",
        "read_by": "object"
    };

    constructor() {
        this.query = db.setTable('messages').setCast(this.cast);
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
            hiddenByMe INTEGER DEFAULT 0,
            hiddenAt TEXT,
            read_by TEXT,
            isDeleted INTEGER DEFAULT 0,
            read_by_count INTEGER DEFAULT 0,
            status TEXT
            )
        `;
    }
}