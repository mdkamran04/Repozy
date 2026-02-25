export async function GET() {
  return Response.json({
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "UNDEFINED",
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED ? "SET" : "UNDEFINED",
  })
}