import { Message as WbotMessage } from "whatsapp-web.js";
import { v4 as uuid } from "uuid";

import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import SerializeWbotMsgId from "../../helpers/SerializeWbotMsgId";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import CreateMessageService from "../MessageServices/CreateMessageService";
import SendWuzapiMessage from "../WuzapiServices/SendWuzapiMessage";

import formatBody from "../../helpers/Mustache";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
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
      const formattedBody = formatBody(body, ticket.contact);

      // Gerar ID único para a mensagem
      const messageId = uuid();

      const response = await SendWuzapiMessage.sendText({
        wuzapiUrl: whatsapp.wuzapiUrl,
        instanceToken: whatsapp.wuzapiToken,
        phone: ticket.contact.number,
        body: formattedBody,
        customId: messageId // Enviar nosso ID para o Wuzapi
      });

      // Salvar mensagem no banco de dados local com o mesmo ID
      const messageData = {
        id: messageId,
        ticketId: ticket.id,
        body: formattedBody,
        contactId: ticket.contactId,
        fromMe: true,
        read: true,
        mediaType: "chat",
      };

      await CreateMessageService({ messageData });
      await ticket.update({ lastMessage: formattedBody });

      // Retornar um objeto mock para compatibilidade
      return {} as WbotMessage;
    } catch (err) {
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  // Fluxo normal para wwebjs
  let quotedMsgSerializedId: string | undefined;
  if (quotedMsg) {
    await GetWbotMessage(ticket, quotedMsg.id);
    quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
  }

  const wbot = await GetTicketWbot(ticket);

  try {
    const sentMessage = await wbot.sendMessage(
      `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
      formatBody(body, ticket.contact),
      {
        quotedMessageId: quotedMsgSerializedId,
        linkPreview: false
      }
    );

    await ticket.update({ lastMessage: body });
    return sentMessage;
  } catch (err) {
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
