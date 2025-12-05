import axios from "axios";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

interface Request {
    wuzapiUrl: string;
    wuzapiAdminToken: string;
    instanceId: string;
}

const DeleteWuzapiInstance = async ({
    wuzapiUrl,
    wuzapiAdminToken,
    instanceId
}: Request): Promise<void> => {
    try {
        await axios.delete(`${wuzapiUrl}/admin/users/${instanceId}`, {
            headers: {
                Authorization: wuzapiAdminToken
            }
        });

        logger.info(`Wuzapi instance deleted: ${instanceId}`);
    } catch (err) {
        logger.error(`Error deleting Wuzapi instance: ${err}`);
        throw new AppError("ERR_WUZAPI_DELETE_INSTANCE");
    }
};

export default DeleteWuzapiInstance;
