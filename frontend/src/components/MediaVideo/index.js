import React, { useState, useRef, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { CircularProgress, IconButton, Typography } from "@material-ui/core";
import { PlayArrow, Pause, VolumeUp, VolumeOff, Fullscreen } from "@material-ui/icons";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
    videoContainer: {
        position: "relative",
        width: "100%",
        maxWidth: 300,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#000",
        cursor: "pointer",
    },
    video: {
        width: "100%",
        height: "auto",
        display: "block",
        maxHeight: 400,
        minHeight: 200,
    },
    loadingContainer: {
        width: "100%",
        maxWidth: 300,
        minHeight: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        borderRadius: 8,
    },
    controls: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
        padding: "10px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: 0,
        transition: "opacity 0.3s",
        "$videoContainer:hover &": {
            opacity: 1,
        },
    },
    playButton: {
        color: "#fff",
        padding: 4,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: 2,
        cursor: "pointer",
        position: "relative",
    },
    progress: {
        height: "100%",
        backgroundColor: "#fff",
        borderRadius: 2,
        transition: "width 0.1s",
    },
    volumeButton: {
        color: "#fff",
        padding: 4,
    },
    fullscreenButton: {
        color: "#fff",
        padding: 4,
    },
    duration: {
        color: "#fff",
        fontSize: 12,
        minWidth: 45,
        textAlign: "center",
    },
    thumbnail: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
        cursor: "pointer",
        transition: "opacity 0.3s",
    },
    playIcon: {
        fontSize: "4rem",
        color: "#fff",
    }
}));

const MediaVideo = ({ videoUrl }) => {
    const classes = useStyles();
    const videoRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [muted, setMuted] = useState(false);
    const [showThumbnail, setShowThumbnail] = useState(true);
    const [blobUrl, setBlobUrl] = useState("");
    const [error, setError] = useState(false);
    const blobUrlRef = useRef("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");

    useEffect(() => {
        if (!videoUrl) return;

        const fetchVideo = async () => {
            try {
                // Se a URL já é uma data URL ou blob URL, usar diretamente
                if (videoUrl.startsWith("data:") || videoUrl.startsWith("blob:")) {
                    setBlobUrl(videoUrl);
                    setLoading(false);
                    return;
                }

                // Para vídeos, sempre usar api.get para garantir autenticação e CORS
                // Mesmo se for URL completa, precisamos passar pelas credenciais
                let urlToFetch = videoUrl;
                
                // Se é URL completa, extrair apenas o path para usar com api.get
                if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
                    try {
                        const videoUrlObj = new URL(videoUrl);
                        // Extrair apenas o pathname + search para usar com api.get
                        // Isso garante que as credenciais sejam enviadas
                        urlToFetch = videoUrlObj.pathname + videoUrlObj.search;
                    } catch (e) {
                        // Se falhar ao parsear, tentar extrair manualmente
                        const match = videoUrl.match(/https?:\/\/[^\/]+(\/.*)/);
                        if (match) {
                            urlToFetch = match[1];
                        }
                    }
                }

                const { data, headers } = await api.get(urlToFetch, {
                    responseType: "blob",
                });
                const url = window.URL.createObjectURL(
                    new Blob([data], { type: headers["content-type"] || "video/mp4" })
                );
                // Limpar blob URL anterior se existir
                if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
                    window.URL.revokeObjectURL(blobUrlRef.current);
                }
                blobUrlRef.current = url;
                setBlobUrl(url);
                setLoading(false);
            } catch (err) {
                console.error("Error loading video:", err);
                setError(true);
                setLoading(false);
            }
        };

        fetchVideo();

        return () => {
            // Cleanup do blob URL quando videoUrl mudar ou componente desmontar
            if (blobUrlRef.current && blobUrlRef.current.startsWith("blob:")) {
                window.URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = "";
            }
        };
    }, [videoUrl]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !blobUrl) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            setLoading(false);
            // Criar thumbnail do vídeo
            try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const thumbnail = canvas.toDataURL("image/jpeg", 0.8);
                setThumbnailUrl(thumbnail);
            } catch (err) {
                console.log("Could not generate thumbnail:", err);
            }
        };

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            setProgress((video.currentTime / video.duration) * 100);
        };

        const handleEnded = () => {
            setPlaying(false);
            setShowThumbnail(true);
        };

        const handleError = () => {
            setError(true);
            setLoading(false);
        };

        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("ended", handleEnded);
        video.addEventListener("error", handleError);

        return () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("ended", handleEnded);
            video.removeEventListener("error", handleError);
        };
    }, [blobUrl]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (playing) {
            video.pause();
        } else {
            video.play();
            setShowThumbnail(false);
        }
        setPlaying(!playing);
    };

    const handleProgressClick = (e) => {
        const video = videoRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    };

    const toggleMute = () => {
        const video = videoRef.current;
        video.muted = !muted;
        setMuted(!muted);
    };

    const toggleFullscreen = () => {
        const video = videoRef.current;
        if (video.requestFullscreen) {
            video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
            video.msRequestFullscreen();
        }
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (loading) {
        return (
            <div className={classes.loadingContainer}>
                <CircularProgress style={{ color: "#fff" }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={classes.loadingContainer}>
                <Typography style={{ color: "#fff", textAlign: "center", padding: 20 }}>
                    Erro ao carregar vídeo
                </Typography>
            </div>
        );
    }

    if (!blobUrl) {
        return null;
    }

    return (
        <div className={classes.videoContainer}>
            <video
                ref={videoRef}
                className={classes.video}
                src={blobUrl}
                onClick={togglePlay}
                preload="metadata"
                poster={thumbnailUrl}
            />

            {showThumbnail && !playing && (
                <div className={classes.thumbnail} onClick={togglePlay}>
                    {thumbnailUrl ? (
                        <img 
                            src={thumbnailUrl} 
                            alt="Video thumbnail" 
                            style={{ 
                                width: "100%", 
                                height: "100%", 
                                objectFit: "cover",
                                opacity: 0.7
                            }} 
                        />
                    ) : null}
                    <PlayArrow 
                        className={classes.playIcon}
                        style={{ 
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)"
                        }}
                    />
                </div>
            )}

            <div className={classes.controls}>
                <IconButton
                    className={classes.playButton}
                    onClick={togglePlay}
                    size="small"
                >
                    {playing ? <Pause /> : <PlayArrow />}
                </IconButton>

                <div className={classes.progressBar} onClick={handleProgressClick}>
                    <div className={classes.progress} style={{ width: `${progress}%` }} />
                </div>

                <span className={classes.duration}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <IconButton
                    className={classes.volumeButton}
                    onClick={toggleMute}
                    size="small"
                >
                    {muted ? <VolumeOff /> : <VolumeUp />}
                </IconButton>

                <IconButton
                    className={classes.fullscreenButton}
                    onClick={toggleFullscreen}
                    size="small"
                >
                    <Fullscreen />
                </IconButton>
            </div>
        </div>
    );
};

export default MediaVideo;
