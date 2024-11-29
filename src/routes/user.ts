import { Hono } from 'hono'
import { Prisma, PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { jwt, sign, verify } from 'hono/jwt'
import { X_HONO_DISABLE_SSG_HEADER_KEY } from 'hono/ssg'
import { string, z } from 'zod'
import { signinInput, signupInput } from '@tanviirsinghh/medium-common'
import { User } from '../../../Blog/src/hooks/index';

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

  console.log('otp check here')

  const apikey = c.env.API_KEY
  const secret = c.env.OTP_SECRET
  console.log('request entered backend')

  const body = await c.req.json()

  console.log(body)
  console.log('after body')

  const { success } = signupInput.safeParse(body)

  if (!success) {
    c.status(411)
    return c.json({
      message: 'Input not correct'
    })
  }

  console.log('create databse')
  const emailCheck = await prisma.user.findUnique({
    where: {
      email: body.email
    }
  })
  console.log('fuck')
  if (emailCheck) {
    c.status(403)
    return c.json({
      error: 'Email Already in Use'
    })
  }
  console.log('fuck')

  try {
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: body.password,
        blogName: body.blogName,
        profilePicture: body.profilePicture
        // otp:"1234",
        // isVerified:false,
      }
    })
    console.log('temporary user created successfully')

    //  const otpResponse = await sendOtp({apikey, otp , email})
    // After creating the user, its returns us the user's id
    // which we are using here to sign
    const token = await sign({ id: user.id }, c.env.JWT_SECRET)
    // after signing the JWT will return us a token that we are returning
    console.log('jwt token ' + token)
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
    console.log('chalda')
    console.log('here is the returning token' + jwt)
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
    console.log('Token decoded successfully')
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
    console.log(`Fetching data for userId: ${userId}`)

    // Fetch user data from the database
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        blogName: true,
        profilePicture: true
      }
    })

    // Check if user exists
    if (!userData) {
      c.status(404)
      return c.text('User not found')
    }

    return c.json(userData) // Send user data as response
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
  // if(!decode){
  //   c.status(411)
  //   return c.text('Token not verified')
  // }
  console.log(body.profilePicture)
  try{
    console.log("entered the try block")
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