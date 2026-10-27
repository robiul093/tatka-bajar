import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    const appName = process.env.APP_NAME || 'Application';
    return `${appName} Server Running Successfully!`;
  }
}
