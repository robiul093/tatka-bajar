import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return app server running success message', () => {
      const response = appController.getHello();
      expect(response.message).toBe(
        `${process.env.APP_NAME} Server Runing Success!`,
      );
      expect(response.statusCode).toBe(200);
    });
  });
});
