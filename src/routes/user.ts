import { Hono } from 'hono'
import { Prisma, PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { jwt, sign, verify } from 'hono/jwt'
import { X_HONO_DISABLE_SSG_HEADER_KEY } from 'hono/ssg'
import { object, string, z } from 'zod'
import { signinInput, signupInput,  } from '@tanviirsinghh/medium-common'
import { User } from '../../../Blog/src/hooks/index';
import { SigninInput } from '../../../common/dist/index';


export const userRoute = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
    OTP_SECRET: string
    API_KEY: string
  }
}>()


// To restrict a middleware to certain routes, you can use the following -

// app.use('/message/*', async (c, next) => {
//   await next()
// })

// In our case, the following routes need to be protected -

// app.get('/api/v1/blog/:id', (c) => {})

// app.post('/api/v1/blog', (c) => {})

// app.put('/api/v1/blog', (c) => {})

// So we can add a top level middleware
// Routes

userRoute.post('/signup', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
  


  const apikey = c.env.API_KEY
  const secret = c.env.OTP_SECRET

  const body = await c.req.json()
       

  const { success } = signupInput.safeParse(body)

  if (!success) {
    c.status(411)
    return c.json({
      message: 'Input not correct'
    })
  }

  const emailCheck = await prisma.user.findUnique({
    where: {
      email: body.email
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
        name: body.name,
        email: body.email,
        password: body.password,
        blogName: body.blogName,
        profilePicture: body.profilePicture,
        bio:body.bio,
        location:body.location,
      }
    })

    //  const otpResponse = await sendOtp({apikey, otp , email})
    // After creating the user, its returns us the user's id
    // which we are using here to sign
    const token = await sign({ id: user.id }, c.env.JWT_SECRET)
    // after signing the JWT will return us a token that we are returning
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
  console.log('backend')

  const { success } = signinInput.safeParse(body)
  if (!success) {
    c.status(411)
    return c.json({
      message: 'Input not correct'
    })
  }
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
        password: body.password
      }
    })
    if (!user) {
      c.status(401)
      return c.text('user not found / Incorrect creds' )
    }
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET)

    return c.json({
      token : jwt
    })
  } catch (e) {
    c.status(500)

    return c.text('Please try again')
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
    if(queryUserId === decode.id){
    userId =  decode.id 
    check = true
    }else{
      userId =   queryUserId
      check = false
    }
  } else {
    userId =   decode.id
    
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
        posts:true
      }
    })

    if (!userData) {
      c.status(404)
      return c.text('User not found')
    }

    return c.json({userData,isCurrentUser: check})
  } catch (e) {
    console.error('Database error:', e)
    c.status(500)
    return c.text('Error while fetching user details from the database')
  }
})

//  get all the saved blogs


userRoute.get('/savedblogs', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const authHeader = c.req.header('Authorization') // Get Authorization header
  if (!authHeader) {
    c.status(401)
    return c.text('Token not available')
  }

  // Remove 'Bearer ' prefix if present
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
              select:{

               // Assuming `post` is the relation field for saved posts
              id: true,
              title: true,
              content: false,
              authorId:true,
              author:{
                select:{
                  name:true
                }
              },
              url: true,
            },
          },
          },
        },
      },
    })
    // const extractedBlogs = savedBlogs?.savedPosts.map((savedPost)=> savedPost.post)
    // Check if user exists
    if (!saved) {
      c.status(404)
      return c.text('User not found')
    }
   
  
  
  // first i was sending these but getting object on frontend
    // return c.json({
    //   saved: saved.savedPosts
    // }) // Send user data as response


    // getting savedPost object from the backend, mapping all the blog array to savedPost and sending to the frontend 
  return c.json(saved.savedPosts.map((savedPost) => savedPost.post));
  
  } catch (e) {
    console.error('Database error:', e) // Log error for debugging
    c.status(500)
    return c.text('Error while fetching user details from the database')
  }
})








//  update the image 

userRoute.put('/update-profile-picture', async c => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())
   
  const body = await c.req.json()
  const token = c.req.header('authorization') 
  if(!token){
    c.status(401)
    return c.text("Token not found")
  }
  
  // const decode = await verify(token, c.env.JWT_SECRET)

  const decode = await verify(token, c.env.JWT_SECRET) as { id: string | undefined };

       if (!decode?.id) {
  c.status(411);
  return c.text('Token not verified or ID missing');
} 
 
  try{
  const response = await prisma.user.update({
    where:{
    id:decode.id
    },
    data:{
      profilePicture:body.profilePicture
    }
  })
  return c.json( {
    success:true,
    user: response
  })
}
catch(e){
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
  if(!token){
    c.status(401)
    return c.text("Token not found")
  }
  
  // const decode = await verify(token, c.env.JWT_SECRET)

  const decode = await verify(token, c.env.JWT_SECRET) as { id: string | undefined };

       if (!decode?.id) {
  c.status(411);
  return c.text('Token not verified or ID missing');
} 
  // if(!decode){
  //   c.status(411)
  //   return c.text('Token not verified')
  // }
  try{
  const response = await prisma.user.update({
    where:{
    id:decode.id
    },
    data:{
      coverpicture:body.coverpicture
    }
  })
  return c.json( {
    success:true,
    user: response
  })
}
catch(e){
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
  if(!token){
    c.status(401)
    return c.text("Token not found")
  }
  
  // const decode = await verify(token, c.env.JWT_SECRET)

  const decode = await verify(token, c.env.JWT_SECRET) as { id: string | undefined };

       if (!decode?.id) {
  c.status(411);
  return c.text('Token not verified or ID missing');
} 
  

  const updatedData: Record<string, string> ={}

  if(body.name) updatedData.name = body.name;
  if(body.email) updatedData.email = body.email;
  if(body.blogName) updatedData.blogName = body.blogName;
  if(body.bio) updatedData.bio = body.bio;
  if(body.location) updatedData.location = body.location;
  
if(Object.keys(updatedData).length === 0){
  c.status(401);
  return c.text('No Valid Fields to Update')
}
  try{
  const response = await prisma.user.update({
    where:{
    id:decode.id
    },
    data:updatedData
  })
  return c.json( {
    success:true,
    user: response
  })
}
catch(e){
  c.status(500)
  return c.json({
    success: false,
    message: 'Server / Database Error'
  })
}


})

userRoute.get('/user-stats', async (c) => {

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL
  }).$extends(withAccelerate())

  const token = c.req.header('authorization') 
  if(!token){
    c.status(401)
    return c.text("Token not found")
  }

  const decode = await verify(token, c.env.JWT_SECRET) as { id: string | undefined };

       if (!decode?.id) {
  c.status(411);
  return c.text('Token not verified or ID missing');
} 


  try {
    const stats = await prisma.user.findUnique({
      where: { id: decode.id },
      select: {
        _count: {
          select: { posts: true }  // Count of posts
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
    });

    if (!stats) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Calculate total comments and likes
    const totalComments = stats.posts.reduce((sum, post) => sum + post._count.comment, 0);
    const totalLikes = stats.posts.reduce((sum, post) => sum + post._count.like, 0);

    return c.json({
      totalPosts: stats._count.posts,
      totalComments,
      totalLikes
    });
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});