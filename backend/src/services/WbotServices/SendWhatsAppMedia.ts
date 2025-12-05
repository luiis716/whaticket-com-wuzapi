import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuid } from "uuid";
import {
  MessageMedia,
  Message as WbotMessage,
  MessageSendOptions
} from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import SendWuzapiMessage from "../WuzapiServices/SendWuzapiMessage";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { logger } from "../../utils/logger";

import formatBody from "../../helpers/Mustache";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<WbotMessage> => {
  // Buscar whatsapp para verificar tipo
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);

  if (!whatsapp) {
    throw new AppError("ERR_WAPP_NOT_FOUND");
  }

  // Se for Wuzapi, usar API externa
  if (whatsapp.type === "wuzapi") {
    if (!whatsapp.wuzapiUrl || !whatsapp.wuzapiToken) {
      throw new AppError("ERR_WUZAPI_NOT_CONFIGURED");
    }

    try {
      const hasBody = body
        ? formatBody(body as string, ticket.contact)
        : undefined;

      // Determinar tipo de mídia
      let mediaType: "image" | "video" | "audio" | "document" = "document";
      if (media.mimetype.startsWith("image/")) {
        mediaType = "image";
      } else if (media.mimetype.startsWith("video/")) {
        mediaType = "video";
      } else if (media.mimetype.startsWith("audio/")) {
        mediaType = "audio";
      }

      // Se for áudio, usar PTT (Push To Talk - mensagem de voz)
      if (mediaType === "audio") {
        // Converter WebM para OGG/Opus
        const oggFileName = `${Date.now()} -audio.ogg`;
        const publicPath = path.join(__dirname, "../../../public");
        const oggPublicPath = path.join(publicPath, oggFileName);

        await new Promise<void>((resolve, reject) => {
          ffmpeg(media.path)
            .audioCodec('libopus')
            .audioBitrate('64k')
            .audioFrequency(48000)
            .audioChannels(1)
            .format('ogg')
            .on('end', () => resolve())
            .on('error', (err: any) => reject(err))
            .save(oggPublicPath);
        });

        // Ler arquivo OGG convertido e converter para base64
        const audioBuffer = fs.readFileSync(oggPublicPath);
        const audioBase64 = audioBuffer.toString('base64');

        // Determinar duração real do áudio
        const duration = await new Promise<number>((resolve, reject) => {
          ffmpeg.ffprobe(oggPublicPath, (err: any, metadata: any) => {
            if (err) {
              resolve(Math.ceil((audioBuffer.length / 1024) / 16)); // Fallback estimate
            } else {
              resolve(Math.ceil(metadata.format.duration || 0));
            }
          });
        });

        // Gerar ID único para a mensagem
        const messageId = uuid();

        const response = await SendWuzapiMessage.sendAudioPTT({
          wuzapiUrl: whatsapp.wuzapiUrl,
          instanceToken: whatsapp.wuzapiToken,
          phone: ticket.contact.number,
          audioBase64,
          mimeType: "audio/ogg; codecs=opus",
          seconds: duration,
          customId: messageId
        });

        // Gerar URL pública do áudio
        const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
        const audioUrl = `${backendUrl} /public/${oggFileName} `;

        logger.info(`Creating audio message with UUID: ${messageId} `);

        // Criar mensagem no banco de dados com o mesmo ID
        await CreateMessageService({
          messageData: {
            id: messageId,
            ticketId: ticket.id,
            contactId: ticket.contactId,
            body: "🎤 Áudio",
            fromMe: true,
            read: true,
            mediaType: "ptt",
            mediaUrl: audioUrl
          }
        });

        await ticket.update({ lastMessage: "🎤 Áudio" });

        // Limpar arquivo temporário (manter OGG em public)
        fs.unlinkSync(media.path);

        return {} as WbotMessage;
      }

      // Para outros tipos de mídia (imagem, vídeo, documento), usar URL
      const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
      const publicPath = path.join(__dirname, "../../../public");
      const fileName = `${Date.now()} -${media.filename} `;
      const publicFilePath = path.join(publicPath, fileName);

      // Copiar arquivo para pasta pública
      fs.copyFileSync(media.path, publicFilePath);
      const mediaUrl = `${backendUrl} /public/${fileName} `;

      // Gerar ID único para a mensagem  
      const messageId = uuid();

      const response = await SendWuzapiMessage.sendMedia({
        wuzapiUrl: whatsapp.wuzapiUrl,
        instanceToken: whatsapp.wuzapiToken,
        phone: ticket.contact.number,
        mediaUrl,
        caption: hasBody,
        mediaType,
        fileName: media.filename,
        customId: messageId
      });

      logger.info(`Creating ${mediaType} message with UUID: ${messageId} `);

      // Criar mensagem no banco de dados com o mesmo ID
      await CreateMessageService({
        messageData: {
          id: messageId,
          ticketId: ticket.id,
          contactId: ticket.contactId,
          body: hasBody || media.filename,
          fromMe: true,
          read: true,
          mediaType,
          mediaUrl
        }
      });

      await ticket.update({ lastMessage: body || media.filename });

      // Limpar arquivo temporário
      fs.unlinkSync(media.path);

      // Retornar um objeto mock para compatibilidade
      return {} as WbotMessage;
    } catch (err) {
      console.log(err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  // Fluxo normal para wwebjs
  try {
    const wbot = await GetTicketWbot(ticket);
    const hasBody = body
      ? formatBody(body as string, ticket.contact)
      : undefined;

    const newMedia = MessageMedia.fromFilePath(media.path);

    let mediaOptions: MessageSendOptions = {
      caption: hasBody,
      sendAudioAsVoice: true
    };

    if (
      newMedia.mimetype.startsWith("image/") &&
      !/^.*\.(jpe?g|png|gif)?$/i.exec(media.filename)
    ) {
      mediaOptions["sendMediaAsDocument"] = true;
    }

    const sentMessage = await wbot.sendMessage(
      `${ticket.contact.number} @${ticket.isGroup ? "g" : "c"}.us`,
      newMedia,
      mediaOptions
    );

    await ticket.update({ lastMessage: body || media.filename });

    fs.unlinkSync(media.path);

    return sentMessage;
  } catch (err) {
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
