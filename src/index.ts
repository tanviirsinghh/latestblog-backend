import { Hono } from "hono";
import { Prisma, PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { jwt, sign, verify } from "hono/jwt";
import { X_HONO_DISABLE_SSG_HEADER_KEY } from "hono/ssg";
import { userRoute } from "./routes/user";
import { blogRoute } from "./routes/blog";
import { cors } from "hono/cors";


const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
 
  };
}>();
 // CORS configuration
app.use('/*', cors({
  origin: ['https://latest-blog-nv7mdh52s-tanviirsinghhs-projects.vercel.app','https://latest-blog-git-main-tanviirsinghhs-projects.vercel.app','https://latest-blog-nv7mdh52s-tanviirsinghhs-projects.vercel.app/','https://large-75896.web.app','http://localhost:5173'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400,
}));



// app.use('/*', cors())
app.route('/api/v1/user', userRoute)
app.route('/api/v1/blog', blogRoute)
// middlware
// app.use("/", async (c, next) => {
//     const header = c.req.header("authorization") as string ;
//     // this will split header into two parts bearer and token and will return the first index which is token
//     const token = header.split(" ")[1]
//     const response =  await verify(header, c.env.JWT_SECRET)
//     // as we have signed the jwt with an id
//     // it will return us an id
  
//     if(response.id){
//       next()
//     }else{
//       c.status(403)
//       return c.json({
//         error:'unauthorized'
//       })
//     }
//     await next();
//   });



export default app;
