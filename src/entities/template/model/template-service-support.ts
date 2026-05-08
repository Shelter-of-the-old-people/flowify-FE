const TEMPORARILY_UNSUPPORTED_TEMPLATE_SERVICES = new Set(["gmail"]);

export const getUnsupportedTemplateServices = (services: string[]) =>
  services.filter((service) =>
    TEMPORARILY_UNSUPPORTED_TEMPLATE_SERVICES.has(service),
  );

export const getTemplateUnsupportedServiceMessage = (
  unsupportedServices: string[],
) => {
  if (unsupportedServices.length === 0) {
    return null;
  }

  if (unsupportedServices.includes("gmail")) {
    return "Gmail 연동은 현재 준비 중입니다. Gmail이 필요한 템플릿은 아직 가져올 수 없습니다.";
  }

  return "현재 준비 중인 서비스가 포함되어 있어 이 템플릿은 아직 가져올 수 없습니다.";
};
