export const CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "hashDocumento",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "codigo",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "estudiante",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "emisor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "cargo",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fechaEmision",
        "type": "uint256"
      }
    ],
    "name": "CertificadoEmitido",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "hashDocumento",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "motivo",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "revocador",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fechaRevocacion",
        "type": "uint256"
      }
    ],
    "name": "CertificadoRevocado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "emisor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "cargo",
        "type": "string"
      }
    ],
    "name": "EmisorAgregado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "emisor",
        "type": "address"
      }
    ],
    "name": "EmisorRemovido",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "hashDocumento",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "estudiante",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fechaRecepcion",
        "type": "uint256"
      }
    ],
    "name": "RecepcionConfirmada",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_emisor",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_cargo",
        "type": "string"
      }
    ],
    "name": "agregarEmisor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "certificados",
    "outputs": [
      {
        "internalType": "string",
        "name": "codigo",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "estudiante",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "estudianteWallet",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "hashDocumento",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "fechaEmision",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "valido",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "motivoRevocacion",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "emisor",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "cargoEmisor",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "recepcionConfirmada",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "fechaRecepcion",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fechaRevocacion",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "codigoToHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_hashDocumento",
        "type": "bytes32"
      }
    ],
    "name": "confirmarRecepcion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_codigo",
        "type": "string"
      }
    ],
    "name": "consultarCertificado",
    "outputs": [
      {
        "internalType": "bool",
        "name": "existe",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "estudiante",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "hashDocumento",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "fechaEmision",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "valido",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "motivoRevocacion",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "emisor",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "estudianteWallet",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "recepcionConfirmada",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "fechaRecepcion",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_hashDocumento",
        "type": "bytes32"
      }
    ],
    "name": "consultarHistorial",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "fechaEmision",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "emisor",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "cargoEmisor",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "recepcionConfirmada",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "fechaRecepcion",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "estudianteWallet",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "valido",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "fechaRevocacion",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "motivoRevocacion",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "emisoresAutorizados",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_codigo",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_estudiante",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "_estudianteWallet",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "_hashDocumento",
        "type": "bytes32"
      }
    ],
    "name": "emitirCertificado",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_emisor",
        "type": "address"
      }
    ],
    "name": "removerEmisor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_hashDocumento",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "_motivo",
        "type": "string"
      }
    ],
    "name": "revocarCertificado",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_hashDocumento",
        "type": "bytes32"
      }
    ],
    "name": "verificarCertificado",
    "outputs": [
      {
        "internalType": "bool",
        "name": "existe",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "codigo",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "estudiante",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "fechaEmision",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "valido",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "motivoRevocacion",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "emisor",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "estudianteWallet",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "recepcionConfirmada",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "fechaRecepcion",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
