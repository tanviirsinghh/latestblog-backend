import { Prisma, PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { createBlogInput, updateBlogInput } from '@tanviirsinghh/medium-common'
import { Hono } from 'hono'
import { jwt, sign, verify } from 'hono/jwt'
import { JWTPayload } from 'hono/utils/jwt/types'

export const blogRoute = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  }
  Variables: {
    userId: string
  }
}>()
interface jwtpayload {
  id: string
}

blogRoute.use('/*', async (c, next) => {
  const verified = c.req.header('authorization') || ''
  // const token = verified.split(" ")[1]
  const decode = (await verify(verified, c.env.JWT_SECRET)) as JWTPayload
  console.log(decode)

// 
//  
// 
// 
// 
// 
// 
// 
// 

//  this can cause error because this was previously giving error thats why its is assigned string, if keep getting error then remove the string from here

  if (decode && typeof decode.id === 'string') {
    c.set('userId', decode.id)
    console.log(decode.id)
    await next()
  } else {
    c.status(403)
    c.json({
      message: 'User not found'
    })
  }
})


blogRoute.post('/', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  console.log('entered backend')

  const authorId = c.get('userId')
  const body = await c.req.json()
  console.log(body)
  const { success } = createBlogInput.safeParse(body)
  console.log(success)
  if (!success) {
    c.status(411)
    return c.json({
      message: 'Input not correct'
    })
  }
 
  // sending the img to the cloudinary
  // const img = body.img;
  // const imgUpload = sendImg(img);
  // console.log("here is the body.url " + body.url)
console.log("try block of create blog")
try{
  const post = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content,
      url: body.url,
      authorId: authorId,
     
    }
  })
  return c.json({
    id: post.id
  })
}catch(e){
  c.status(500)
 return c.json({
  msg: "Internal Server Error"
 })


}


})

blogRoute.put('/', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const body = await c.req.json()
  const { success } = updateBlogInput.safeParse(body)
  if (!success) {
    c.status(411)
    return c.json({
      message: 'Input not correct'
    })
  }

  const post = await prisma.post.update({
    where: {
      id: body.id
    },
    data: {
      title: body.title,
      content: body.content
    }
  })
  return c.json({
    id: post.id
  })
})

// Might add pagination later
blogRoute.get('/bulk', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const posts = await prisma.post.findMany({
    select: {
      content: true,
      title: true,
      id: true,
      author: {
        select: {
          name: true
        }
      }
    }
  })
  return c.json({
    posts
  })
})

blogRoute.get('/:id', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
  const id = c.req.param('id')
  try {
    const post = await prisma.post.findFirst({
      where: {
        id: id
      },
      select: {
        id: true,
        title: true,
        content: true,
        url:true,
        author: {
          select: {
            name: true
          }
        }
      }
    })
    return c.json(post)
  } catch (e) {
    c.status(411)
    return c.json({
      message: 'Error while fetching blog post'
    })
  }
})
