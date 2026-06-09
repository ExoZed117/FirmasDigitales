import { Sequelize, DataTypes, Model } from "sequelize";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ override: true });

const dialect = (process.env.DB_DIALECT || "sqlite") as "sqlite" | "mssql";
let sequelize: Sequelize;

if (dialect === "mssql") {
  console.log("Connecting to SQL Server:", process.env.DB_HOST);
  sequelize = new Sequelize(
    process.env.DB_NAME!,
    process.env.DB_USER!,
    process.env.DB_PASS!,
    {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "1433"),
      dialect: "mssql",
      dialectOptions: {
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
      },
      logging: false,
    }
  );
} else {
  console.log("Connecting to SQLite database...");
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.join(__dirname, "../../database.sqlite"),
    logging: false,
  });
}

// 1. User Model
export class User extends Model {
  public id!: string;
  public username!: string;
  public passwordHash!: string;
  public email!: string;
  public role!: string;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "collaborator",
    },
  },
  {
    sequelize,
    tableName: "Users",
    timestamps: true,
  }
);

// 2. Document Model
export class Document extends Model {
  public id!: string;
  public codigo!: string;
  public estudiante!: string;
  public status!: "pending" | "ready_for_blockchain" | "registered" | "revoked";
  public originalPath!: string | null;
  public officializedPath!: string | null;
  public certificatePath!: string | null;
  public hashDocumento!: string | null;
  public fechaSubida!: Date;
  public fechaEnvioSolicitud!: Date | null;
  public fechaRegistroBlockchain!: Date | null;
  public motivoRevocacion!: string | null;
  public estudianteWallet!: string | null;
  public recepcionConfirmada!: boolean;
  public fechaRecepcion!: Date | null;
  public fechaRevocacion!: Date | null;
  public blockchainTxHash!: string | null;
  public blockchainBlockNumber!: number | null;
  public blockchainContractAddress!: string | null;
  public blockchainTimestamp!: Date | null;
  public estudianteSignatureImage!: string | null;
  public requireFacial!: boolean;
  public collaborators!: Collaborator[];
  public auditLogs!: AuditLog[];
}

Document.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    codigo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    estudiante: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "pending",
    },
    originalPath: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    officializedPath: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    certificatePath: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    hashDocumento: {
      type: DataTypes.STRING(66),
      allowNull: true,
    },
    fechaSubida: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fechaEnvioSolicitud: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fechaRegistroBlockchain: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    motivoRevocacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estudianteWallet: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    recepcionConfirmada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    fechaRecepcion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fechaRevocacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    blockchainTxHash: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    blockchainBlockNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    blockchainContractAddress: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    blockchainTimestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estudianteSignatureImage: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    requireFacial: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "Documents",
    timestamps: true,
  }
);

// 3. Collaborator Model
export class Collaborator extends Model {
  public id!: string;
  public documentId!: string;
  public name!: string;
  public email!: string;
  public phone!: string | null;
  public token!: string;
  public signed!: boolean;
  public signedAt!: Date | null;
  public posX!: number;
  public posY!: number;
  public page!: number;
  public signatureImage!: string | null;
  public document!: Document;
}

Collaborator.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    signed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    posX: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    posY: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    page: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    signatureImage: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "Collaborators",
    timestamps: true,
  }
);

// 4. AuditLog Model
export class AuditLog extends Model {
  public id!: string;
  public documentId!: string;
  public action!: string;
  public details!: string | null;
  public timestamp!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "AuditLogs",
    timestamps: false,
  }
);

// Associations
Document.hasMany(Collaborator, { foreignKey: "documentId", as: "collaborators", onDelete: "CASCADE" });
Collaborator.belongsTo(Document, { foreignKey: "documentId", as: "document" });

Document.hasMany(AuditLog, { foreignKey: "documentId", as: "auditLogs", onDelete: "CASCADE" });
AuditLog.belongsTo(Document, { foreignKey: "documentId", as: "document" });

export { sequelize };
export default sequelize;
