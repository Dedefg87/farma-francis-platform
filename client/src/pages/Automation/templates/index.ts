export type { FlowTemplate } from "./types";
export { pharmacyTemplates } from "./pharmacy";
export { communicationTemplates } from "./communication";
export { schedulingTemplates } from "./scheduling";
export { operationsTemplates } from "./operations";

import { pharmacyTemplates } from "./pharmacy";
import { communicationTemplates } from "./communication";
import { schedulingTemplates } from "./scheduling";
import { operationsTemplates } from "./operations";

export const flowTemplates = [
  ...pharmacyTemplates,
  ...communicationTemplates,
  ...schedulingTemplates,
  ...operationsTemplates,
];
