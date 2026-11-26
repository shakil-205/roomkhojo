"use strict";

/* ==========================================
   ROOMKHOJO PREMIUM+ AUTHENTICATION

   Tenant and Property Owner Login
   Supabase Authentication Integration

   IMPORTANT:
   Security permissions must be enforced
   through Supabase RLS and backend code.
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

    let currentView = "login";

    let failedAttempts = 0;

    let recoveryMode = false;

    let isBusy = false;

    const captchaWidgets = {};


    /* ======================================
       FORM REFERENCES
    ====================================== */

    const forms = {

        login: $("loginForm"),

        register: $("registerForm"),

        phone: $("phoneForm"),

        otp: $("otpForm"),

        forgot: $("forgotForm"),

        newPassword: $("newPasswordForm"),

        signedIn: $("signedInPanel")

    };


    /* ======================================
       PAGE TITLES
    ====================================== */

    const titles = {

        login: [
            "Welcome Back",
            "Sign in to continue your RoomKhojo journey."
        ],

        register: [
            "Join RoomKhojo",
            "Create your tenant or property owner account."
        ],

        phone: [
            "Mobile OTP Login",
            "Verify your registered mobile number."
        ],

        otp: [
            "Verify Your OTP",
            "Enter your verification code."
        ],

        forgot: [
            "Reset Your Password",
            "Recover your RoomKhojo account."
        ],

        newPassword: [
            "Create New Password",
            "Choose a strong password."
        ],

        signedIn: [
            "Welcome to RoomKhojo",
            "Your account is authenticated."
        ]

    };


    /* ======================================
       SHOW STATUS MESSAGE
    ====================================== */
/**
 * @param {string} text
 * @param {string} [type="info"]
 * @returns {void}
 */
    function showMessage(text, type = "info") {

        const box = $("message");

        box.textContent = text;

        box.className = "message " + type;

        box.hidden = !text;

    }


    /* ======================================
       SWITCH BETWEEN FORMS
    ====================================== */
/**
 * @param {string} name
 * @returns {void}
 */
    function showView(name) {

        currentView = name;

        Object.keys(forms).forEach((key) => {

            forms[key].hidden = key !== name;

        });


        $("panelTitle").textContent =
            titles[name][0];

        $("panelDescription").textContent =
            titles[name][1];


        $("authTabs").hidden =
            !["login", "register", "phone", "otp"]
                .includes(name);


        $("signinChoice").hidden =
            !["login", "phone", "otp"]
                .includes(name);


        $("loginTab").classList.toggle(
            "active",
            name !== "register"
        );


        $("registerTab").classList.toggle(
            "active",
            name === "register"
        );


        $("emailChoice").classList.toggle(
            "active",
            name === "login"
        );


        $("phoneChoice").classList.toggle(
            "active",
            name === "phone" || name === "otp"
        );


        showMessage("");


        /* Render CAPTCHA when its form is visible */

        setTimeout(() => {

            showCaptchaForView(name);

        }, 100);

    }


    /* ======================================
       CHECK PASSWORD STRENGTH
    ====================================== */
