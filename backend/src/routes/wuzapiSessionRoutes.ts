import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as WuzapiSessionController from "../controllers/WuzapiSessionController";

const wuzapiSessionRoutes = Router();

wuzapiSessionRoutes.get(
    "/wuzapi-session/:whatsappId/qr",
    isAuth,
    WuzapiSessionController.getQRCode
);

wuzapiSessionRoutes.get(
    "/wuzapi-session/:whatsappId/status",
    isAuth,
    WuzapiSessionController.getStatus
);

wuzapiSessionRoutes.post(
    "/wuzapi-session/:whatsappId/connect",
    isAuth,
    WuzapiSessionController.connect
);

wuzapiSessionRoutes.post(
    "/wuzapi-session/:whatsappId/disconnect",
    isAuth,
    WuzapiSessionController.disconnect
);

export default wuzapiSessionRoutes;
