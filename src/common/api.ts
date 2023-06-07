/* eslint-disable @typescript-eslint/naming-convention */
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import Axios from "axios";
import Irys from "./irys";

// taken from the arweave.js lib
export interface ApiConfig {
  host?: string;
  protocol?: string;
  port?: string | number;
  timeout?: number;
  logging?: boolean;
  // eslint-disable-next-line @typescript-eslint/ban-types
  logger?: Function;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

// TODO: overhaul this
export default class Api {
  public readonly METHOD_GET = "GET";
  public readonly METHOD_POST = "POST";
  protected instance?: AxiosInstance;
  public cookieMap = new Map();

  public config!: ApiConfig;

  constructor(config: ApiConfig) {
    this.applyConfig(config);
  }

  public applyConfig(config: ApiConfig): void {
    this.config = this.mergeDefaults(config);
  }

  public getConfig(): ApiConfig {
    return this.config;
  }

  private async requestInterceptor(request: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    const cookies = this.cookieMap.get(new URL(request.baseURL ?? "").host);
    if (cookies) request.headers!.cookie = cookies;
    return request;
  }

  private async responseInterceptor(response: AxiosResponse): Promise<AxiosResponse> {
    const setCookie = response.headers?.["set-cookie"];
    if (setCookie) this.cookieMap.set(response.request.host, setCookie);
    return response;
  }

  private mergeDefaults(config: ApiConfig): ApiConfig {
    const protocol = config.protocol ?? "http";
    const port = config.port ?? (protocol === "https" ? 443 : 80);

    return {
      host: config.host ?? "127.0.0.1",
      protocol,
      port,
      timeout: config.timeout ?? 20000,
      logging: config.logging ?? false,
      logger: config.logger ?? console.log,
      headers: { ...config.headers, "x-irys-js-sdk-version": Irys.VERSION },
      withCredentials: true,
    };
  }

  public async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.request().get<T>(endpoint, { ...config, headers: { ...config?.headers, ...this.config?.headers } });
    } catch (error: any) {
      if (error.response?.status) {
        return error.response;
      }

      throw error;
    }
  }

  public async post<T = any>(endpoint: string, body: Buffer | string | object | null, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.request().post(endpoint, body, { ...config, headers: { ...config?.headers, ...this.config?.headers } });
    } catch (error: any) {
      if (error.response?.status) {
        return error.response;
      }

      throw error;
    }
  }

  public request(): AxiosInstance {
    if (this.instance) return this.instance;

    const instance = Axios.create({
      baseURL: `${this.config.protocol}://${this.config.host}:${this.config.port}`,
      timeout: this.config.timeout,
      maxContentLength: 1024 * 1024 * 512,
      headers: this.config.headers,
      withCredentials: this.config.withCredentials,
    });

    if (this.config.withCredentials) {
      instance.interceptors.request.use(this.requestInterceptor.bind(this));
      instance.interceptors.response.use(this.responseInterceptor.bind(this));
    }

    if (this.config.logging) {
      instance.interceptors.request.use((request) => {
        this.config.logger!(`Requesting: ${request.baseURL}/${request.url}`);
        return request;
      });

      instance.interceptors.response.use((response) => {
        this.config.logger!(`Response:   ${response.config.url} - ${response.status}`);
        return response;
      });
    }

    return (this.instance = instance);
  }
}