/**
 * @param {string} password
 * @returns {boolean}
 */
    function isStrongPassword(password) {

        return (

            password.length >= 10 &&

            password.length <= 128 &&

            /[a-z]/.test(password) &&

            /[A-Z]/.test(password) &&

            /[0-9]/.test(password) &&

            /[^A-Za-z0-9]/.test(password)

        );

    }


    /* ======================================
       PASSWORD STRENGTH METER
    ====================================== */

    function updatePasswordStrength() {

        const password =
            $("registerPassword").value;


        const checks = [

            password.length >= 10,

            /[a-z]/.test(password),

            /[A-Z]/.test(password),

            /[0-9]/.test(password),

            /[^A-Za-z0-9]/.test(password)

        ];


        const score = password
            ? checks.filter(Boolean).length
            : 0;


        $("strengthBar").style.width =
            (score * 20) + "%";


        let colour = "#e36b69";

        let text = "Weak Password";


        if (score >= 3) {

            colour = "#e0ae43";

            text = "Keep Improving";

        }


        if (score === 5) {

            colour = "#12a986";

            text = "Strong Password";

        }


        if (!password) {

            text = "Not Entered";

        }


        $("strengthBar").style.background =
            colour;


        $("strengthText").textContent =
            text;

    }


    $("registerPassword").addEventListener(
        "input",
        updatePasswordStrength
    );


    /* ======================================
       SHOW / HIDE PASSWORD
    ====================================== */

    document.querySelectorAll(".toggle-pass")
        .forEach((button) => {

            button.addEventListener("click", () => {

                const field =
                    $(button.dataset.target);


                const currentlyHidden =
                    field.type === "password";


                field.type = currentlyHidden
                    ? "text"
                    : "password";


                button.textContent =
                    currentlyHidden
                        ? "Hide"
                        : "Show";

            });

        });


    /* ======================================
       CHECK LIVE WEBSITE
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
       CHECK AUTHENTICATION READY
    ====================================== */

    function authReady() {

        if (!isLiveWebsite()) {

            showMessage(

                "Acode Preview is for testing the design. " +
                "Real login requires your published HTTPS " +
                "RoomKhojo website.",

                "info"

            );

            return false;

        }


        if (!supabaseClient) {

            showMessage(

                "Authentication is not configured yet. " +
                "Complete auth-config.js and check your " +
                "internet connection.",

                "error"

            );

            return false;

        }


        return true;

    }


    /* ======================================
       BUTTON LOADING STATE
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


        const oldText = button.textContent;

        button.textContent = "Please Wait...";


        try {

            await action();

        } catch (error) {

            console.error(
                "RoomKhojo authentication error:",
                error
            );


            showMessage(

                "An unexpected error occurred. " +
                "Please try again.",

                "error"

            );

        } finally {

            button.disabled = false;

            button.textContent = oldText;

            isBusy = false;

        }

    }


    /* ======================================
       CLOUDFLARE CAPTCHA
    ====================================== */

    const captchaElements = {

        login: "captchaLogin",

        register: "captchaRegister",

        forgot: "captchaForgot",

        phone: "captchaPhone"

    };

/**
 * @param {string} view
 * @returns {void}
 */
    function showCaptchaForView(view) {

        if (!config.turnstileEnabled) {
            return;
        }


        const id = captchaElements[view];

        if (!id) return;


        const element = $(id);

        element.hidden = false;


        if (

            !config.turnstileSiteKey ||

            !window.turnstile

        ) {

            showMessage(

                "Human verification is unavailable. " +
                "Please try again later.",

                "error"

            );

            return;

        }


        /* Render each CAPTCHA only once */

        if (captchaWidgets[id] !== undefined) {
            return;
        }


        try {

            captchaWidgets[id] =
                window.turnstile.render(element, {

                    sitekey:
                        config.turnstileSiteKey,

                    theme: "light",

                    callback: (/** @type {string} */ token) => {

    element.dataset.token =
        token;

},

                    "expired-callback": () => {

                        delete element.dataset.token;

                    },

                    "error-callback": () => {

                        delete element.dataset.token;

                    }

                });

        } catch (error) {

            console.error(
                "CAPTCHA initialization failed:",
                error
            );

        }

    }


    /* ======================================
       GET CAPTCHA TOKEN
    ====================================== */
/**
 * @param {string} id
 * @returns {{captchaToken?: string} | null}
 */
    function getCaptchaOptions(id) {

        if (!config.turnstileEnabled) {

            return {};

        }


        const element = $(id);

        const token = element.dataset.token;


        if (!token) {

            showMessage(

                "Please complete Verify You Are Human.",

                "error"

            );

            return null;

        }


        return {

            captchaToken: token

        };

    }


    /* ======================================
       RESET CAPTCHA
    ====================================== */
