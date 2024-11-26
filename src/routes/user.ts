import { Hono } from "hono";
import { Prisma, PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { jwt, sign, verify } from "hono/jwt";
import { X_HONO_DISABLE_SSG_HEADER_KEY } from "hono/ssg"; 
import { string, z } from "zod";
import { signinInput, signupInput } from "@tanviirsinghh/medium-common";


export const userRoute = new Hono<{
    Bindings: {
      DATABASE_URL: string;
      JWT_SECRET: string;
      OTP_SECRET:string
      API_KEY:string
   
     
    };
  }>();
  
  const OTPSECRET="fuckyoubitchgotohell"
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

userRoute.post("/signup", async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    // const otptoken = totp.generate(OTPSECRET)
    // console.log(otptoken)

    // const otp = (OTPSECRET);
    console.log("otp check here")
 
    
    const apikey = c.env.API_KEY
   const secret = c.env.OTP_SECRET
  console.log("request entered backend")

    const body = await c.req.json();

    console.log(body)
    console.log("after body")

    const {success} = signupInput.safeParse(body)

    if(!success){
      c.status(411)
      return c.json({
        message:"Input not correct"
      })
    }

    console.log("create databse")
    const emailCheck = await prisma.user.findUnique({
      where:{
          email:body.email
      }
      
    })
    console.log("fuck")
    if(emailCheck){
      c.status(403);
      return c.json({
        error:"Email Already in Use"
      })
    }
    console.log("fuck")
    

    try {
      
    //  console.log("before otp function" + otp)
    //  const responce =  await sendOtp({email, otp, apikey});
  //  const otp = '1234'
      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          password: body.password,
          blogName:body.blogName,
          profilePicture: body.profilePicture
          // otp:"1234",
          // isVerified:false,
          
        }
     });
     console.log("temporary user created successfully")
    //  console.log('otp sent')
    //  const email = body.email;

    //  const otpResponse = await sendOtp({apikey, otp , email})
    //  console.log("this is otp function respone after completion " + otpResponse)
    //  aft
      // After creating the user, its returns us the user's id
      // which we are using here to sign
      const token = await sign({ id: user.id }, c.env.JWT_SECRET);
      // after signing the JWT will return us a token that we are returning
      console.log("jwt token " + token)
      return c.json({
        token
      });
      
    } 
  catch (e) {

    c.status(500)
    return c.json({
      error: "Error while signing up",
    });
  }
  });


  userRoute.post("/signin", async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
  
    const body = await c.req.json();
    const {success} = signinInput.safeParse(body)
    if(!success){
      c.status(411)
      return c.json({
        message:"Input not correct"
      })
    }
  try{
    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
        password: body.password,
      },
    });
    if (!user) {
      c.status(401);
      return c.json({
        error: "user not found / Incorrect creds",
      });
    }
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    console.log('chalda')
     console.log(
"here is the returning token" + jwt
     )
    return c.text(

      jwt); 

    } catch (e) {

    c.status(500)

    return c.text("Please try again")
    }
  });


 