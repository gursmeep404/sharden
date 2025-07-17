import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔐 Authentication attempt for:', credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        try {
          console.log('🔍 Looking up user in database...');
          const user = await prisma.users.findUnique({
            where: { email: credentials.email },
            include: { role: true },
          });

          if (!user) {
            console.log('❌ User not found');
            return null;
          }

          console.log('✅ User found:', user.email, 'Role:', user.role.name);

          // Direct string comparison for prototype
          if (credentials.password !== user.password_hash) {
            console.log('❌ Password mismatch');
            return null;
          }

          console.log('✅ Authentication successful for:', user.email);
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role.name,
          };
        } catch (error) {
          console.error('❌ Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.role = user.role;
        console.log(
          '🎫 JWT token created for user:',
          user.email,
          'Role:',
          user.role
        );
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.sub;
        session.user.role = token.role;
        console.log(
          '🎯 Session created for user:',
          session.user.email,
          'Role:',
          session.user.role
        );
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt' as const,
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
