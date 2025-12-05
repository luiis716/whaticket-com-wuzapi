import { join } from "path";
import { promisify } from "util";
import { writeFile, unlink } from "fs";
import { exec as execCb } from "child_process";
import * as Sentry from "@sentry/node";
import axios from "axios";

import { logger } from "../../utils/logger";

const writeFileAsync = promisify(writeFile);
const unlinkAsync = promisify(unlink);
const exec = promisify(execCb);

interface MediaDetails {
    URL: string;
    DirectPath: string;
    Mimetype: string;
    FileEncSHA256: string;
    FileSHA256: string;
    FileLength: number;
    MediaKey?: string; // Optional, might not always be present or needed for direct download
    FileName?: string; // Original filename from webhook, if available
    wuzapiUrl: string; // Base URL da instância Wuzapi
    instanceToken: string; // Token da instância Wuzapi
}

// generate random id string for file names, function got from: https://stackoverflow.com/a/1349426/1851801
function makeRandomId(length: number) {
    let result = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

const DownloadMediaService = async (
    mediaDetails: MediaDetails
): Promise<{ fileName: string; mediaType: string }> => {
    const {
        URL,
        DirectPath,
        Mimetype,
        FileEncSHA256,
        FileSHA256,
        FileLength,
        MediaKey,
        FileName,
        wuzapiUrl,
        instanceToken
    } = mediaDetails;

    if (!URL || !wuzapiUrl || !instanceToken) {
        throw new Error("ERR_WUZAPI_DOWNLOAD_MEDIA_MISSING_PARAMS");
    }

    const randomId = makeRandomId(5);
    const originalFilename = FileName?.split(".")[0] || randomId;
    const timestamp = new Date().getTime();

    let finalFilename: string;
    let finalMediaType = "video";

    try {
        // Usar o endpoint oficial do Wuzapi para baixar e decodificar o vídeo.
        // Esse endpoint retorna JSON com o campo Data em base64,
        // no formato: "data:video/mp4;base64,AAAA..."
        const { data } = await axios.post(
            `${wuzapiUrl}/chat/downloadvideo`,
            {
                Url: URL,
                DirectPath,
                MediaKey,
                Mimetype,
                FileEncSHA256,
                FileSHA256,
                FileLength
            },
            {
                headers: {
                    token: instanceToken,
                    "Content-Type": "application/json"
                }
                // responseType padrão (json)
            }
        );
        // data vem no formato:
        // { code: 200, data: { Data: "data:video/mp4;base64,AAA...", Mimetype: "video/mp4" }, success: true }
        const base64Wrapper: string | undefined =
            data?.data?.Data || data?.Data;

        if (!base64Wrapper) {
            throw new Error("ERR_WUZAPI_DOWNLOAD_MEDIA_NO_DATA");
        }

        // Remover o prefixo "data:video/mp4;base64," se existir
        const base64String = base64Wrapper.includes(",")
            ? base64Wrapper.split(",")[1]
            : base64Wrapper;

        const mediaBuffer = Buffer.from(base64String, "base64");

        // Sempre salvar como mp4, pois o endpoint já devolve o vídeo pronto para reprodução
        const outputMp4Name = `${originalFilename}-${timestamp}.mp4`;
        const mp4Path = join(__dirname, "..", "..", "..", "public", outputMp4Name);

        await writeFileAsync(mp4Path, mediaBuffer);

        finalFilename = outputMp4Name;
        finalMediaType = "video";
    } catch (err) {
        logger.error({ err }, "Error downloading media from Wuzapi downloadvideo endpoint.");
        Sentry.captureException(err);
        throw err;
    }

    return { fileName: finalFilename, mediaType: finalMediaType };
};

export default DownloadMediaService;
