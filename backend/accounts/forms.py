"""Admin forms for the custom email-based user model."""

from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password

from accounts.models import User


class UserCreationForm(forms.ModelForm):
    """Create a user in Django admin with a hashed password and a role."""

    password1 = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Confirm password", widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ("email", "full_name", "phone", "is_buyer", "is_farmer")

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise ValidationError("The two passwords do not match.")
        if password1:
            validate_password(password1)
        return password2

    def clean(self):
        cleaned_data = super().clean()
        if not cleaned_data.get("is_buyer") and not cleaned_data.get("is_farmer"):
            raise ValidationError("Give this account at least one role: buyer, farmer, or both.")
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(
        help_text=(
            "Passwords are stored as hashes and cannot be read. "
            "Use the password change link to set a new one."
        )
    )

    class Meta:
        model = User
        fields = "__all__"
