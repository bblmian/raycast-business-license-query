import axios from "axios";
import { getConfig } from "../config";

interface QueryResponse {
  words_result_num: number;
  words_result: {
    companyname: string;
    companytype: string;
    legalperson: string;
    capital: string;
    companycode: string;
    companyaddress: string;
    businessscope: string;
    authority: string;
    companystatus: string;
    establishdate: string;
    creditno: string;
    province: string;
    city: string;
    district: string;
    [key: string]: string;
  };
  log_id: number;
}

interface VerifyResponse {
  words_result_num: number;
  words_result: {
    verifyresult: string;
    companymatch: string;
    regnummatch: string;
  };
  log_id: number;
}

const BASE_URL = "https://aip.baidubce.com/rest/2.0/ocr/v1";

export class BusinessAPI {
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;

  constructor(private apiKey: string, private secretKey: string) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        "https://aip.baidubce.com/oauth/2.0/token",
        null,
        {
          params: {
            grant_type: "client_credentials",
            client_id: this.apiKey,
            client_secret: this.secretKey,
          },
        }
      );

      if (!response.data.access_token) {
        throw new Error("Failed to get access token");
      }

      this.accessToken = response.data.access_token;
      this.tokenExpireTime = Date.now() + (response.data.expires_in || 2592000) * 1000;
      return response.data.access_token;
    } catch (error) {
      throw new Error(`Failed to get access token: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async queryBusiness(name: string): Promise<QueryResponse> {
    const token = await this.getAccessToken();
    const response = await axios.post(
      `${BASE_URL}/businesslicense_verification_standard`,
      { verifynum: name },
      {
        params: { access_token: token },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async verifyBusiness(name: string, code: string): Promise<VerifyResponse> {
    const token = await this.getAccessToken();
    const response = await axios.post(
      `${BASE_URL}/two_factors_verification`,
      { company: name, regnum: code },
      {
        params: { access_token: token },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }
}

export const createAPI = () => {
  const config = getConfig();
  return new BusinessAPI(config.apiKey, config.secretKey);
}; 