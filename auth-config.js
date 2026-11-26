"use strict";

/* ==========================================
   ROOMKHOJO PREMIUM+ AUTH CONFIGURATION

   Tenant Login
   Property Owner Login
   Admin Login
   Employee Login

   Supabase Authentication
   Cloudflare Turnstile
   Mobile OTP Preparation
   Biometric Login Preparation
========================================== */


/* ==========================================
   PUBLIC AUTHENTICATION CONFIGURATION
========================================== */

window.ROOMKHOJO_AUTH_CONFIG = Object.freeze({


    /* ======================================
       SUPABASE PROJECT URL
    ====================================== */

    supabaseUrl:
        "https://detudtjepdnasnpltody.supabase.co",


    /* ======================================
       SUPABASE PUBLIC PUBLISHABLE KEY

       This key is intended for frontend use.

       Never use a secret key or
       service_role key in browser code.
    ====================================== */

    supabasePublishableKey:
        "sb_publishable_AVz84-9mdwjqdZNZ70J2ZQ_kEz9jjwh",


    /* ======================================
       ROOMKHOJO GITHUB PAGES WEBSITE
    ====================================== */

    origin:
        "https://shakil-205.github.io",


    /* ======================================
       WEBSITE PROJECT PATH
    ====================================== */

    basePath:
        "/roomkhojo/",


    /* ======================================
       CLOUDFLARE TURNSTILE CAPTCHA

       Set true only after configuring
       Cloudflare Turnstile and Supabase
       server-side CAPTCHA verification.

       Keep disabled for now.
    ====================================== */

    turnstileEnabled: true,


    /* ======================================
       CLOUDFLARE PUBLIC SITE KEY

       Add the Cloudflare Site Key here
       when we configure CAPTCHA.

       Never paste the Turnstile
       Secret Key into this file.
    ====================================== */

    turnstileSiteKey: "0x4AAAAAAGU0Flf23if_e0Ip",


    /* ======================================
       ADMIN AND EMPLOYEE CAPTCHA

       Staff authentication must require
       human verification.

       Keep this enabled.
    ====================================== */

    staffRequiresTurnstile: true,


    /* ======================================
       MOBILE OTP LOGIN

       SMS provider is not configured yet.

       Maximum 5 OTPs per mobile number
       per 24 hours will require
       server-side enforcement.

       Keep disabled.
    ====================================== */

    phoneOtpEnabled: false,


    /* ======================================
       FACE / FINGERPRINT PASSKEY LOGIN

       Experimental feature.

       Enable only after permanent
       domain setup and security testing.
    ====================================== */

    passkeyEnabled: false


});


/* ==========================================
   END OF ROOMKHOJO AUTH CONFIGURATION
========================================== */