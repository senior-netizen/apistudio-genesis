import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { RunnerController } from './runner.controller';
import { RunnerService } from './runner.service';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [RunnerController],
  providers: [RunnerService],
  exports: [RunnerService],
})
export class RunnerModule {}
