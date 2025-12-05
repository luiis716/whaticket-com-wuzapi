# 🚀 Whaticket com Wuzapi

Sistema de atendimento multicanal com suporte completo para **Wuzapi API**, permitindo múltiplas conexões WhatsApp, gestão de tickets, mensagens de mídia e confirmações de leitura em tempo real.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![React](https://img.shields.io/badge/react-17.0.2-blue)

## ✨ Funcionalidades

### 📱 Integração Wuzapi
- ✅ Suporte completo para Wuzapi API
- ✅ Múltiplas instâncias WhatsApp
- ✅ QR Code para conexão
- ✅ Status de conexão em tempo real
- ✅ Webhooks para eventos

### 💬 Mensagens
- ✅ Envio de texto
- ✅ Envio de áudio (PTT - Push to Talk)
- ✅ Envio de imagens
- ✅ Envio de vídeos
- ✅ Envio de documentos
- ✅ Gravação de áudio nativa (MediaRecorder API)
- ✅ Preview de mensagens enviadas

### 📊 ReadReceipt (Confirmações de Leitura)
- ✅ Mensagem enviada (✓)
- ✅ Mensagem entregue (✓✓ cinza)
- ✅ Mensagem lida (✓✓ azul)
- ✅ Atualização em tempo real via Socket.IO

### 🎯 Recursos Avançados
- ✅ Conversão automática de áudio WebM → OGG/Opus
- ✅ Detecção de mensagens deletadas
- ✅ Sincronização de IDs usando UUID
- ✅ Sistema de tickets e filas
- ✅ Multi-usuários com permissões

## 🛠️ Tecnologias

### Backend
- **Node.js** 14+
- **TypeScript**
- **Express**
- **Sequelize ORM**
- **MySQL**
- **Socket.IO**
- **FFmpeg** (conversão de áudio)

### Frontend
- **React** 17
- **Material-UI**
- **Vite**
- **Axios**
- **Socket.IO Client**

## 📋 Pré-requisitos

- Node.js 14 ou superior
- MySQL 5.7 ou superior
- FFmpeg instalado no sistema
- Conta Wuzapi configurada

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/luiis716/whaticket-com-wuzapi.git
cd whaticket-com-wuzapi
```

### 2. Instale FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Baixe em [ffmpeg.org](https://ffmpeg.org/download.html)

### 3. Configure o Backend

```bash
cd backend
npm install
```

Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite o `.env` com suas configurações:
```env
# Banco de dados
DB_HOST=localhost
DB_DIALECT=mysql
DB_USER=root
DB_PASS=sua_senha
DB_NAME=whaticket

# Backend
BACKEND_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000
PORT=8080

# JWT
JWT_SECRET=sua_chave_secreta_jwt
JWT_REFRESH_SECRET=sua_chave_refresh_jwt

# Wuzapi Admin (obter no painel Wuzapi)
WUZAPI_ADMIN_TOKEN=seu_token_admin_wuzapi
```

Execute as migrações do banco de dados:
```bash
npx sequelize db:migrate
npx sequelize db:seed:all
```

### 4. Configure o Frontend

```bash
cd ../frontend
npm install
```

Crie um arquivo `.env` no frontend:
```env
VITE_BACKEND_URL=http://localhost:8080
```

### 5. Inicie a aplicação

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Acesse: `http://localhost:3000`

**Login padrão:**
- Email: `admin@whaticket.com`
- Senha: `admin`

## 📖 Configuração Wuzapi

### 1. Obtenha as credenciais Wuzapi

Acesse seu painel Wuzapi e obtenha:
- **URL da API Wuzapi** (ex: `https://api.wuzapi.com`)
- **Admin Token** (configure no `.env` como `WUZAPI_ADMIN_TOKEN`)

### 2. Adicione uma conexão WhatsApp

1. Acesse **Conexões** no menu
2. Clique em **Adicionar**
3. Preencha:
   - **Nome:** Nome da conexão
   - **Tipo:** Selecione "Wuzapi"
   - **URL Wuzapi:** URL da sua API Wuzapi
4. Clique em **Salvar**
5. Clique no ícone de QR Code
6. Escaneie com WhatsApp > Dispositivos Conectados

### 3. Configure Webhooks

O sistema cria automaticamente webhooks ao conectar instâncias Wuzapi. Os eventos configurados são:
- `Message` - Recebe mensagens
- `ReadReceipt` - Recebe confirmações de leitura

## 🎮 Uso

### Enviar Mensagens

**Texto:**
```javascript
// Automaticamente sincronizado
Digite no campo de mensagem e pressione Enter
```

**Áudio:**
1. Clique no ícone 🎤
2. Grave seu áudio
3. Clique em ✓ para enviar

**Imagem/Vídeo/Documento:**
1. Clique no ícone 📎
2. Selecione o arquivo
3. Adicione legenda (opcional)
4. Clique em enviar

### Confirmações de Leitura

As mensagens mostram automaticamente:
- ⏰ Relógio: Não enviada
- ✓ 1 check: Enviada
- ✓✓ 2 checks cinza: Entregue
- ✓✓ 2 checks azul: Lida

## 🏗️ Estrutura do Projeto

```
whaticket-com-wuzapi/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── WuzapiSessionController.ts
│   │   │   └── WuzapiWebhookController.ts
│   │   ├── services/
│   │   │   ├── WuzapiServices/
│   │   │   │   ├── SendWuzapiMessage.ts
│   │   │   │   ├── wuzapiMessageListener.ts
│   │   │   │   └── ...
│   │   │   └── WbotServices/
│   │   ├── models/
│   │   ├── routes/
│   │   └── database/
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MessageInput/
│   │   │   ├── MessagesList/
│   │   │   └── ...
│   │   └── pages/
│   └── package.json
│
└── README.md
```

## 🔧 API Endpoints

### Sessões Wuzapi

```
POST   /wuzapi-session/:whatsappId/start     # Iniciar sessão
DELETE /wuzapi-session/:whatsappId           # Deletar sessão
POST   /wuzapi-session/:whatsappId/qrcode    # Obter QR Code
GET    /wuzapi-session/:whatsappId/status    # Verificar status
```

### Webhooks

```
POST /wuzapi-webhook/:whatsappId              # Receber eventos Wuzapi
```

### Mensagens

```
POST /messages/:ticketId                      # Enviar mensagem
```

## 🐛 Troubleshooting

### Erro: "Cannot find ffmpeg"

**Solução:** Instale o FFmpeg no sistema:
```bash
sudo apt-get install ffmpeg
```

### Mensagens não aparecem no chat

**Solução:** Verifique se:
1. O backend está rodando
2. Socket.IO está conectado (veja no console do navegador)
3. As mensagens estão sendo criadas no banco de dados

### ReadReceipt não atualiza

**Solução:** Verifique:
1. Webhook configurado corretamente no Wuzapi
2. Eventos `ReadReceipt` habilitados
3. IDs das mensagens correspondendo (veja logs do backend)

### Áudio não é enviado

**Solução:** Verifique:
1. FFmpeg instalado e acessível
2. Permissão de microfone concedida no navegador
3. Logs do backend para erros de conversão

## 📝 Changelog

### v1.0.0 (2025-12-05)

**Adicionado:**
- Integração completa com Wuzapi API
- Sistema de ReadReceipt (Delivered/Read)
- Envio de mensagens de texto, áudio PTT, imagens, vídeos e documentos
- Conversão automática WebM → OGG/Opus
- Gravação de áudio nativa com MediaRecorder API
- Detecção de mensagens deletadas
- Sincronização de IDs com UUID
- Socket.IO para atualizações em tempo real

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

**André Marques (luiis716)**

- GitHub: [@luiis716](https://github.com/luiis716)
- Repositório: [whaticket-com-wuzapi](https://github.com/luiis716/whaticket-com-wuzapi)

## 🙏 Agradecimentos

- [Wuzapi](https://wuzapi.com) - API WhatsApp
- Comunidade Open Source

---

⭐ Se este projeto te ajudou, considere dar uma estrela no repositório!
