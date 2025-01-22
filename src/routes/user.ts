import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign, verify } from 'hono/jwt'
import { signinInput, signupInput } from '@tanviirsinghh/medium-common'

export const userRoute = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
    OTP_SECRET: string
    API_KEY: string
  }
}>()

userRoute.post('/signup', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const body = await c.req.json()
  const validationResult = signupInput.safeParse(body)
  if (!validationResult.success) {
    c.status(411)
    return c.json({
      message: 'Input not correct',
      errors: validationResult.error.errors.map(err => ({
        field: err.path[0],
        message: err.message
      }))
    })
  }

  // Use validated data
  const validatedData = validationResult.data
  const emailCheck = await prisma.user.findUnique({
    where: {
      email: validatedData.email
    }
  })
  if (emailCheck) {
    c.status(403)
    return c.json({
      error: 'Email Already in Use'
    })
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: validatedData.password,
        blogName: validatedData.blogName,
        profilePicture: validatedData.profilePicture,
        bio: validatedData.bio,
        location: validatedData.location
      }
    })

    const token = await sign({ id: user.id }, c.env.JWT_SECRET)
    return c.json({
      token
    })
  } catch (e) {
    c.status(500)
    return c.json({
      error: 'Error while signing up'
    })
  }
})

userRoute.post('/signin', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const body = await c.req.json()

  const validationResult = signinInput.safeParse(body)

  if (!validationResult.success) {
    c.status(411)
    return c.json({
      message: 'Input not correct',
      errors: validationResult.error.errors.map(err => ({
        field: err.path[0],
        message: err.message
      }))
    })
  }

  const validatedData = validationResult.data
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: validatedData.email,
        password: validatedData.password
      }
    })
    if (!user) {
      c.status(401)
      return c.text('user not found / Incorrect creds')
    }
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET)

    return c.json({
      token: jwt
    })
  } catch (e) {
    c.status(500)

    return c.json({
      message: 'Internal server error'
    })
  }
})

userRoute.get('/details', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
  let check
  const authHeader = c.req.header('Authorization')
  if (!authHeader) {
    c.status(401)
    return c.text('Token not available')
  }

  const token = authHeader.replace('Bearer ', '')
  let decode: { id: string } | null = null
  try {
    decode = (await verify(token, c.env.JWT_SECRET)) as { id: string }
  } catch (e) {
    console.error('Token verification failed', e)
    c.status(500)
    return c.text('Token not verified')
  }

  const queryUserId = c.req.query('authorId')

  let userId: string
  if (queryUserId) {
    if (queryUserId === decode.id) {
      userId = decode.id
      check = true
    } else {
      userId = queryUserId
      check = false
    }
  } else {
    userId = decode.id
  }

  try {
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        blogName: true,
        profilePicture: true,
        bio: true,
        location: true,
        coverpicture: true,
        posts: true
      }
    })

    if (!userData) {
      c.status(404)
      return c.text('User not found')
    }

    return c.json({ userData, isCurrentUser: check })
  } catch (e) {
    console.error('Database error:', e)
    c.status(500)
    return c.text('Error while fetching user details from the database')
  }
})

userRoute.get('/savedblogs', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const authHeader = c.req.header('Authorization') // Get Authorization header
  if (!authHeader) {
    c.status(401)
    return c.text('Token not available')
  }

  const token = authHeader.replace('Bearer ', '')

  let decode: { id: string } | null = null
  try {
    decode = (await verify(token, c.env.JWT_SECRET)) as { id: string } // Decode the token
  } catch (e) {
    console.error('Token verification failed', e) // Log error for debugging
    c.status(500)
    return c.text('Token not verified')
  }

  const userId = decode?.id // Extract userId from the decoded token
  if (!userId) {
    c.status(400)
    return c.text('Invalid token payload')
  }

  try {
    // Fetch user data from the database
    const saved = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        savedPosts: {
          select: {
            post: {
              select: {
                id: true,
                title: true,
                content: false,
                authorId: true,
                author: {
                  select: {
                    name: true
                  }
                },
                url: true
              }
            }
          }
        }
      }
    })

    if (!saved) {
      c.status(404)
      return c.text('User not found')
    }

    // getting savedPost object from the backend, mapping all the blog array to savedPost and sending to the frontend
    return c.json(saved.savedPosts.map(savedPost => savedPost.post))
  } catch (e) {
    console.error('Database error:', e) // Log error for debugging
    c.status(500)
    return c.text('Error while fetching user details from the database')
  }
})

userRoute.put('/update-profile-picture', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const body = await c.req.json()
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
    const response = await prisma.user.update({
      where: {
        id: decode.id
      },
      data: {
        profilePicture: body.profilePicture
      }
    })
    return c.json({
      success: true,
      user: response
    })
  } catch (e) {
    c.status(500)
    return c.json({
      success: false,
      message: 'Server / Database Error'
    })
  }
})

userRoute.put('/update-cover-picture', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const body = await c.req.json()
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
    const response = await prisma.user.update({
      where: {
        id: decode.id
      },
      data: {
        coverpicture: body.coverpicture
      }
    })
    return c.json({
      success: true,
      user: response
    })
  } catch (e) {
    c.status(500)
    return c.json({
      success: false,
      message: 'Server / Database Error'
    })
  }
})

userRoute.put('/update-user-info', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
  const body = await c.req.json()
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

  const updatedData: Record<string, string> = {}

  if (body.name) updatedData.name = body.name
  if (body.email) updatedData.email = body.email
  if (body.blogName) updatedData.blogName = body.blogName
  if (body.bio) updatedData.bio = body.bio
  if (body.location) updatedData.location = body.location

  if (Object.keys(updatedData).length === 0) {
    c.status(401)
    return c.text('No Valid Fields to Update')
  }
  try {
    const response = await prisma.user.update({
      where: {
        id: decode.id
      },
      data: updatedData
    })
    return c.json({
      success: true,
      user: response
    })
  } catch (e) {
    c.status(500)
    return c.json({
      success: false,
      message: 'Server / Database Error'
    })
  }
})

userRoute.get('/user-stats', async c => {
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
    const stats = await prisma.user.findUnique({
      where: { id: decode.id },
      select: {
        _count: {
          select: { posts: true } // Count of posts
        },
        posts: {
          select: {
            _count: {
              select: {
                comment: true,
                like: true
              }
            }
          }
        }
      }
    })

    if (!stats) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Calculate total comments and likes
    const totalComments = stats.posts.reduce(
      (sum, post) => sum + post._count.comment,
      0
    )
    const totalLikes = stats.posts.reduce(
      (sum, post) => sum + post._count.like,
      0
    )

    return c.json({
      totalPosts: stats._count.posts,
      totalComments,
      totalLikes
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})
