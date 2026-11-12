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
