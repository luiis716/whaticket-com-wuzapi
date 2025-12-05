import { Request, Response } from "express";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import GetWuzapiQRCode from "../services/WuzapiServices/GetWuzapiQRCode";
import GetWuzapiStatus from "../services/WuzapiServices/GetWuzapiStatus";
import DisconnectWuzapiInstance from "../services/WuzapiServices/DisconnectWuzapiInstance";
import ConnectWuzapiInstance from "../services/WuzapiServices/ConnectWuzapiInstance";
import AppError from "../errors/AppError";

import { getIO } from "../libs/socket";

export const getQRCode = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { whatsappId } = req.params;

    const whatsapp = await ShowWhatsAppService(whatsappId);

    if (whatsapp.type !== "wuzapi") {
        throw new AppError("ERR_WAPP_NOT_WUZAPI");
    }

    if (!whatsapp.wuzapiUrl || !whatsapp.wuzapiToken) {
        throw new AppError("ERR_WUZAPI_NOT_CONFIGURED");
    }

    const { qrcode } = await GetWuzapiQRCode({
        wuzapiUrl: whatsapp.wuzapiUrl,
        instanceToken: whatsapp.wuzapiToken
    });

    return res.status(200).json({ qrcode });
};

export const getStatus = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { whatsappId } = req.params;

    const whatsapp = await ShowWhatsAppService(whatsappId);

    if (whatsapp.type !== "wuzapi") {
        throw new AppError("ERR_WAPP_NOT_WUZAPI");
    }

    if (!whatsapp.wuzapiUrl || !whatsapp.wuzapiToken) {
        throw new AppError("ERR_WUZAPI_NOT_CONFIGURED");
    }

    const status = await GetWuzapiStatus({
        wuzapiUrl: whatsapp.wuzapiUrl,
        instanceToken: whatsapp.wuzapiToken
    });

    // Atualizar status no banco de dados
    let newStatus = "DISCONNECTED";
    if (status.connected && status.loggedIn) {
        newStatus = "CONNECTED";
    } else if (status.connected && !status.loggedIn) {
        newStatus = "qrcode";
    }

    if (whatsapp.status !== newStatus) {
        await whatsapp.update({ status: newStatus, qrcode: status.qrcode });

        const io = getIO();
        io.emit("whatsapp", {
            action: "update",
            whatsapp
        });
    }

    return res.status(200).json(status);
};

export const connect = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { whatsappId } = req.params;

    const whatsapp = await ShowWhatsAppService(whatsappId);

    if (whatsapp.type !== "wuzapi") {
        throw new AppError("ERR_WAPP_NOT_WUZAPI");
    }

    if (!whatsapp.wuzapiUrl || !whatsapp.wuzapiToken) {
        throw new AppError("ERR_WUZAPI_NOT_CONFIGURED");
    }

    // Conectar instância
    await ConnectWuzapiInstance({
        wuzapiUrl: whatsapp.wuzapiUrl,
        instanceToken: whatsapp.wuzapiToken
    });

    // Obter QR Code
    const { qrcode } = await GetWuzapiQRCode({
        wuzapiUrl: whatsapp.wuzapiUrl,
        instanceToken: whatsapp.wuzapiToken
    });

    // Atualizar status para qrcode
    await whatsapp.update({
        qrcode: qrcode,
        status: "qrcode",
        retries: 0
    });

    const io = getIO();
    io.emit("whatsapp", {
        action: "update",
        whatsapp
    });

    return res.status(200).json({ qrcode });
};

export const disconnect = async (
    req: Request,
    res: Response
): Promise<Response> => {
    const { whatsappId } = req.params;

    const whatsapp = await ShowWhatsAppService(whatsappId);

    if (whatsapp.type !== "wuzapi") {
        throw new AppError("ERR_WAPP_NOT_WUZAPI");
    }

    if (!whatsapp.wuzapiUrl || !whatsapp.wuzapiToken) {
        throw new AppError("ERR_WUZAPI_NOT_CONFIGURED");
    }

    await DisconnectWuzapiInstance({
        wuzapiUrl: whatsapp.wuzapiUrl,
        instanceToken: whatsapp.wuzapiToken
    });

    // Verificar status após desconectar
    const status = await GetWuzapiStatus({
        wuzapiUrl: whatsapp.wuzapiUrl,
        instanceToken: whatsapp.wuzapiToken
    });

    // Atualizar status no banco
    let newStatus = "DISCONNECTED";
    if (status.connected && status.loggedIn) {
        newStatus = "CONNECTED";
    } else if (status.connected && !status.loggedIn) {
        newStatus = "qrcode";
    }

    await whatsapp.update({
        status: newStatus,
        qrcode: newStatus === "qrcode" ? status.qrcode : ""
    });

    const io = getIO();
    io.emit("whatsapp", {
        action: "update",
        whatsapp
    });

    return res.status(200).json({ message: "Disconnected successfully", status: newStatus });
};
