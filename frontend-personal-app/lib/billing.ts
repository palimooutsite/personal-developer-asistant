import { apiRequest } from './api';

export interface BillingPrice { id: string; packageId: string; version: number; billingPeriod: 'MONTHLY' | 'YEARLY' | string; amountMinor: number; currency: string; isActive: boolean; }
export interface BillingFeature { id: string; code: string; name: string; description: string | null; valueType: 'BOOLEAN' | 'LIMIT' | string; unit: string | null; isActive: boolean; }
export interface BillingPackageFeature { id: string; packageId: string; featureId: string; enabled: boolean; limitValue: number | null; feature: BillingFeature | null; }
export interface BillingPackage { id: string; code: string; name: string; description: string | null; isActive: boolean; sortOrder: number; prices?: BillingPrice[]; features?: BillingPackageFeature[]; }
export interface BillingPackageFeaturesResponse { package: BillingPackage; features: BillingPackageFeature[]; }
export interface BillingSubscription { id: string; tenantId: string; packageId: string; packagePriceId: string; status: string; provider: string; startedAt: string; currentPeriodStart: string; currentPeriodEnd: string; cancelledAt: string | null; package: { id: string; code: string; name: string }; packagePrice: { id: string; billingPeriod: string; amountMinor: number; currency: string; version: number }; }
export interface BillingUsageFeature { id: string; featureId: string; code: string | null; name: string | null; valueType: string | null; unit: string | null; enabled: boolean; limitValue: number | null; currentUsage: number; remaining: number | null; allowed: boolean; }
export interface BillingUsageResponse { subscription: { id: string; status: string; packageId: string }; package: { id: string; code: string; name: string }; features: BillingUsageFeature[]; }
export interface BillingCheckoutResponse {
  subscription: BillingSubscription;
  invoice: {
    id?: string;
    tenantId: string;
    subscriptionId: string;
    packagePriceId: string;
    packageCode: string;
    packageName: string;
    billingPeriod: string;
    currency: string;
    originalAmountMinor: number;
    discountAmountMinor: number;
    taxAmountMinor: number;
    finalAmountMinor: number;
    status?: string;
    issuedAt?: string | null;
    dueAt?: string | null;
    discounts: Array<{ discountId: string; code: string; type: string; amountMinor: number }>;
  };
  payment: {
    id: string;
    tenantId: string;
    subscriptionId: string;
    invoiceId: string;
    provider: string;
    providerPaymentId: string | null;
    status: string;
    amountMinor: number;
    currency: string;
    checkoutUrl: string | null;
    paidAt: string | null;
    expiresAt: string | null;
    createdAt: string;
  };
}
export async function getBillingPackages(): Promise<BillingPackage[]> { return apiRequest<BillingPackage[]>('/billing/catalog/packages'); }
export async function getBillingPackageFeatures(packageId: string): Promise<BillingPackageFeaturesResponse> { return apiRequest<BillingPackageFeaturesResponse>('/billing/catalog/packages/' + packageId + '/features'); }
export async function getCurrentSubscription(tenantId: string): Promise<BillingSubscription | null> { return apiRequest<BillingSubscription | null>('/billing/tenants/' + tenantId + '/subscription'); }
export async function getBillingUsage(tenantId: string): Promise<BillingUsageResponse> { return apiRequest<BillingUsageResponse>('/billing/tenants/' + tenantId + '/features'); }
export async function createBillingCheckout(tenantId: string, packageId: string, packagePriceId: string, discountCode?: string): Promise<BillingCheckoutResponse> {
  return apiRequest<BillingCheckoutResponse>('/billing/tenants/' + tenantId + '/checkout', { method: 'POST', body: JSON.stringify({ packageId, packagePriceId, ...(discountCode?.trim() ? { discountCode: discountCode.trim() } : {}), provider: 'SANDBOX' }) });
}
export async function sandboxSucceedPayment(tenantId: string, paymentId: string) { return apiRequest('/billing/tenants/' + tenantId + '/payments/' + paymentId + '/sandbox/succeed', { method: 'POST' }); }
