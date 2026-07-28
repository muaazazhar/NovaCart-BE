import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenType, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Request } from 'express';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { EmailService } from '../email/email.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const customerRole = await this.prisma.role.findUnique({
      where: { name: RoleName.CUSTOMER },
    });
    if (!customerRole) {
      throw new ConflictException('Customer role not configured');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        roleId: customerRole.id,
        isEmailVerified: false,
        cart: { create: {} },
      },
      include: { role: true },
    });

    await this.activityLogsService.log({
      userId: user.id,
      action: 'CREATE',
      module: 'auth',
      resourceId: user.id,
      description: `User registered: ${user.email}`,
    });

    await this.issueAndSendVerification(user.id, user.email, user.firstName);

    return {
      message: 'Registration successful. Please verify your email before signing in.',
      data: {
        email: user.email,
        requiresVerification: true,
        user: this.sanitizeUser(user),
      },
    };
  }

  async login(dto: LoginDto, req?: Request) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before signing in.',
        email: user.email,
      });
    }

    const permissions = user.role.rolePermissions.map(
      (rp: { permission: { name: string } }) => rp.permission.name,
    );
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.role.name,
      permissions,
      req,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.activityLogsService.log({
      userId: user.id,
      action: 'LOGIN',
      module: 'auth',
      resourceId: user.id,
      description: `User logged in: ${user.email}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    });

    return {
      message: 'Login successful',
      data: {
        user: this.sanitizeUser(user),
        ...tokens,
      },
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), isActive: true, deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;
    return user;
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!stored.user.isEmailVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before signing in.',
        email: stored.user.email,
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const permissions = stored.user.role.rolePermissions.map((rp) => rp.permission.name);
    const tokens = await this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role.name,
      permissions,
    );

    return {
      message: 'Token refreshed',
      data: tokens,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken, isRevoked: false },
        data: { isRevoked: true },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    await this.activityLogsService.log({
      userId,
      action: 'LOGOUT',
      module: 'auth',
      resourceId: userId,
      description: 'User logged out',
    });

    return { message: 'Logged out successfully', data: null };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    return { message: 'Password changed successfully', data: null };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    return { message: 'Profile retrieved', data: this.sanitizeUser(user) };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
    });

    // Avoid account enumeration
    if (!user) {
      return {
        message: 'If an account exists for that email, a verification link has been sent.',
        data: { email: email.toLowerCase() },
      };
    }

    if (user.isEmailVerified) {
      return {
        message: 'This email is already verified. You can sign in.',
        data: { email: user.email, alreadyVerified: true },
      };
    }

    await this.issueAndSendVerification(user.id, user.email, user.firstName);

    return {
      message: 'If an account exists for that email, a verification link has been sent.',
      data: { email: user.email },
    };
  }

  async verifyEmail(token: string) {
    const record = await this.findValidToken(token, AuthTokenType.EMAIL_VERIFICATION);

    const user = await this.prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });

    await this.prisma.authToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    await this.prisma.authToken.updateMany({
      where: {
        userId: user.id,
        type: AuthTokenType.EMAIL_VERIFICATION,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    try {
      await this.emailService.sendWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
      });
    } catch (error) {
      this.logger.warn(
        `Welcome email failed for ${user.email}: ${error instanceof Error ? error.message : error}`,
      );
    }

    const permissions = user.role.rolePermissions.map((rp) => rp.permission.name);
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.role.name,
      permissions,
    );

    return {
      message: 'Email verified successfully',
      data: {
        user: this.sanitizeUser(user),
        ...tokens,
      },
    };
  }

  async forgotPassword(email: string) {
    const normalized = email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalized, deletedAt: null, isActive: true },
    });

    if (user) {
      const rawToken = await this.createAuthToken(
        user.id,
        AuthTokenType.PASSWORD_RESET,
        60 * 60 * 1000,
      );
      try {
        await this.emailService.sendPasswordResetEmail({
          to: user.email,
          firstName: user.firstName,
          token: rawToken,
        });
      } catch (error) {
        this.logger.error(
          `Password reset email failed for ${user.email}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return {
      message:
        'If an account exists for that email, password reset instructions have been sent.',
      data: { email: normalized },
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.findValidToken(dto.token, AuthTokenType.PASSWORD_RESET);
    const hashed = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      this.prisma.authToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.authToken.updateMany({
        where: {
          userId: record.userId,
          type: AuthTokenType.PASSWORD_RESET,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    return { message: 'Password reset successful. You can sign in now.', data: null };
  }

  private async issueAndSendVerification(
    userId: string,
    email: string,
    firstName: string,
  ) {
    const rawToken = await this.createAuthToken(
      userId,
      AuthTokenType.EMAIL_VERIFICATION,
      24 * 60 * 60 * 1000,
    );

    try {
      await this.emailService.sendVerificationEmail({
        to: email,
        firstName,
        token: rawToken,
      });
    } catch (error) {
      this.logger.error(
        `Verification email failed for ${email}: ${error instanceof Error ? error.message : error}`,
      );
      // Registration still succeeds; user can resend later
    }
  }

  private async createAuthToken(
    userId: string,
    type: AuthTokenType,
    ttlMs: number,
  ): Promise<string> {
    await this.prisma.authToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(rawToken);

    await this.prisma.authToken.create({
      data: {
        userId,
        type,
        token: hashedToken,
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });

    return rawToken;
  }

  private async findValidToken(rawToken: string, type: AuthTokenType) {
    const hashedToken = this.hashToken(rawToken);
    const record = await this.prisma.authToken.findFirst({
      where: {
        token: hashedToken,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired token');
    }

    return record;
  }

  private hashToken(rawToken: string) {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    permissions: string[],
    req?: Request,
  ) {
    const payload: JwtPayload = { sub: userId, email, role, permissions };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn') as any,
    });

    const refreshToken = randomBytes(64).toString('hex');
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
    const expiresAt = this.parseExpiry(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
        userAgent: req?.get('user-agent'),
        ipAddress: req?.ip,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    };
  }

  private parseExpiry(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };
    return new Date(Date.now() + value * multipliers[unit]);
  }

  private sanitizeUser(user: any) {
    if (!user) return null;
    const { password, ...rest } = user;
    return rest;
  }
}
