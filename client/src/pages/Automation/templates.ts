// Modular templates - see ./templates/ directory
import { pharmacyTemplates } from "./templates/pharmacy";
import { communicationTemplates } from "./templates/communication";
import { schedulingTemplates } from "./templates/scheduling";
import { operationsTemplates } from "./templates/operations";
import type { FlowTemplate } from "./templates/types";

export type { FlowTemplate };

export const flowTemplates: FlowTemplate[] = [
  ...pharmacyTemplates,
  ...communicationTemplates,
  ...schedulingTemplates,
  ...operationsTemplates,
];
