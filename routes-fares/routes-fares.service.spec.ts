import { Test, TestingModule } from '@nestjs/testing';
import { RoutesFaresService } from './routes-fares.service';

describe('RoutesFaresService', () => {
  let service: RoutesFaresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoutesFaresService],
    }).compile();

    service = module.get<RoutesFaresService>(RoutesFaresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
