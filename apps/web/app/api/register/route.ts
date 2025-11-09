import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; name?: string };
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 },
      );
    }

    // Dynamically import to avoid bundling issues
    // Import db entities directly
    const dbModule = await import('@trainhive/db');
    const { AppDataSource, User: UserEntity } = dbModule;

    // Initialize database connection if needed
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const userRepository = AppDataSource.getRepository(UserEntity);

    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = userRepository.create({
      email,
      name,
      password: hashedPassword,
    });

    const savedUser = await userRepository.save(newUser);

    return NextResponse.json(
      {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : String(error);
    // eslint-disable-next-line no-console
    console.error('Error details:', errorMessage, errorStack);
    return NextResponse.json(
      { error: 'Failed to register user', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 },
    );
  }
}
