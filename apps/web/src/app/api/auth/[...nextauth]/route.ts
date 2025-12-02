import NextAuth from 'next-auth';
import { getAuthOptions } from '@trainhive/auth';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const handler = NextAuth(getAuthOptions());

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export { handler as GET, handler as POST };
