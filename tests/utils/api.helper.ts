import request from 'supertest';
import { Express } from 'express';

export class ApiTestHelper {
  private app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  // Helper for authenticated requests
  async authenticatedRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    token: string
  ): Promise<any> {
    const req = request(this.app);
    return (req[method](path) as any)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json');
  }

  // Helper for GET requests
  async get(path: string, token?: string): Promise<any> {
    const req = (request(this.app).get(path) as any).set('Accept', 'application/json');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  // Helper for POST requests
  async post(path: string, data: Record<string, unknown>, token?: string): Promise<any> {
    const req = (request(this.app).post(path) as any)
      .send(data)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json');

    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  // Helper for PUT requests
  async put(path: string, data: Record<string, unknown>, token?: string): Promise<any> {
    const req = (request(this.app).put(path) as any)
      .send(data)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json');

    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  // Helper for DELETE requests
  async delete(path: string, token?: string): Promise<any> {
    const req = (request(this.app).delete(path) as any).set('Accept', 'application/json');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  // Helper for file upload requests
  async uploadFile(
    path: string,
    fieldName: string,
    filePath: string,
    token?: string
  ): Promise<any> {
    const req = (request(this.app).post(path) as any)
      .attach(fieldName, filePath)
      .set('Accept', 'application/json');

    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  // Helper for file upload with buffer
  async uploadFileBuffer(
    path: string,
    fieldName: string,
    buffer: Buffer,
    filename: string,
    token?: string
  ): Promise<any> {
    const req = (request(this.app).post(path) as any)
      .attach(fieldName, buffer, filename)
      .set('Accept', 'application/json');

    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  // Helper to expect error response
  expectError(response: request.Response, statusCode: number, message?: string) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('error');
    if (message) {
      expect(response.body.error).toContain(message);
    }
  }

  // Helper to expect success response
  expectSuccess(response: request.Response, statusCode: number = 200) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('success', true);
  }
}
