import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  Default,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import Contact from "./Contact";
import Ticket from "./Ticket";

@Table
class Message extends Model<Message> {
  @PrimaryKey
  @Column
  id: string;

  @Default(0)
  @Column
  ack: number;

  @Default(false)
  @Column
  read: boolean;

  @Default(false)
  @Column
  fromMe: boolean;

  @Column(DataType.TEXT)
  body: string;

  @Column(DataType.STRING)
  get mediaUrl(): string | null {
    const rawMediaUrl = this.getDataValue("mediaUrl");
    if (!rawMediaUrl) {
      return null;
    }
    
    // Se já é uma URL completa, retornar como está
    if (rawMediaUrl.startsWith("http://") || rawMediaUrl.startsWith("https://")) {
      return rawMediaUrl;
    }
    
    // Normalizar caminhos começando com "/public/" ou "public/"
    let cleanUrl = rawMediaUrl;
    if (cleanUrl.startsWith("/public/")) {
      cleanUrl = cleanUrl.substring(8); // remove "/public/"
    }
    if (cleanUrl.startsWith("public/")) {
      cleanUrl = cleanUrl.substring(7); // remove "public/"
    }
    
    // Construir URL completa
    let backendUrl = process.env.BACKEND_URL || "http://localhost";
    const port = process.env.PROXY_PORT || process.env.PORT || "8080";

    // Garantir que não tenha barra no final para facilitar o tratamento
    backendUrl = backendUrl.replace(/\/+$/, "");

    const baseUrl = backendUrl.includes(":") ? backendUrl : `${backendUrl}:${port}`;

    // Se o BACKEND_URL já termina com "/public", não adicionar outro "/public"
    if (baseUrl.endsWith("/public")) {
      return `${baseUrl}/${cleanUrl}`;
    }

    return `${baseUrl}/public/${cleanUrl}`;
  }

  @Column
  mediaType: string;

  @Column
  fileName: string;

  @Default(false)
  @Column
  isDeleted: boolean;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  @ForeignKey(() => Message)
  @Column
  quotedMsgId: string;

  @BelongsTo(() => Message, "quotedMsgId")
  quotedMsg: Message;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact, "contactId")
  contact: Contact;
}

export default Message;
