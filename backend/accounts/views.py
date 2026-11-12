"""Authentication and profile API endpoints under /api/auth/."""

from django.contrib.auth import login, logout
from django.contrib.auth.tokens import default_token_generator
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.emails import send_password_reset_email, send_verification_email
from accounts.models import User
from accounts.serializers import (
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)


def user_from_uid(uid: str):
    """Decode a urlsafe base64 uid and return the matching user, or None."""
    try:
        pk = force_str(urlsafe_base64_decode(uid))
    except (TypeError, ValueError, OverflowError, UnicodeDecodeError):
        return None
    if not pk:
        return None
    return User.objects.filter(pk=pk).first()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Welcome + verification email (console backend in development).
        send_verification_email(user)

        # Log the new user in straight away; the React app calls /api/auth/me/.
        login(request, user)

        return Response(
            UserSerializer(user, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        return Response(UserSerializer(user, context={"request": request}).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"].strip(),
            is_active=True,
        ).first()
        if user:
            send_password_reset_email(user)

        # Same response whether or not the account exists (no account enumeration).
        return Response(
            {"detail": "If an account exists for that email, a reset link has been sent."}
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        user = user_from_uid(data["uid"])
        if user is None or not default_token_generator.check_token(user, data["token"]):
            return Response(
                {"detail": "This reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated. You can now log in."})


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return self._verify(request.query_params)

    def post(self, request):
        return self._verify(request.data)

    def _verify(self, params):
        serializer = VerifyEmailSerializer(data=params)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        user = user_from_uid(data["uid"])
        if user is None or not default_token_generator.check_token(user, data["token"]):
            return Response(
                {"detail": "This verification link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.email_verified_at is None:
            user.email_verified_at = timezone.now()
            fields = ["email_verified_at"]
            if user.verification_level == User.VerificationLevel.UNVERIFIED:
                user.verification_level = User.VerificationLevel.ACCOUNT
                fields.append("verification_level")
            user.save(update_fields=fields)

        return Response(
            {
                "detail": "Email verified.",
                "user": UserSerializer(user).data,
            }
        )


class ResendVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.email_verified_at is not None:
            return Response({"detail": "Your email is already verified."})
        send_verification_email(request.user)
        return Response({"detail": "Verification email sent."})


@ensure_csrf_cookie
def csrf_token(request):
    """Return a CSRF token for the React app (also sets the cookie)."""
    return JsonResponse({"csrfToken": get_token(request)})
