import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserAdminController } from './user-admin.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserController, UserAdminController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
