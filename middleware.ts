import { NextResponse, NextRequest } from 'next/server';
   import jwt from 'jsonwebtoken';

   export function middleware(request: NextRequest) {
     const { pathname } = request.nextUrl;

     // Исключаем страницу входа из проверки авторизации
     if (pathname === '/admin/login') {
       return NextResponse.next();
     }

     const token = request.cookies.get('token')?.value;

     if (!token) {
       return NextResponse.redirect(new URL('/admin/login', request.url));
     }

     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { role: string };
       if (decoded.role !== 'admin') {
         return NextResponse.redirect(new URL('/admin/login', request.url));
       }
       return NextResponse.next();
     } catch {
       return NextResponse.redirect(new URL('/admin/login', request.url));
     }
   }

   export const config = {
     matcher: ['/admin/:path*', '/api/admin/:path*'],
   };