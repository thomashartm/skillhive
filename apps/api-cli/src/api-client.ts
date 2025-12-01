import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Token storage location
const TOKEN_FILE = path.join(os.homedir(), '.trainhive-token');

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:3001') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error(`API Error: ${error.response.status} ${error.response.statusText}`);
          console.error(JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
          console.error('No response received from API');
        } else {
          console.error('Error setting up request:', error.message);
        }
        throw error;
      }
    );
  }

  async loadToken(): Promise<boolean> {
    try {
      const token = await fs.readFile(TOKEN_FILE, 'utf-8');
      this.token = token.trim();
      return true;
    } catch (error) {
      return false;
    }
  }

  async saveToken(token: string): Promise<void> {
    this.token = token;
    await fs.writeFile(TOKEN_FILE, token, 'utf-8');
  }

  async clearToken(): Promise<void> {
    this.token = null;
    try {
      await fs.unlink(TOKEN_FILE);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/v1/auth/login', credentials);
    await this.saveToken(response.data.token);
    return response.data;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  hasToken(): boolean {
    return this.token !== null;
  }

  getToken(): string | null {
    return this.token;
  }
}
