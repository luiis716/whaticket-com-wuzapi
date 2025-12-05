import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { CircularProgress, Backdrop, IconButton } from "@material-ui/core";
import { Close, ZoomIn, ZoomOut } from "@material-ui/icons";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
    imageContainer: {
        position: "relative",
        display: "inline-block",
    },
    messageMedia: {
        objectFit: "cover",
        width: "100%",
        maxWidth: 300,
        height: "auto",
        maxHeight: 400,
        borderRadius: 8,
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        display: "block",
        "&:hover": {
            transform: "scale(1.02)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        },
    },
    skeleton: {
        width: 250,
        height: 200,
        borderRadius: 8,
        backgroundColor: "#e0e0e0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    fullImage: {
        maxWidth: "90vw",
        maxHeight: "90vh",
        objectFit: "contain",
        transition: "transform 0.3s ease",
    },
    closeButton: {
        position: "absolute",
        top: 20,
        right: 20,
        color: "#fff",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
    },
    zoomControls: {
        position: "absolute",
        bottom: 20,
        display: "flex",
        gap: 10,
    },
    zoomButton: {
        color: "#fff",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
    },
    errorContainer: {
        width: 250,
        height: 200,
        borderRadius: 8,
        backgroundColor: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#999",
        fontSize: 14,
    },
}));

const MediaImage = ({ imageUrl }) => {
    const classes = useStyles();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [blobUrl, setBlobUrl] = useState("");
    const [open, setOpen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const blobUrlRef = useRef("");

    useEffect(() => {
        if (!imageUrl) return;

        const fetchImage = async () => {
            try {
                // Se a URL já é uma data URL ou blob URL, usar diretamente
                if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
                    setBlobUrl(imageUrl);
                    setLoading(false);
                    return;
                }

                // Se é uma URL completa (http/https), usar diretamente
                if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
                    setBlobUrl(imageUrl);
                    setLoading(false);
                    return;
                }

                // Se é uma URL relativa, usar api.get
                const { data, headers } = await api.get(imageUrl, {
                    responseType: "blob",
                });
                const url = window.URL.createObjectURL(
                    new Blob([data], { type: headers["content-type"] || "image/jpeg" })
                );
                // Limpar blob URL anterior se existir
                if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
                    window.URL.revokeObjectURL(blobUrlRef.current);
                }
                blobUrlRef.current = url;
                setBlobUrl(url);
                setLoading(false);
            } catch (err) {
                console.error("Error loading image:", err);
                setError(true);
                setLoading(false);
            }
        };

        fetchImage();

        return () => {
            // Cleanup do blob URL quando imageUrl mudar ou componente desmontar
            if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
                window.URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = "";
            }
        };
    }, [imageUrl]);

    const handleOpen = () => {
        setOpen(true);
        setZoom(1);
    };

    const handleClose = () => {
        setOpen(false);
        setZoom(1);
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.5, 3));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.5, 0.5));
    };

    if (loading) {
        return (
            <div className={classes.skeleton}>
                <CircularProgress size={40} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={classes.errorContainer}>
                Erro ao carregar imagem
            </div>
        );
    }

    return (
        <>
            <div className={classes.imageContainer}>
                <img
                    src={blobUrl}
                    alt="Imagem"
                    className={classes.messageMedia}
                    onClick={handleOpen}
                />
            </div>

            <Backdrop className={classes.backdrop} open={open} onClick={handleClose}>
                <IconButton
                    className={classes.closeButton}
                    onClick={handleClose}
                >
                    <Close />
                </IconButton>

                <img
                    src={blobUrl}
                    alt="Imagem ampliada"
                    className={classes.fullImage}
                    style={{ transform: `scale(${zoom})` }}
                    onClick={(e) => e.stopPropagation()}
                />

                <div className={classes.zoomControls} onClick={(e) => e.stopPropagation()}>
                    <IconButton
                        className={classes.zoomButton}
                        onClick={handleZoomOut}
                        disabled={zoom <= 0.5}
                    >
                        <ZoomOut />
                    </IconButton>
                    <IconButton
                        className={classes.zoomButton}
                        onClick={handleZoomIn}
                        disabled={zoom >= 3}
                    >
                        <ZoomIn />
                    </IconButton>
                </div>
            </Backdrop>
        </>
    );
};

export default MediaImage;
