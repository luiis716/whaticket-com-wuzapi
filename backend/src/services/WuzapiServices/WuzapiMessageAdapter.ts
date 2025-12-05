import { logger } from "../../utils/logger";

// The internal message structure the system expects.
export interface AdaptedMessage {
    id: string;
    fromMe: boolean;
    from: string;
    body: string;
    type: string;
    timestamp: number;
    pushName?: string;
    media?: {
        data: string; // base64
        filename: string;
        mimetype: string;
    },
    event: any; // Add this line
}

const WuzapiMessageAdapter = (webhookData: any): AdaptedMessage | null => {
    try {
        const { event, type: webhookType, base64, fileName, mimeType } = webhookData;

        // Ensure it's a message event that we can handle.
        if (!event || webhookType !== "Message") {
            logger.warn("Wuzapi webhook received is not a 'Message' type or has no 'event' data.", { webhookData });
            return null;
        }

        const { Info, Message } = event;

        // Validate that the essential properties exist.
        if (!Info || !Message || !Info.ID || !Info.Timestamp) {
            logger.error("Wuzapi webhook is missing essential info (Info, Message, ID, or Timestamp).", { webhookData });
            return null;
        }

        if (typeof Info.Chat !== "string") {
            logger.warn("Received a Wuzapi webhook where 'Info.Chat' is not a string. Skipping message.", { Info });
            return null;
        }

        // 1) Ignorar status do WhatsApp (status@broadcast)
        if (
            Info.Chat === "status@broadcast" ||
            Info.Chat.endsWith("@broadcast")
        ) {
            logger.info("Ignoring WhatsApp status/broadcast message from Wuzapi webhook.", {
                chat: Info.Chat,
                id: Info.ID
            });
            return null;
        }

        // 2) Normalizar JID/LID para evitar dois chats diferentes
        // - Se o chat for um LID (…@lid) e existir SenderAlt com @s.whatsapp.net,
        //   usar SenderAlt como base para o JID "real".
        let normalizedChat = Info.Chat as string;

        const senderAlt: string | undefined = (Info as any).SenderAlt;
        if (
            normalizedChat.endsWith("@lid") &&
            senderAlt &&
            senderAlt.includes("@s.whatsapp.net")
        ) {
            normalizedChat = senderAlt;
        }

        // Converter JID do WhatsApp para o formato interno @c.us
        // Ex.: 558681587640@s.whatsapp.net => 558681587640@c.us
        normalizedChat = normalizedChat
            .replace("@s.whatsapp.net", "@c.us")
            .replace("@lid", "@c.us");

        const from = normalizedChat;
        const timestamp = new Date(Info.Timestamp).getTime();

        let body = "";
        let type = Info.Type || "chat";
        let media;

        if (Info.Type === "text" && Message.conversation) {
            body = Message.conversation;
        } else if (Info.Type === "media") {
            type = Info.MediaType; // image, video, document, ptt

            if (Message.imageMessage?.caption) {
                body = Message.imageMessage.caption;
            } else if (Message.videoMessage?.caption) {
                body = Message.videoMessage.caption;
            } else if (Message.documentMessage?.caption) {
                body = Message.documentMessage.caption;
            }

            if (base64 && fileName && mimeType) {
                let finalMimeType = mimeType;

                if (Message.audioMessage && Message.audioMessage.mimetype) {
                    finalMimeType = Message.audioMessage.mimetype;
                }
                
                media = {
                    data: base64,
                    filename: fileName,
                    mimetype: finalMimeType
                };
            }
        }

        const adaptedMessage: AdaptedMessage = {
            id: Info.ID,
            fromMe: Info.IsFromMe || false,
            from,
            body,
            type,
            timestamp,
            pushName: Info.PushName,
            media,
            event // Add this line
        };

        logger.info(`Wuzapi message adapted successfully: ${adaptedMessage.id}`);
        return adaptedMessage;
    } catch (err) {
        logger.error({ err }, "Error adapting Wuzapi message.");
        return null;
    }
};

export default WuzapiMessageAdapter;
