import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import WuzapiMessageAdapter from "../services/WuzapiServices/WuzapiMessageAdapter";
import * as WuzapiMessageListener from "../services/WuzapiServices/wuzapiMessageListener";
import { logger } from "../utils/logger";

export const receiveWebhook = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { whatsappId } = req.params;
    const webhookData = req.body;

    try {
        const whatsapp = await Whatsapp.findByPk(whatsappId);

        if (!whatsapp) {
            logger.error(`Whatsapp instance not found: ${whatsappId}`);
            return res.status(404).json({ error: "Whatsapp instance not found" });
        }

        if (whatsapp.type !== "wuzapi") {
            logger.error(`Whatsapp instance is not Wuzapi type: ${whatsappId}`);
            return res.status(400).json({ error: "Invalid instance type" });
        }

        const eventType = webhookData.type;

        // Handle ReadReceipt events (Delivered/Read)
        if (eventType === "ReadReceipt") {
            await WuzapiMessageListener.handleWuzapiReadReceipt(webhookData, whatsapp.id);
            logger.info(`Wuzapi ReadReceipt processed for instance ${whatsappId}: ${webhookData.state}`);
            return res.status(200).json({ success: true });
        }

        // Handle Message events
        if (eventType === "Message") {
            const adaptedMessage = WuzapiMessageAdapter(webhookData);

            if (!adaptedMessage) {
                logger.warn("Wuzapi webhook received an unadaptable message.");
                return res.status(200).json({ message: "Message not adaptable." });
            }

            // Check if it's a deleted message (protocolMessage)
            if (webhookData.event?.Message?.protocolMessage?.type === 0) {
                await WuzapiMessageListener.handleWuzapiDeletedMessage(adaptedMessage);
                logger.info(`Wuzapi deleted message processed for instance ${whatsappId}`);
            } else {
                // Normal message
                await WuzapiMessageListener.handleWuzapiMessage(adaptedMessage, whatsapp.id);
                logger.info(`Wuzapi message processed for instance ${whatsappId}`);
            }

            return res.status(200).json({ success: true });
        }

        // Unknown event type
        logger.warn(`Unknown Wuzapi event type: ${eventType}`);
        return res.status(200).json({ message: "Event type not handled." });
    } catch (err) {
        logger.error({ err }, "Error processing Wuzapi webhook.");
        return res.status(500).json({ error: "Internal server error" });
    }
};
