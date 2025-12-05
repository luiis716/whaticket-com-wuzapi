import React, { useRef, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { IconButton, Typography, Chip } from "@material-ui/core";
import { PlayArrow, Pause, Speed } from "@material-ui/icons";

const LS_NAME = 'audioMessageRate';

const useStyles = makeStyles((theme) => ({
    audioContainer: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        borderRadius: 20,
        maxWidth: 280,
        minWidth: 200,
    },
    playButton: {
        padding: 6,
        backgroundColor: theme.palette.primary.main,
        color: "#fff",
        "&:hover": {
            backgroundColor: theme.palette.primary.dark,
        },
    },
    waveformContainer: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: 32,
        cursor: "pointer",
        position: "relative",
    },
    waveBar: {
        flex: 1,
        backgroundColor: "#999",
        borderRadius: 2,
        transition: "height 0.1s, background-color 0.2s",
        "&.active": {
            backgroundColor: theme.palette.primary.main,
        },
    },
    timeDisplay: {
        fontSize: 11,
        color: "#666",
        minWidth: 35,
        textAlign: "right",
    },
    rateChip: {
        height: 24,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        backgroundColor: theme.palette.primary.main,
        color: "#fff",
        "&:hover": {
            backgroundColor: theme.palette.primary.dark,
        },
    },
    hiddenAudio: {
        display: "none",
    },
}));

export default function Audio({ url }) {
    const classes = useStyles();
    const audioRef = useRef(null);
    const [audioRate, setAudioRate] = useState(parseFloat(localStorage.getItem(LS_NAME) || "1"));
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);

    // Generate random waveform heights
    const [waveformHeights] = useState(() => {
        return Array.from({ length: 20 }, () => Math.random() * 0.7 + 0.3);
    });

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.playbackRate = audioRate;
        localStorage.setItem(LS_NAME, audioRate);

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            setProgress((audio.currentTime / audio.duration) * 100);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            setProgress(0);
        };

        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [audioRate]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleRate = () => {
        let newRate = null;
        switch (audioRate) {
            case 0.5:
                newRate = 1;
                break;
            case 1:
                newRate = 1.5;
                break;
            case 1.5:
                newRate = 2;
                break;
            case 2:
                newRate = 0.5;
                break;
            default:
                newRate = 1;
                break;
        }
        setAudioRate(newRate);
    };

    const handleWaveformClick = (e) => {
        const audio = audioRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pos * audio.duration;
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className={classes.audioContainer}>
            <audio ref={audioRef} className={classes.hiddenAudio}>
                <source src={url} type="audio/ogg" />
            </audio>

            <IconButton
                className={classes.playButton}
                onClick={togglePlay}
                size="small"
            >
                {isPlaying ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
            </IconButton>

            <div className={classes.waveformContainer} onClick={handleWaveformClick}>
                {waveformHeights.map((height, index) => {
                    const barProgress = (index / waveformHeights.length) * 100;
                    const isActive = barProgress <= progress;
                    return (
                        <div
                            key={index}
                            className={`${classes.waveBar} ${isActive ? "active" : ""}`}
                            style={{ height: `${height * 100}%` }}
                        />
                    );
                })}
            </div>

            <Typography className={classes.timeDisplay}>
                {formatTime(currentTime)}
            </Typography>

            {isPlaying && (
                <Chip
                    icon={<Speed style={{ fontSize: 14, color: "#fff" }} />}
                    label={`${audioRate}x`}
                    className={classes.rateChip}
                    onClick={toggleRate}
                    size="small"
                />
            )}
        </div>
    );
}