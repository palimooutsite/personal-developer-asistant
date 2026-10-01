import { apiRequest } from "./api";

export type BillingPeriod = "MONTHLY" | "YEARLY";
export type FeatureValueType = "BOOLEAN" | "LIMIT";

export interface AdminFeature { id:string; code:string; name:string; description:string|null; valueType:FeatureValueType|string; unit:string|null; isActive:boolean; }
export interface AdminPrice { id:string; packageId:string; version:number; billingPeriod:BillingPeriod|string; amountMinor:number; currency:string; isActive:boolean; }
export interface AdminPackageFeature { id:string; packageId:string; featureId:string; enabled:boolean; limitValue:number|null; feature:AdminFeature|null; }
export interface AdminPackage { id:string; code:string; name:string; description:string|null; isActive:boolean; sortOrder:number; prices?:AdminPrice[]; features?:AdminPackageFeature[]; }
export interface AdminPackageFeaturesResponse { package: AdminPackage; features: AdminPackageFeature[]; }

export async function listPackages(){return apiRequest<AdminPackage[]>("/billing/catalog/packages");}
export async function getBillingPackageFeatures(packageId:string){return apiRequest<AdminPackageFeaturesResponse>(`/billing/catalog/packages/${packageId}/features`);}
export async function createPackage(body:{code:string;name:string;description?:string;sortOrder?:number}){return apiRequest<AdminPackage>("/billing/catalog/packages",{method:"POST",body:JSON.stringify(body)});}
export async function updatePackage(id:string,body:Partial<{name:string;description:string;isActive:boolean;sortOrder:number}>){return apiRequest<AdminPackage>(`/billing/catalog/packages/${id}`,{method:"PATCH",body:JSON.stringify(body)});}
export async function listFeatures(){return apiRequest<AdminFeature[]>("/billing/catalog/features");}
export async function createFeature(body:{code:string;name:string;description?:string;valueType:FeatureValueType;unit?:string}){return apiRequest<AdminFeature>("/billing/catalog/features",{method:"POST",body:JSON.stringify(body)});}
export async function updateFeature(id:string,body:Partial<{name:string;description:string;valueType:FeatureValueType;unit:string;isActive:boolean}>){return apiRequest<AdminFeature>(`/billing/catalog/features/${id}`,{method:"PATCH",body:JSON.stringify(body)});}
export async function addPrice(packageId:string,body:{billingPeriod:BillingPeriod;amountMinor:number;currency?:string}){return apiRequest<AdminPrice>(`/billing/catalog/packages/${packageId}/prices`,{method:"POST",body:JSON.stringify(body)});}
export async function updatePrice(id:string,body:Partial<{amountMinor:number;currency:string;isActive:boolean}>){return apiRequest<AdminPrice>(`/billing/catalog/prices/${id}`,{method:"PATCH",body:JSON.stringify(body)});}
export async function setPackageFeature(packageId:string,featureId:string,body:{enabled:boolean;limitValue?:number|null}){return apiRequest<AdminPackageFeature>(`/billing/catalog/packages/${packageId}/features/${featureId}`,{method:"POST",body:JSON.stringify(body)});}
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
export type DiscountDuration = "ONCE" | "RECURRING_CYCLES" | "FOREVER";
export interface AdminDiscount { id:string; code:string; name:string; description:string|null; type:DiscountType|string; valueMinor:number|null; percentage:number|null; maxDiscountMinor:number|null; minimumAmountMinor:number|null; duration:DiscountDuration|string; durationCycles:number|null; usageLimit:number|null; usageCount:number; startsAt:string|null; expiresAt:string|null; isActive:boolean; createdAt:string; updatedAt:string; }
export interface AdminDiscountPackage { id:string; discountId:string; packageId:string; createdAt:string; }
export async function listDiscounts(){return apiRequest<AdminDiscount[]>("/billing/discounts");}
export async function getDiscount(id:string){return apiRequest<AdminDiscount>(`/billing/discounts/${id}`);}
export async function createDiscount(body:Record<string,unknown>){return apiRequest<AdminDiscount>("/billing/discounts",{method:"POST",body:JSON.stringify(body)});}
export async function updateDiscount(id:string,body:Record<string,unknown>){return apiRequest<AdminDiscount>(`/billing/discounts/${id}`,{method:"PATCH",body:JSON.stringify(body)});}
export async function getDiscountPackages(id:string){return apiRequest<AdminDiscountPackage[]>(`/billing/discounts/${id}/packages`);}
export async function setDiscountPackage(id:string,packageId:string,enabled:boolean){return apiRequest(`/billing/discounts/${id}/packages/${packageId}`,{method:enabled?"POST":"DELETE",...(enabled?{body:JSON.stringify({enabled:true})}:{})});}

export async function seedCatalog(){return apiRequest("/billing/catalog/seed-defaults",{method:"POST"});}
