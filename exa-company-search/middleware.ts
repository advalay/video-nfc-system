import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // ミドルウェアで追加の処理が必要な場合
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    // 保護するページを指定
    "/",
    "/leads",
    "/api/exa",
  ],
}
