import { Request, Response } from "express";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId
  });

  SetTicketMessagesAsRead(ticket);

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg, mediaUrl, mediaType }: any = req.body;
  const medias = req.files as Express.Multer.File[];

  const ticket = await ShowTicketService(ticketId);

  SetTicketMessagesAsRead(ticket);

  // Handle audio URL (or other media URLs)
  if (mediaUrl && mediaType) {
    const Whatsapp = (await import("../models/Whatsapp")).default;
    const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);

    if (!whatsapp) {
      throw new Error("WhatsApp not found");
    }

    if (whatsapp.type === "wuzapi") {
      const SendWuzapiMessage = (await import("../services/WuzapiServices/SendWuzapiMessage")).default;

      if (!whatsapp.wuzapiUrl || !whatsapp.wuzapiToken) {
        throw new Error("Wuzapi not configured");
      }

      await SendWuzapiMessage.sendMedia({
        wuzapiUrl: whatsapp.wuzapiUrl,
        instanceToken: whatsapp.wuzapiToken,
        phone: ticket.contact.number,
        mediaUrl,
        caption: body,
        mediaType,
        fileName: undefined
      });

      await ticket.update({ lastMessage: body || `${mediaType} sent` });
    } else {
      throw new Error("Media URL sending only supported for Wuzapi");
    }
  } else if (medias) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File) => {
        await SendWhatsAppMedia({ media, ticket });
      })
    );
  } else {
    await SendWhatsAppMessage({ body, ticket, quotedMsg });
  }

  return res.send();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;

  const message = await DeleteWhatsAppMessage(messageId);

  const io = getIO();
  io.to(message.ticketId.toString()).emit("appMessage", {
    action: "update",
    message
  });

  return res.send();
};
