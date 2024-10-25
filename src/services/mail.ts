interface mailProps{
    email:string,
    otp:string,
    apikey:string
    
}

export const sendOtp = async ({ email, apikey, otp}:mailProps) => {
    console.log('entered the function')
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apikey
      },
      body:  JSON.stringify({
        sender: { name: 'Blog APP', email: 'ustaalokk<yanon6107@gmail.com>' }, // Use your verified sender email from Brevo
        to: [{ email: email }],
        subject: 'Blog App OTP',
        htmlContent: `Your conformation code is ${otp}`,
      }),
    });
  
    if (!response.ok) {
      const error = await response.text();
        console.log("error in otp function")
      console.error('Error from Brevo API:', error);  // Log the error for debugging
    throw new Error(`Failed to send email: ${error}`);
    }
    console.log('sent otp function complete')
    return 
  };
