import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@trainhive/db';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    // Configure Passport for JWT authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Configure JWT module to verify tokens
    JwtModule.register({
      secret: process.env.NEXTAUTH_SECRET || 'change-this-secret-in-production',
      signOptions: {
        expiresIn: '7d', // Match NextAuth expiration
      },
    }),
    // Import User entity repository for authentication
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, AuthService],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
