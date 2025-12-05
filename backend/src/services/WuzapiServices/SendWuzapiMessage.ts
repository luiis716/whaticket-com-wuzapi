import axios from "axios";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

interface SendTextRequest {
    wuzapiUrl: string;
    instanceToken: string;
    phone: string;
    body: string;
    customId?: string;
}

interface SendMediaRequest {
    wuzapiUrl: string;
    instanceToken: string;
    phone: string;
    mediaUrl: string;
    caption?: string;
    mediaType: "image" | "video" | "audio" | "document";
    fileName?: string;
    customId?: string;
}

const SendWuzapiMessage = {
    sendText: async ({
        wuzapiUrl,
        instanceToken,
        phone,
        body,
        customId
    }: SendTextRequest): Promise<any> => {
        try {
            const payload: any = {
                Phone: phone,
                Body: body
            };

            // Adicionar ID customizado se fornecido
            if (customId) {
                payload.Id = customId;
            }

            const { data } = await axios.post(
                `${wuzapiUrl}/chat/send/text`,
                payload,
                {
                    headers: {
                        token: instanceToken,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (!data.success) {
                throw new AppError("ERR_WUZAPI_SEND_MESSAGE");
            }

            logger.info(`Wuzapi text message sent to ${phone}, messageId: ${customId || data.data?.id}`);
            return data;
        } catch (err) {
            logger.error(`Error sending Wuzapi text message: ${err}`);
            throw new AppError("ERR_WUZAPI_SEND_MESSAGE");
        }
    },

    sendMedia: async ({
        wuzapiUrl,
        instanceToken,
        phone,
        mediaUrl,
        caption,
        mediaType,
        fileName,
        customId
    }: SendMediaRequest): Promise<any> => {
        try {
            let endpoint = "";
            let payload: any = { Phone: phone };

            switch (mediaType) {
                case "image":
                    endpoint = "/chat/send/image";
                    payload.Image = mediaUrl;
                    payload.Caption = caption || "";
                    break;
                case "video":
                    endpoint = "/chat/send/video";
                    payload.Video = mediaUrl;
                    payload.Caption = caption || "";
                    break;
                case "audio":
                    endpoint = "/chat/send/audio";
                    payload.Audio = mediaUrl;
                    payload.Caption = caption || "";
                    break;
                case "document":
                    endpoint = "/chat/send/document";
                    payload.Document = mediaUrl;
                    payload.FileName = fileName || "document";
                    break;
                default:
                    throw new AppError("ERR_WUZAPI_INVALID_MEDIA_TYPE");
            }

            // Adicionar ID customizado se fornecido
            if (customId) {
                payload.Id = customId;
            }

            const { data } = await axios.post(`${wuzapiUrl}${endpoint}`, payload, {
                headers: {
                    token: instanceToken,
                    "Content-Type": "application/json"
                }
            });

            if (!data.success) {
                throw new AppError("ERR_WUZAPI_SEND_MEDIA");
            }

            logger.info(`Wuzapi ${mediaType} sent to ${phone}, messageId: ${customId || data.data?.id}`);
            return data;
        } catch (err) {
            logger.error(`Error sending Wuzapi media: ${err}`);
            throw new AppError("ERR_WUZAPI_SEND_MEDIA");
        }
    },

    sendAudioPTT: async ({
        wuzapiUrl,
        instanceToken,
        phone,
        audioBase64,
        mimeType = "audio/ogg; codecs=opus",
        seconds = 0,
        customId
    }: {
        wuzapiUrl: string;
        instanceToken: string;
        phone: string;
        audioBase64: string;
        mimeType?: string;
        seconds?: number;
        customId?: string;
    }): Promise<any> => {
        try {
            // Generate simple waveform (can be improved later)
            const waveform = Array(32).fill(0).map(() => Math.floor(Math.random() * 25));

            const payload: any = {
                Phone: phone,
                Audio: audioBase64.startsWith('data:') ? audioBase64 : `data:audio/ogg;base64,${audioBase64}`,
                PTT: true,
                MimeType: mimeType,
                Seconds: seconds,
                Waveform: waveform
            };

            // Adicionar ID customizado se fornecido
            if (customId) {
                payload.Id = customId;
            }

            const { data } = await axios.post(
                `${wuzapiUrl}/chat/send/audio`,
                payload,
                {
                    headers: {
                        token: instanceToken,
                        accept: "application/json",
                        "Content-Type": "application/json"
                    }
                }
            );

            if (!data.success) {
                throw new AppError("ERR_WUZAPI_SEND_AUDIO_PTT");
            }

            logger.info(`Wuzapi audio PTT sent to ${phone}, duration: ${seconds}s, messageId: ${customId || data.data?.id}`);
            return data;
        } catch (err) {
            logger.error(`Error sending Wuzapi audio PTT: ${err}`);
            throw new AppError("ERR_WUZAPI_SEND_AUDIO_PTT");
        }
    }
};

export default SendWuzapiMessage;
