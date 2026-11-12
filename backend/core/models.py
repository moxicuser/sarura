"""Core app: reference data (Rwanda locations), contact messages, static content."""

from django.db import models


class Province(models.Model):
    """Rwanda's 5 provinces (intara)."""

    name = models.CharField(max_length=64, unique=True)
    name_rw = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class District(models.Model):
    """Rwanda's 30 districts (uturere), always scoped to a province."""

    province = models.ForeignKey(Province, on_delete=models.PROTECT, related_name="districts")
    name = models.CharField(max_length=64)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["province", "name"], name="uniq_district_per_province"),
        ]

    def __str__(self):
        return f"{self.name} ({self.province.name})"


class Sector(models.Model):
    """Rwanda's sectors (imirenge).

    Sector names repeat across districts, so uniqueness is per district and a
    sector is always stored/joined with its district.
    """

    district = models.ForeignKey(District, on_delete=models.PROTECT, related_name="sectors")
    name = models.CharField(max_length=64)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["district", "name"], name="uniq_sector_per_district"),
        ]

    def __str__(self):
        return f"{self.name} ({self.district.name})"


class ContactMessage(models.Model):
    """A message sent from the public Contact Us form (guide §9, Step 7).

    Only these four fields come from the form. `handled` is for the admin team
    so unanswered messages can be found quickly.
    """

    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=254)
    subject = models.CharField(max_length=150)
    message = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)
    handled = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["handled", "-created_at"], name="contact_handled_created_idx"),
        ]

    def __str__(self):
        return f"{self.subject} — {self.name}"
