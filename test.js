const OTPAuth = require('otpauth');

try {
    const s = "cyyn 7rrd setw 53d3 vrkj bxjr mj6i tu3j";
    let cleanSecret = s.replace(/[\s\-=]/g, '').toUpperCase();
    console.log("Secret to decode:", cleanSecret);
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(cleanSecret) });
    const code = totp.generate();
    console.log("Code:", code);
} catch (e) {
    console.error("Error:", e.message);
}
