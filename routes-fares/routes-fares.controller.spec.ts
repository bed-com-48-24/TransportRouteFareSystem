import { Test, TestingModule } from '@nestjs/testing';
import { RoutesFaresController } from './routes-fares.controller';

describe('RoutesFaresController', () => {
  let controller: RoutesFaresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutesFaresController],
    }).compile();

    controller = module.get<RoutesFaresController>(RoutesFaresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
