import axios from "axios";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

interface Request {
    wuzapiUrl: string;
    instanceToken: string;
}

interface Response {
    connected: boolean;
    loggedIn: boolean;
    qrcode: string;
    jid: string;
}

const GetWuzapiStatus = async ({
    wuzapiUrl,
    instanceToken
}: Request): Promise<Response> => {
    try {
        const { data } = await axios.get(`${wuzapiUrl}/session/status`, {
            headers: {
                token: instanceToken
            }
        });

        if (!data.success || !data.data) {
            throw new AppError("ERR_WUZAPI_STATUS");
        }

        return {
            connected: data.data.connected || false,
            loggedIn: data.data.loggedIn || false,
            qrcode: data.data.qrcode || "",
            jid: data.data.jid || ""
        };
    } catch (err) {
        logger.error(`Error getting Wuzapi status: ${err}`);
        throw new AppError("ERR_WUZAPI_STATUS");
    }
};

export default GetWuzapiStatus;
