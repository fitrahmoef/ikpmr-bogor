import type { NextAuthConfig } from 'next-auth';

// Edge-safe part of the config, shared by middleware. No database or bcrypt here.
export const authConfig = {
  pages: { signIn: '/masuk' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      // only "signed in" is checked here; roles are checked against the database in each layout,
      // so a promotion or demotion applies without waiting for the token to refresh
      if (pathname.startsWith('/admin') || pathname.startsWith('/anggota')) return !!auth?.user;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; role?: string; status?: string };
        token.id = u.id;
        token.role = u.role;
        token.status = u.status;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        Object.assign(session.user, { id: token.id, role: token.role, status: token.status });
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
