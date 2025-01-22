import { Hono } from 'hono'
import { userRoute } from './routes/user'
import { blogRoute } from './routes/blog'
import { cors } from 'hono/cors'

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  }
}>()
// CORS configuration
app.use(
  '/*',
  cors({
    origin: [
      'https://latest-blog-nv7mdh52s-tanviirsinghhs-projects.vercel.app',
      'https://latest-blog-git-main-tanviirsinghhs-projects.vercel.app',
      'https://latest-blog-nv7mdh52s-tanviirsinghhs-projects.vercel.app/',
      'https://large-75896.web.app',
      'http://localhost:5173'
    ],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400
  })
)

app.route('/api/v1/user', userRoute)
app.route('/api/v1/blog', blogRoute)

export default app
