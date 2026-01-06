import { WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { IncomingMessage } from 'http';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface WSSharedDoc extends Y.Doc {
    conns: Set<WebSocket>;
}

const docs = new Map<string, WSSharedDoc>();

const messageSync = 0;
const messageAwareness = 1;

const saveToDb = async (room: string, doc: Y.Doc) => {
    const content = Y.encodeStateAsUpdate(doc);
    try {
        await prisma.document.upsert({
            where: { id: room },
            update: { content: Buffer.from(content), updatedAt: new Date() },
            create: { id: room, name: room, content: Buffer.from(content) },
        });
        console.log(`Saved room ${room} to DB`);
    } catch (err) {
        console.error('Failed to save to DB:', err);
    }
};

// Simple debounce
let saveTimeout: NodeJS.Timeout | null = null;
const debouncedSave = (room: string, doc: Y.Doc) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveToDb(room, doc), 2000); // Save every 2s max
};

const updateHandler = (update: Uint8Array, origin: any, doc: WSSharedDoc, room: string) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    doc.conns.forEach((client) => {
        if (client !== origin && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });

    if (origin !== 'db') {
        debouncedSave(room, doc);
    }
};

export const setupWSConnection = async (ws: WebSocket, req: IncomingMessage) => {
    const url = req.url || '';
    const room = url.slice(1) || 'default-room';

    let doc = docs.get(room);
    if (!doc) {
        doc = new Y.Doc() as WSSharedDoc;
        doc.conns = new Set<WebSocket>();
        docs.set(room, doc);

        // Load from DB
        try {
            const dbDoc = await prisma.document.findUnique({ where: { id: room } });
            if (dbDoc && dbDoc.content) {
                Y.applyUpdate(doc, new Uint8Array(dbDoc.content), 'db');
                console.log(`Loaded room ${room} from DB`);
            }
        } catch (err) {
            console.error('Failed to load from DB:', err);
        }

        doc.on('update', (update: Uint8Array, origin: any) => updateHandler(update, origin, doc!, room));
    }

    doc.conns.add(ws);

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));

    ws.on('message', (message: ArrayBuffer) => {
        const encoder = encoding.createEncoder();
        const decoder = decoding.createDecoder(new Uint8Array(message));
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
            case messageSync:
                encoding.writeVarUint(encoder, messageSync);
                syncProtocol.readSyncMessage(decoder, encoder, doc!, null);
                if (encoding.length(encoder) > 1) {
                    ws.send(encoding.toUint8Array(encoder));
                }
                break;
            case messageAwareness:
                const update = decoding.readVarUint8Array(decoder);
                doc!.conns.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        const enc = encoding.createEncoder();
                        encoding.writeVarUint(enc, messageAwareness);
                        encoding.writeVarUint8Array(enc, update);
                        client.send(encoding.toUint8Array(enc));
                    }
                });
                break;
        }
    });

    ws.on('close', () => {
        doc?.conns.delete(ws);
        if (doc?.conns.size === 0) {
            // docs.delete(room);
        }
    });
};
