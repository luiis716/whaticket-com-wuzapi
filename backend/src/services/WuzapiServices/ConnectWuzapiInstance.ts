import axios from "axios";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

interface Request {
    wuzapiUrl: string;
    instanceToken: string;
}

const ConnectWuzapiInstance = async ({
    wuzapiUrl,
    instanceToken
}: Request): Promise<void> => {
    try {
        const { data } = await axios.post(
            `${wuzapiUrl}/session/connect`,
            {
                Subscribe: ["Message"],
                Immediate: false
            },
            {
                headers: {
                    token: instanceToken,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!data.success) {
            throw new AppError("ERR_WUZAPI_CONNECT_INSTANCE");
        }

        logger.info("Wuzapi instance connected successfully");
    } catch (err) {
        logger.error(`Error connecting Wuzapi instance: ${err}`);
        throw new AppError("ERR_WUZAPI_CONNECT_INSTANCE");
    }
};

export default ConnectWuzapiInstance;
