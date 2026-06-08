// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CertificadoAcademico {
    address public owner;

    struct Certificado {
        string codigo;
        string estudiante;
        address estudianteWallet;
        bytes32 hashDocumento;
        uint256 fechaEmision;
        bool valido;
        string motivoRevocacion;
        address emisor;
        string cargoEmisor;
        bool recepcionConfirmada;
        uint256 fechaRecepcion;
        uint256 fechaRevocacion;
    }

    // Mapping from document hash to Certificate details
    mapping(bytes32 => Certificado) public certificados;
    
    // Mapping from unique code to document hash (for lookup by code)
    mapping(string => bytes32) public codigoToHash;

    // Roles and Authorized Emisors
    mapping(address => string) public emisoresAutorizados;

    // Events
    event CertificadoEmitido(
        bytes32 indexed hashDocumento,
        string codigo,
        string estudiante,
        address indexed emisor,
        string cargo,
        uint256 fechaEmision
    );
    
    event CertificadoRevocado(
        bytes32 indexed hashDocumento,
        string motivo,
        address indexed revocador,
        uint256 fechaRevocacion
    );

    event RecepcionConfirmada(
        bytes32 indexed hashDocumento,
        address indexed estudiante,
        uint256 fechaRecepcion
    );

    event EmisorAgregado(address indexed emisor, string cargo);
    event EmisorRemovido(address indexed emisor);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el propietario puede realizar esta accion");
        _;
    }

    modifier onlyAuthorizedEmisor() {
        require(
            msg.sender == owner || bytes(emisoresAutorizados[msg.sender]).length > 0,
            "Solo emisores autorizados pueden realizar esta accion"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Agrega un nuevo emisor autorizado (ej. Rector).
     */
    function agregarEmisor(address _emisor, string memory _cargo) public onlyOwner {
        require(_emisor != address(0), "Direccion invalida");
        require(bytes(_cargo).length > 0, "El cargo no puede estar vacio");
        emisoresAutorizados[_emisor] = _cargo;
        emit EmisorAgregado(_emisor, _cargo);
    }

    /**
     * @dev Remueve un emisor autorizado.
     */
    function removerEmisor(address _emisor) public onlyOwner {
        require(_emisor != address(0), "Direccion invalida");
        require(bytes(emisoresAutorizados[_emisor]).length > 0, "La direccion no es un emisor");
        delete emisoresAutorizados[_emisor];
        emit EmisorRemovido(_emisor);
    }

    /**
     * @dev Registra un nuevo certificado en la blockchain (solo emisores autorizados).
     */
    function emitirCertificado(
        string memory _codigo,
        string memory _estudiante,
        address _estudianteWallet,
        bytes32 _hashDocumento
    ) public onlyAuthorizedEmisor {
        require(_hashDocumento != bytes32(0), "El hash del documento no puede ser nulo");
        require(certificados[_hashDocumento].hashDocumento == bytes32(0), "Este certificado ya ha sido registrado");
        require(codigoToHash[_codigo] == bytes32(0), "El codigo de certificado ya esta en uso");

        string memory cargo = msg.sender == owner ? "Owner/Universidad" : emisoresAutorizados[msg.sender];

        certificados[_hashDocumento] = Certificado({
            codigo: _codigo,
            estudiante: _estudiante,
            estudianteWallet: _estudianteWallet,
            hashDocumento: _hashDocumento,
            fechaEmision: block.timestamp,
            valido: true,
            motivoRevocacion: "",
            emisor: msg.sender,
            cargoEmisor: cargo,
            recepcionConfirmada: false,
            fechaRecepcion: 0,
            fechaRevocacion: 0
        });

        codigoToHash[_codigo] = _hashDocumento;

        emit CertificadoEmitido(_hashDocumento, _codigo, _estudiante, msg.sender, cargo, block.timestamp);
    }

    /**
     * @dev Permite al estudiante o a un emisor autorizado confirmar la recepcion.
     */
    function confirmarRecepcion(bytes32 _hashDocumento) public {
        require(certificados[_hashDocumento].hashDocumento != bytes32(0), "El certificado no existe");
        require(
            certificados[_hashDocumento].estudianteWallet == msg.sender ||
            msg.sender == owner ||
            bytes(emisoresAutorizados[msg.sender]).length > 0,
            "Solo el estudiante asignado o un emisor autorizado puede confirmar la recepcion"
        );
        require(!certificados[_hashDocumento].recepcionConfirmada, "La recepcion ya ha sido confirmada");
        require(certificados[_hashDocumento].valido, "El certificado se encuentra revocado");

        certificados[_hashDocumento].recepcionConfirmada = true;
        certificados[_hashDocumento].fechaRecepcion = block.timestamp;

        emit RecepcionConfirmada(_hashDocumento, msg.sender, block.timestamp);
    }

    /**
     * @dev Verifica si un hash de documento está registrado y es válido.
     */
    function verificarCertificado(bytes32 _hashDocumento) public view returns (
        bool existe,
        string memory codigo,
        string memory estudiante,
        uint256 fechaEmision,
        bool valido,
        string memory motivoRevocacion,
        address emisor,
        address estudianteWallet,
        bool recepcionConfirmada,
        uint256 fechaRecepcion
    ) {
        Certificado memory cert = certificados[_hashDocumento];
        if (cert.hashDocumento == bytes32(0)) {
            return (false, "", "", 0, false, "", address(0), address(0), false, 0);
        }
        return (
            true,
            cert.codigo,
            cert.estudiante,
            cert.fechaEmision,
            cert.valido,
            cert.motivoRevocacion,
            cert.emisor,
            cert.estudianteWallet,
            cert.recepcionConfirmada,
            cert.fechaRecepcion
        );
    }

    /**
     * @dev Consulta un certificado utilizando su código único.
     */
    function consultarCertificado(string memory _codigo) public view returns (
        bool existe,
        string memory estudiante,
        bytes32 hashDocumento,
        uint256 fechaEmision,
        bool valido,
        string memory motivoRevocacion,
        address emisor,
        address estudianteWallet,
        bool recepcionConfirmada,
        uint256 fechaRecepcion
    ) {
        bytes32 hashDoc = codigoToHash[_codigo];
        if (hashDoc == bytes32(0)) {
            return (false, "", bytes32(0), 0, false, "", address(0), address(0), false, 0);
        }
        Certificado memory cert = certificados[hashDoc];
        return (
            true,
            cert.estudiante,
            cert.hashDocumento,
            cert.fechaEmision,
            cert.valido,
            cert.motivoRevocacion,
            cert.emisor,
            cert.estudianteWallet,
            cert.recepcionConfirmada,
            cert.fechaRecepcion
        );
    }

    /**
     * @dev Revoca un certificado previamente registrado (solo por un emisor autorizado).
     */
    function revocarCertificado(bytes32 _hashDocumento, string memory _motivo) public onlyAuthorizedEmisor {
        require(certificados[_hashDocumento].hashDocumento != bytes32(0), "El certificado no existe");
        require(certificados[_hashDocumento].valido, "El certificado ya se encuentra revocado");

        certificados[_hashDocumento].valido = false;
        certificados[_hashDocumento].motivoRevocacion = _motivo;
        certificados[_hashDocumento].fechaRevocacion = block.timestamp;

        emit CertificadoRevocado(_hashDocumento, _motivo, msg.sender, block.timestamp);
    }

    /**
     * @dev Retorna la línea de tiempo completa del ciclo de vida del certificado en Blockchain.
     */
    function consultarHistorial(bytes32 _hashDocumento) public view returns (
        uint256 fechaEmision,
        address emisor,
        string memory cargoEmisor,
        bool recepcionConfirmada,
        uint256 fechaRecepcion,
        address estudianteWallet,
        bool valido,
        uint256 fechaRevocacion,
        string memory motivoRevocacion
    ) {
        Certificado memory cert = certificados[_hashDocumento];
        require(cert.hashDocumento != bytes32(0), "El certificado no existe");
        return (
            cert.fechaEmision,
            cert.emisor,
            cert.cargoEmisor,
            cert.recepcionConfirmada,
            cert.fechaRecepcion,
            cert.estudianteWallet,
            cert.valido,
            cert.fechaRevocacion,
            cert.motivoRevocacion
        );
    }
}
