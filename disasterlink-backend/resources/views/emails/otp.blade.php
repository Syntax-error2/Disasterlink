<!DOCTYPE html>
<html>
<head>
    <title>DisasterLink Registration OTP</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 20px;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #18181b; margin-top: 0; padding-bottom: 15px; border-bottom: 1px solid #e4e4e7;">Personnel Registration Security Check</h2>
        <p style="color: #52525b; font-size: 16px;">Hello {{ $name }},</p>
        <p style="color: #52525b; font-size: 16px;">You recently requested to register for the DisasterLink system. For security purposes, please use the following 6-digit One-Time Password (OTP) to verify your email address and complete your registration:</p>
        
        <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626; font-family: monospace;">{{ $otp }}</span>
        </div>

        <p style="color: #52525b; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please safely ignore this email.</p>
        <p style="color: #71717a; font-size: 12px; margin-top: 40px; border-top: 1px solid #e4e4e7; padding-top: 20px;">
            Secure Dispatch by DisasterLink Systems.
        </p>
    </div>
</body>
</html>