/**
 * @param {string} id
 * @returns {void}
 */
    function resetCaptcha(id) {

        if (!config.turnstileEnabled) {
            return;
        }


        const element = $(id);

        delete element.dataset.token;


        if (

            window.turnstile &&

            captchaWidgets[id] !== undefined

        ) {

            window.turnstile.reset(
                captchaWidgets[id]
            );

        }

    }


    /* ======================================
       SIGN IN TAB
    ====================================== */

    $("loginTab").addEventListener(
        "click",
        () => {

            showView("login");

        }
    );


    /* ======================================
       CREATE ACCOUNT TAB
    ====================================== */

    $("registerTab").addEventListener(
        "click",
        () => {

            showView("register");

        }
    );


    /* ======================================
       EMAIL LOGIN OPTION
    ====================================== */

    $("emailChoice").addEventListener(
        "click",
        () => {

            showView("login");

        }
    );


    /* ======================================
       MOBILE OTP OPTION
    ====================================== */

    $("phoneChoice").addEventListener(
        "click",
        () => {

            showView("phone");


            showMessage(

                "Mobile OTP login is coming soon. " +
                "We must configure an SMS provider " +
                "and server-side OTP limits first.",

                "info"

            );

        }
    );


    /* ======================================
       CHANGE MOBILE NUMBER
    ====================================== */

    $("otpBack").addEventListener(
        "click",
        () => {

            showView("phone");

        }
    );


    /* ======================================
       FORGOT PASSWORD BUTTON
    ====================================== */

    $("forgotLink").addEventListener(
        "click",
        () => {

            $("resetEmail").value =
                $("loginEmail").value.trim();


            showView("forgot");

        }
    );


    /* ======================================
       BACK BUTTONS
    ====================================== */

    document.querySelectorAll("[data-view]")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    showView(
                        button.dataset.view
                    );

                }
            );

        });


    /* ======================================
       EMAIL AND PASSWORD LOGIN
    ====================================== */

    $("loginForm").addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!forms.login.reportValidity()) {
                return;
            }


            if (!authReady()) {
                return;
            }


            const captcha =
                getCaptchaOptions("captchaLogin");


            if (captcha === null) {
                return;
            }


            const button =
                forms.login.querySelector(
                    'button[type="submit"]'
                );


            await withLoading(button, async () => {


                const email =
                    $("loginEmail").value
                        .trim()
                        .toLowerCase();


                const password =
                    $("loginPassword").value;


                const { data, error } =
                    await supabaseClient.auth
                        .signInWithPassword({

                            email,

                            password,

                            options: captcha

                        });


                resetCaptcha("captchaLogin");


                if (error || !data?.user) {

                    failedAttempts++;


                    if (failedAttempts >= 3) {

                        $("securityNotice").hidden =
                            false;

                    }


                    showMessage(

                        error?.status === 429

                            ? "Too many attempts. " +
                              "Please try again later."

                            : "Login unsuccessful. " +
                              "Check your email, password " +
                              "and verification status.",

                        "error"

                    );


                    return;

                }


                /* Successful authentication */

                failedAttempts = 0;


                $("securityNotice").hidden =
                    true;


                showSignedIn(data.user);

            });

        }
    );


    /* ======================================
       SHOW SUCCESSFUL LOGIN
    ====================================== */
