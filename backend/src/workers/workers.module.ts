import { Module } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { WorkerRequestsController } from './worker-requests.controller';

@Module({
  providers: [WorkersService],
  controllers: [WorkersController, WorkerRequestsController]
})
export class WorkersModule {}
