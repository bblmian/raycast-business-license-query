import axios from "axios";
import { createAPI } from "./index";

export interface BusinessLicenseResponse {
  name: string;
  regNumber: string;
  status: string;
  type: string;
  legalPerson: string;
  establishDate: string;
  regCapital: string;
  address: string;
  businessScope: string;
  province: string;
  city: string;
  district: string;
  licensedBusinessScope: string;
}

export interface TwoFactorsVerificationResponse {
  company: string;
  regnum: string;
  verifyResult: {
    status: string;
    nameMatch: boolean;
    codeMatch: boolean;
  };
}

export interface QueryOptions {
  accessToken: string;
  apiKey: string;
  secretKey: string;
}

export async function queryBusinessInfo(
  companyName: string,
  options?: Partial<QueryOptions>
): Promise<BusinessLicenseResponse> {
  try {
    const api = createAPI();
    const response = await api.queryBusiness(companyName);
    
    if (!response.words_result) {
      throw new Error("API call failed: No result returned");
    }
    
    return {
      name: response.words_result.companyname,
      regNumber: response.words_result.companycode,
      status: response.words_result.companystatus,
      type: response.words_result.companytype,
      legalPerson: response.words_result.legalperson,
      establishDate: response.words_result.establishdate,
      regCapital: response.words_result.capital,
      address: response.words_result.companyaddress,
      businessScope: response.words_result.businessscope,
      province: response.words_result.province || "",
      city: response.words_result.city || "",
      district: response.words_result.district || "",
      licensedBusinessScope: response.words_result.licensedbusinessscope || "",
    };
  } catch (error) {
    throw new Error(`Query failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function verifyTwoFactors(
  company: string,
  regnum: string,
  options?: Partial<QueryOptions>
): Promise<TwoFactorsVerificationResponse> {
  try {
    const api = createAPI();
    const response = await api.verifyBusiness(company, regnum);
    
    if (!response.words_result) {
      throw new Error("API call failed: No result returned");
    }
    
    return {
      company,
      regnum,
      verifyResult: {
        status: response.words_result.verifyresult === "1" ? "Verified" : "Not Verified",
        nameMatch: response.words_result.companymatch === "1",
        codeMatch: response.words_result.regnummatch === "1",
      },
    };
  } catch (error) {
    throw new Error(`Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function batchQuery(
  companies: string[],
  onProgress?: (progress: number) => void
): Promise<BusinessLicenseResponse[]> {
  const results: BusinessLicenseResponse[] = [];
  
  for (let i = 0; i < companies.length; i++) {
    const result = await queryBusinessInfo(companies[i]);
    results.push(result);
    
    if (onProgress) {
      onProgress(Math.round(((i + 1) / companies.length) * 100));
    }
  }
  
  return results;
}

export async function batchVerify(
  items: Array<{ company: string; regnum: string }>,
  onProgress?: (progress: number) => void
): Promise<TwoFactorsVerificationResponse[]> {
  const results: TwoFactorsVerificationResponse[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const { company, regnum } = items[i];
    const result = await verifyTwoFactors(company, regnum);
    results.push(result);
    
    if (onProgress) {
      onProgress(Math.round(((i + 1) / items.length) * 100));
    }
  }
  
  return results;
} 