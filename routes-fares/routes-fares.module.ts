import { Module } from '@nestjs/common';
import { RoutesFaresController } from './routes-fares.controller';
import { RoutesFaresService } from './routes-fares.service';

@Module({
  controllers: [RoutesFaresController],
  providers: [RoutesFaresService]
})
export class RoutesFaresModule {}
