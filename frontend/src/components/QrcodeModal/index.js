import React, { useEffect, useState } from "react";
import QRCode from "qrcode.react";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";

import { Dialog, DialogContent, Paper, Typography } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";

const QrcodeModal = ({ open, onClose, whatsAppId }) => {
	const [qrCode, setQrCode] = useState("");

	useEffect(() => {
		const fetchSession = async () => {
			if (!whatsAppId) return;

			try {
				const { data } = await api.get(`/whatsapp/${whatsAppId}`);
				console.log("QR Code data from API:", data.qrcode?.substring(0, 50) + "...");
				setQrCode(data.qrcode);

				// Se for Wuzapi, iniciar polling de status
				if (data.type === "wuzapi") {
					startWuzapiPolling(whatsAppId);
				}
			} catch (err) {
				toastError(err);
			}
		};
		fetchSession();
	}, [whatsAppId]);

	const startWuzapiPolling = (whatsAppId) => {
		const pollInterval = setInterval(async () => {
			try {
				const { data } = await api.get(`/wuzapi-session/${whatsAppId}/status`);

				// Se conectado e logado, fechar modal
				if (data.connected && data.loggedIn) {
					clearInterval(pollInterval);
					onClose();
				}

				// Atualizar QR code se mudou
				if (data.qrcode && data.qrcode !== qrCode) {
					setQrCode(data.qrcode);
				}
			} catch (err) {
				console.error("Error polling Wuzapi status:", err);
			}
		}, 5000); // Poll a cada 5 segundos

		// Limpar intervalo quando modal fechar
		return () => clearInterval(pollInterval);
	};

	useEffect(() => {
		if (!whatsAppId) return;
		const socket = openSocket();

		socket.on("whatsappSession", data => {
			if (data.action === "update" && data.session.id === whatsAppId) {
				setQrCode(data.session.qrcode);
			}

			if (data.action === "update" && data.session.qrcode === "") {
				onClose();
			}
		});

		socket.on("whatsapp", data => {
			if (data.action === "update" && data.whatsapp.id === whatsAppId) {
				// Se status mudou para CONNECTED, fechar modal
				if (data.whatsapp.status === "CONNECTED") {
					onClose();
				}
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [whatsAppId, onClose]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" scroll="paper">
			<DialogContent>
				<Paper elevation={0}>
					<Typography color="primary" gutterBottom>
						{i18n.t("qrCode.message")}
					</Typography>
					{qrCode ? (
						qrCode.startsWith("data:image") ? (
							<img src={qrCode} alt="QR Code" style={{ width: 256, height: 256 }} />
						) : (
							<QRCode value={qrCode} size={256} />
						)
					) : (
						<span>Waiting for QR Code</span>
					)}
				</Paper>
			</DialogContent>
		</Dialog>
	);
};

export default React.memo(QrcodeModal);
