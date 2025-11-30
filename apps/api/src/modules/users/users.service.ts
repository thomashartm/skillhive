import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@trainhive/db';
import { UserRole } from '@trainhive/shared';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check for duplicate email
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException(`User with email '${createUserDto.email}' already exists`);
    }

    const user = this.userRepository.create({
      ...createUserDto,
      role: createUserDto.role || UserRole.USER,
    });

    const savedUser = await this.userRepository.save(user);

    // Remove password from response
    delete savedUser.password;
    return savedUser;
  }

  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Remove passwords from all users
    return users.map(user => {
      delete user.password;
      return user;
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove password from response
    delete user.password;
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check email uniqueness if changing
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: updateUserDto.email }
      });
      if (existing) {
        throw new ConflictException(`User with email '${updateUserDto.email}' already exists`);
      }
    }

    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);

    // Remove password from response
    delete savedUser.password;
    return savedUser;
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userRepository.remove(user);
  }
}
