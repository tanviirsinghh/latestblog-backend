import { Prisma, PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { createBlogInput, updateBlogInput } from '@tanviirsinghh/medium-common'
import { Hono } from 'hono'
import { jwt, sign, verify } from 'hono/jwt'
import { JWTPayload } from 'hono/utils/jwt/types'
// import SavedBlogs from '../../../Blog/src/components/UserProfile.tsx/SavedBlogs'

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
  console.log('try block of create blog')
  try {
    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        url: body.url,
        authorId: authorId
      }
    })
    return c.json({
      id: post.id
    })
  } catch (e) {
    c.status(500)
    return c.json({
      msg: 'Internal Server Error'
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

  try {
    const posts = await prisma.post.findMany({
      select: {
        content: true,
        title: true,
        id: true,
        url: true,
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
    console.log('completed the fetch from the blogs')
  } catch (e) {
    c.status(411)
    return c.json({
      message: 'Error while fetching blogs'
    })
  }
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
        url: true,
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

blogRoute.post('/saveblog', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
  console.log('backend')
  const body = await c.req.json()

  const token = c.req.header('authorization')
  if (!token) {
    c.status(401)
    return c.text('Token not found')
  }
  console.log('token aagya')

  const decode = (await verify(token, c.env.JWT_SECRET)) as {
    id: string | undefined
  }

  if (!decode?.id) {
    c.status(411)
    return c.text('Token not verified or ID missing')
  }
  console.log('start')

  try {
    const saveBlog = await prisma.savedPost.create({
      data: {
        postId: body.postId,
        userId: decode.id
      }
    })
    return c.json(saveBlog)
  } catch (e) {
    c.status(411)
    return c.json({
      message: 'Error while fetching blog post'
    })
  }
})

blogRoute.get('/savedblogs', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const token = c.req.header('authorization')
  if (!token) {
    c.status(401)
    return c.text('Token not found')
  }

  const decode = (await verify(token, c.env.JWT_SECRET)) as {
    id: string | undefined
  }
  if (!decode?.id) {
    c.status(401)
    return c.text('Token not verified')
  }

  try {
    const savedBlogs = await prisma.savedPost.findMany({
      where: { userId: decode.id },
      include: { post: true } // Include post details if needed
    })

    return c.json(savedBlogs)
  } catch (e) {
    c.status(411)
    return c.json({
      message: 'Error while fetching blog post'
    })
  }
})

blogRoute.get('/bookmarkstatus/:id', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const token = c.req.header('authorization')
  if (!token) {
    c.status(401)
    return c.text('Token not found')
  }

  const decode = (await verify(token, c.env.JWT_SECRET)) as {
    id: string | undefined
  }

  if (!decode?.id) {
    c.status(411)
    return c.text('Token not verified or ID missing')
  }
  try {
    const id = c.req.param('id') // Extract post ID from route parameter
    const blog = await prisma.savedPost.findFirst({
      where: {
        postId: id,
        userId: decode.id
      } // Check if the blog exists by ID
    })

    if (!blog) {
      // Blog not found
      return c.json(
        {
          isBookmarked: false,
          message: 'Blog not found'
        },
        404
      )
    }

    // Blog found
    return c.json(
      {
        isBookmarked: true,
        blog
      },
      200
    )
  } catch (e) {
    // Handle errors like database connection issues
    return c.json(
      {
        isBookmarked: false,
        message: 'Error while fetching blog post'
      },
      500
    )
  }
})

blogRoute.delete('/removesavedblog/:id', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
  console.log('backend')
  // const body = await c.req.json()
  const id = c.req.param('id')
  if (!id) {
    c.status(400)
    return c.json({ message: 'ID parameter is missing or invalid' })
  }
  const token = c.req.header('authorization')
  if (!token) {
    c.status(401)
    return c.text('Token not found')
  }
  console.log('token aagya')

  const decode = (await verify(token, c.env.JWT_SECRET)) as {
    id: string | undefined
  }

  if (!decode?.id) {
    c.status(411)
    return c.text('Token not verified or ID missing')
  }
  // if(!decode){
  console.log('start delete')
  console.log(decode.id)
  try {
    const remove = await prisma.savedPost.deleteMany({
      where: {
        postId: id,
        userId: decode.id
      }
    })

    if (remove.count === 0) {
      c.status(404)
      return c.json({
        message:
          'Saved blog not found or you do not have permission to remove it'
      })
    }
    return c.json({
      message: 'Blog unsaved',
      remove
    })
  } catch (e) {
    c.status(411)
    return c.json({
      message: 'Error while fetching blog post'
    })
  }
})
