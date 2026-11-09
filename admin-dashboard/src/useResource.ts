import { createResourceCache } from "../../shared/resource-cache";
import { api } from "./api";
export const adminResources = createResourceCache(api);
export const useResource = adminResources.useResource;
