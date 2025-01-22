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
  const decode = (await verify(verified, c.env.JWT_SECRET)) as JWTPayload

  //  this can cause error because this was previously giving error thats why its is assigned string, if keep getting error then remove the string from here

  if (decode && typeof decode.id === 'string') {
    c.set('userId', decode.id)
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


  const authorId = c.get('userId')

  const body = await c.req.json()
  
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

blogRoute.put('/editedblog/:id', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
  const id =  c.req.param('id')
  const body = await c.req.json()
  
  const { success } = updateBlogInput.safeParse(body)
  if (!success) {
    c.status(411)
    return c.json({
      message: 'Input not correct'
    })
  }

  const authHeader = c.req.header('Authorization')
  let decode: { id: string } | null = null
  // let userId;

  // Check if Authorization header is available
  if (!authHeader) {
    c.status(401)
    return c.text('Token not available')
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    // Decode the token and extract user info
    decode = (await verify(token, c.env.JWT_SECRET)) as { id: string }
  } catch (e) {
    console.error('Token verification failed', e)
    c.status(500)
    return c.text('Token not verified')
  }

  try{
  const post = await prisma.post.update({
    where: {
      id: id
    },
    data: {
      title: body.title,
      content: body.content,
      id: id,
      url: body.url,

    }
  })
  return c.json({
    id: post.id
  })
}catch(e){
  c.status(401)
  return c.json({
    message: 'Error while fetching blogs'
  })
}
})
blogRoute.delete('/deleteblog/:id', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const postId = c.req.param('id')
  if (!postId) {
    c.status(400)
    return c.json({ message: 'ID parameter is missing or invalid' })
  }
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
       const response = await prisma.post.delete({
         where: {
           id: postId
      }
    })

    if(response){
    return c.json({
      message: 'Blog Deleted',
      
    })
  }
  } catch (e) {
    c.status(500)
    return c.json({
      message: 'Error while fetching blog post'
    })
  }
})

blogRoute.get('/bulk', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const authHeader = c.req.header('Authorization')
  let decode: { id: string } | null = null

  if (!authHeader) {
    c.status(401)
    return c.text('Token not available')
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    // Decode the token and extract user info
    decode = (await verify(token, c.env.JWT_SECRET)) as { id: string }
  } catch (e) {
    console.error('Token verification failed', e)
    c.status(500)
    return c.text('Token not verified')
  }

  try {
    // Fetch the posts based on the determined userId
    const posts = await prisma.post.findMany({
      select: {
        content: true,
        title: true,
        id: true,
        url: true,
       
        _count:{
          select:{
            like:true,
            comment:true,
            savedPosts:true
          }
      },
        author: {
          select: {
            name: true,
            profilePicture:true
          }
        }
      },
    })

    return c.json({
      posts
    })
  } catch (e) {
    c.status(411)
    return c.json({
      message: 'Error while fetching blogs'
    })
  }
})

blogRoute.get('/posts', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const authorId = c.req.query('authorId') // Retrieving authorId query parameter
  const authHeader = c.req.header('Authorization')
  let decode: { id: string } | null = null
  let userId

  // Check if Authorization header is available
  if (!authHeader) {
    c.status(401)
    return c.text('Token not available')
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    // Decode the token and extract user info
    decode = (await verify(token, c.env.JWT_SECRET)) as { id: string }
  } catch (e) {
    console.error('Token verification failed', e)
    c.status(500)
    return c.text('Token not verified')
  }

  // Determine the userId based on the authorId query or logged-in user
  if (authorId) {
    if (authorId === decode.id) {
      // If authorId matches the logged-in user, fetch the user's own posts
      userId = decode.id
    } else {
      // Otherwise, fetch posts for the specified author
      userId = authorId
    }
  } else {
    // If no authorId, fetch posts for the logged-in user
    userId = decode.id
  }

  try {
    // Fetch the posts based on the determined userId
    const posts = await prisma.post.findMany({
      where: {
        authorId: userId // Filtering posts by authorId
      },
      select: {
        content: true,
        title: true,
        id: true,
        url: true,
        author: {
          select: {
            name: true
          }
        },
        _count:{
          select:{
            like:true,
            comment:true,
            savedPosts:true
          }
        }
      }
    })

    return c.json({
      posts
    })
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

  const authHeader = c.req.header('Authorization')
  let decode: { id: string } | null = null

  // Check if Authorization header is available
  if (!authHeader) {
    c.status(401)
    return c.text('Token not available')
  }
  const token = authHeader.replace('Bearer ', '')
  try {
    // Decode the token and extract user info
    decode = (await verify(token, c.env.JWT_SECRET)) as { id: string }
  } catch (e) {
    console.error('Token verification failed', e)
    c.status(500)
    return c.text('Token not verified')
  }
  const userId = decode.id

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
        authorId:true,
           _count:{
          select:{
            comment:true,
            like:true
          }
        },
        author: {
          select: {
            name: true,
          }
        }
      }
    })
 
    if(post?.authorId === userId){
      return c.json({post, editButton:true})
    }else{
      return c.json({post, editButton:false})
    }
  } catch (e) {
    c.status(411)
    return c.json({
      message: 'Error while fetching blog post'
    })
  }
})

