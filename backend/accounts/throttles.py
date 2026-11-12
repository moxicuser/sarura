"""Rate limits for authentication endpoints (guide section 7).

Login, registration and password reset are the endpoints most likely to be
attacked by bots or password guessing, so they are limited per client IP.
The limits are configured through the environment (see README) and shared by
DRF's cache, so they survive across requests but reset on their own.
"""

from rest_framework.throttling import SimpleRateThrottle


class ClientIPThrottle(SimpleRateThrottle):
    """Throttle by client IP for both signed-in and anonymous requests.

    DRF's AnonRateThrottle stops tracking once a request is authenticated.
    These endpoints are safe to protect for everyone: logging in again should
    still be limited, and a signed-in visitor should not be able to hammer the
    password-reset endpoint either.
    """

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class LoginRateThrottle(ClientIPThrottle):
    scope = "login"


class RegisterRateThrottle(ClientIPThrottle):
    scope = "register"


class PasswordResetRateThrottle(ClientIPThrottle):
    scope = "password_reset"
