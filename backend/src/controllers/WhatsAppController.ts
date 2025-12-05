import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { removeWbot } from "../libs/wbot";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";

import CreateWuzapiInstance from "../services/WuzapiServices/CreateWuzapiInstance";
import ConnectWuzapiInstance from "../services/WuzapiServices/ConnectWuzapiInstance";
import DeleteWuzapiInstance from "../services/WuzapiServices/DeleteWuzapiInstance";

interface WhatsappData {
  name: string;
  queueIds: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  status?: string;
  isDefault?: boolean;
  type?: string;
  wuzapiUrl?: string;
  wuzapiAdminToken?: string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const whatsapps = await ListWhatsAppsService();

  return res.status(200).json(whatsapps);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    type,
    wuzapiUrl,
    wuzapiAdminToken
  }: WhatsappData = req.body;

  // Apenas Wuzapi é suportado
  if (!type || type !== "wuzapi") {
    return res.status(400).json({ error: "Only Wuzapi type is supported" });
  }

  if (!wuzapiUrl || !wuzapiAdminToken) {
    return res.status(400).json({ error: "Wuzapi URL and Admin Token are required" });
  }

  // Criar registro temporário para obter ID
  const { whatsapp: tempWhatsapp } = await CreateWhatsAppService({
    name,
    status: "DISCONNECTED",
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    type: "wuzapi",
    wuzapiUrl,
    wuzapiAdminToken
  });

  // Gerar URL do webhook
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
  const webhookUrl = `${backendUrl}/webhooks/wuzapi/${tempWhatsapp.id}`;

  try {
    // Criar instância no Wuzapi
    const wuzapiInstance = await CreateWuzapiInstance({
      name,
      wuzapiUrl,
      wuzapiAdminToken,
      webhookUrl
    });

    // Atualizar com os dados da instância
    await tempWhatsapp.update({
      wuzapiInstanceId: wuzapiInstance.instanceId,
      wuzapiToken: wuzapiInstance.instanceToken
    });

    // Verificar status inicial da instância
    const GetWuzapiStatus = require("../services/WuzapiServices/GetWuzapiStatus").default;
    try {
      const status = await GetWuzapiStatus({
        wuzapiUrl,
        instanceToken: wuzapiInstance.instanceToken
      });

      // Atualizar status no banco
      let initialStatus = "DISCONNECTED";
      if (status.connected && status.loggedIn) {
        initialStatus = "CONNECTED";
      } else if (status.connected && !status.loggedIn) {
        initialStatus = "qrcode";
      }

      await tempWhatsapp.update({
        status: initialStatus,
        qrcode: status.qrcode || ""
      });
    } catch (statusErr) {
      // Se falhar ao verificar status, manter como DISCONNECTED
      console.log("Could not verify initial status:", statusErr);
    }

    const io = getIO();
    io.emit("whatsapp", {
      action: "update",
      whatsapp: tempWhatsapp
    });

    return res.status(200).json(tempWhatsapp);
  } catch (err) {
    // Se falhar, deletar a instância temporária
    await tempWhatsapp.destroy();
    throw err;
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;

  const whatsapp = await ShowWhatsAppService(whatsappId);

  return res.status(200).json(whatsapp);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId
  });

  const io = getIO();
  io.emit("whatsapp", {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.emit("whatsapp", {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(whatsapp);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;

  // Buscar whatsapp antes de deletar para verificar tipo
  const whatsapp = await ShowWhatsAppService(whatsappId);

  // Se for Wuzapi, deletar da API externa
  if (whatsapp.type === "wuzapi" && whatsapp.wuzapiUrl && whatsapp.wuzapiInstanceId) {
    const wuzapiAdminToken = process.env.WUZAPI_ADMIN_TOKEN || "";

    if (wuzapiAdminToken) {
      try {
        await DeleteWuzapiInstance({
          wuzapiUrl: whatsapp.wuzapiUrl,
          wuzapiAdminToken,
          instanceId: whatsapp.wuzapiInstanceId
        });
      } catch (err) {
        // Log error but continue with local deletion
        console.error("Error deleting Wuzapi instance:", err);
      }
    }
  } else {
    // Se for wwebjs, remover wbot
    removeWbot(+whatsappId);
  }

  await DeleteWhatsAppService(whatsappId);

  const io = getIO();
  io.emit("whatsapp", {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};
