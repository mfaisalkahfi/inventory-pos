import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
    });

    await this.userRepository.save(user);

    return { message: 'Registration successful', userId: user.id };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken, userAgent, ipAddress);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const storedToken = await this.refreshTokenRepository.findOne({
      where: {
        token: refreshToken,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Revoke old token
    storedToken.isRevoked = true;
    await this.refreshTokenRepository.save(storedToken);

    // Generate new tokens
    const tokens = await this.generateTokens(storedToken.user);

    // Save new refresh token
    await this.saveRefreshToken(
      storedToken.user.id,
      tokens.refreshToken,
      storedToken.userAgent,
      storedToken.ipAddress,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.refreshTokenRepository.update(
        { token: refreshToken, userId },
        { isRevoked: true },
      );
    } else {
      // Revoke all refresh tokens for this user
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
    }

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as any, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m') as any,
      }),
      this.jwtService.signAsync(payload as any, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    token: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    const days = parseInt(expiresIn!.replace('d', ''), 10) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    });

    await this.refreshTokenRepository.save(refreshToken);
  }

  // --- User Management ---
  async findAllUsers() {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    const result = [];
    for (const user of users) {
      let roles: any[] = [];
      let locations: any[] = [];
      try {
        roles = await this.userRepository.query(
          `SELECT r.id, r.name FROM roles r 
           INNER JOIN user_roles ur ON ur.role_id = r.id 
           WHERE ur.user_id = $1`,
          [user.id],
        );
      } catch {}
      try {
        locations = await this.userRepository.query(
          `SELECT ul.id, ul.location_type, ul.location_id FROM user_locations ul WHERE ul.user_id = $1`,
          [user.id],
        );
        // Enrich with location names
        for (const loc of locations) {
          try {
            if (loc.location_type === 'warehouse') {
              const wh = await this.userRepository.query(`SELECT name FROM warehouses WHERE id = $1`, [loc.location_id]);
              loc.location_name = wh[0]?.name || loc.location_id;
            } else if (loc.location_type === 'outlet') {
              const out = await this.userRepository.query(`SELECT name FROM outlets WHERE id = $1`, [loc.location_id]);
              loc.location_name = out[0]?.name || loc.location_id;
            }
          } catch {
            loc.location_name = loc.location_id;
          }
        }
      } catch {}
      result.push({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        roles,
        locations,
      });
    }
    return result;
  }

  async findUserById(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('User not found');

    let roles: any[] = [];
    let locations: any[] = [];
    try {
      roles = await this.userRepository.query(
        `SELECT r.id, r.name FROM roles r 
         INNER JOIN user_roles ur ON ur.role_id = r.id 
         WHERE ur.user_id = $1`,
        [id],
      );
    } catch {}
    try {
      locations = await this.userRepository.query(
        `SELECT ul.id, ul.location_type, ul.location_id FROM user_locations ul WHERE ul.user_id = $1`,
        [id],
      );
      for (const loc of locations) {
        try {
          if (loc.location_type === 'warehouse') {
            const wh = await this.userRepository.query(`SELECT name FROM warehouses WHERE id = $1`, [loc.location_id]);
            loc.location_name = wh[0]?.name || loc.location_id;
          } else if (loc.location_type === 'outlet') {
            const out = await this.userRepository.query(`SELECT name FROM outlets WHERE id = $1`, [loc.location_id]);
            loc.location_name = out[0]?.name || loc.location_id;
          }
        } catch {
          loc.location_name = loc.location_id;
        }
      }
    } catch {}

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      roles,
      locations,
    };
  }

  async updateUser(id: string, dto: { fullName?: string; phone?: string; isActive?: boolean }) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('User not found');
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    return this.userRepository.save(user);
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('User not found');
    await this.userRepository.softRemove(user);
    return { message: 'User deleted' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Password lama salah');
    }

    if (newPassword.length < 8) {
      throw new ConflictException('Password baru minimal 8 karakter');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.save(user);

    return { message: 'Password berhasil diubah' };
  }

  async resetPassword(userId: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    if (!newPassword || newPassword.length < 8) {
      throw new ConflictException('Password baru minimal 8 karakter');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.save(user);

    return { message: `Password user ${user.fullName} berhasil di-reset` };
  }

  async getUserLocations(userId: string) {
    const locations = await this.userRepository.query(
      `SELECT ul.id, ul.location_type, ul.location_id FROM user_locations ul WHERE ul.user_id = $1`,
      [userId],
    );
    for (const loc of locations) {
      try {
        if (loc.location_type === 'warehouse') {
          const wh = await this.userRepository.query(`SELECT id, code, name FROM warehouses WHERE id = $1`, [loc.location_id]);
          loc.location = wh[0] || null;
        } else if (loc.location_type === 'outlet') {
          const out = await this.userRepository.query(`SELECT id, code, name FROM outlets WHERE id = $1`, [loc.location_id]);
          loc.location = out[0] || null;
        }
      } catch {
        loc.location = null;
      }
    }
    return locations;
  }
}
