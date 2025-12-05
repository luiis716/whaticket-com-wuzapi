import axios from "axios";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

interface Request {
    wuzapiUrl: string;
    instanceToken: string;
}

interface Response {
    qrcode: string;
}

const GetWuzapiQRCode = async ({
    wuzapiUrl,
    instanceToken
}: Request): Promise<Response> => {
    try {
        const { data } = await axios.get(`${wuzapiUrl}/session/qr`, {
            headers: {
                token: instanceToken
            }
        });

        if (!data.success || !data.data?.QRCode) {
            throw new AppError("ERR_WUZAPI_QR_CODE");
        }

        return {
            qrcode: data.data.QRCode
        };
    } catch (err) {
        logger.error(`Error getting Wuzapi QR code: ${err}`);
        throw new AppError("ERR_WUZAPI_QR_CODE");
    }
};

export default GetWuzapiQRCode;
