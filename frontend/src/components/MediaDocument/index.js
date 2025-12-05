import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Button, Typography, Paper } from "@material-ui/core";
import {
    GetApp,
    Description,
    PictureAsPdf,
    TableChart,
    InsertDriveFile,
    Archive,
    Code,
} from "@material-ui/icons";

const useStyles = makeStyles((theme) => ({
    documentContainer: {
        display: "flex",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        maxWidth: 300,
        gap: 12,
    },
    iconContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: "#fff",
    },
    icon: {
        fontSize: 32,
    },
    pdfIcon: {
        color: "#d32f2f",
    },
    docIcon: {
        color: "#1976d2",
    },
    xlsIcon: {
        color: "#388e3c",
    },
    zipIcon: {
        color: "#f57c00",
    },
    codeIcon: {
        color: "#7b1fa2",
    },
    defaultIcon: {
        color: "#757575",
    },
    infoContainer: {
        flex: 1,
        minWidth: 0,
    },
    fileName: {
        fontSize: 14,
        fontWeight: 500,
        color: "#303030",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    fileSize: {
        fontSize: 12,
        color: "#757575",
        marginTop: 2,
    },
    downloadButton: {
        minWidth: "auto",
        padding: "6px 12px",
    },
}));

const MediaDocument = ({ documentUrl, fileName, fileSize }) => {
    const classes = useStyles();
    const [displayName, setDisplayName] = useState("");
    const [displaySize, setDisplaySize] = useState("");
    const [fileExtension, setFileExtension] = useState("");

    useEffect(() => {
        // Extract filename from URL if not provided
        if (!fileName && documentUrl) {
            const urlParts = documentUrl.split("/");
            const urlFileName = urlParts[urlParts.length - 1];
            setDisplayName(decodeURIComponent(urlFileName));
        } else {
            setDisplayName(fileName || "Documento");
        }

        // Extract file extension
        const name = fileName || documentUrl || "";
        const ext = name.split(".").pop()?.toLowerCase() || "";
        setFileExtension(ext);

        // Format file size
        if (fileSize) {
            setDisplaySize(formatFileSize(fileSize));
        }
    }, [documentUrl, fileName, fileSize]);

    const formatFileSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const getFileIcon = () => {
        const iconProps = { className: classes.icon };

        switch (fileExtension) {
            case "pdf":
                return <PictureAsPdf {...iconProps} className={`${classes.icon} ${classes.pdfIcon}`} />;
            case "doc":
            case "docx":
                return <Description {...iconProps} className={`${classes.icon} ${classes.docIcon}`} />;
            case "xls":
            case "xlsx":
            case "csv":
                return <TableChart {...iconProps} className={`${classes.icon} ${classes.xlsIcon}`} />;
            case "zip":
            case "rar":
            case "7z":
                return <Archive {...iconProps} className={`${classes.icon} ${classes.zipIcon}`} />;
            case "js":
            case "jsx":
            case "ts":
            case "tsx":
            case "html":
            case "css":
            case "json":
            case "xml":
                return <Code {...iconProps} className={`${classes.icon} ${classes.codeIcon}`} />;
            default:
                return <InsertDriveFile {...iconProps} className={`${classes.icon} ${classes.defaultIcon}`} />;
        }
    };

    return (
        <Paper className={classes.documentContainer} elevation={0}>
            <div className={classes.iconContainer}>
                {getFileIcon()}
            </div>

            <div className={classes.infoContainer}>
                <Typography className={classes.fileName} title={displayName}>
                    {displayName}
                </Typography>
                {displaySize && (
                    <Typography className={classes.fileSize}>
                        {displaySize}
                    </Typography>
                )}
            </div>

            <Button
                className={classes.downloadButton}
                variant="contained"
                color="primary"
                size="small"
                startIcon={<GetApp />}
                href={documentUrl}
                target="_blank"
                download
            >
                Baixar
            </Button>
        </Paper>
    );
};

export default MediaDocument;