/**
 * @param {{email?: string, phone?: string}} user
 * @returns {void}
 */
    function showSignedIn(user) {

        showView("signedIn");


        $("signedInEmail").textContent =

            user.email ||

            user.phone ||

            "RoomKhojo User";


        $("loginPassword").value = "";

    }


    /* ======================================
       REGISTER TENANT / OWNER
    ====================================== */

    $("registerForm").addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!forms.register.reportValidity()) {
                return;
            }


            const fullName =
                $("fullName").value.trim();


            const email =
                $("registerEmail").value
                    .trim()
                    .toLowerCase();


            const phone =
                $("registerPhone").value.trim();


            const role =
                $("accountType").value;


            const password =
                $("registerPassword").value;


            const confirmPassword =
                $("confirmPassword").value;


            /* Validate full name */

            if (fullName.length < 2) {

                showMessage(

                    "Please enter your full name.",

                    "error"

                );

                return;

            }


            /* Validate Indian mobile number */

            if (!/^[6-9][0-9]{9}$/.test(phone)) {

                showMessage(

                    "Enter a valid 10-digit " +
                    "Indian mobile number.",

                    "error"

                );

                return;

            }


            /* Only allow public account types */

            if (

                role !== "tenant" &&

                role !== "owner"

            ) {

                showMessage(

                    "Select Tenant or Property Owner.",

                    "error"

                );

                return;

            }


            /* Check password strength */

            if (!isStrongPassword(password)) {

                showMessage(

                    "Password must contain at least " +
                    "10 characters, uppercase, lowercase, " +
                    "number and symbol.",

                    "error"

                );

                return;

            }

                /* Confirm password */

            if (password !== confirmPassword) {

                showMessage(

                    "Passwords do not match.",

                    "error"

                );

                return;

            }


            if (!authReady()) {

                return;

            }


            const captcha =
                getCaptchaOptions("captchaRegister");


            if (captcha === null) {

                return;

            }


            /* REGISTRATION SUBMIT BUTTON */

            const button =
                forms.register.querySelector(
                    'button[type="submit"]'
                );


            await withLoading(button, async () => {


                const redirectUrl =
                    new URL(
                        "login.html",
                        location.href
                    ).href;


                const { data, error } =
                    await supabaseClient.auth.signUp({

                        email,

                        password,

                        options: {

                            ...captcha,

                            emailRedirectTo:
                                redirectUrl,

                            data: {

                                full_name: fullName,

                                phone: phone,

                                requested_role: role

                            }

                        }

                    });


                resetCaptcha("captchaRegister");


                if (error) {

                    showMessage(

                        error.status === 429

                            ? "Too many registration " +
                              "requests. Try again later."

                            : "Registration could not " +
                              "be completed.",

                        "error"

                    );

                    return;

                }


                /*
                 If email confirmation is disabled,
                 Supabase may return a session.

                 Registration must not bypass
                 our planned onboarding process.
                */

                if (data?.session) {

                    await supabaseClient.auth
                        .signOut();

                }


                forms.register.reset();

                updatePasswordStrength();

                showView("login");


                showMessage(

                    "Registration request received. " +
                    "If successful, a confirmation " +
                    "link will arrive in your email. " +
                    "Check your inbox and spam folder.",

                    "ok"

                );

            });

        }
    );


    /* ======================================
       FORGOT PASSWORD
    ====================================== */

    $("forgotForm").addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!forms.forgot.reportValidity()) {

                return;

            }


            if (!authReady()) {

                return;

            }


            const captcha =
                getCaptchaOptions("captchaForgot");


            if (captcha === null) {

                return;

            }


            const button =
                forms.forgot.querySelector(
                    'button[type="submit"]'
                );


            await withLoading(button, async () => {


                const email =
                    $("resetEmail").value
                        .trim()
                        .toLowerCase();


                const redirectUrl =
                    new URL(
                        "login.html",
                        location.href
                    ).href;


                const { error } =
                    await supabaseClient.auth
                        .resetPasswordForEmail(

                            email,

                            {

                                redirectTo:
                                    redirectUrl,

                                ...captcha

                            }

                        );


                resetCaptcha("captchaForgot");


                if (error?.status === 429) {

                    showMessage(

                        "Too many requests. " +
                        "Please try again later.",

                        "error"

                    );

                    return;

                }


                showMessage(

                    "If the email is registered, " +
                    "a password recovery link " +
                    "will be sent.",

                    "ok"

                );

            });

        }
    );


    /* ======================================
       CREATE NEW PASSWORD
    ====================================== */

    $("newPasswordForm").addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!forms.newPassword.reportValidity()) {

                return;

            }


            if (!authReady()) {

                return;

            }


            if (!recoveryMode) {

                showMessage(

                    "Please open a valid password " +
                    "recovery link first.",

                    "error"

                );

                return;

            }


            const password =
                $("newPassword").value;


            const confirmPassword =
                $("newPasswordConfirm").value;


            if (!isStrongPassword(password)) {

                showMessage(

                    "Choose a stronger password.",

                    "error"

                );

                return;

            }


            if (password !== confirmPassword) {

                showMessage(

                    "Passwords do not match.",

                    "error"

                );

                return;

            }


            const button =
                forms.newPassword.querySelector(
                    'button[type="submit"]'
                );


            await withLoading(button, async () => {


                const { error } =
                    await supabaseClient.auth
                        .updateUser({

                            password

                        });


                if (error) {

                    showMessage(

                        "Password could not be updated. " +
                        "The recovery link may have expired.",

                        "error"

                    );

                    return;

                }


                recoveryMode = false;

                forms.newPassword.reset();


                await supabaseClient.auth.signOut();


                showView("login");


                showMessage(

                    "Your password has been updated. " +
                    "Sign in using your new password.",

                    "ok"

                );

            });

        }
    );


    /* ======================================
       MOBILE OTP PLACEHOLDER

       Real SMS login must not be enabled
       before server-side OTP limits exist.
    ====================================== */

    $("phoneForm").addEventListener(
        "submit",
        (event) => {

            event.preventDefault();


            showMessage(

                "Mobile OTP is not available yet. " +
                "Please use Email & Password.",

                "info"

            );

        }
    );


    $("otpForm").addEventListener(
        "submit",
        (event) => {

            event.preventDefault();


            showMessage(

                "Mobile OTP verification " +
                "has not been activated.",

                "info"

            );

        }
    );


    /* ======================================
       SECURE SIGN OUT
    ====================================== */

    $("signOutButton").addEventListener(
        "click",
        async () => {


            if (!authReady()) {

                return;

            }


            await withLoading(
                $("signOutButton"),
                async () => {


                    const { error } =
                        await supabaseClient.auth
                            .signOut();


                    if (error) {

                        showMessage(

                            "Unable to sign out. " +
                            "Please try again.",

                            "error"

                        );

                        return;

                    }


                    showView("login");


                    showMessage(

                        "You have signed out.",

                        "ok"

                    );

                }
            );

        }
    );


    /* ======================================
       INITIALIZE SUPABASE
    ====================================== */

    function initializeSupabase() {

        if (!isLiveWebsite()) {

            showMessage(

                "Interface Preview Mode: " +
                "buttons and forms can be viewed. " +
                "Authentication will work after " +
                "publishing to your HTTPS website " +
                "and completing Supabase setup.",

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


        /* Listen for authentication events */

        supabaseClient.auth.onAuthStateChange(
    (/** @type {string} */ event) => {

                if (event === "PASSWORD_RECOVERY") {

                    recoveryMode = true;


                    showView("newPassword");


                    showMessage(

                        "Recovery link verified. " +
                        "Create your new password.",

                        "ok"

                    );

                }


                if (

                    event === "SIGNED_OUT" &&

                    currentView === "signedIn"

                ) {

                    showView("login");

                }

            }
        );


        /* Restore existing login session */

        supabaseClient.auth.getUser()
            .then(({ data, error }) => {


                if (

                    !error &&

                    data?.user &&

                    !recoveryMode &&

                    currentView === "login"

                ) {

                    showSignedIn(data.user);

                }

            })
            .catch((/** @type {Error} */ error) => {

                console.error(
                    "Unable to restore session:",
                    error
                );

            });

    }


    /* ======================================
       INITIALIZE LOGIN INTERFACE
    ====================================== */

    showView("login");


    initializeSupabase();


    /* CAPTCHA will load when enabled */

    if (config.turnstileEnabled) {

        let attempts = 0;


        const timer = setInterval(() => {


            attempts++;


            if (

                window.turnstile ||

                attempts >= 30

            ) {

                clearInterval(timer);


                showCaptchaForView(
                    currentView
                );

            }

        }, 200);

    }


})();        