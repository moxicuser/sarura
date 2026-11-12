"""Seed the fixed category list from the marketplace rules (§1)."""

from django.db import migrations

CATEGORIES = [
    ("Vegetables", "Imboga"),
    ("Fruits", "Imbuto"),
    ("Grains", "Ibiribwa"),
    ("Tubers", "Ibijumba n'ibirayi"),
    ("Other", "Ibindi"),
]


def seed_categories(apps, schema_editor):
    Category = apps.get_model("marketplace", "Category")
    for name, name_rw in CATEGORIES:
        Category.objects.update_or_create(name=name, defaults={"name_rw": name_rw})


def unseed_categories(apps, schema_editor):
    # Categories are protected once listings reference them; leave them in place
    # on reverse so no data is lost.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("marketplace", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_categories, unseed_categories),
    ]