blogRoute.post('/:id/like', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const postId = c.req.param('id')
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
  } // Decode token to get userId
  const userId = decode.id

  try {
    // Create a like
    const response = await prisma.like.create({
      data: {
         postId, 
         userId 
        }
    })

    return c.json({ 
      isLiked:true,
       message: 'Post Liked' 
      })

  } catch (e) {
    c.status(411)
    return c.json({
      message: 'Error while Liking the post '
    })
  }
})

blogRoute.delete('/:id/likeremove', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const postId = c.req.param('id')
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
  } // Decode token to get userId
  const userId = decode.id 
  // Check if already liked
  try {
    // Create a like
    const removed = await prisma.like.delete({
      where: { 
        postId_userId: {
           postId,
           userId 
          } 
        }
    })
   if(removed){
 return c.json({ 
      isLiked:false,
       message: 'Post Liked removed' 
      }) 
     } 
    }
     catch (e) {
    c.status(403)
    return c.json({
      message: 'Error while removing Like '
    })
  }
})
blogRoute.get('/likestatus/:id', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
  const postId = c.req.param('id')
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
  const userId = decode.id

  try {
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: { 
          postId, 
          userId
         }
      }
    })
   if(existingLike){
    return c.json({ 
      isLiked:true,
       message: 'Post Liked' 
      })
      } 
    else{
      return c.json({ 
        isLiked:false,
         message: 'Not liked' 
        })
    }
  }
      catch (e) {
    c.status(411)
    return c.json({ 
      isLiked:false,
       message: 'Error fetching' 
      })
  }
})

blogRoute.get('/:id/postlikes', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
  const postId = c.req.param('id')
  
  try {
    const likeCount = await prisma.like.count({
      where: {
        postId: postId
      }
    })
      return c.json({likeCount})
    

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
      404
    )
  }
})

blogRoute.delete('/removesavedblog/:id', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

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

  const decode = (await verify(token, c.env.JWT_SECRET)) as {
    id: string | undefined
  }

  if (!decode?.id) {
    c.status(411)
    return c.text('Token not verified or ID missing')
  }
  
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


blogRoute.post('/:id/comment', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())


  const blogId = c.req.param('id')
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
    const post = await prisma.comment.create({
      data: {
        content: body.content,
        timestamp: body.timestamp,
        userId : decode.id,
        postId: blogId
      }
    })
    
      return c.json(
          post
      )
    
  } catch (e) {
    c.status(500)
    return c.json({
      msg: 'Internal Server Error'
    })
  }
})

blogRoute.get('/:id/comments', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
            
  const postId = c.req.param('id')
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
     // Extract post ID from route parameter
    const comments = await prisma.comment.findMany({
      where: {
        postId: postId,
       
      },include:{
        user:{
          select:{
            name:true, 
            profilePicture:true,
            id:true,
          }
        }
      }
      // Check if the blog exists by ID
    })

    if (!comments) {
      // Blog not found
      return c.json(
        {
          message: 'No Comments'
        },
        404
      )
    }

    // Blog found
    return c.json(
      {
        comments
      },
      200
    )
  } catch (e) {
    // Handle errors like database connection issues
    return c.json(
      {
        message: 'Error while fetching comments'
      },
      411
    )
  }
})


