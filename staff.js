"use strict";

/* ==========================================
   ROOMKHOJO PREMIUM+ STAFF AUTHENTICATION

   Admin Login
   Employee Login
   CAPTCHA
   MFA Authentication
   Staff Role Verification
   Secure Sign Out

   IMPORTANT:
   Real permissions must be enforced
   through Supabase RLS policies.
========================================== */

(() => {

    /* ======================================
       CONFIGURATION
    ====================================== */

    const config =
        window.ROOMKHOJO_AUTH_CONFIG || {};


    /**
     * @param {string} id
     * @returns {HTMLElement | null}
     */
    const $ = (id) =>
        document.getElementById(id);


    let supabaseClient = null;

    let isBusy = false;

    let captchaToken = "";

    let captchaWidgetId = null;

    let mfaFactorId = null;

    let enrollmentFactorId = null;

    let approvedRole = null;


    /* ======================================
       STAFF LOGIN PANELS
    ====================================== */

    const panels = [

        "staffLoginForm",

        "mfaEnrollPanel",

        "mfaChallengeForm",

        "staffApproved"

    ];


    /* ======================================
       SECURITY MESSAGE
    ====================================== */

    /**
     * @param {string} text
     * @param {string} [type="info"]
     * @returns {void}
     */
    function showMessage(text, type = "info") {

        const box = $("staffMessage");

        box.textContent = text;

        box.className = "message " + type;

        box.hidden = !text;

    }


    /* ======================================
       SWITCH STAFF PANELS
    ====================================== */

    /**
     * @param {string} name
     * @returns {void}
     */
    function showPanel(name) {

        panels.forEach((panel) => {

            $(panel).hidden =
                panel !== name;

        });


        $("staffSignOut").hidden =
            name === "staffLoginForm";


        const titles = {

            staffLoginForm: [

                "Staff Secure Sign In",

                "Authorized RoomKhojo staff only."

            ],

            mfaEnrollPanel: [

                "Set Up Two-Factor Authentication",

                "Protect your staff account."

            ],

            mfaChallengeForm: [

                "Verify Your Identity",

                "Enter your authenticator code."

            ],

            staffApproved: [

                "Staff Identity Verified",

                "Your authentication is complete."

            ]

        };


        $("staffTitle").textContent =
            titles[name][0];


        $("staffSubtitle").textContent =
            titles[name][1];

    }


    /* ======================================
       CHECK PUBLISHED WEBSITE
    ====================================== */

    function isLiveWebsite() {

        return (

            location.protocol === "https:" &&

            location.origin === config.origin &&

            location.pathname.startsWith(
                config.basePath || "/roomkhojo/"
            )

        );

    }


    /* ======================================
       CHECK SECURITY CONFIGURATION
    ====================================== */

    function authenticationReady() {

        if (!isLiveWebsite()) {

            showMessage(

                "Preview mode: Real staff login " +
                "requires the published HTTPS " +
                "RoomKhojo website.",

                "info"

            );

            return false;

        }


        if (!supabaseClient) {

            showMessage(

                "Supabase authentication is " +
                "not configured yet.",

                "error"

            );

            return false;

        }


        /*
         Staff CAPTCHA must be enabled.

         Fail closed if CAPTCHA is
         missing or not configured.
        */

        if (

            !config.turnstileEnabled ||

            !config.turnstileSiteKey ||

            !window.turnstile

        ) {

            showMessage(

                "Staff login is disabled until " +
                "Cloudflare CAPTCHA protection " +
                "is configured.",

                "error"

            );

            return false;

        }


        return true;

    }


    /* ======================================
       PREVENT DUPLICATE SUBMISSIONS
    ====================================== */

    /**
     * @param {HTMLButtonElement} button
     * @param {() => Promise<void>} action
     * @returns {Promise<void>}
     */
    async function withLoading(button, action) {

        if (isBusy) return;

        isBusy = true;

        button.disabled = true;


        const originalText =
            button.textContent;


        button.textContent =
            "Please Wait...";


        try {

            await action();

        } catch (error) {

            console.error(
                "RoomKhojo staff authentication:",
                error
            );


            showMessage(

                "An unexpected error occurred. " +
                "Please try again.",

                "error"

            );

        } finally {

            button.disabled = false;

            button.textContent =
                originalText;

            isBusy = false;

        }

    }


    /* ======================================
       SHOW / HIDE PASSWORD
    ====================================== */

    document.querySelectorAll(".toggle-pass")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    const field =
                        $(button.dataset.target);


                    const hidden =
                        field.type === "password";


                    field.type = hidden
                        ? "text"
                        : "password";


                    button.textContent = hidden
                        ? "Hide"
                        : "Show";

                }
            );

        });


    /* ======================================
       INITIALIZE CLOUDFLARE CAPTCHA
    ====================================== */

    function initializeCaptcha() {

        if (!config.turnstileEnabled) {
            return;
        }


        if (!config.turnstileSiteKey) {

            showMessage(

                "Cloudflare CAPTCHA site key " +
                "is missing.",

                "error"

            );

            return;

        }


        let attempts = 0;


        const timer = setInterval(() => {

            attempts++;


            if (window.turnstile) {

                clearInterval(timer);


                const element =
                    $("staffCaptcha");


                element.hidden = false;


                try {

                    captchaWidgetId =
                        window.turnstile.render(

                            element,

                            {

                                sitekey:
                                    config.turnstileSiteKey,

                                theme: "light",


                                callback: (
                                    /** @type {string} */
                                    token
                                ) => {

                                    captchaToken =
                                        token;

                                },


                                "expired-callback": () => {

                                    captchaToken = "";

                                },


                                "error-callback": () => {

                                    captchaToken = "";

                                }

                            }

                        );

                } catch (error) {

                    console.error(
                        "CAPTCHA error:",
                        error
                    );


                    showMessage(

                        "Human verification could " +
                        "not be loaded.",

                        "error"

                    );

                }

            }


            if (attempts >= 30) {

                clearInterval(timer);


                if (!window.turnstile) {

                    showMessage(

                        "CAPTCHA is unavailable. " +
                        "Staff login cannot continue.",

                        "error"

                    );

                }

            }

        }, 200);

    }


    /* ======================================
       RESET CAPTCHA
    ====================================== */

    function resetCaptcha() {

        captchaToken = "";


        if (

            window.turnstile &&

            captchaWidgetId !== null

        ) {

            window.turnstile.reset(
                captchaWidgetId
            );

        }

    }


    /* ======================================
       SECURE STAFF SIGN OUT
    ====================================== */

    /**
     * @param {string} text
     * @returns {Promise<void>}
     */
    async function signOutStaff(text) {

        approvedRole = null;

        mfaFactorId = null;

        enrollmentFactorId = null;


        if (supabaseClient) {

            const { error } =
                await supabaseClient.auth
                    .signOut();


            if (error) {

                showMessage(

                    "Could not sign out. " +
                    "Please try again.",

                    "error"

                );

                return;

            }

        }


        $("staffPassword").value = "";

        $("mfaCode").value = "";

        $("mfaEnrollCode").value = "";


        $("mfaSetupContent").hidden = true;

        $("totpSecret").textContent = "";

        $("totpQr").removeAttribute("src");


        showPanel("staffLoginForm");

        resetCaptcha();

        showMessage(text, "info");

    }


    /* ======================================
       CHECK STAFF ACCOUNT AND MFA
    ====================================== */

    async function checkStaffSession() {

        if (!authenticationReady()) {
            return;
        }


        /*
         Confirm the real Supabase user.
        */

        const {
            data: userResult,
            error: userError
        } = await supabaseClient.auth
            .getUser();


        if (

            userError ||

            !userResult?.user

        ) {

            showPanel("staffLoginForm");

            return;

        }


        const user = userResult.user;


        /*
         Staff role comes from user_profiles.

         Never trust a role chosen by a
         user in their registration form.
        */

        const {
            data: profile,
            error: profileError
        } = await supabaseClient

            .from("user_profiles")

            .select("role,is_active")

            .eq("auth_user_id", user.id)

            .maybeSingle();


        /*
         Reject anyone who is not an
         approved active staff member.

         Database RLS must also restrict
         access to this information.
        */

        if (

            profileError ||

            !profile ||

            profile.is_active !== true ||

            !["admin", "employee"]
                .includes(profile.role)

        ) {

            await signOutStaff(

                "Staff access denied or unavailable. " +
                "An approved staff account and " +
                "database permissions are required."

            );

            return;

        }


        approvedRole = profile.role;


        /* ==================================
           CHECK MFA ENROLLMENT
        ================================== */

        const {
            data: factors,
            error: factorsError
        } = await supabaseClient.auth.mfa
            .listFactors();


        if (factorsError) {

            showMessage(

                "Could not verify MFA settings.",

                "error"

            );

            return;

        }


        const verifiedFactor =
    (factors.totp || []).find(

        (/** @type {{id: string, status: string}} */ factor) =>
            factor.status === "verified"

    );


        /*
         New staff member must first
         register an authenticator app.
        */

        if (!verifiedFactor) {

            showPanel("mfaEnrollPanel");


            showMessage(

                "Two-factor authentication is " +
                "required for staff access.",

                "info"

            );

            return;

        }


        mfaFactorId =
            verifiedFactor.id;


        /* ==================================
           CHECK AUTHENTICATOR LEVEL
        ================================== */

        const {
            data: aal,
            error: aalError
        } = await supabaseClient.auth.mfa
            .getAuthenticatorAssuranceLevel();


        if (aalError) {

            showMessage(

                "Unable to verify MFA status.",

                "error"

            );

            return;

        }


        /*
         Require AAL2 before showing
         the approved staff panel.
        */

        if (aal.currentLevel !== "aal2") {

            showPanel("mfaChallengeForm");


            showMessage(

                "Enter the six-digit code from " +
                "your authenticator app.",

                "info"

            );

            return;

        }


        /* ==================================
           STAFF AUTHENTICATION COMPLETE
        ================================== */

        showPanel("staffApproved");


        const roleName =
            approvedRole === "admin"
                ? "Administrator"
                : "Employee";


        $("staffApprovedLabel").textContent =

            roleName +

            " · " +

            (user.email || "Staff Account");


        /*
         Biometric passkey login is
         intentionally disabled until
         the experimental integration
         is configured and tested.
        */

        $("staffRegisterPasskey").hidden =
            true;


        showMessage(

            "Staff role and MFA verified.",

            "ok"

        );

    }


    /* ======================================
       EMAIL AND PASSWORD STAFF LOGIN
    ====================================== */

    $("staffLoginForm").addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (

                !$("staffLoginForm")
                    .reportValidity()

            ) {

                return;

            }


            if (!authenticationReady()) {
                return;
            }


            /*
             CAPTCHA must be completed
             before credential submission.
            */

            if (!captchaToken) {

                showMessage(

                    "Please complete " +
                    "Verify You Are Human.",

                    "error"

                );

                return;

            }


            const button =
                $("staffLoginForm")
                    .querySelector(
                        'button[type="submit"]'
                    );


            await withLoading(
                button,
                async () => {


                    const email =
                        $("staffEmail").value
                            .trim()
                            .toLowerCase();


                    const password =
                        $("staffPassword").value;


                    const { error } =
                        await supabaseClient.auth
                            .signInWithPassword({

                                email,

                                password,

                                options: {

                                    captchaToken:
                                        captchaToken

                                }

                            });


                    resetCaptcha();


                    /*
                     Clear the password
                     from the input field.
                    */

                    $("staffPassword").value = "";


                    if (error) {

                        showMessage(

                            error.status === 429

                                ? "Too many login attempts. " +
                                  "Try again later."

                                : "Staff login unsuccessful. " +
                                  "Check your credentials " +
                                  "and CAPTCHA.",

                            "error"

                        );

                        return;

                    }


                    await checkStaffSession();

                }
            );

        }
    );


    /* ======================================
       START MFA ENROLLMENT
    ====================================== */

    $("beginMfaEnrollment").addEventListener(
        "click",
        async (event) => {


            if (

                !authenticationReady() ||

                !approvedRole

            ) {

                return;

            }


            await withLoading(
                event.currentTarget,
                async () => {


                    const {
                        data,
                        error
                    } = await supabaseClient.auth.mfa
                        .enroll({

                            factorType: "totp",

                            friendlyName:
                                "RoomKhojo Staff Authenticator"

                        });


                    if (error) {

                        showMessage(

                            "Could not start MFA setup.",

                            "error"

                        );

                        return;

                    }


                    enrollmentFactorId =
                        data.id;


                    /* DISPLAY MFA QR CODE */

                    const qr =
                        data.totp?.qr_code || "";


                    if (qr) {

                        $("totpQr").src =
                            qr.startsWith("data:image/")

                                ? qr

                                : "data:image/svg+xml;charset=utf-8," +
                                  encodeURIComponent(qr);


                        $("totpQr").hidden = false;

                    }


                    $("totpSecret").textContent =
                        data.totp?.secret || "";


                    $("mfaSetupContent").hidden =
                        false;


                    showMessage(

                        "Scan the QR code using " +
                        "your authenticator app.",

                        "info"

                    );

                }
            );

        }
    );

    /* ======================================
       VERIFY NEW MFA FACTOR
    ====================================== */

    $("mfaEnrollVerify").addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (

                !enrollmentFactorId ||

                !$("mfaEnrollVerify")
                    .reportValidity() ||

                !authenticationReady()

            ) {

                return;

            }


            const button =
                $("mfaEnrollVerify")
                    .querySelector(
                        'button[type="submit"]'
                    );


            await withLoading(
                button,
                async () => {


                    const {
                        data: challenge,
                        error: challengeError
                    } = await supabaseClient.auth.mfa
                        .challenge({

                            factorId:
                                enrollmentFactorId

                        });


                    if (challengeError) {

                        showMessage(

                            "MFA challenge could not " +
                            "be created.",

                            "error"

                        );

                        return;

                    }


                    const { error } =
                        await supabaseClient.auth.mfa
                            .verify({

                                factorId:
                                    enrollmentFactorId,

                                challengeId:
                                    challenge.id,

                                code:
                                    $("mfaEnrollCode")
                                        .value.trim()

                            });


                    if (error) {

                        showMessage(

                            "Incorrect or expired " +
                            "authenticator code.",

                            "error"

                        );

                        return;

                    }


                    $("mfaEnrollCode").value = "";

                    $("totpSecret").textContent = "";

                    $("totpQr").removeAttribute("src");

                    $("mfaSetupContent").hidden =
                        true;


                    enrollmentFactorId = null;


                    await checkStaffSession();

                }
            );

        }
    );


    /* ======================================
       VERIFY MFA DURING LOGIN
    ====================================== */

    $("mfaChallengeForm").addEventListener(
        "submit",
        async (event) => {


            event.preventDefault();


            if (

                !mfaFactorId ||

                !$("mfaChallengeForm")
                    .reportValidity() ||

                !authenticationReady()

            ) {

                return;

            }


            const button =
                $("mfaChallengeForm")
                    .querySelector(
                        'button[type="submit"]'
                    );


            await withLoading(
                button,
                async () => {


                    const {
                        data: challenge,
                        error: challengeError
                    } = await supabaseClient.auth.mfa
                        .challenge({

                            factorId:
                                mfaFactorId

                        });


                    if (challengeError) {

                        showMessage(

                            "Unable to start MFA verification.",

                            "error"

                        );

                        return;

                    }


                    const { error } =
                        await supabaseClient.auth.mfa
                            .verify({

                                factorId:
                                    mfaFactorId,

                                challengeId:
                                    challenge.id,

                                code:
                                    $("mfaCode")
                                        .value.trim()

                            });


                    if (error) {

                        showMessage(

                            "Incorrect or expired " +
                            "authenticator code.",

                            "error"

                        );

                        return;

                    }


                    $("mfaCode").value = "";


                    await checkStaffSession();

                }
            );

        }
    );


    /* ======================================
       BIOMETRIC LOGIN

       Passkeys are experimental.

       Keep this feature disabled until
       server-side security and the
       permanent domain are configured.
    ====================================== */

    $("staffPasskey").disabled = true;

    $("staffRegisterPasskey").hidden = true;


    /* ======================================
       SIGN OUT BUTTON
    ====================================== */

    $("staffSignOut").addEventListener(
        "click",
        async () => {


            await withLoading(
                $("staffSignOut"),
                async () => {


                    await signOutStaff(

                        "You have signed out of " +
                        "the RoomKhojo staff portal."

                    );

                }
            );

        }
    );


    /* ======================================
       INITIALIZE STAFF AUTHENTICATION
    ====================================== */

    function initializeStaffAuth() {

        showPanel("staffLoginForm");


        if (!isLiveWebsite()) {

            showMessage(

                "Design preview only. " +
                "Staff authentication requires " +
                "the published HTTPS website.",

                "info"

            );

            return;

        }


        if (

            !window.supabase ||

            !config.supabaseUrl ||

            !config.supabasePublishableKey

        ) {

            showMessage(

                "Supabase configuration is missing. " +
                "Complete auth-config.js first.",

                "error"

            );

            return;

        }


        supabaseClient =
            window.supabase.createClient(

                config.supabaseUrl,

                config.supabasePublishableKey,

                {

                    auth: {

                        persistSession: true,

                        autoRefreshToken: true,

                        detectSessionInUrl: true

                    }

                }

            );


        /*
         Restore existing session.

         Staff role and MFA must be
         checked again every time.
        */

        if (

            config.turnstileEnabled &&

            config.turnstileSiteKey

        ) {

            supabaseClient.auth.getUser()
                .then(({ data, error }) => {


                    if (

                        !error &&

                        data?.user

                    ) {

                        return checkStaffSession();

                    }

                })
                .catch((/** @type {Error} */ error) => {

                    console.error(

                        "Staff session restoration error:",

                        error

                    );

                });

        }

    }


    /* ======================================
       START APPLICATION
    ====================================== */

    initializeStaffAuth();

    initializeCaptcha();

})();