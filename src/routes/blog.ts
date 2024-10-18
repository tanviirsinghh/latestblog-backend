import { Prisma, PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { createBlogInput, updateBlogInput } from "@tanviirsinghh/medium-common";
import { Hono } from "hono";
import { jwt, sign, verify } from "hono/jwt";




export const blogRoute = new Hono<{
    Bindings: {
      DATABASE_URL: string;
      JWT_SECRET: string;
    },
    Variables:{
        userId: string;
        
    }
  }>();

  

blogRoute.use('/*', async (c, next) => {
     const verified  = c.req.header('authorization') || ""
// const token = verified.split(" ")[1]
     const decode = await verify(verified, c.env.JWT_SECRET)

     if(decode){
        c.set("userId", decode.id)
        console.log(decode.id)
       await next()
     }else{
        c.status(403)
        c.json({
            message:'User not found'
        })
     }

})
  blogRoute.post('/',async (c) =>{
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
      const authorId = c.get("userId") 
      const body = await c.req.json()
      

      const {success} = createBlogInput.safeParse(body)
      console.log(body)
      console.log(success)
    if(!success){
      c.status(411)
      return c.json({
        message:"Input not correct"
      })
    }
    
      const post = await prisma.post.create({
        data:{
            title: body.title,
            content: body.content,
            authorId:authorId
        }
      })
      return c.json({
        id:post.id
      })
      
  })
  blogRoute.put("/", async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());

      const body = await c.req.json()
      const {success} = updateBlogInput.safeParse(body)
    if(!success){
      c.status(411)
      return c.json({
        message:"Input not correct"
      })
    }
    
      const post = await prisma.post.update({

        where:{
            id:body.id
        },
        data:{
            title: body.title,
            content: body.content
        }
      })
      return c.json({
        id:post.id
      })
  });
  
 // Might add pagination later
 blogRoute.get("/bulk", async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());

    const posts= await prisma.post.findMany({
      select:{
        content:true,
        title:true,
        id:true,
        author:{
          select:{
            name:true
          }
        }
      }
    });
    return c.json({
        posts
    })

})
  
  blogRoute.get("/:id", async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
const id = c.req.param("id")
    try{
      const post = await prisma.post.findFirst({
 
        where:{
            id:id
        },
        select:{
          id:true,
          title:true,
          content:true,
          author:{
            select:{
              name:true
            }
          }
        }
      })
      return c.json(
        post
      ) 
    }catch(e){
        c.status(411)
        return c.json({
            message:"Error while fetching blog post"
        })
    }
    
    
    });


