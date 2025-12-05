import { join } from "path";
import { promisify } from "util";
import { writeFile, unlink } from "fs";
import { exec as execCb } from "child_process";
import * as Sentry from "@sentry/node";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";

import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { logger } from "../../utils/logger";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { getIO } from "../../libs/socket";
import { AdaptedMessage } from "./WuzapiMessageAdapter";
import DownloadMediaService from "./DownloadMediaService"; // Import the new service

const writeFileAsync = promisify(writeFile);
const unlinkAsync = promisify(unlink);
const exec = promisify(execCb);

const verifyContact = async (msg: AdaptedMessage): Promise<Contact> => {
    const contactData = {
        name: msg.pushName || msg.from.replace(/@c.us$/, ""),
        number: msg.from.replace(/@c.us$/, ""),
        isGroup: false // Assuming it's not a group for now
    };

    const contact = await CreateOrUpdateContactService(contactData);
    return contact;
};

// generate random id string for file names, function got from: https://stackoverflow.com/a/1349426/1851801
function makeRandomId(length: number) {
    let result = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

const verifyMediaMessage = async (
    msg: AdaptedMessage,
    ticket: Ticket,
    contact: Contact,
    whatsapp: Whatsapp
): Promise<Message> => {

    const { media } = msg;
    if (!media) {
        throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
    }

    let finalFilename: string;
    let finalMediaType: string;

    const { Message: rawMessage } = msg.event; // Access the raw message from the event

    // Check if it's a video message with a URL to download
    if (rawMessage.videoMessage && rawMessage.videoMessage.URL) {
        logger.info("Detected video message with URL, using DownloadMediaService");
        const downloadedMedia = await DownloadMediaService({
            URL: rawMessage.videoMessage.URL,
            DirectPath: rawMessage.videoMessage.directPath,
            Mimetype: rawMessage.videoMessage.mimetype,
            FileEncSHA256: rawMessage.videoMessage.fileEncSHA256,
            FileSHA256: rawMessage.videoMessage.fileSHA256,
            FileLength: rawMessage.videoMessage.fileLength,
            MediaKey: rawMessage.videoMessage.mediaKey,
            FileName: media.filename, // Use original filename for consistency
            wuzapiUrl: whatsapp.wuzapiUrl,
            instanceToken: whatsapp.wuzapiToken
        });
        finalFilename = downloadedMedia.fileName;
        finalMediaType = downloadedMedia.mediaType;
    } else {
        // Fallback to existing base64 handling for other media types (images, audio, documents without URL)
        // This block will also handle base64 videos if no URL is provided,
        // though it might not be the full video.
        logger.info("Detected media message without URL or non-video, using base64 handling");
        const randomId = makeRandomId(5);
        const originalFilename = media.filename.split(".")[0] || randomId;
        const timestamp = new Date().getTime();

        finalMediaType = media.mimetype.split("/")[0];

        const isF4V = media.mimetype.includes("f4v") || media.mimetype.includes("video/f4v") || media.filename.toLowerCase().endsWith(".f4v");
        const isOggAudio = finalMediaType === "audio" && media.mimetype.includes("ogg");

        if (isOggAudio) {
            const inputOggName = `${originalFilename}-${timestamp}.ogg`;
            const oggPath = join(__dirname, "..", "..", "..", "public", inputOggName);
            finalFilename = inputOggName; // fallback

            try {
                await writeFileAsync(oggPath, media.data, "base64");

                const outputMp4Name = `${originalFilename}-${timestamp}.mp4`;
                const mp4Path = join(__dirname, "..", "..", "..", "public", outputMp4Name);

                try {
                    // Command for converting ogg audio to aac audio in mp4 container
                    const { stdout, stderr } = await exec(`ffmpeg -i "${oggPath}" -c:a aac "${mp4Path}"`);
                    logger.info(`FFmpeg (ogg->mp4) stdout: ${stdout}`);
                    logger.warn(`FFmpeg (ogg->mp4) stderr: ${stderr}`);
                    finalFilename = outputMp4Name;
                    finalMediaType = "audio"; // Ensure media type is correctly set after conversion
                    await unlinkAsync(oggPath);
                } catch (e) {
                    logger.warn("Could not convert audio (ogg) to mp4. Using ogg. Is ffmpeg installed? Ensure aac encoder is available.", e);
                    if (e.stderr) logger.error(`FFmpeg (ogg->mp4) conversion error stderr: ${e.stderr}`);
                    if (e.stdout) logger.error(`FFmpeg (ogg->mp4) conversion error stdout: ${e.stdout}`);
                    finalFilename = inputOggName; // Fallback to original
                }
            } catch (e) {
                logger.error(e);
                Sentry.captureException(e);
                throw e;
            }
        } else if (isF4V) { // Check for F4V specifically
            finalMediaType = "video"; // Force media type to video for F4V conversions
            const inputF4VName = `${originalFilename}-${timestamp}.f4v`;
            const f4vPath = join(__dirname, "..", "..", "..", "public", inputF4VName);
            finalFilename = inputF4VName; // fallback

            try {
                await writeFileAsync(f4vPath, media.data, "base64");

                const outputMp4Name = `${originalFilename}-${timestamp}.mp4`;
                const mp4Path = join(__dirname, "..", "..", "..", "public", outputMp4Name);

                try {
                    const { stdout, stderr } = await exec(`ffmpeg -i "${f4vPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -vf format=yuv420p -movflags +faststart "${mp4Path}"`);
                    logger.info(`FFmpeg (f4v->mp4) stdout: ${stdout}`);
                    logger.warn(`FFmpeg (f4v->mp4) stderr: ${stderr}`); // ffmpeg often logs info to stderr
                    finalFilename = outputMp4Name;
                    await unlinkAsync(f4vPath);
                } catch (e) {
                    logger.warn("Could not convert video (f4v) to mp4. Using original f4v. Is ffmpeg installed? Ensure libx264 and aac encoders are available.", e);
                    if (e.stderr) logger.error(`FFmpeg (f4v->mp4) conversion error stderr: ${e.stderr}`);
                    if (e.stdout) logger.error(`FFmpeg (f4v->mp4) conversion error stdout: ${e.stdout}`);
                    finalFilename = inputF4VName; // Fallback to original
                }
            } catch (e) {
                logger.error(e);
                Sentry.captureException(e);
                throw e;
            }
        } else {
            // Generic logic for other media types (image, document, other videos/audios)
            const extension = media.filename.split(".").pop() || media.mimetype.split("/")[1];
            finalFilename = `${originalFilename}-${timestamp}.${extension}`;

            try {
                await writeFileAsync(
                    join(__dirname, "..", "..", "..", "public", finalFilename),
                    media.data,
                    "base64"
                );
            } catch (e) {
                logger.error(e);
                Sentry.captureException(e);
                throw e;
            }
        }
    }

    const messageData = {
        id: msg.id,
        ticketId: ticket.id,
        contactId: contact.id,
        body: msg.body,
        fromMe: msg.fromMe,
        read: msg.fromMe,
        mediaUrl: finalFilename, // Salvar apenas o nome do arquivo, o getter do modelo adiciona /public/
        mediaType: msg.type, // Use msg.type (from Info.MediaType)
        fileName: media.filename,
        createdAt: new Date(msg.timestamp)
    };

    await ticket.update({ lastMessage: msg.body || finalFilename });
    const newMessage = await CreateMessageService({ messageData });

    return newMessage;
};

const verifyMessage = async (
    msg: AdaptedMessage,
    ticket: Ticket,
    contact: Contact
): Promise<void> => {
    const messageData = {
        id: msg.id,
        ticketId: ticket.id,
        contactId: msg.fromMe ? undefined : contact.id,
        body: msg.body,
        fromMe: msg.fromMe,
        mediaType: msg.type,
        read: msg.fromMe,
        createdAt: new Date(msg.timestamp)
    };

    await ticket.update({ lastMessage: msg.body });
    await CreateMessageService({ messageData });
};

const isValidMsg = (msg: AdaptedMessage): boolean => {
    if (
        msg.type === "chat" ||
        msg.type === "text" ||
        msg.type === "audio" ||
        msg.type === "ptt" ||
        msg.type === "video" ||
        msg.type === "image" ||
        msg.type === "document" ||
        msg.type === "vcard" ||
        msg.type === "sticker" ||
        msg.type === "location"
    )
        return true;
    return false;
};

export const handleWuzapiMessage = async (
    msg: AdaptedMessage,
    whatsappId: number
): Promise<void> => {
    if (!isValidMsg(msg)) {
        return;
    }

    try {
        const whatsapp = await ShowWhatsAppService(whatsappId);

        if (!whatsapp) {
            logger.error(`Whatsapp instance not found: ${whatsappId}`);
            return;
        }

        const contact = await verifyContact(msg);

        const unreadMessages = msg.fromMe ? 0 : 1; // Wuzapi doesn't provide unreadCount, defaulting to 1 for incoming messages

        if (
            unreadMessages === 0 &&
            whatsapp.farewellMessage &&
            whatsapp.farewellMessage === msg.body
        )
            return;

        const ticket = await FindOrCreateTicketService(
            contact,
            whatsappId,
            unreadMessages,
            undefined // groupContact - not supported yet for Wuzapi
        );

        if (msg.media) {
            await verifyMediaMessage(msg, ticket, contact, whatsapp);
        } else {
            await verifyMessage(msg, ticket, contact);
        }

        const io = getIO();
        io.to(ticket.status).emit("ticket", {
            action: "update",
            ticket
        });

        logger.info(`Wuzapi message processed: ${msg.id}`);
    } catch (err) {
        logger.error({ err }, "Error handling Wuzapi message.");
        throw err;
    }
};
