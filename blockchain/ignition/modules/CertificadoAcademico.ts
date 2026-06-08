import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CertificadoAcademicoModule", (m) => {
  const certificado = m.contract("CertificadoAcademico");

  return { certificado };
});
