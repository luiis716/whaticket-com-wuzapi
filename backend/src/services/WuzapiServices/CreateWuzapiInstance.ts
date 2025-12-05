import axios from "axios";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

interface Request {
    name: string;
    wuzapiUrl: string;
    wuzapiAdminToken: string;
    webhookUrl: string;
}

interface Response {
    instanceId: string;
    instanceToken: string;
}

const CreateWuzapiInstance = async ({
    name,
    wuzapiUrl,
    wuzapiAdminToken,
    webhookUrl
}: Request): Promise<Response> => {
    try {
        const { data } = await axios.post(
            `${wuzapiUrl}/admin/users`,
            {
                name,
                token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                webhook: webhookUrl,
                events: ["Message", "ReadReceipt"]
            },
            {
                headers: {
                    Authorization: wuzapiAdminToken,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!data.success || !data.data) {
            throw new AppError("ERR_WUZAPI_CREATE_INSTANCE");
        }

        logger.info(`Wuzapi instance created: ${data.data.id}`);

        return {
            instanceId: data.data.id,
            instanceToken: data.data.token
        };
    } catch (err) {
        logger.error(`Error creating Wuzapi instance: ${err}`);
        throw new AppError("ERR_WUZAPI_CREATE_INSTANCE");
    }
};

export default CreateWuzapiInstance;
