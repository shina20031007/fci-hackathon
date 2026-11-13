import records from "./projects.json";
import { projectSchema } from "../../src/lib/validation/project";
export const officialProjects = projectSchema.array().parse(records);
