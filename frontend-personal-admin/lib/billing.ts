import { apiRequest } from "./api";

export type BillingPeriod = "MONTHLY" | "YEARLY";
export type FeatureValueType = "BOOLEAN" | "LIMIT";

export interface AdminFeature { id:string; code:string; name:string; description:string|null; valueType:FeatureValueType|string; unit:string|null; isActive:boolean; }
export interface AdminPrice { id:string; packageId:string; version:number; billingPeriod:BillingPeriod|string; amountMinor:number; currency:string; isActive:boolean; }
export interface AdminPackageFeature { id:string; packageId:string; featureId:string; enabled:boolean; limitValue:number|null; feature:AdminFeature|null; }
export interface AdminPackage { id:string; code:string; name:string; description:string|null; isActive:boolean; sortOrder:number; prices?:AdminPrice[]; features?:AdminPackageFeature[]; }

export async function listPackages(){return apiRequest<AdminPackage[]>("/billing/catalog/packages");}
export async function createPackage(body:{code:string;name:string;description?:string;sortOrder?:number}){return apiRequest<AdminPackage>("/billing/catalog/packages",{method:"POST",body:JSON.stringify(body)});}
export async function updatePackage(id:string,body:Partial<{name:string;description:string;isActive:boolean;sortOrder:number}>){return apiRequest<AdminPackage>(`/billing/catalog/packages/${id}`,{method:"PATCH",body:JSON.stringify(body)});}
export async function listFeatures(){return apiRequest<AdminFeature[]>("/billing/catalog/features");}
export async function createFeature(body:{code:string;name:string;description?:string;valueType:FeatureValueType;unit?:string}){return apiRequest<AdminFeature>("/billing/catalog/features",{method:"POST",body:JSON.stringify(body)});}
export async function updateFeature(id:string,body:Partial<{name:string;description:string;valueType:FeatureValueType;unit:string;isActive:boolean}>){return apiRequest<AdminFeature>(`/billing/catalog/features/${id}`,{method:"PATCH",body:JSON.stringify(body)});}
export async function addPrice(packageId:string,body:{billingPeriod:BillingPeriod;amountMinor:number;currency?:string}){return apiRequest<AdminPrice>(`/billing/catalog/packages/${packageId}/prices`,{method:"POST",body:JSON.stringify(body)});}
export async function updatePrice(id:string,body:Partial<{amountMinor:number;currency:string;isActive:boolean}>){return apiRequest<AdminPrice>(`/billing/catalog/prices/${id}`,{method:"PATCH",body:JSON.stringify(body)});}
export async function setPackageFeature(packageId:string,featureId:string,body:{enabled:boolean;limitValue?:number|null}){return apiRequest<AdminPackageFeature>(`/billing/catalog/packages/${packageId}/features/${featureId}`,{method:"POST",body:JSON.stringify(body)});}
export async function seedCatalog(){return apiRequest("/billing/catalog/seed-defaults",{method:"POST"});}
