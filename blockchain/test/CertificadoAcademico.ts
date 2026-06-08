import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("CertificadoAcademico", function () {
  async function deployContract() {
    const [owner, emisor1, student, otherAccount] = await ethers.getSigners();
    const contract = await ethers.deployContract("CertificadoAcademico");
    return { contract, owner, emisor1, student, otherAccount };
  }

  it("Should allow the owner to manage authorized emisores", async function () {
    const { contract, owner, emisor1 } = await deployContract();

    // Owner adds emisor
    await expect(contract.agregarEmisor(emisor1.address, "Rector"))
      .to.emit(contract, "EmisorAgregado")
      .withArgs(emisor1.address, "Rector");

    expect(await contract.emisoresAutorizados(emisor1.address)).to.equal("Rector");

    // Owner removes emisor
    await expect(contract.removerEmisor(emisor1.address))
      .to.emit(contract, "EmisorRemovido")
      .withArgs(emisor1.address);

    expect(await contract.emisoresAutorizados(emisor1.address)).to.equal("");
  });

  it("Should prevent non-owners from managing emisores", async function () {
    const { contract, otherAccount } = await deployContract();

    await expect(
      contract.connect(otherAccount).agregarEmisor(otherAccount.address, "Decano")
    ).to.be.revertedWith("Solo el propietario puede realizar esta accion");
  });

  it("Should allow an authorized emisor to emit a certificate", async function () {
    const { contract, owner, emisor1, student } = await deployContract();
    
    // Authorize emisor1 as Rector
    await contract.agregarEmisor(emisor1.address, "Rector");

    const codigo = "CERT-2026-X";
    const estudiante = "Laura Diaz";
    const hash = ethers.keccak256(ethers.toUtf8Bytes("Doc Laura"));

    // Emit from emisor1
    await expect(contract.connect(emisor1).emitirCertificado(codigo, estudiante, student.address, hash))
      .to.emit(contract, "CertificadoEmitido")
      .withArgs(hash, codigo, estudiante, emisor1.address, "Rector", (val: any) => typeof val === "bigint");

    const verification = await contract.verificarCertificado(hash);
    expect(verification.existe).to.be.true;
    expect(verification.estudianteWallet).to.equal(student.address);
    expect(verification.recepcionConfirmada).to.be.false;
    expect(verification.emisor).to.equal(emisor1.address);
  });

  it("Should prevent unauthorized accounts from emitting certificates", async function () {
    const { contract, student, otherAccount } = await deployContract();
    const hash = ethers.keccak256(ethers.toUtf8Bytes("Doc Bad"));

    await expect(
      contract.connect(otherAccount).emitirCertificado("CERT-BAD", "Malicioso", student.address, hash)
    ).to.be.revertedWith("Solo emisores autorizados pueden realizar esta accion");
  });

  it("Should allow the student to confirm reception of their certificate", async function () {
    const { contract, owner, student } = await deployContract();
    
    const hash = ethers.keccak256(ethers.toUtf8Bytes("Doc Student"));
    await contract.emitirCertificado("CERT-STUD", "Estudiante", student.address, hash);

    // Confirm reception as student
    await expect(contract.connect(student).confirmarRecepcion(hash))
      .to.emit(contract, "RecepcionConfirmada")
      .withArgs(hash, student.address, (val: any) => typeof val === "bigint");

    const verification = await contract.verificarCertificado(hash);
    expect(verification.recepcionConfirmada).to.be.true;
    expect(Number(verification.fechaRecepcion)).to.be.greaterThan(0);
  });

  it("Should prevent other unauthorized accounts from confirming reception", async function () {
    const { contract, student, otherAccount } = await deployContract();
    const hash = ethers.keccak256(ethers.toUtf8Bytes("Doc Student 2"));
    await contract.emitirCertificado("CERT-STUD-2", "Estudiante 2", student.address, hash);

    // Attempt to confirm as someone else who is not student, owner, or authorized emisor
    await expect(
      contract.connect(otherAccount).confirmarRecepcion(hash)
    ).to.be.revertedWith("Solo el estudiante asignado o un emisor autorizado puede confirmar la recepcion");
  });

  it("Should allow an authorized emisor to confirm reception in behalf of the student", async function () {
    const { contract, owner, emisor1, student } = await deployContract();
    await contract.agregarEmisor(emisor1.address, "Rector");

    const hash = ethers.keccak256(ethers.toUtf8Bytes("Doc Student 3"));
    await contract.emitirCertificado("CERT-STUD-3", "Estudiante 3", student.address, hash);

    // Confirm reception as authorized emisor
    await expect(contract.connect(emisor1).confirmarRecepcion(hash))
      .to.emit(contract, "RecepcionConfirmada");

    const verification = await contract.verificarCertificado(hash);
    expect(verification.recepcionConfirmada).to.be.true;
  });

  it("Should allow querying the complete history timeline", async function () {
    const { contract, owner, emisor1, student } = await deployContract();
    await contract.agregarEmisor(emisor1.address, "Director de Carrera");
    
    const hash = ethers.keccak256(ethers.toUtf8Bytes("Doc Hist"));
    await contract.connect(emisor1).emitirCertificado("CERT-HIST", "Historial", student.address, hash);

    // Sign reception
    await contract.connect(student).confirmarRecepcion(hash);

    // Query history
    const history = await contract.consultarHistorial(hash);
    expect(history.emisor).to.equal(emisor1.address);
    expect(history.cargoEmisor).to.equal("Director de Carrera");
    expect(history.recepcionConfirmada).to.be.true;
    expect(history.estudianteWallet).to.equal(student.address);
    expect(history.valido).to.be.true;
  });

  it("Should register revocation details and motive correct", async function () {
    const { contract, owner, emisor1, student } = await deployContract();
    await contract.agregarEmisor(emisor1.address, "Secretario");

    const hash = ethers.keccak256(ethers.toUtf8Bytes("Doc Rev"));
    await contract.connect(emisor1).emitirCertificado("CERT-REV", "Revocado", student.address, hash);

    await contract.connect(emisor1).revocarCertificado(hash, "Error de notas");

    const history = await contract.consultarHistorial(hash);
    expect(history.valido).to.be.false;
    expect(history.motivoRevocacion).to.equal("Error de notas");
    expect(Number(history.fechaRevocacion)).to.be.greaterThan(0);
  });
});
