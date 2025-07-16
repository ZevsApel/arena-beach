import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const prisma = new PrismaClient();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 минут в миллисекундах

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return NextResponse.json({ message: 'Неверный email или пароль' }, { status: 401 });
    }

    let loginAttempt = await prisma.loginAttempt.findFirst({ where: { adminId: admin.id } });
    if (!loginAttempt) {
      loginAttempt = await prisma.loginAttempt.create({
        data: { adminId: admin.id, attempts: 0 },
      });
    }

    const timeSinceLastAttempt = new Date().getTime() - new Date(loginAttempt.lastAttempt).getTime();
    if (timeSinceLastAttempt > LOCKOUT_DURATION) {
      await prisma.loginAttempt.update({
        where: { id: loginAttempt.id },
        data: { attempts: 0, lastAttempt: new Date() },
      });
      loginAttempt.attempts = 0;
    }

    if (loginAttempt.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { message: 'Слишком много попыток. Попробуйте снова через 15 минут.' },
        { status: 429 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      await prisma.loginAttempt.update({
        where: { id: loginAttempt.id },
        data: { attempts: loginAttempt.attempts + 1, lastAttempt: new Date() },
      });
      return NextResponse.json({ message: 'Неверный email или пароль' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    const cookie = serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600,
      path: '/',
    });

    await prisma.loginAttempt.update({
      where: { id: loginAttempt.id },
      data: { attempts: 0, lastAttempt: new Date() },
    });

    return NextResponse.json(
      { message: 'Успешный вход' },
      {
        status: 200,
        headers: { 'Set-Cookie': cookie },
      }
    );
  } catch (error) {
    console.error('API Error:', error); // Для отладки
    return NextResponse.json({ message: 'Произошла ошибка' }, { status: 500 });
  }
}