import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '@trainhive/db';
import { getScopesForRole } from '@trainhive/shared';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticate user with email and password, return JWT token
   * Token format is compatible with NextAuth JWT tokens
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    // Return generic error to avoid username enumeration
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp (non-critical, don't fail if it errors)
    try {
      await this.userRepository.update(
        { id: user.id },
        { lastLoginAt: new Date() },
      );
    } catch (error) {
      // Log error but don't fail the login
      console.error('Failed to update last login timestamp:', error);
    }

    // Generate scopes based on user role
    const scopes = getScopesForRole(user.role);

    // Create JWT payload matching NextAuth format
    // Note: iat and exp are automatically added by JwtService based on module config
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      scopes,
      provider: 'credentials',
    };

    // Generate JWT token using same secret as NextAuth
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        scopes,
      },
    };
  }
}
