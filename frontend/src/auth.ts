import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// Google sign-in. Sessions are stateless JWT cookies; the backend owns user records
// and upserts a user by email the first time it sees one.
export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/" },
})
