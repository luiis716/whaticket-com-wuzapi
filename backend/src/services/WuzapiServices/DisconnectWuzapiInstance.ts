import axios from "axios";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

interface Request {
    wuzapiUrl: string;
    instanceToken: string;
}

const DisconnectWuzapiInstance = async ({
    wuzapiUrl,
    instanceToken
}: Request): Promise<void> => {
    try {
        // Disconnect instance
        const { data } = await axios.post(
            `${wuzapiUrl}/session/disconnect`,
            {},
            {
                headers: {
                    token: instanceToken
                }
            }
        );

        if (data.success) {
            logger.info("Wuzapi instance disconnected successfully");
        } else {
            logger.warn(`Wuzapi disconnect returned: ${JSON.stringify(data)}`);
        }
    } catch (err: any) {
        logger.error(`Error disconnecting Wuzapi instance: ${err.message}`);
        // Não lançar erro se a desconexão foi bem sucedida na API
        if (err.response?.status === 200 || err.response?.data?.success) {
            logger.info("Wuzapi disconnected despite error response");
            return;
        }
        throw new AppError("ERR_WUZAPI_DISCONNECT");
    }
};

export default DisconnectWuzapiInstance;
