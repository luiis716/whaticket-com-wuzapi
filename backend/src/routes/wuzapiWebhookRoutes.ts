import { Router } from "express";
import * as WuzapiWebhookController from "../controllers/WuzapiWebhookController";

const wuzapiWebhookRoutes = Router();

// Rota pública para receber webhooks do Wuzapi
wuzapiWebhookRoutes.post(
    "/webhooks/wuzapi/:whatsappId",
    WuzapiWebhookController.receiveWebhook
);

export default wuzapiWebhookRoutes;
